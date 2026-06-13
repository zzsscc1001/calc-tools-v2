import { useState } from "react"
import { Link } from "react-router-dom"
import { Zap, Activity, Calculator, ArrowLeft } from "lucide-react"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { FlickeringGrid } from "@/components/ui/flickering-grid"
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text"
import { NumberTicker } from "@/components/ui/number-ticker"
import { MagicCard } from "@/components/ui/magic-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"

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

  const calculate = () => {
    console.log("Calculate clicked!")
    const D = 1 - vin / vout
    const deltaIL = (vin * D) / (f * 1000 * l * 1e-6)
    const ilAvg = iout / (1 - D)
    const ilPeak = ilAvg + deltaIL / 2

    const newResults = {
      duty: D * 100,
      deltaIL: deltaIL * 1000, // 转为 mA
      ilAvg: ilAvg * 1000, // 转为 mA
      ilPeak: ilPeak * 1000, // 转为 mA
    }
    console.log("Results:", newResults)
    setResults(newResults)
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

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-16">
        {/* 头部 */}
        <div className="relative mb-12 text-center">
          <div className="absolute top-0 left-0">
            <Link to="/calc-tools-v2/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </div>
          <div className="absolute top-0 right-0">
            <AnimatedThemeToggler />
          </div>

          <AnimatedShinyText className="mb-3 text-xs tracking-widest uppercase">
            Power Electronics Calculator
          </AnimatedShinyText>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">
            Boost Converter
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Calculate duty cycle, inductor ripple, and average current
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
