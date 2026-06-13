import { Link } from "react-router-dom"
import {
  Zap,
  Activity,
  Thermometer,
  Cpu,
  Waves,
  Calculator,
} from "lucide-react"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { FlickeringGrid } from "@/components/ui/flickering-grid"
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text"
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid"

const features = [
  {
    Icon: Zap,
    name: "Boost Converter",
    description: "Calculate duty cycle, inductor ripple, and efficiency.",
    href: "/calc-tools-v2/boost",
    cta: "Open tool",
    className: "col-span-3 lg:col-span-2",
    background: <div className="absolute -top-20 -right-20 opacity-60" />,
  },
  {
    Icon: Activity,
    name: "Loop Compensation",
    description: "Bode plot analysis and compensation network design.",
    href: "#",
    cta: "Coming soon",
    className: "col-span-3 lg:col-span-1",
    background: <div className="absolute -top-20 -right-20 opacity-60" />,
  },
  {
    Icon: Thermometer,
    name: "Thermal Analysis",
    description: "Junction temperature and derating calculations.",
    href: "#",
    cta: "Coming soon",
    className: "col-span-3 lg:col-span-1",
    background: <div className="absolute -top-20 -right-20 opacity-60" />,
  },
  {
    Icon: Cpu,
    name: "MOSFET Losses",
    description: "Switching and conduction loss estimation.",
    href: "#",
    cta: "Coming soon",
    className: "col-span-3 lg:col-span-2",
    background: <div className="absolute -top-20 -right-20 opacity-60" />,
  },
  {
    Icon: Waves,
    name: "LC Filter Design",
    description: "Inductor and capacitor sizing for output filtering.",
    href: "#",
    cta: "Coming soon",
    className: "col-span-3 lg:col-span-2",
    background: <div className="absolute -top-20 -right-20 opacity-60" />,
  },
  {
    Icon: Calculator,
    name: "Voltage Divider",
    description: "Resistor ratio and loading effect calculator.",
    href: "#",
    cta: "Coming soon",
    className: "col-span-3 lg:col-span-1",
    background: <div className="absolute -top-20 -right-20 opacity-60" />,
  },
]

export default function Home() {
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
          <h1 className="mt-1 text-3xl font-semibold text-foreground">
            Calc Tools
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Power electronics calculation utilities
          </p>
        </div>

        {/* Bento Grid 目录 */}
        <BentoGrid>
          {features.map((feature, idx) => (
            <Link key={idx} to={feature.href} className="contents">
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
