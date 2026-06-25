import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { Zap, Activity, Calculator, ArrowLeft, Waves } from "lucide-react"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { FlickeringGrid } from "@/components/ui/flickering-grid"
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text"
import { NumberTicker } from "@/components/ui/number-ticker"
import { MagicCard } from "@/components/ui/magic-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"

// 弹簧配置
const fastSpring = { stiffness: 600, damping: 40 }

// ─── 输入参数类型 ───
interface RippleInputs {
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
interface RippleScalars {
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
interface WaveformPoint {
  t: number       // µs
  id1: number     // A
  id2: number     // A
  idTotal: number // A
  ic: number      // A
  vc: number      // mV
  vesr: number    // mV
  vripple: number // mV
}

interface RippleResult {
  scalars: RippleScalars
  waveforms: WaveformPoint[]
}

// ─── Chart 配置 ───
const currentChartConfig = {
  id1: { label: "Phase 1 Id (A)", color: "#3b82f6" },
  id2: { label: "Phase 2 Id (A)", color: "#f97316" },
  idTotal: { label: "Total Id (A)", color: "#22c55e" },
} satisfies ChartConfig

const capRippleChartConfig = {
  vc: { label: "Cap Ripple (mV)", color: "#3b82f6" },
  vesr: { label: "ESR Ripple (mV)", color: "#ef4444" },
} satisfies ChartConfig

const totalRippleChartConfig = {
  vripple: { label: "Total Ripple (mV)", color: "#a855f7" },
} satisfies ChartConfig

// ─── 核心计算函数 ───
function calculateBoostRipple(inputs: RippleInputs): RippleResult {
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
    idTotal[i] = ph1.id[i] + ph2.id[idx2]
  }

  // Step 4: 电容纹波
  const ic = new Float64Array(N)
  for (let i = 0; i < N; i++) {
    ic[i] = idTotal[i] - iout
  }

  // 电容电压纹波 (积分后减均值)
  const vc = new Float64Array(N)
  let vcSum = 0
  let vcIntegral = 0
  for (let i = 0; i < N; i++) {
    vcIntegral += ic[i] * dt
    vc[i] = vcIntegral / Cout
    vcSum += vc[i]
  }
  const vcMean = vcSum / N
  for (let i = 0; i < N; i++) {
    vc[i] -= vcMean
  }

  // ESR 压降
  const vesr = new Float64Array(N)
  for (let i = 0; i < N; i++) {
    vesr[i] = ic[i] * ESR
  }

  // 总纹波
  const vripple = new Float64Array(N)
  for (let i = 0; i < N; i++) {
    vripple[i] = vc[i] + vesr[i]
  }

  // Step 5: 纹波峰峰值
  let vcMin = Infinity, vcMax = -Infinity
  let vesrMin = Infinity, vesrMax = -Infinity
  let vrMin = Infinity, vrMax = -Infinity
  for (let i = 0; i < N; i++) {
    if (vc[i] < vcMin) vcMin = vc[i]
    if (vc[i] > vcMax) vcMax = vc[i]
    if (vesr[i] < vesrMin) vesrMin = vesr[i]
    if (vesr[i] > vesrMax) vesrMax = vesr[i]
    if (vripple[i] < vrMin) vrMin = vripple[i]
    if (vripple[i] > vrMax) vrMax = vripple[i]
  }

  // 生成波形数据 (5 个周期, 平铺+重积分, 降采样步长 4)
  const NCYCLES = 5
  const DOWNSAMPLE = 4

  // 平铺 Id1, Id2, Id_total, Vesr 到 5 个周期
  const Nt = NCYCLES * N
  const id1Tiled = new Float64Array(Nt)
  const id2Tiled = new Float64Array(Nt)
  const idTotalTiled = new Float64Array(Nt)
  const vesrTiled = new Float64Array(Nt)
  for (let c = 0; c < NCYCLES; c++) {
    for (let i = 0; i < N; i++) {
      const idx = c * N + i
      const idx2 = (i + halfN) % N
      id1Tiled[idx] = ph1.id[i]
      id2Tiled[idx] = ph2.id[idx2]
      idTotalTiled[idx] = idTotal[i]
      vesrTiled[idx] = vesr[i]
    }
  }

  // Ic 去直流后平铺，再重积分 Vc（参考代码做法）
  let meanIc = 0
  for (let i = 0; i < N; i++) meanIc += ic[i]
  meanIc /= N

  const vcTiled = new Float64Array(Nt)
  let vcSumTiled = 0
  for (let i = 0; i < Nt; i++) {
    vcSumTiled += (ic[i % N] - meanIc) * dt
    vcTiled[i] = vcSumTiled / Cout
  }
  let vcMeanTiled = 0
  for (let i = 0; i < Nt; i++) vcMeanTiled += vcTiled[i]
  vcMeanTiled /= Nt
  for (let i = 0; i < Nt; i++) vcTiled[i] -= vcMeanTiled

  const vrippleTiled = new Float64Array(Nt)
  for (let i = 0; i < Nt; i++) vrippleTiled[i] = vcTiled[i] + vesrTiled[i]

  // 降采样输出
  const waveforms: WaveformPoint[] = []
  for (let i = 0; i < Nt; i += DOWNSAMPLE) {
    const tUs = (i / Nt) * T * NCYCLES * 1e6
    waveforms.push({
      t: parseFloat(tUs.toFixed(2)),
      id1: parseFloat(id1Tiled[i].toFixed(3)),
      id2: parseFloat(id2Tiled[i].toFixed(3)),
      idTotal: parseFloat(idTotalTiled[i].toFixed(3)),
      ic: parseFloat((ic[i % N] - meanIc).toFixed(3)),
      vc: parseFloat((vcTiled[i] * 1000).toFixed(2)),
      vesr: parseFloat((vesrTiled[i] * 1000).toFixed(2)),
      vripple: parseFloat((vrippleTiled[i] * 1000).toFixed(2)),
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

// ─── 主组件 ───
export default function BoostRippleCalculator() {
  // 输入参数
  const [vin, setVin] = useState(12)
  const [vout, setVout] = useState(24)
  const [iout, setIout] = useState(3)
  const [fsw, setFsw] = useState(300)
  const [eta, setEta] = useState(0.92)
  const [l, setL] = useState(10)
  const [cout, setCout] = useState(47)
  const [esr, setEsr] = useState(15)
  const [vd, setVd] = useState(0.5)
  const [alpha, setAlpha] = useState(0.5)

  // 计算结果
  const [result, setResult] = useState<RippleResult | null>(null)

  const calculate = () => {
    const r = calculateBoostRipple({
      vin, vout, iout, fsw, eta, l, cout, esr, vd, alpha,
    })
    setResult(r)
  }

  // 波形数据（直接使用 result 中的 waveforms）
  const waveformData = useMemo(() => {
    if (!result) return []
    return result.waveforms
  }, [result])

  return (
    <div className="relative min-h-screen bg-background">
      {/* 背景动画网格 */}
      <div className="fixed inset-0 z-0">
        <FlickeringGrid
          color="var(--foreground)"
          maxOpacity={0.03}
          flickerChance={0.04}
          squareSize={3}
          gridGap={6}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-16">
        {/* 返回链接 */}
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </div>

        {/* 头部 */}
        <div className="relative mb-12 text-center">
          <div className="absolute top-0 right-0">
            <AnimatedThemeToggler />
          </div>
          <AnimatedShinyText className="mb-3 text-xs tracking-widest uppercase">
            Power Electronics Calculator
          </AnimatedShinyText>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">
            Boost Output Ripple
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
            Two-phase interleaved async Boost output ripple time-domain simulation.
            Auto CCM/DCM detection, 180° phase shift.
          </p>
        </div>

        {/* 主内容区 - 两栏布局 */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* 左侧：输入区域 */}
          <MagicCard className="p-6" gradientColor="var(--color-muted)">
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <Calculator className="size-5" />
                <h2 className="text-lg font-semibold">Input Parameters</h2>
              </div>

              {/* Vin */}
              <div className="space-y-1.5">
                <Label htmlFor="vin">Input Voltage (V)</Label>
                <Input id="vin" type="number" value={vin} onChange={e => setVin(Number(e.target.value))} step={0.1} />
              </div>

              {/* Vout */}
              <div className="space-y-1.5">
                <Label htmlFor="vout">Output Voltage (V)</Label>
                <Input id="vout" type="number" value={vout} onChange={e => setVout(Number(e.target.value))} step={0.1} />
              </div>

              {/* Iout */}
              <div className="space-y-1.5">
                <Label htmlFor="iout">Output Current (A)</Label>
                <Input id="iout" type="number" value={iout} onChange={e => setIout(Number(e.target.value))} step={0.1} />
              </div>

              {/* fsw */}
              <div className="space-y-1.5">
                <Label htmlFor="fsw">Switching Frequency (kHz)</Label>
                <Input id="fsw" type="number" value={fsw} onChange={e => setFsw(Number(e.target.value))} step={10} />
              </div>

              {/* eta */}
              <div className="space-y-1.5">
                <Label htmlFor="eta">Efficiency (η)</Label>
                <Input id="eta" type="number" value={eta} onChange={e => setEta(Number(e.target.value))} step={0.01} min={0.5} max={1} />
              </div>

              {/* L */}
              <div className="space-y-1.5">
                <Label htmlFor="l">Inductance (µH)</Label>
                <Input id="l" type="number" value={l} onChange={e => setL(Number(e.target.value))} step={0.1} />
              </div>

              {/* Cout */}
              <div className="space-y-1.5">
                <Label htmlFor="cout">Output Capacitance (µF)</Label>
                <Input id="cout" type="number" value={cout} onChange={e => setCout(Number(e.target.value))} step={1} />
              </div>

              {/* ESR */}
              <div className="space-y-1.5">
                <Label htmlFor="esr">Capacitor ESR (mΩ)</Label>
                <Input id="esr" type="number" value={esr} onChange={e => setEsr(Number(e.target.value))} step={1} />
              </div>

              {/* Vd */}
              <div className="space-y-1.5">
                <Label htmlFor="vd">Diode Forward Voltage (V)</Label>
                <Input id="vd" type="number" value={vd} onChange={e => setVd(Number(e.target.value))} step={0.05} />
              </div>

              {/* alpha */}
              <div className="space-y-1.5">
                <Label htmlFor="alpha">Phase 1 Current Ratio (α)</Label>
                <Input id="alpha" type="number" value={alpha} onChange={e => setAlpha(Number(e.target.value))} step={0.05} min={0.1} max={0.9} />
              </div>

              {/* 计算按钮 */}
              <button
                className="w-full bg-foreground text-background py-3 px-6 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                onClick={calculate}
              >
                <Zap className="size-4" />
                Calculate
              </button>
            </div>
          </MagicCard>

          {/* 右侧：输出区域 */}
          <MagicCard className="p-6" gradientColor="var(--color-muted)">
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <Activity className="size-5" />
                <h2 className="text-lg font-semibold">Results</h2>
              </div>

              {result ? (
                <div className="space-y-4">
                  {/* Duty Cycle */}
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Duty Cycle</Label>
                    <div className="flex items-baseline gap-1">
                      <NumberTicker value={result.scalars.d} decimalPlaces={2} className="text-3xl font-bold tracking-tight" springConfig={fastSpring} />
                      <span className="text-lg text-muted-foreground">%</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Iin_total */}
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">Total Input Current</Label>
                    <div className="flex items-baseline gap-1">
                      <NumberTicker value={result.scalars.iinTotal} decimalPlaces={2} className="text-3xl font-bold tracking-tight" springConfig={fastSpring} />
                      <span className="text-lg text-muted-foreground">A</span>
                    </div>
                  </div>

                  <Separator />

                  {/* IL1_avg / IL2_avg */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Phase 1 Avg (mA)</Label>
                      <div className="flex items-baseline gap-1">
                        <NumberTicker value={result.scalars.il1Avg} decimalPlaces={1} className="text-2xl font-bold tracking-tight" springConfig={fastSpring} />
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${result.scalars.ph1Mode === "CCM" ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"}`}>
                        {result.scalars.ph1Mode}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">Phase 2 Avg (mA)</Label>
                      <div className="flex items-baseline gap-1">
                        <NumberTicker value={result.scalars.il2Avg} decimalPlaces={1} className="text-2xl font-bold tracking-tight" springConfig={fastSpring} />
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${result.scalars.ph2Mode === "CCM" ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"}`}>
                        {result.scalars.ph2Mode}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  {/* Peak / Valley 电流 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Phase 1</Label>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div>Peak: <span className="font-mono text-foreground">{result.scalars.ph1Ipeak.toFixed(1)} mA</span></div>
                        <div>Valley: <span className="font-mono text-foreground">{result.scalars.ph1Ivalley.toFixed(1)} mA</span></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Phase 2</Label>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div>Peak: <span className="font-mono text-foreground">{result.scalars.ph2Ipeak.toFixed(1)} mA</span></div>
                        <div>Valley: <span className="font-mono text-foreground">{result.scalars.ph2Ivalley.toFixed(1)} mA</span></div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* 纹波峰峰值 */}
                  <div className="space-y-3">
                    <Label className="text-xs font-medium">Output Ripple</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">Total Vpp</Label>
                        <div className="flex items-baseline gap-0.5">
                          <NumberTicker value={result.scalars.vpp} decimalPlaces={1} className="text-2xl font-bold tracking-tight" springConfig={fastSpring} />
                          <span className="text-sm text-muted-foreground">mV</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">Cap Vpp</Label>
                        <div className="flex items-baseline gap-0.5">
                          <NumberTicker value={result.scalars.vcPp} decimalPlaces={1} className="text-2xl font-bold tracking-tight" springConfig={fastSpring} />
                          <span className="text-sm text-muted-foreground">mV</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">ESR Vpp</Label>
                        <div className="flex items-baseline gap-0.5">
                          <NumberTicker value={result.scalars.vesrPp} decimalPlaces={1} className="text-2xl font-bold tracking-tight" springConfig={fastSpring} />
                          <span className="text-sm text-muted-foreground">mV</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                  <p>Click "Calculate" to see results</p>
                </div>
              )}
            </div>
          </MagicCard>
        </div>

        {/* 波形展示区 */}
        {result && waveformData.length > 0 && (
          <div className="mt-6 space-y-6">
            {/* 电流交错波形 */}
            <MagicCard className="p-6" gradientColor="var(--color-muted)">
              <div className="mb-4 flex items-center gap-2">
                <Waves className="size-5" />
                <h2 className="text-lg font-semibold">Interleaved Inductor Currents</h2>
              </div>
              <ChartContainer config={currentChartConfig} className="h-[250px] w-full">
                <LineChart data={waveformData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} tickFormatter={v => `${v}µs`} label={{ value: "Time (µs)", position: "insideBottom", offset: -2, style: { fontSize: 10 } }} />
                  <YAxis tick={{ fontSize: 10 }} label={{ value: "Current (A)", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="id1" stroke="var(--color-id1)" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="id2" stroke="var(--color-id2)" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="idTotal" stroke="var(--color-idTotal)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </MagicCard>

            {/* 电压纹波分量 + 总纹波 */}
            <div className="grid gap-6 md:grid-cols-2">
              <MagicCard className="p-6" gradientColor="var(--color-muted)">
                <div className="mb-4 flex items-center gap-2">
                  <Waves className="size-5" />
                  <h2 className="text-sm font-semibold">Capacitor & ESR Ripple</h2>
                </div>
                <ChartContainer config={capRippleChartConfig} className="h-[200px] w-full">
                  <LineChart data={waveformData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="t" tick={{ fontSize: 10 }} tickFormatter={v => `${v}µs`} />
                    <YAxis tick={{ fontSize: 10 }} label={{ value: "mV", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="vc" stroke="var(--color-vc)" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="vesr" stroke="var(--color-vesr)" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ChartContainer>
              </MagicCard>

              <MagicCard className="p-6" gradientColor="var(--color-muted)">
                <div className="mb-4 flex items-center gap-2">
                  <Waves className="size-5" />
                  <h2 className="text-sm font-semibold">Total Output Ripple</h2>
                </div>
                <ChartContainer config={totalRippleChartConfig} className="h-[200px] w-full">
                  <LineChart data={waveformData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="t" tick={{ fontSize: 10 }} tickFormatter={v => `${v}µs`} />
                    <YAxis tick={{ fontSize: 10 }} label={{ value: "mV", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="vripple" stroke="var(--color-vripple)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartContainer>
              </MagicCard>
            </div>
          </div>
        )}

        {/* 页脚 */}
        <div className="mt-16 text-center text-xs text-muted-foreground">
          Built with{" "}
          <a
            href="https://magicui.design"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Magic UI
          </a>
        </div>
      </div>
    </div>
  )
}
