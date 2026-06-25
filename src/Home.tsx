import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  Zap,
  Activity,
  Thermometer,
  Cpu,
  Waves,
  Calculator,
  BarChart3,
} from "lucide-react"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { FlickeringGrid } from "@/components/ui/flickering-grid"
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text"
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid"
import { DiaTextReveal } from "@/components/ui/dia-text-reveal"

const features = [
  {
    Icon: Zap,
    name: "Calculator Demo",
    description: "Basic Boost converter duty cycle and ripple demo.",
    href: "#",
    cta: "Open demo",
    className: "col-span-3 lg:col-span-1",
    background: <div className="absolute -top-20 -right-20 opacity-60" />,
    to: "/boost",
  },
  {
    Icon: BarChart3,
    name: "Boost Ripple",
    description: "Two-phase interleaved async Boost output ripple simulation.",
    href: "#",
    cta: "Open tool",
    className: "col-span-3 lg:col-span-2",
    background: <div className="absolute -top-20 -right-20 opacity-60" />,
    to: "/boost-ripple",
  },
  {
    Icon: Activity,
    name: "Loop Compensation",
    description: "Bode plot analysis and compensation network design.",
    href: "#",
    cta: "Coming soon",
    className: "col-span-3 lg:col-span-1",
    background: <div className="absolute -top-20 -right-20 opacity-60" />,
    to: "#",
  },
  {
    Icon: Thermometer,
    name: "Thermal Analysis",
    description: "Junction temperature and derating calculations.",
    href: "#",
    cta: "Coming soon",
    className: "col-span-3 lg:col-span-1",
    background: <div className="absolute -top-20 -right-20 opacity-60" />,
    to: "#",
  },
  {
    Icon: Cpu,
    name: "MOSFET Losses",
    description: "Switching and conduction loss estimation.",
    href: "#",
    cta: "Coming soon",
    className: "col-span-3 lg:col-span-2",
    background: <div className="absolute -top-20 -right-20 opacity-60" />,
    to: "#",
  },
  {
    Icon: Waves,
    name: "LC Filter Design",
    description: "Inductor and capacitor sizing for output filtering.",
    href: "#",
    cta: "Coming soon",
    className: "col-span-3 lg:col-span-2",
    background: <div className="absolute -top-20 -right-20 opacity-60" />,
    to: "#",
  },
  {
    Icon: Calculator,
    name: "Voltage Divider",
    description: "Resistor ratio and loading effect calculator.",
    href: "#",
    cta: "Coming soon",
    className: "col-span-3 lg:col-span-1",
    background: <div className="absolute -top-20 -right-20 opacity-60" />,
    to: "#",
  },
]

export default function Home() {
  // 主题切换时重播 DiaTextReveal 动画
  const [revealKey, setRevealKey] = useState(0)
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === "class") {
          setRevealKey((k) => k + 1)
        }
      }
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

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
          <div className="absolute top-0 right-0">
            <AnimatedThemeToggler />
          </div>

          <AnimatedShinyText className="mb-3 text-xs tracking-widest uppercase">
            Engineer's Toolkit
          </AnimatedShinyText>
          <h1 className="mt-1 text-4xl font-bold text-foreground">
            <DiaTextReveal
              key={revealKey}
              text="Calc Tools"
              colors={["#c679c4", "#fa3d1d", "#ffb005", "#e1e1fe", "#0358f7"]}
            />
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Power electronics calculation utilities
          </p>
        </div>

        {/* Bento Grid 目录 */}
        <BentoGrid className="auto-rows-[12rem]">
          {features.map((feature, idx) => (
            <Link key={idx} to={feature.to} className="contents">
              <BentoCard {...feature} />
            </Link>
          ))}
        </BentoGrid>

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
