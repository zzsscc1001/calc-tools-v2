# CalcTools v2 - 项目经验总结

## 项目信息
- **源码**：`/home/suchen/calc-tools-v2/`
- **GitHub**：zzsscc1001/calc-tools-v2
- **Pages**：https://zzsscc1001.github.io/calc-tools-v2/
- **技术栈**：Vite + React + TypeScript + Tailwind CSS v4 + shadcn/ui + Magic UI

## 已安装组件

### Magic UI（通过 CLI 安装）
```bash
npx shadcn@latest add @magicui/bento-grid
npx shadcn@latest add @magicui/flickering-grid
npx shadcn@latest add @magicui/animated-shiny-text
npx shadcn@latest add @magicui/animated-theme-toggler
npx shadcn@latest add @magicui/number-ticker
npx shadcn@latest add @magicui/animated-list
npx shadcn@latest add @magicui/shimmer-button
npx shadcn@latest add @magicui/magic-card
```

### shadcn 基础组件
```bash
npx shadcn@latest add input slider select switch label card tabs separator button
```

## 项目结构
```
src/
├── App.tsx              # HashRouter 路由入口
├── Home.tsx             # BentoGrid 目录页
├── BoostCalculator.tsx  # Boost Converter 计算器
├── main.tsx
├── index.css
├── lib/
│   └── utils.ts
└── components/
    └── ui/              # 所有 Magic UI + shadcn 组件
```

## 必踩的坑

### 1. CLI 创建字面 `@/` 目录
每次 `npx shadcn@latest add` 后，组件会创建到项目根目录的 `@/` 而不是 `src/`。

**修复**：
```bash
mv @/components src/components
rm -rf @
```

### 2. GitHub Pages SPA 刷新 404
BrowserRouter 在静态托管下刷新会 404，必须用 HashRouter。

```tsx
// ❌ 错误
import { BrowserRouter } from "react-router-dom"

// ✅ 正确
import { HashRouter } from "react-router-dom"
```

URL 格式：`https://zzsscc1001.github.io/calc-tools-v2/#/boost`

### 3. gh CLI 不可用
GitHub token 缺少 `read:org` scope，gh CLI 无法使用。

**替代方案**：用 git credentials + curl
```bash
TOKEN=$(grep "github.com" ~/.git-credentials | head -1 | sed 's|https://[^:]*:\([^@]*\)@.*|\1|')
curl -s -H "Authorization: token $TOKEN" https://api.github.com/...
```

### 4. deploy.sh 的 `$()` 转义问题
在 terminal 命令中 `$()` 会被 shell 转义，导致脚本内容错误。

**解决方案**：用 `write_file` 写入脚本文件，再 `bash deploy.sh` 执行。

### 5. BentoGrid 行高太大
默认 `auto-rows-[22rem]`（352px）导致卡片间距过大。

**修复**：在 Home.tsx 中覆盖为 `auto-rows-[12rem]`
```tsx
<BentoGrid className="auto-rows-[12rem]">
```

### 6. BentoCard 的 col-span
BentoCard 组件内部已有 `col-span-3`，通过 `className` prop 可以覆盖。

```tsx
// 小屏占满，大屏占 2 列
className: "col-span-3 lg:col-span-2"

// 小屏占满，大屏占 1 列
className: "col-span-3 lg:col-span-1"
```

## 部署流程

```bash
# 1. 构建
npm run build

# 2. 部署到 GitHub Pages
bash deploy.sh

# 3. 提交源码
git add . && git commit -m "xxx" && git push origin master
```

deploy.sh 脚本内容：
```bash
#!/bin/bash
cd /home/suchen/calc-tools-v2
TOKEN=$(grep "github.com" ~/.git-credentials 2>/dev/null | head -1 | sed 's|https://[^:]*:\([^@]*\)@.*|\1|')
rm -rf /tmp/gh-pages-deploy
mkdir -p /tmp/gh-pages-deploy
cp -r dist/* /tmp/gh-pages-deploy/
cd /tmp/gh-pages-deploy
git init
git add .
git commit -m "Deploy"
git remote add origin https://zzsscc1001:${TOKEN}@github.com/zzsscc1001/calc-tools-v2.git
git push -f origin master:gh-pages
```

## 工作规则
1. 大操作、大改先口头确认
2. 部署后让用户亲自去 Pages 查看效果
3. 不要私自确认继续
