/**
 * Basic boost converter duty cycle, inductor current, and demo waveforms.
 *
 * Pure functions. No React. Formulas match the previous page implementation.
 */

export interface BoostInputs {
  vin: number   // V
  vout: number  // V
  f: number     // kHz
  l: number     // µH
  iout: number  // A
}

export interface BoostResults {
  duty: number     // %
  deltaIL: number  // mA
  ilAvg: number    // mA
  ilPeak: number   // mA
}

export interface BoostWaveformPoint {
  t: number
  il: number
  vsw: number
  vout: number
}

export function calculateBoost(inputs: BoostInputs): BoostResults {
  const { vin, vout, f, l, iout } = inputs
  const D = 1 - vin / vout
  const deltaIL = (vin * D) / (f * 1000 * l * 1e-6)
  const ilAvg = iout / (1 - D)
  const ilPeak = ilAvg + deltaIL / 2

  return {
    duty: D * 100,
    deltaIL: deltaIL * 1000,
    ilAvg: ilAvg * 1000,
    ilPeak: ilPeak * 1000,
  }
}

export function generateBoostWaveforms(
  vin: number,
  vout: number,
  f: number,
  l: number,
  iout: number,
  duty: number,
): BoostWaveformPoint[] {
  const D = duty / 100
  const Ts = 1 / (f * 1000) // 开关周期 (s)
  const deltaIL = (vin * D) / (f * 1000 * l * 1e-6)
  const ilAvg = iout / (1 - D)
  const ilMin = ilAvg - deltaIL / 2
  const ilPeak = ilAvg + deltaIL / 2

  const points = 200
  const data: BoostWaveformPoint[] = []

  for (let i = 0; i < points; i++) {
    const t = (i / points) * Ts * 1e6 // µs
    const tNorm = t / (Ts * 1e6) // 0~1

    // 电感电流：三角纹波
    let il: number
    if (tNorm < D) {
      il = ilMin + (deltaIL / D) * tNorm
    } else {
      il = ilPeak - (deltaIL / (1 - D)) * (tNorm - D)
    }

    // SW 节点电压：方波
    const vsw = tNorm < D ? 0 : vout

    // 输出电压纹波：简化正弦近似
    const vripple = 0.02 * vout * Math.sin(2 * Math.PI * tNorm * 2)

    data.push({
      t: parseFloat(t.toFixed(2)),
      il: parseFloat((il * 1000).toFixed(1)),
      vsw: parseFloat(vsw.toFixed(1)),
      vout: parseFloat((vout + vripple).toFixed(2)),
    })
  }

  return data
}
