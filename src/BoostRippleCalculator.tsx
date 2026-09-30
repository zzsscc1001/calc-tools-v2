import { useState, useMemo } from "react"
import { Zap, Activity, Calculator, Waves } from "lucide-react"
import { CalculatorLayout } from "@/components/layout/CalculatorLayout"
import { ResultsPlaceholder } from "@/components/results-placeholder"
import { fastSpring } from "@/lib/fast-spring"
import { calculateBoostRipple, type RippleResult } from "@/lib/calculators"
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
  // 错误提示
  const [calcError, setCalcError] = useState<string | null>(null)

  const calculate = () => {
    setCalcError(null)
    if (vin <= 0 || vout <= 0) { setCalcError("Input and output voltage must be greater than 0 V"); return }
    if (vout <= vin) { setCalcError("Boost topology requires output voltage greater than input voltage"); return }
    if (iout <= 0) { setCalcError("Output current must be greater than 0 A"); return }
    if (fsw <= 0 || l <= 0 || cout <= 0) { setCalcError("Frequency, inductance, and capacitance must be greater than 0"); return }
    if (eta <= 0 || eta > 1) { setCalcError("Efficiency η must be in the range (0, 1]"); return }
    if (alpha <= 0 || alpha >= 1) { setCalcError("Phase 1 current ratio α must be in the range (0, 1)"); return }
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
    <CalculatorLayout
      title="Boost Output Ripple"
      description="Two-phase interleaved async Boost output ripple time-domain simulation. Auto CCM/DCM detection, 180° phase shift."
      descriptionMaxWidth="max-w-lg"
    >
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

              {/* 错误提示 */}
              {calcError && (
                <p className="text-sm text-red-500 dark:text-red-400">{calcError}</p>
              )}

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
                <ResultsPlaceholder action="Calculate" />
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
                  <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => `t = ${payload?.[0]?.payload?.t} µs`} />} />
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
                    <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => `t = ${payload?.[0]?.payload?.t} µs`} />} />
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
                    <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => `t = ${payload?.[0]?.payload?.t} µs`} />} />
                    <Line type="monotone" dataKey="vripple" stroke="var(--color-vripple)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartContainer>
              </MagicCard>
            </div>
          </div>
        )}

    </CalculatorLayout>
  )
}
