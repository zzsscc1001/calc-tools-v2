import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { Zap, Activity, Calculator, ArrowLeft, Waves } from "lucide-react"
import katex from "katex"
import "katex/dist/katex.min.css"
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
  ReferenceLine,
} from "recharts"

// 弹簧配置
const fastSpring = { stiffness: 600, damping: 40 }

// ─── 输入参数类型 ───
interface LoopInputs {
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
  fsw: number        // kHz
  td: number         // ns
}

// ─── 标量结果 ───
interface LoopScalars {
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
interface BodePoint {
  f: number        // Hz (log scale)
  gainDb: number
  phaseDeg: number
}

interface LoopResult {
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

// ─── Chart 配置 ───
const gainChartConfig = {
  gain: { label: "Gain (dB)", color: "#3b82f6" },
} satisfies ChartConfig

const phaseChartConfig = {
  phase: { label: "Phase (°)", color: "#f97316" },
} satisfies ChartConfig

// ─── 核心计算函数 ───
function calculateLedLoop(inputs: LoopInputs): LoopResult {
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

    let num = cmul(cmul(cmul(n1, n2), n3), n4)
    let den = cmul(cmul(d1, d2), d3)

    // K_factor = -K_sys / (jω) = (0, -K_sys/ω)
    // 因为 1/(jω) = -j/ω = (0, -1/ω)
    const kFactor: Complex = { re: 0, im: -K_sys / omega }

    return cdiv(cmul(kFactor, num), den)
  }

  for (let i = 0; i <= PTS; i++) {
    const logF = Math.log10(fMin) + (Math.log10(fMax) - Math.log10(fMin)) * i / PTS
    const f = Math.pow(10, logF)
    const omega = 2 * Math.PI * f
    const T = evalT(omega)
    const gainDb = 20 * Math.log10(cabs(T))
    const phaseDeg = cangle(T) * 180 / Math.PI
    bode.push({ f, gainDb, phaseDeg })
  }

  // Step 5: 穿越频率和相位裕度 (二分搜索)
  let fLow = 10
  let fHigh = 1e7
  for (let iter = 0; iter < 60; iter++) {
    const fMid = Math.sqrt(fLow * fHigh)
    const omegaMid = 2 * Math.PI * fMid
    const T = evalT(omegaMid)
    const gainDb = 20 * Math.log10(cabs(T))
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

// ─── 格式化频率 ───
function formatFreq(hz: number): string {
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(2)} MHz`
  if (hz >= 1e3) return `${(hz / 1e3).toFixed(1)} kHz`
  return `${hz.toFixed(1)} Hz`
}

// ─── 格式化角频率为 Hz ───
function omegaToHz(rad_s: number): string {
  return formatFreq(rad_s / (2 * Math.PI))
}

// ─── KaTeX 渲染辅助 ───
function MathBlock({ math: tex }: { math: string }) {
  const html = katex.renderToString(tex, { displayMode: true, throwOnError: false })
  return <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />
}

// ─── 主组件 ───
export default function LedLoopCalculator() {
  // 输入参数
  const [vin, setVin] = useState(9)
  const [vo, setVo] = useState(24)
  const [io, setIo] = useState(1)
  const [nLed, setNLed] = useState(8)
  const [l, setL] = useState(22)
  const [co, setCo] = useState(5)
  const [esr, setEsr] = useState(10)
  const [rPer, setRPer] = useState(0.25)
  const [rs, setRs] = useState(200)
  const [cs, setCs] = useState(10)
  const [ri, setRi] = useState(0.32)
  const [gm, setGm] = useState(265)
  const [rc, setRc] = useState(1)
  const [cc, setCc] = useState(10)
  const [fsw, setFsw] = useState(400)
  const [td, setTd] = useState(400)

  // 计算结果
  const [result, setResult] = useState<LoopResult | null>(null)

  const calculate = () => {
    const r = calculateLedLoop({
      vin, vo, io, nLed, l, co, esr, rPer, rs, cs, ri, gm, rc, cc, fsw, td,
    })
    setResult(r)
  }

  // Bode 图数据
  const bodeData = useMemo(() => {
    if (!result) return []
    return result.bode.map(p => ({
      logF: Math.log10(p.f),
      f: p.f,
      gain: parseFloat(p.gainDb.toFixed(2)),
      phase: parseFloat(p.phaseDeg.toFixed(2)),
    }))
  }, [result])

  // 相位裕度颜色
  function pmColor(pm: number): string {
    if (pm >= 45) return "text-green-600 dark:text-green-400"
    if (pm >= 30) return "text-yellow-600 dark:text-yellow-400"
    return "text-red-600 dark:text-red-400"
  }

  function pmBg(pm: number): string {
    if (pm >= 45) return "bg-green-500/15"
    if (pm >= 30) return "bg-yellow-500/15"
    return "bg-red-500/15"
  }

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

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-16">
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
            LED Loop Compensation
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
            Boost topology LED driver loop compensation analysis.
            Pole-zero calculation, Bode plot, crossover frequency and phase margin.
          </p>
        </div>

        {/* 主内容区 - 两栏布局 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 左侧：输入区域 */}
          <MagicCard className="p-6" gradientColor="var(--color-muted)">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calculator className="size-5" />
                <h2 className="text-lg font-semibold">Input Parameters</h2>
              </div>

              {/* Power Stage */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Power Stage</Label>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="vin" className="text-xs">Vin (V)</Label>
                    <Input id="vin" type="number" value={vin} onChange={e => setVin(Number(e.target.value))} step={0.1} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="vo" className="text-xs">Vo (V)</Label>
                    <Input id="vo" type="number" value={vo} onChange={e => setVo(Number(e.target.value))} step={0.1} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="io" className="text-xs">Io (A)</Label>
                    <Input id="io" type="number" value={io} onChange={e => setIo(Number(e.target.value))} step={0.1} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="nLed" className="text-xs">n_led (颗)</Label>
                    <Input id="nLed" type="number" value={nLed} onChange={e => setNLed(Number(e.target.value))} step={1} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="l" className="text-xs">L (µH)</Label>
                    <Input id="l" type="number" value={l} onChange={e => setL(Number(e.target.value))} step={0.1} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="co" className="text-xs">Co (µF)</Label>
                    <Input id="co" type="number" value={co} onChange={e => setCo(Number(e.target.value))} step={0.1} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="esr" className="text-xs">ESR (mΩ)</Label>
                    <Input id="esr" type="number" value={esr} onChange={e => setEsr(Number(e.target.value))} step={1} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rPer" className="text-xs">r_per (Ω/颗)</Label>
                    <Input id="rPer" type="number" value={rPer} onChange={e => setRPer(Number(e.target.value))} step={0.01} />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Current Sensing */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Sensing</Label>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="rs" className="text-xs">Rs (mΩ)</Label>
                    <Input id="rs" type="number" value={rs} onChange={e => setRs(Number(e.target.value))} step={1} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cs" className="text-xs">Cs (µF)</Label>
                    <Input id="cs" type="number" value={cs} onChange={e => setCs(Number(e.target.value))} step={0.1} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ri" className="text-xs">Ri (V/A)</Label>
                    <Input id="ri" type="number" value={ri} onChange={e => setRi(Number(e.target.value))} step={0.01} />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Compensation */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Compensation</Label>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="gm" className="text-xs">gm (µA/V)</Label>
                    <Input id="gm" type="number" value={gm} onChange={e => setGm(Number(e.target.value))} step={1} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rc" className="text-xs">Rc (kΩ)</Label>
                    <Input id="rc" type="number" value={rc} onChange={e => setRc(Number(e.target.value))} step={0.1} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cc" className="text-xs">Cc (nF)</Label>
                    <Input id="cc" type="number" value={cc} onChange={e => setCc(Number(e.target.value))} step={0.1} />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Timing */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Timing</Label>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="fsw" className="text-xs">fsw (kHz)</Label>
                    <Input id="fsw" type="number" value={fsw} onChange={e => setFsw(Number(e.target.value))} step={10} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="td" className="text-xs">td (ns)</Label>
                    <Input id="td" type="number" value={td} onChange={e => setTd(Number(e.target.value))} step={10} />
                  </div>
                </div>
              </div>

              {/* 计算按钮 */}
              <button
                className="w-full bg-foreground text-background py-3 px-6 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                onClick={calculate}
              >
                <Zap className="size-4" />
                Analyze
              </button>
            </div>
          </MagicCard>

          {/* 右侧：输出区域 */}
          <MagicCard className="p-6" gradientColor="var(--color-muted)">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Activity className="size-5" />
                <h2 className="text-lg font-semibold">Results</h2>
              </div>

              {result ? (
                <div className="space-y-4">
                  {/* 穿越频率 + 相位裕度 — 大卡片 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-border p-4 text-center">
                      <Label className="text-muted-foreground text-xs">Crossover Freq</Label>
                      <div className="mt-2">
                        <span className="text-2xl font-bold tracking-tight font-mono">
                          {formatFreq(result.scalars.fc)}
                        </span>
                      </div>
                    </div>
                    <div className={`rounded-lg p-4 text-center ${pmBg(result.scalars.phaseMargin)}`}>
                      <Label className="text-muted-foreground text-xs">Phase Margin</Label>
                      <div className="mt-2 flex items-baseline justify-center gap-1">
                        <NumberTicker
                          value={result.scalars.phaseMargin}
                          decimalPlaces={1}
                          className={`text-2xl font-bold tracking-tight ${pmColor(result.scalars.phaseMargin)}`}
                          springConfig={fastSpring}
                        />
                        <span className="text-lg text-muted-foreground">°</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* 基本量 */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">D</Label>
                      <div className="font-mono text-sm font-medium">{(result.scalars.d * 100).toFixed(2)}%</div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">K_sys</Label>
                      <div className="font-mono text-sm font-medium">{result.scalars.kSys.toExponential(2)}</div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">R_LED</Label>
                      <div className="font-mono text-sm font-medium">{result.scalars.rLed.toFixed(2)} Ω</div>
                    </div>
                  </div>

                  <Separator />

                  {/* 零极点表 */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Poles & Zeros</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {/* 零点 */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-blue-500 font-medium">Zeros</Label>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">ω_cz (EA)</span>
                            <span className="font-mono">{omegaToHz(result.scalars.wzCz)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">ω_bz (LED)</span>
                            <span className="font-mono">{omegaToHz(result.scalars.wzBz)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">ω_RHP</span>
                            <span className="font-mono">{omegaToHz(result.scalars.wzRhp)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">ω_del</span>
                            <span className="font-mono">{omegaToHz(result.scalars.wzDel)}</span>
                          </div>
                        </div>
                      </div>
                      {/* 极点 */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-red-500 font-medium">Poles</Label>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">ω_p1 (load)</span>
                            <span className="font-mono">{omegaToHz(result.scalars.wpP1)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">ω_bp (sense)</span>
                            <span className="font-mono">{omegaToHz(result.scalars.wpBp)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">ω_del</span>
                            <span className="font-mono">{omegaToHz(result.scalars.wpDel)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                  <p>Click "Analyze" to see results</p>
                </div>
              )}
            </div>
          </MagicCard>
        </div>

        {/* Bode 图 */}
        {result && bodeData.length > 0 && (
          <div className="mt-6 space-y-6">
            {/* 增益 Bode 图 */}
            <MagicCard className="p-6" gradientColor="var(--color-muted)">
              <div className="mb-4 flex items-center gap-2">
                <Waves className="size-5" />
                <h2 className="text-lg font-semibold">Gain Bode Plot</h2>
                <span className="text-xs text-muted-foreground font-mono ml-auto">
                  fc = {formatFreq(result.scalars.fc)}
                </span>
              </div>
              <ChartContainer config={gainChartConfig} className="h-[300px] w-full">
                <LineChart data={bodeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="logF"
                    type="number"
                    domain={[2, 6.7]}
                    tick={{ fontSize: 10 }}
                    tickFormatter={v => {
                      if (v >= 6) return `${Math.pow(10, v)/1e6}M`
                      if (v >= 3) return `${Math.pow(10, v)/1e3}k`
                      return `${Math.pow(10, v)}`
                    }}
                    ticks={[2, 3, 4, 5, 6]}
                    label={{ value: "Frequency (Hz)", position: "insideBottom", offset: -2, style: { fontSize: 10 } }}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    label={{ value: "Gain (dB)", angle: -90, position: "insideLeft", style: { fontSize: 10 } }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ReferenceLine y={0} stroke="var(--color-border)" strokeDasharray="6 4" strokeWidth={1} />
                  <Line
                    type="monotone"
                    dataKey="gain"
                    stroke="var(--color-gain)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </MagicCard>

            {/* 相位 Bode 图 */}
            <MagicCard className="p-6" gradientColor="var(--color-muted)">
              <div className="mb-4 flex items-center gap-2">
                <Waves className="size-5" />
                <h2 className="text-lg font-semibold">Phase Bode Plot</h2>
                <span className={`text-xs font-mono ml-auto px-2 py-0.5 rounded ${pmBg(result.scalars.phaseMargin)} ${pmColor(result.scalars.phaseMargin)}`}>
                  PM = {result.scalars.phaseMargin.toFixed(1)}°
                </span>
              </div>
              <ChartContainer config={phaseChartConfig} className="h-[300px] w-full">
                <LineChart data={bodeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="logF"
                    type="number"
                    domain={[2, 6.7]}
                    tick={{ fontSize: 10 }}
                    tickFormatter={v => {
                      if (v >= 6) return `${Math.pow(10, v)/1e6}M`
                      if (v >= 3) return `${Math.pow(10, v)/1e3}k`
                      return `${Math.pow(10, v)}`
                    }}
                    ticks={[2, 3, 4, 5, 6]}
                    label={{ value: "Frequency (Hz)", position: "insideBottom", offset: -2, style: { fontSize: 10 } }}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    domain={[-270, 90]}
                    label={{ value: "Phase (°)", angle: -90, position: "insideLeft", style: { fontSize: 10 } }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ReferenceLine y={-180} stroke="var(--color-border)" strokeDasharray="6 4" strokeWidth={1} />
                  <Line
                    type="monotone"
                    dataKey="phase"
                    stroke="var(--color-phase)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </MagicCard>

            {/* 传递函数参考 */}
            <MagicCard className="p-6" gradientColor="var(--color-muted)">
              <div className="mb-4">
                <Label className="text-xs font-medium">Transfer Function Reference</Label>
              </div>
              <div className="space-y-4 text-sm">
                <div>
                  <MathBlock math="T(s) = \frac{K_{sys}}{s} \cdot \frac{\left(1+\frac{s}{\omega_{cz}}\right)\left(1+\frac{s}{\omega_{bz}}\right)\left(1-\frac{s}{\omega_{RHP}}\right)\left(1-\frac{s}{\omega_{del}}\right)}{\left(1+\frac{s}{\omega_{p1}}\right)\left(1+\frac{s}{\omega_{bp}}\right)\left(1+\frac{s}{\omega_{del}}\right)}" />
                </div>
                <div>
                  <MathBlock math="K_{sys} = \frac{g_m \cdot V_{in} \cdot R_s}{R_i \cdot C_c \cdot (V_o + I_o \cdot R_{LED})}" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-blue-500 font-medium mb-2 block">Zeros</Label>
                    <div className="space-y-1">
                      <MathBlock math="\omega_{cz} = \frac{1}{R_c \cdot C_c}" />
                      <MathBlock math="\omega_{bz} = \frac{1}{R_{LED} \cdot C_o}" />
                      <MathBlock math="\omega_{RHP} = \frac{(1-D)^2 \cdot V_o}{L \cdot I_o}" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-red-500 font-medium mb-2 block">Poles</Label>
                    <div className="space-y-1">
                      <MathBlock math="\omega_{p1} = \frac{V_o + I_o \cdot R_{LED}}{V_o \cdot (R_{LED}+R_{esr}) \cdot C_o}" />
                      <MathBlock math="\omega_{bp} = \frac{1}{R_s \cdot C_s}" />
                    </div>
                  </div>
                </div>
              </div>
            </MagicCard>
          </div>
        )}

        {/* 页脚 */}
        <div className="mt-16 text-center text-xs text-muted-foreground">
          Built with{" "}
          <a href="https://magicui.design" className="underline underline-offset-4 hover:text-foreground transition-colors">
            Magic UI
          </a>
        </div>
      </div>
    </div>
  )
}
