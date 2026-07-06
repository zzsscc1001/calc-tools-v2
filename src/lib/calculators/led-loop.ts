/**
 * LED 驱动环路补偿计算核心
 *
 * 此模块为纯函数，不依赖任何 React 或 UI 库。
 * 可独立进行单元测试。
 */

// ─── 输入参数类型 ───
export interface LoopInputs {
  vin: number        // V
  vo: number         // V
  io: number         // A
  nLed: number       // 颗
  l: number          // µH
  co: number         // µF
  esr: number        // mΩ
  rPer: number       // Ω/颗
  rs: number         // mΩ
  cs: number         // µF
  ri: number         // V/A
  gm: number         // µA/V
  rc: number         // kΩ
  cc: number         // nF
  fsw: number        // kHz（保留，用于未来扩展）
  td: number         // ns
}

// ─── 标量结果 ───
export interface LoopScalars {
  d: number
  kSys: number
  rLed: number
  wzCz: number     // rad/s
  wzBz: number
  wzRhp: number
  wzDel: number
  wpP1: number
  wpBp: number
  wpDel: number
  fc: number       // Hz
  phaseMargin: number // deg
  phaseAtFc: number   // deg
}

// ─── Bode 数据点 ───
export interface BodePoint {
  f: number        // Hz (log scale)
  gainDb: number
  phaseDeg: number
}

export interface LoopResult {
  scalars: LoopScalars
  bode: BodePoint[]
}

// ─── 复数运算 ───
interface Complex { re: number; im: number }

function cmul(a: Complex, b: Complex): Complex {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }
}

function cdiv(a: Complex, b: Complex): Complex {
  const d = b.re * b.re + b.im * b.im
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }
}

function cabs(a: Complex): number {
  return Math.sqrt(a.re * a.re + a.im * a.im)
}

function cangle(a: Complex): number {
  return Math.atan2(a.im, a.re)
}

/**
 * 计算 LED 驱动 Boost 拓扑的环路补偿参数与 Bode 图数据。
 *
 * @throws {Error} 当输入参数违反物理约束时抛出错误
 */
export function calculateLedLoop(inputs: LoopInputs): LoopResult {
  const { vin, vo, io, nLed, l, co, esr, rPer, rs, cs, ri, gm, rc, cc, td } = inputs

  // 单位转换
  const L = l * 1e-6
  const Co = co * 1e-6
  const ESR = esr * 1e-3
  const Rs = rs * 1e-3
  const Cs = cs * 1e-6
  const gmA = gm * 1e-6
  const Rc = rc * 1e3
  const Cc = cc * 1e-9
  const tdS = td * 1e-9

  // Step 1: 基本量
  const D = 1 - vin / vo
  const R_LED = nLed * rPer

  // Step 2: 零极点频率
  const K_sys = gmA * vin * Rs / (ri * Cc * (vo + io * R_LED))

  const wz_cz = 1 / (Rc * Cc)
  const wz_bz = 1 / (R_LED * Co)
  const wz_rhp = Math.pow(1 - D, 2) * vo / (L * io)
  const wz_del = 2 / tdS

  const wp_p1 = (vo + io * R_LED) / (vo * (R_LED + ESR) * Co)
  const wp_bp = 1 / (Rs * Cs)
  const wp_del = 2 / tdS

  // Step 3 & 4: 传递函数求值 + Bode 图
  const PTS = 500
  const fMin = 100
  const fMax = 5e6
  const bode: BodePoint[] = []

  function evalT(omega: number): Complex {
    // 零点
    const n1: Complex = { re: 1, im: omega / wz_cz }
    const n2: Complex = { re: 1, im: omega / wz_bz }
    const n3: Complex = { re: 1, im: -omega / wz_rhp }   // RHP 零点
    const n4: Complex = { re: 1, im: -omega / wz_del }   // 延迟零点
    // 极点
    const d1: Complex = { re: 1, im: omega / wp_p1 }
    const d2: Complex = { re: 1, im: omega / wp_bp }
    const d3: Complex = { re: 1, im: omega / wp_del }

    const num = cmul(cmul(cmul(n1, n2), n3), n4)
    const den = cmul(cmul(d1, d2), d3)

    // K_factor = -K_sys / (jω)
    const kFactor: Complex = { re: 0, im: -K_sys / omega }

    return cdiv(cmul(kFactor, num), den)
  }

  for (let i = 0; i <= PTS; i++) {
    const logF = Math.log10(fMin) + (Math.log10(fMax) - Math.log10(fMin)) * i / PTS
    const f = Math.pow(10, logF)
    const omega = 2 * Math.PI * f
    const Tf = evalT(omega)
    const gainDb = 20 * Math.log10(cabs(Tf))
    const phaseDeg = cangle(Tf) * 180 / Math.PI
    bode.push({ f, gainDb, phaseDeg })
  }

  // Step 5: 穿越频率和相位裕度 (二分搜索)
  let fLow = 10
  let fHigh = 1e7
  for (let iter = 0; iter < 60; iter++) {
    const fMid = Math.sqrt(fLow * fHigh)
    const omegaMid = 2 * Math.PI * fMid
    const Tf = evalT(omegaMid)
    const gainDb = 20 * Math.log10(cabs(Tf))
    if (gainDb > 0) fLow = fMid
    else fHigh = fMid
  }
  const fc = Math.sqrt(fLow * fHigh)
  const omegaFc = 2 * Math.PI * fc
  const TFc = evalT(omegaFc)
  const phaseAtFc = cangle(TFc) * 180 / Math.PI
  const phaseMargin = 180 + phaseAtFc

  return {
    scalars: {
      d: D,
      kSys: K_sys,
      rLed: R_LED,
      wzCz: wz_cz,
      wzBz: wz_bz,
      wzRhp: wz_rhp,
      wzDel: wz_del,
      wpP1: wp_p1,
      wpBp: wp_bp,
      wpDel: wp_del,
      fc,
      phaseMargin,
      phaseAtFc,
    },
    bode,
  }
}
