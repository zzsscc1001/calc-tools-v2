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
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

// 生成 Boost 波形数据
function generateWaveforms(vin: number, vout: number, f: number, l: number, iout: number, duty: number) {
  const D = duty / 100
  const Ts = 1 / (f * 1000) // 开关周期 (s)
  const deltaIL = (vin * D) / (f * 1000 * l * 1e-6)
  const ilAvg = iout / (1 - D)
  const ilMin = ilAvg - deltaIL / 2
  const ilPeak = ilAvg + deltaIL / 2

  const points = 200
  const data = []

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

  // 演示用：下拉 & 勾选
  const [topology, setTopology] = useState("boost")
  const [syncRect, setSyncRect] = useState(false)
  const [enableOcp, setEnableOcp] = useState(true)
  const [enableFmea, setEnableFmea] = useState(false)

  // 计算结果
  const [results, setResults] = useState<{
    duty: number
    deltaIL: number
    ilAvg: number
    ilPeak: number
  } | null>(null)

  const calculate = () => {
    const D = 1 - vin / vout
    const deltaIL = (vin * D) / (f * 1000 * l * 1e-6)
    const ilAvg = iout / (1 - D)
    const ilPeak = ilAvg + deltaIL / 2

    setResults({
      duty: D * 100,
      deltaIL: deltaIL * 1000,
      ilAvg: ilAvg * 1000,
      ilPeak: ilPeak * 1000,
    })
  }

  // 波形数据
  const waveformData = useMemo(() => {
    if (!results) return []
    return generateWaveforms(vin, vout, f, l, iout, results.duty)
  }, [results, vin, vout, f, l, iout])

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
            Boost Converter
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Calculate duty cycle, inductor ripple, and average current.
            This is a demo page showcasing UI components — parameters and
            options are for display purposes only.
          </p>
        </div>

        {/* 主内容区 - 两栏布局 */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* 左侧：输入区域 */}
          <MagicCard className="p-6" gradientColor="var(--color-muted)">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Calculator className="size-5" />
                <h2 className="text-lg font-semibold">Input Parameters</h2>
              </div>

              {/* 拓扑选择 - Select 下拉 */}
              <div className="space-y-2">
                <Label>Topology</Label>
                <Select value={topology} onValueChange={(v) => v && setTopology(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select topology" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boost">Boost</SelectItem>
                    <SelectItem value="buck">Buck</SelectItem>
                    <SelectItem value="buck-boost">Buck-Boost</SelectItem>
                    <SelectItem value="sepic">SEPIC</SelectItem>
                    <SelectItem value="cuk">Ćuk</SelectItem>
                  </SelectContent>
                </Select>
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

              <Separator />

              {/* 勾选项 */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Options</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sync"
                    checked={syncRect}
                    onCheckedChange={(v) => setSyncRect(v === true)}
                  />
                  <Label htmlFor="sync" className="text-sm font-normal cursor-pointer">
                    Synchronous Rectification
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="ocp"
                    checked={enableOcp}
                    onCheckedChange={(v) => setEnableOcp(v === true)}
                  />
                  <Label htmlFor="ocp" className="text-sm font-normal cursor-pointer">
                    Over-Current Protection
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="fmea"
                    checked={enableFmea}
                    onCheckedChange={(v) => setEnableFmea(v === true)}
                  />
                  <Label htmlFor="fmea" className="text-sm font-normal cursor-pointer">
                    FMEA Compliant
                  </Label>
                </div>
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
                <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                  <p>Click "Calculate" to see results</p>
                </div>
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
                  <ChartTooltip content={<ChartTooltipContent />} />
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
                    <ChartTooltip content={<ChartTooltipContent />} />
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
                    <ChartTooltip content={<ChartTooltipContent />} />
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
