# Calc Tools

A collection of power electronics calculation utilities built with **Vite + React + TypeScript + Tailwind CSS v4 + shadcn/ui + Magic UI**.

**Live Demo:** https://zzsscc1001.github.io/calc-tools-v2/

## Features

- **BentoGrid homepage** — card-based tool directory using Magic UI components
- **Animated title** — DiaTextReveal gradient sweep, replays on theme toggle
- **Dark/Light theme** — AnimatedThemeToggler with smooth transitions
- **Rich form inputs** — Slider and Input (shadcn/ui)
- **Animated results** — NumberTicker for smooth number transitions
- **Waveform charts** — Recharts via shadcn/ui Chart for real circuit waveforms
- **GitHub Pages deploy** — GitHub Actions CI/CD + HashRouter for SPA routing

## Quick Start

```bash
# 1. Clone or use as template
git clone https://github.com/zzsscc1001/calc-tools-v2.git
cd calc-tools-v2

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev
```

## Project Structure

```
src/
├── App.tsx                          # HashRouter 路由入口
├── Home.tsx                         # BentoGrid 目录主页
├── BoostCalculator.tsx              # Boost 基础参数计算器
├── BoostRippleCalculator.tsx        # Boost 两相交错纹波计算器
├── LedLoopCalculator.tsx            # LED 驱动环路补偿计算器
├── main.tsx
├── index.css                        # Tailwind CSS v4 入口 (@import "tailwindcss")
├── lib/
│   ├── utils.ts                     # cn() helper (clsx + tailwind-merge)
│   └── calculators/                 # 计算核心（纯函数，无 React 依赖）
│       ├── index.ts                 # 统一导出入口
│       ├── boost.ts                 # Boost 基础参数计算逻辑
│       ├── boost-ripple.ts          # Boost 纹波计算逻辑
│       └── led-loop.ts              # LED 环路补偿计算逻辑
└── components/
    ├── layout/
    │   └── CalculatorLayout.tsx     # 通用计算器页面布局组件
    └── ui/                          # 所有 Magic UI + shadcn 组件 (CLI 安装)
        ├── bento-grid.tsx           # Magic UI: BentoGrid + BentoCard
        ├── dia-text-reveal.tsx      # Magic UI: 渐变文字扫描动画
        ├── flickering-grid.tsx      # Magic UI: 背景闪烁网格
        ├── number-ticker.tsx        # Magic UI: 数字滚动动画
        ├── animated-shiny-text.tsx
        ├── animated-theme-toggler.tsx
        ├── magic-card.tsx
        ├── chart.tsx                # shadcn: Recharts 封装
        ├── input.tsx
        ├── label.tsx
        ├── separator.tsx
        └── slider.tsx
```

## How to Add a New Calculator Page

Follow these 4 steps to add your own tool (e.g. "Buck Converter"):

### Step 1: Create the calculation logic

Create `src/lib/calculators/buck.ts`. Keep all math here as a pure function with no React dependencies — this makes it independently testable.

```ts
// src/lib/calculators/buck.ts

export interface BuckInputs {
  vin: number   // V
  vout: number  // V
  iout: number  // A
  fsw: number   // kHz
  l: number     // µH
}

export interface BuckResult {
  duty: number      // %
  ilRipple: number  // mA
}

export function calculateBuck(inputs: BuckInputs): BuckResult {
  const { vin, vout, iout, fsw, l } = inputs

  if (vin <= 0 || vout <= 0 || iout <= 0 || fsw <= 0 || l <= 0)
    throw new Error("All parameters must be positive.")
  if (vout >= vin)
    throw new Error("Vout must be less than Vin for a Buck converter.")

  const duty = (vout / vin) * 100
  const ilRipple = ((vin - vout) * (vout / vin)) / (fsw * 1000 * l * 1e-6) * 1000

  return { duty, ilRipple }
}
```

Then re-export it from `src/lib/calculators/index.ts`:

```ts
export type { BuckInputs, BuckResult } from "./buck"
export { calculateBuck } from "./buck"
```

### Step 2: Create the page component

Create `src/BuckCalculator.tsx`. Use `CalculatorLayout` for the page shell — it handles the background, header, back button, and theme toggle automatically.

```tsx
// src/BuckCalculator.tsx
import { useState } from "react"
import { Zap, Activity, Calculator } from "lucide-react"
import { CalculatorLayout } from "@/components/layout/CalculatorLayout"
import { calculateBuck, type BuckResult } from "@/lib/calculators"
import { NumberTicker } from "@/components/ui/number-ticker"
import { MagicCard } from "@/components/ui/magic-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const fastSpring = { stiffness: 600, damping: 40 }

export default function BuckCalculator() {
  const [vin, setVin] = useState(12)
  const [vout, setVout] = useState(5)
  const [iout, setIout] = useState(2)
  const [fsw, setFsw] = useState(300)
  const [l, setL] = useState(10)

  const [result, setResult] = useState<BuckResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const calculate = () => {
    try {
      setError(null)
      setResult(calculateBuck({ vin, vout, iout, fsw, l }))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Calculation error")
    }
  }

  return (
    <CalculatorLayout
      title="Buck Converter"
      description="Step-down converter duty cycle and inductor ripple current calculation."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* 左: 输入 */}
        <MagicCard className="p-6" gradientColor="var(--color-muted)">
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Calculator className="size-5" />
              <h2 className="text-lg font-semibold">Input Parameters</h2>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vin">Input Voltage (V)</Label>
              <Input id="vin" type="number" value={vin}
                onChange={e => setVin(Number(e.target.value))} step={0.1} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vout">Output Voltage (V)</Label>
              <Input id="vout" type="number" value={vout}
                onChange={e => setVout(Number(e.target.value))} step={0.1} />
            </div>

            {/* ...其他输入控件... */}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              className="w-full bg-foreground text-background py-3 px-6 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              onClick={calculate}
            >
              <Zap className="size-4" /> Calculate
            </button>
          </div>
        </MagicCard>

        {/* 右: 输出 */}
        <MagicCard className="p-6" gradientColor="var(--color-muted)">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Activity className="size-5" />
              <h2 className="text-lg font-semibold">Results</h2>
            </div>
            {result ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Duty Cycle</Label>
                  <div className="flex items-baseline gap-1">
                    <NumberTicker value={result.duty} decimalPlaces={1}
                      className="text-4xl font-bold tracking-tight"
                      springConfig={fastSpring} />
                    <span className="text-xl text-muted-foreground">%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                <p>Click "Calculate" to see results</p>
              </div>
            )}
          </div>
        </MagicCard>
      </div>
    </CalculatorLayout>
  )
}
```

### Step 3: Register the route

In `src/App.tsx`, add the new route:

```tsx
import BuckCalculator from "./BuckCalculator"

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/boost" element={<BoostCalculator />} />
        <Route path="/buck" element={<BuckCalculator />} />  {/* ← add this */}
      </Routes>
    </HashRouter>
  )
}
```

### Step 4: Add a card to the homepage

In `src/Home.tsx`, add an entry to the `features` array:

```tsx
{
  Icon: Zap,
  name: "Buck Converter",
  description: "Step-down converter duty cycle and ripple calculation.",
  cta: "Open tool",
  className: "col-span-3 lg:col-span-1",
  background: <div className="absolute -top-20 -right-20 opacity-60" />,
  to: "/buck",
}
```

Grid columns: `col-span-3` = full width on mobile, `lg:col-span-2` = 2/3 on desktop, `lg:col-span-1` = 1/3.

## Key Patterns

### CalculatorLayout

All calculator pages use `CalculatorLayout` for a consistent page shell (background grid, back button, header, theme toggle). Pass `title` and `description` as props; all page content goes in `children`.

```tsx
<CalculatorLayout
  title="My Calculator"
  description="Short description shown below the title."
  descriptionMaxWidth="max-w-lg"   // optional, default max-w-md
>
  {/* your content */}
</CalculatorLayout>
```

### Input Validation

All calculation functions throw an `Error` with a human-readable message when inputs violate physical constraints. Wrap calls in `try/catch` and surface the message in the UI:

```tsx
const calculate = () => {
  try {
    setError(null)
    setResult(calculateBuck({ vin, vout, iout, fsw, l }))
  } catch (e) {
    setError(e instanceof Error ? e.message : "Calculation error")
  }
}

{error && <p className="text-sm text-red-500">{error}</p>}
```

### Input Controls

```tsx
// Text/number input
<Input type="number" value={vin} onChange={e => setVin(Number(e.target.value))} />

// Slider with label
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <Label>Inductance (µH)</Label>
    <span className="text-sm text-muted-foreground">{l} µH</span>
  </div>
  <Slider min={1} max={100} step={1} value={[l]}
    onValueChange={val => setL(Array.isArray(val) ? val[0] : val)} />
</div>

// Dropdown select
<Select value={topology} onValueChange={v => v && setTopology(v)}>
  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
  <SelectContent>
    <SelectItem value="boost">Boost</SelectItem>
    <SelectItem value="buck">Buck</SelectItem>
  </SelectContent>
</Select>
```

### Animated Results (NumberTicker)

```tsx
<NumberTicker
  value={results.duty}
  decimalPlaces={1}
  className="text-4xl font-bold tracking-tight"
  springConfig={{ stiffness: 600, damping: 40 }}
/>
```

> **Note:** `springConfig` is a custom addition to the Magic UI NumberTicker component. See `src/components/ui/number-ticker.tsx`.

### Waveform Charts (Recharts via shadcn Chart)

```tsx
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts"

const chartConfig = {
  il: { label: "Current (mA)", color: "#3b82f6" },
} satisfies ChartConfig

<ChartContainer config={chartConfig} className="h-[250px] w-full">
  <LineChart data={waveformData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="t" tickFormatter={v => `${v}µs`} />
    <YAxis />
    <ChartTooltip
      content={
        <ChartTooltipContent
          labelFormatter={(_, payload) => `t = ${payload?.[0]?.payload?.t} µs`}
        />
      }
    />
    <Line type="monotone" dataKey="il" stroke="var(--color-il)" strokeWidth={2} dot={false} />
  </LineChart>
</ChartContainer>
```

### Homepage Title Animation (DiaTextReveal)

```tsx
// Theme toggle replays the animation via key change
const [revealKey, setRevealKey] = useState(0)
useEffect(() => {
  const observer = new MutationObserver(mutations => {
    for (const m of mutations) {
      if (m.attributeName === "class") setRevealKey(k => k + 1)
    }
  })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
  return () => observer.disconnect()
}, [])

<h1>
  <DiaTextReveal
    key={revealKey}
    text="Calc Tools"
    colors={["#c679c4", "#fa3d1d", "#ffb005", "#e1e1fe", "#0358f7"]}
  />
</h1>
```

## Component Modification Log

| Component | File | Modification | Reason |
|-----------|------|-------------|--------|
| NumberTicker | `src/components/ui/number-ticker.tsx` | Added `springConfig` prop (optional `SpringOptions`) | Default animation too slow |

> **Note on Chart components:** The shadcn `ChartTooltipContent` (`src/components/ui/chart.tsx`) was **not** modified. To display custom X-axis information (like time or frequency) in the tooltip header, we simply pass the `labelFormatter` prop to it directly from the page level, leveraging the existing Recharts API passthrough.

## Deployment

This project deploys to **GitHub Pages** automatically via **GitHub Actions** on every push to `master`.

The workflow is defined in `.github/workflows/deploy.yml`:

1. Triggered on every push to `master` (or manually via `workflow_dispatch`)
2. Runs `npm ci` → `npm run build` → uploads `dist/` as a Pages artifact
3. Deploys the artifact to GitHub Pages

No manual steps are required. Build and deploy status can be monitored in the **Actions** tab of the repository.

> **Why HashRouter?** GitHub Pages doesn't support SPA server-side routing. With `BrowserRouter`, refreshing a subpage (e.g. `/boost`) returns 404. `HashRouter` uses `#/boost` which the static server ignores — all routes resolve to `index.html`.

## Pitfalls

### 1. CLI creates literal `@/` directory

Every `npx shadcn@latest add` creates files under `@/components/ui/` instead of `src/components/ui/`.

```bash
# Always do this after installing a component:
mv @/components/ui/<file>.tsx src/components/ui/
rm -rf @
```

### 2. Select onValueChange receives `string | null`

The shadcn Select (via @base-ui) passes `null` on clear. Guard with:

```tsx
onValueChange={(v) => v && setMyValue(v)}
```

### 3. Slider onValueChange type

The `@base-ui/react` Slider `onValueChange` callback may pass either a number or an array depending on context. Always guard with:

```tsx
onValueChange={val => setL(Array.isArray(val) ? val[0] : val)}
```

### 4. GitHub Pages SPA 404

Always use `HashRouter`, never `BrowserRouter`.

### 5. Tailwind CSS v4

This project uses Tailwind CSS v4 with `@tailwindcss/vite` plugin. The CSS entry point uses `@import "tailwindcss"` syntax, not the v3 `@tailwind` directives.

### 6. Geist font via @fontsource

The Geist font is loaded via `@fontsource-variable/geist` in `src/index.css`, not via CDN. If you get 404s on font files, check the import.

## Tech Stack Reference

| Technology | Version | Purpose |
|-----------|---------|---------|
| Vite | 8.x | Build tool |
| React | 19.x | UI framework |
| TypeScript | 6.x | Type safety (strict mode enabled) |
| Tailwind CSS | 4.x | Utility-first CSS |
| shadcn/ui | 4.x | Base component library (CLI install) |
| Magic UI | — | Animation components (CLI install via shadcn) |
| Recharts | 3.x | Chart library (via shadcn chart component) |
| Motion | 12.x | Animation library (used by Magic UI) |
| Lucide React | 1.x | Icon library |
| React Router | 7.x | Client-side routing (HashRouter) |

## License

MIT
