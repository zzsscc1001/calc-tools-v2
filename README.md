# Calc Tools

A collection of power electronics calculation utilities built with **Vite + React + TypeScript + Tailwind CSS v4 + shadcn/ui + Magic UI**.

**Live Demo:** https://zzsscc1001.github.io/calc-tools-v2/

## Features

- **BentoGrid homepage** — card-based tool directory using Magic UI components
- **Animated title** — DiaTextReveal gradient sweep, replays on theme toggle
- **Dark/Light theme** — AnimatedThemeToggler with smooth transitions
- **Rich form inputs** — Slider, Input, Select, Checkbox (all from shadcn/ui)
- **Animated results** — NumberTicker for smooth number transitions
- **Waveform charts** — Recharts via shadcn/ui Chart for real circuit waveforms
- **GitHub Pages deploy** — HashRouter for SPA routing on static hosting

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
├── App.tsx                    # HashRouter 路由入口
├── Home.tsx                   # BentoGrid 目录主页
├── BoostCalculator.tsx        # 示例计算器页面
├── main.tsx
├── index.css                  # Tailwind CSS v4 入口 (@import "tailwindcss")
├── lib/
│   └── utils.ts               # cn() helper (clsx + tailwind-merge)
└── components/
    └── ui/                    # 所有 Magic UI + shadcn 组件 (CLI 安装)
        ├── bento-grid.tsx     # Magic UI: BentoGrid + BentoCard
        ├── dia-text-reveal.tsx# Magic UI: 渐变文字扫描动画
        ├── flickering-grid.tsx# Magic UI: 背景闪烁网格
        ├── number-ticker.tsx  # Magic UI: 数字滚动动画
        ├── animated-shiny-text.tsx
        ├── animated-theme-toggler.tsx
        ├── magic-card.tsx
        ├── chart.tsx          # shadcn: Recharts 封装
        ├── checkbox.tsx
        ├── input.tsx
        ├── label.tsx
        ├── select.tsx
        ├── separator.tsx
        ├── slider.tsx
        └── button.tsx
```

## How to Add a New Calculator Page

Follow these 5 steps to add your own tool (e.g. "Buck Converter"):

### Step 1: Create the page file

Create `src/BuckCalculator.tsx`. Use `BoostCalculator.tsx` as a template. The minimal structure:

```tsx
import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Zap, Activity, Calculator } from "lucide-react"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { FlickeringGrid } from "@/components/ui/flickering-grid"
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text"
import { NumberTicker } from "@/components/ui/number-ticker"
import { MagicCard } from "@/components/ui/magic-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"

const fastSpring = { stiffness: 600, damping: 40 }

export default function BuckCalculator() {
  // 输入参数
  const [vin, setVin] = useState(12)
  const [vout, setVout] = useState(5)

  // 计算结果
  const [results, setResults] = useState<{ duty: number } | null>(null)

  const calculate = () => {
    const D = vout / vin
    setResults({ duty: D * 100 })
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div className="fixed inset-0 z-0">
        <FlickeringGrid color="var(--foreground)" maxOpacity={0.03} flickerChance={0.04} squareSize={3} gridGap={6} />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-16">
        {/* 返回链接 */}
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" /> Back
          </Link>
        </div>

        {/* 头部 */}
        <div className="relative mb-12 text-center">
          <div className="absolute top-0 right-0"><AnimatedThemeToggler /></div>
          <AnimatedShinyText className="mb-3 text-xs tracking-widest uppercase">
            Power Electronics Calculator
          </AnimatedShinyText>
          <h1 className="mt-1 text-3xl font-semibold text-foreground">Buck Converter</h1>
        </div>

        {/* 左右两栏: 输入 + 输出 */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* 左: 输入 */}
          <MagicCard className="p-6" gradientColor="var(--color-muted)">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Calculator className="size-5" />
                <h2 className="text-lg font-semibold">Input Parameters</h2>
              </div>
              {/* ...你的输入控件... */}
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
              {results ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Duty Cycle</Label>
                    <div className="flex items-baseline gap-1">
                      <NumberTicker value={results.duty} decimalPlaces={1}
                        className="text-4xl font-bold tracking-tight" springConfig={fastSpring} />
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
      </div>
    </div>
  )
}
```

### Step 2: Register the route

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

### Step 3: Add a card to the homepage

In `src/Home.tsx`, add an entry to the `features` array:

```tsx
{
  Icon: Zap,                          // lucide-react 图标
  name: "Buck Converter",             // 卡片标题
  description: "Step-down converter duty cycle and ripple calculation.",
  href: "#",
  cta: "Open tool",                   // 按钮文字
  className: "col-span-3 lg:col-span-1",  // 占满(3) / 半宽(2) / 窄(1)
  background: <div className="absolute -top-20 -right-20 opacity-60" />,
  to: "/buck",                        // 路由路径
}
```

Grid columns: `col-span-3` = full width on mobile, `lg:col-span-2` = 2/3 on desktop, `lg:col-span-1` = 1/3.

### Step 4: Install any new components you need

```bash
# Magic UI components
npx shadcn@latest add @magicui/<component-name>

# shadcn/ui components
npx shadcn@latest add <component-name>
```

**⚠️ CRITICAL:** After every `npx shadcn@latest add`, the CLI creates files under a literal `@/` directory instead of `src/`. You MUST move them:

```bash
mv @/components/ui/<file>.tsx src/components/ui/
rm -rf @
```

### Step 5: Build and deploy

```bash
npm run build        # TypeScript check + Vite build
bash deploy.sh       # Push dist/ to gh-pages branch
git add . && git commit -m "feat: add buck calculator" && git push origin master
```

## Key Patterns

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
    onValueChange={val => setL(val[0])} />
</div>

// Dropdown select
<Select value={topology} onValueChange={v => v && setTopology(v)}>
  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
  <SelectContent>
    <SelectItem value="boost">Boost</SelectItem>
    <SelectItem value="buck">Buck</SelectItem>
  </SelectContent>
</Select>

// Checkbox
<div className="flex items-center gap-2">
  <Checkbox id="ocp" checked={enableOcp} onCheckedChange={v => setEnableOcp(v === true)} />
  <Label htmlFor="ocp" className="cursor-pointer">Over-Current Protection</Label>
</div>
```

### Animated Results (NumberTicker)

```tsx
<NumberTicker
  value={results.duty}
  decimalPlaces={1}
  className="text-4xl font-bold tracking-tight"
  springConfig={{ stiffness: 600, damping: 40 }}  // fast animation
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
    <ChartTooltip content={<ChartTooltipContent />} />
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

## Deployment

This project deploys to **GitHub Pages** using a simple script (`deploy.sh`):

1. `npm run build` → generates `dist/`
2. `deploy.sh` → copies `dist/` to a temp git repo, force-pushes to `gh-pages` branch

### deploy.sh

```bash
#!/bin/bash
cd /path/to/your-project
TOKEN=$(grep "github.com" ~/.git-credentials 2>/dev/null | head -1 | sed 's|https://[^:]*:\([^@]*\)@.*|\1|')

rm -rf /tmp/gh-pages-deploy
mkdir -p /tmp/gh-pages-deploy
cp -r dist/* /tmp/gh-pages-deploy/

cd /tmp/gh-pages-deploy
git init
git add .
git commit -m "Deploy"
git remote add origin https://YOUR_USER:${TOKEN}@github.com/YOUR_USER/YOUR_REPO.git
git push -f origin master:gh-pages
```

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

### 3. GitHub Pages SPA 404

Always use `HashRouter`, never `BrowserRouter`.

### 4. Tailwind CSS v4

This project uses Tailwind CSS v4 with `@tailwindcss/vite` plugin. The CSS entry point uses `@import "tailwindcss"` syntax, not the v3 `@tailwind` directives.

### 5. Geist font via @fontsource

The Geist font is loaded via `@fontsource-variable/geist` in `main.tsx`, not via CDN. If you get 404s on font files, check the import.

## Tech Stack Reference

| Technology | Version | Purpose |
|-----------|---------|---------|
| Vite | 8.x | Build tool |
| React | 19.x | UI framework |
| TypeScript | 6.x | Type safety |
| Tailwind CSS | 4.x | Utility-first CSS |
| shadcn/ui | 4.x | Base component library (CLI install) |
| Magic UI | — | Animation components (CLI install via shadcn) |
| Recharts | 3.x | Chart library (via shadcn chart component) |
| Motion | 12.x | Animation library (used by Magic UI) |
| Lucide React | — | Icon library |
| React Router | 7.x | Client-side routing (HashRouter) |

## License

MIT
