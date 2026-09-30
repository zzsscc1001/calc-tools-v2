# CalcTools v2

## Project
- Repo: zzsscc1001/calc-tools-v2
- Pages: https://zzsscc1001.github.io/calc-tools-v2/
- Stack: Vite + React + TypeScript + Tailwind CSS v4 + shadcn/ui + Magic UI
- Router: HashRouter. Routes: `/`, `/boost`, `/boost-ripple`, `/led-loop`
- Vite `base`: `/calc-tools-v2/`

## Layout
```
src/
├── App.tsx
├── Home.tsx
├── BoostCalculator.tsx
├── BoostRippleCalculator.tsx
├── LedLoopCalculator.tsx
├── lib/calculators/    # pure functions: boost, boost-ripple, led-loop
└── components/
    ├── layout/CalculatorLayout.tsx
    └── ui/
```

## Notes that still apply

### HashRouter
GitHub Pages has no SPA fallback. Use HashRouter (`#/boost`), not BrowserRouter.

### shadcn CLI `@/` directory
`npx shadcn@latest add` may write a literal `@/` folder at the repo root. Move those files into `src/` and remove `@/`.

### Bento grid sizing
Home overrides row height with `auto-rows-[12rem]`. Card `className` overrides the default `col-span-3` (`lg:col-span-1` or `lg:col-span-2`). Live cards are one link to an existing route. Coming-soon cards are not links.

### NumberTicker
`src/components/ui/number-ticker.tsx` accepts optional `springConfig`. Pages use `{ stiffness: 600, damping: 40 }`.

## Deploy
GitHub Actions (`.github/workflows/deploy.yml`) builds with `npm ci` and deploys `dist/` to GitHub Pages on every push to `master`. There is no manual deploy script.
