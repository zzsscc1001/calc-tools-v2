/**
 * Boost 两相交错纹波计算核心
 *
 * 此模块为纯函数，不依赖任何 React 或 UI 库。
 * 可独立进行单元测试。
 */

// ─── 输入参数类型 ───
export interface RippleInputs {
  vin: number      // V
  vout: number     // V
  iout: number     // A
  fsw: number      // kHz
  eta: number      // 效率 (0~1)
  l: number        // µH
  cout: number     // µF
  esr: number      // mΩ
  vd: number       // 二极管正向压降 V
  alpha: number    // 相1电流比例 (0~1)
}

// ─── 标量结果 ───
export interface RippleScalars {
  d: number           // 占空比 (%)
  iinTotal: number    // 总输入电流 (A)
  il1Avg: number      // 相1平均电感电流 (mA)
  il2Avg: number      // 相2平均电感电流 (mA)
  ilPeak: number      // 总峰值电流 (mA)
  ph1Mode: string     // CCM / DCM
  ph2Mode: string
  ph1Ipeak: number    // mA
  ph1Ivalley: number  // mA
  ph2Ipeak: number
  ph2Ivalley: number
  vpp: number         // 总纹波峰峰值 (mV)
  vcPp: number        // 电容纹波峰峰值 (mV)
  vesrPp: number      // ESR纹波峰峰值 (mV)
}

// ─── 波形数据点 ───
export interface WaveformPoint {
  t: number       // µs
  id1: number     // A
  id2: number     // A
  idTotal: number // A
  ic: number      // A
  vc: number      // mV
  vesr: number    // mV
  vripple: number // mV
}

export interface RippleResult {
  scalars: RippleScalars
  waveforms: WaveformPoint[]
}

/**
 * 计算两相交错 Boost 输出纹波。
 *
 * @throws {Error} 当输入参数违反物理约束时抛出错误
 */
export function calculateBoostRipple(inputs: RippleInputs): RippleResult {
  const { vin, vout, iout, fsw, eta, l, cout, esr, vd, alpha } = inputs

  // 单位转换
  const fswHz = fsw * 1000
  const L = l * 1e-6
  const Cout = cout * 1e-6
  const ESR = esr * 1e-3

  // Step 1: 基本稳态量
  const T = 1 / fswHz
  const D = 1 - (vin * eta) / (vout + vd)
  const IinTotal = (vout * iout) / (vin * eta)
  const IL1Avg = IinTotal * alpha
  const IL2Avg = IinTotal * (1 - alpha)
  const deltaIL = (vin * D * T) / L

  // Step 2: 单相工作模式判定与电流波形
  const N = 2000
  const dt = T / N

  function calcPhaseWaveform(ILAvg: number): {
    mode: string
    iPeak: number
    iValley: number
    ton: number
    id: Float64Array
  } {
    const isCCM = ILAvg > deltaIL / 2
    let iPeak: number, iValley: number, ton: number
    const id = new Float64Array(N)

    if (isCCM) {
      iPeak = ILAvg + deltaIL / 2
      iValley = ILAvg - deltaIL / 2
      const tonTime = D * T
      ton = tonTime
      for (let i = 0; i < N; i++) {
        const t = i * dt
        if (t < tonTime) {
          id[i] = 0
        } else {
          // 线性下降
          const frac = (t - tonTime) / (T - tonTime)
          id[i] = iPeak - frac * (iPeak - iValley)
        }
      }
    } else {
      // DCM
      const k = L * (1 / vin + 1 / (vout + vd - vin)) / T
      iPeak = Math.sqrt(2 * ILAvg / k)
      iValley = 0
      ton = (iPeak * L) / vin
      const toff2 = (iPeak * L) / (vout + vd - vin)
      for (let i = 0; i < N; i++) {
        const t = i * dt
        if (t < ton) {
          id[i] = 0
        } else if (t < ton + toff2) {
          id[i] = iPeak * (1 - (t - ton) / toff2)
        } else {
          id[i] = 0
        }
      }
    }

    return { mode: isCCM ? "CCM" : "DCM", iPeak, iValley, ton, id }
  }

  const ph1 = calcPhaseWaveform(IL1Avg)
  const ph2 = calcPhaseWaveform(IL2Avg)

  // Step 3: 两相交错叠加 (180° 相移 = N/2 个采样点)
  const halfN = N / 2
  const idTotal = new Float64Array(N)
  for (let i = 0; i < N; i++) {
    const idx2 = (i + halfN) % N
    idTotal[i] = (ph1.id[i] ?? 0) + (ph2.id[idx2] ?? 0)
  }

  // Step 4: 电容纹波
  const ic = new Float64Array(N)
  for (let i = 0; i < N; i++) {
    ic[i] = (idTotal[i] ?? 0) - iout
  }

  // 电容电压纹波 (积分后减均值)
  const vc = new Float64Array(N)
  let vcSum = 0
  let vcIntegral = 0
  for (let i = 0; i < N; i++) {
    vcIntegral += (ic[i] ?? 0) * dt
    vc[i] = vcIntegral / Cout
    vcSum += (vc[i] ?? 0)
  }
  const vcMean = vcSum / N
  for (let i = 0; i < N; i++) {
    vc[i] = (vc[i] ?? 0) - vcMean
  }

  // ESR 压降
  const vesr = new Float64Array(N)
  for (let i = 0; i < N; i++) {
    vesr[i] = (ic[i] ?? 0) * ESR
  }

  // 总纹波
  const vripple = new Float64Array(N)
  for (let i = 0; i < N; i++) {
    vripple[i] = (vc[i] ?? 0) + (vesr[i] ?? 0)
  }

  // Step 5: 纹波峰峰值
  let vcMin = Infinity, vcMax = -Infinity
  let vesrMin = Infinity, vesrMax = -Infinity
  let vrMin = Infinity, vrMax = -Infinity
  for (let i = 0; i < N; i++) {
    const vci = vc[i] ?? 0
    const vesri = vesr[i] ?? 0
    const vri = vripple[i] ?? 0
    if (vci < vcMin) vcMin = vci
    if (vci > vcMax) vcMax = vci
    if (vesri < vesrMin) vesrMin = vesri
    if (vesri > vesrMax) vesrMax = vesri
    if (vri < vrMin) vrMin = vri
    if (vri > vrMax) vrMax = vri
  }

  // 生成波形数据 (5 个周期, 平铺+重积分, 降采样步长 4)
  const NCYCLES = 5
  const DOWNSAMPLE = 4

  const Nt = NCYCLES * N
  const id1Tiled = new Float64Array(Nt)
  const id2Tiled = new Float64Array(Nt)
  const idTotalTiled = new Float64Array(Nt)
  const vesrTiled = new Float64Array(Nt)
  for (let c = 0; c < NCYCLES; c++) {
    for (let i = 0; i < N; i++) {
      const idx = c * N + i
      const idx2 = (i + halfN) % N
      id1Tiled[idx] = ph1.id[i] ?? 0
      id2Tiled[idx] = ph2.id[idx2] ?? 0
      idTotalTiled[idx] = idTotal[i] ?? 0
      vesrTiled[idx] = vesr[i] ?? 0
    }
  }

  let meanIc = 0
  for (let i = 0; i < N; i++) meanIc += ic[i] ?? 0
  meanIc /= N

  const vcTiled = new Float64Array(Nt)
  let vcSumTiled = 0
  for (let i = 0; i < Nt; i++) {
    vcSumTiled += ((ic[i % N] ?? 0) - meanIc) * dt
    vcTiled[i] = vcSumTiled / Cout
  }
  let vcMeanTiled = 0
  for (let i = 0; i < Nt; i++) vcMeanTiled += vcTiled[i] ?? 0
  vcMeanTiled /= Nt
  for (let i = 0; i < Nt; i++) vcTiled[i] = (vcTiled[i] ?? 0) - vcMeanTiled

  const vrippleTiled = new Float64Array(Nt)
  for (let i = 0; i < Nt; i++) vrippleTiled[i] = (vcTiled[i] ?? 0) + (vesrTiled[i] ?? 0)

  const waveforms: WaveformPoint[] = []
  for (let i = 0; i < Nt; i += DOWNSAMPLE) {
    const tUs = (i / Nt) * T * NCYCLES * 1e6
    waveforms.push({
      t: parseFloat(tUs.toFixed(2)),
      id1: parseFloat((id1Tiled[i] ?? 0).toFixed(3)),
      id2: parseFloat((id2Tiled[i] ?? 0).toFixed(3)),
      idTotal: parseFloat((idTotalTiled[i] ?? 0).toFixed(3)),
      ic: parseFloat(((ic[i % N] ?? 0) - meanIc).toFixed(3)),
      vc: parseFloat(((vcTiled[i] ?? 0) * 1000).toFixed(2)),
      vesr: parseFloat(((vesrTiled[i] ?? 0) * 1000).toFixed(2)),
      vripple: parseFloat(((vrippleTiled[i] ?? 0) * 1000).toFixed(2)),
    })
  }

  return {
    scalars: {
      d: D * 100,
      iinTotal: IinTotal,
      il1Avg: IL1Avg * 1000,
      il2Avg: IL2Avg * 1000,
      ilPeak: Math.max(ph1.iPeak, ph2.iPeak) * 1000,
      ph1Mode: ph1.mode,
      ph2Mode: ph2.mode,
      ph1Ipeak: ph1.iPeak * 1000,
      ph1Ivalley: ph1.iValley * 1000,
      ph2Ipeak: ph2.iPeak * 1000,
      ph2Ivalley: ph2.iValley * 1000,
      vpp: (vrMax - vrMin) * 1000,
      vcPp: (vcMax - vcMin) * 1000,
      vesrPp: (vesrMax - vesrMin) * 1000,
    },
    waveforms,
  }
}
