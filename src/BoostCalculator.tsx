import { useState, useMemo } from "react"
import { Zap, Activity, Calculator, Waves } from "lucide-react"
import { CalculatorLayout } from "@/components/layout/CalculatorLayout"
import { ResultsPlaceholder } from "@/components/results-placeholder"
import { fastSpring } from "@/lib/fast-spring"
import { calculateBoost, generateBoostWaveforms } from "@/lib/calculators"
import { NumberTicker } from "@/components/ui/number-ticker"
import { MagicCard } from "@/components/ui/magic-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
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

const chartConfig = {
  il: { label: "Inductor Current (mA)", color: "#3b82f6" },
  vsw: { label: "SW Voltage (V)", color: "#ef4444" },
  vout: { label: "Output Voltage (V)", color: "#22c55e" },
} satisfies ChartConfig

export default function BoostCalculator() {
  // 输入参数
  const [vin, setVin] = useState(12)
  const [vout, setVout] = useState(24)
  const [l, setL] = useState(10) // µH
  const [f, setF] = useState(400) // kHz
  const [iout, setIout] = useState(0.5) // A

  // 计算结果
  const [results, setResults] = useState<{
    duty: number
    deltaIL: number
    ilAvg: number
    ilPeak: number
  } | null>(null)

  // 错误提示
  const [calcError, setCalcError] = useState<string | null>(null)

  const calculate = () => {
    setCalcError(null)
    if (vin <= 0 || vout <= 0) {
      setCalcError("Input and output voltage must be greater than 0 V")
      return
    }
    if (vout <= vin) {
      setCalcError("Boost topology requires output voltage greater than input voltage")
      return
    }
    if (iout <= 0) {
      setCalcError("Output current must be greater than 0 A")
      return
    }
    if (l <= 0 || f <= 0) {
      setCalcError("Inductance and switching frequency must be greater than 0")
      return
    }

    setResults(calculateBoost({ vin, vout, f, l, iout }))
  }

  // 波形数据
  const waveformData = useMemo(() => {
    if (!results) return []
    return generateBoostWaveforms(vin, vout, f, l, iout, results.duty)
  }, [results, vin, vout, f, l, iout])

  return (
    <CalculatorLayout
      title="Boost Converter"
      description="Calculate duty cycle, inductor ripple, and average current. This is a demo page showcasing UI components."
    >
      {/* 主内容区 - 两栏布局 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 左侧：输入区域 */}
        <MagicCard className="p-6" gradientColor="var(--color-muted)">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Calculator className="size-5" />
              <h2 className="text-lg font-semibold">Input Parameters</h2>
            </div>

            {/* Vin */}
            <div className="space-y-2">
              <Label htmlFor="vin">Input Voltage (V)</Label>
              <Input
                id="vin"
                type="number"
                value={vin}
                onChange={(e) => setVin(Number(e.target.value))}
                placeholder="12"
              />
            </div>

            {/* Vout */}
            <div className="space-y-2">
              <Label htmlFor="vout">Output Voltage (V)</Label>
              <Input
                id="vout"
                type="number"
                value={vout}
                onChange={(e) => setVout(Number(e.target.value))}
                placeholder="24"
              />
            </div>

            {/* Inductance */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="l">Inductance (µH)</Label>
                <span className="text-sm text-muted-foreground">{l} µH</span>
              </div>
              <Slider
                id="l"
                min={1}
                max={100}
                step={1}
                value={[l]}
                onValueChange={(val) => setL(Array.isArray(val) ? val[0] : val)}
              />
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="f">Switching Frequency (kHz)</Label>
                <span className="text-sm text-muted-foreground">{f} kHz</span>
              </div>
              <Slider
                id="f"
                min={100}
                max={1000}
                step={50}
                value={[f]}
                onValueChange={(val) => setF(Array.isArray(val) ? val[0] : val)}
              />
            </div>

            {/* Output Current */}
            <div className="space-y-2">
              <Label htmlFor="iout">Output Current (A)</Label>
              <Input
                id="iout"
                type="number"
                value={iout}
                onChange={(e) => setIout(Number(e.target.value))}
                placeholder="0.5"
                step={0.1}
              />
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
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Activity className="size-5" />
              <h2 className="text-lg font-semibold">Results</h2>
            </div>

            {results ? (
              <div className="space-y-6">
                {/* Duty Cycle */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Duty Cycle</Label>
                  <div className="flex items-baseline gap-1">
                    <NumberTicker
                      value={results.duty}
                      decimalPlaces={1}
                      className="text-4xl font-bold tracking-tight"
                      springConfig={fastSpring}
                    />
                    <span className="text-xl text-muted-foreground">%</span>
                  </div>
                </div>

                <Separator />

                {/* Inductor Ripple */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">
                    Inductor Ripple (ΔI_L)
                  </Label>
                  <div className="flex items-baseline gap-1">
                    <NumberTicker
                      value={results.deltaIL}
                      decimalPlaces={1}
                      className="text-4xl font-bold tracking-tight"
                      springConfig={fastSpring}
                    />
                    <span className="text-xl text-muted-foreground">mA</span>
                  </div>
                </div>

                <Separator />

                {/* Average Inductor Current */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">
                    Avg Inductor Current
                  </Label>
                  <div className="flex items-baseline gap-1">
                    <NumberTicker
                      value={results.ilAvg}
                      decimalPlaces={1}
                      className="text-4xl font-bold tracking-tight"
                      springConfig={fastSpring}
                    />
                    <span className="text-xl text-muted-foreground">mA</span>
                  </div>
                </div>

                <Separator />

                {/* Peak Inductor Current */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">
                    Peak Inductor Current
                  </Label>
                  <div className="flex items-baseline gap-1">
                    <NumberTicker
                      value={results.ilPeak}
                      decimalPlaces={1}
                      className="text-4xl font-bold tracking-tight"
                      springConfig={fastSpring}
                    />
                    <span className="text-xl text-muted-foreground">mA</span>
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
      {results && waveformData.length > 0 && (
        <div className="mt-6 space-y-6">
          {/* Inductor Current 波形 */}
          <MagicCard className="p-6" gradientColor="var(--color-muted)">
            <div className="mb-4 flex items-center gap-2">
              <Waves className="size-5" />
              <h2 className="text-lg font-semibold">Inductor Current (I_L)</h2>
            </div>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <LineChart data={waveformData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="t"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${v}µs`}
                  label={{ value: "Time (µs)", position: "insideBottom", offset: -2, style: { fontSize: 11 } }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  label={{ value: "mA", angle: -90, position: "insideLeft", style: { fontSize: 11 } }}
                />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => `t = ${payload?.[0]?.payload?.t} µs`} />} />
                <Line
                  type="monotone"
                  dataKey="il"
                  stroke="var(--color-il)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </MagicCard>

          {/* SW Voltage + Output Voltage 波形 */}
          <div className="grid gap-6 md:grid-cols-2">
            <MagicCard className="p-6" gradientColor="var(--color-muted)">
              <div className="mb-4 flex items-center gap-2">
                <Waves className="size-5" />
                <h2 className="text-sm font-semibold">SW Node Voltage</h2>
              </div>
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <LineChart data={waveformData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="t"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `${v}µs`}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => `t = ${payload?.[0]?.payload?.t} µs`} />} />
                  <Line
                    type="stepAfter"
                    dataKey="vsw"
                    stroke="var(--color-vsw)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </MagicCard>

            <MagicCard className="p-6" gradientColor="var(--color-muted)">
              <div className="mb-4 flex items-center gap-2">
                <Waves className="size-5" />
                <h2 className="text-sm font-semibold">Output Voltage Ripple</h2>
              </div>
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <LineChart data={waveformData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="t"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `${v}µs`}
                  />
                  <YAxis tick={{ fontSize: 10 }} domain={["dataMin - 0.1", "dataMax + 0.1"]} />
                  <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => `t = ${payload?.[0]?.payload?.t} µs`} />} />
                  <Line
                    type="monotone"
                    dataKey="vout"
                    stroke="var(--color-vout)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </MagicCard>
          </div>
        </div>
      )}
    </CalculatorLayout>
  )
}
