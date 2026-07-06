import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { FlickeringGrid } from "@/components/ui/flickering-grid"
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text"

interface CalculatorLayoutProps {
  /** 页面主标题 */
  title: string
  /** 页面副标题描述 */
  description: string
  /** 副标题最大宽度，默认 max-w-md */
  descriptionMaxWidth?: string
  /** 页面主内容 */
  children: ReactNode
}

/**
 * 所有计算器页面的通用布局外壳。
 * 封装了背景网格、返回按钮、主题切换器、标题区域和页脚，
 * 避免在每个页面中重复相同的结构代码。
 */
export function CalculatorLayout({
  title,
  description,
  descriptionMaxWidth = "max-w-md",
  children,
}: CalculatorLayoutProps) {
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
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
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
            {title}
          </h1>
          <p className={`mt-2 text-sm text-muted-foreground mx-auto ${descriptionMaxWidth}`}>
            {description}
          </p>
        </div>

        {/* 页面主内容 */}
        {children}

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
