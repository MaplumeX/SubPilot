---
name: SubPilot
description: A calm, reliable subscription tracker — the steady assistant for your recurring spend.
colors:
  ink: "#0a0a0a"
  paper: "#ffffff"
  graphite-900: "#171717"
  graphite-700: "#404040"
  graphite-500: "#737373"
  graphite-300: "#a1a1a1"
  graphite-200: "#d4d4d4"
  graphite-100: "#e5e5e5"
  graphite-50: "#f5f5f5"
  sidebar-bg: "#fafafa"
  destructive: "#e7000b"
  destructive-ink-dark: "#ff6467"
  brand-accent-pending: "#1447e6"
  chart-1: "#d4d4d4"
  chart-2: "#737373"
  chart-3: "#525252"
  chart-4: "#404040"
  chart-5: "#262626"
typography:
  display:
    fontFamily: "'Geist Variable', sans-serif"
    fontSize: "clamp(1.5rem, 3vw, 2rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "'Geist Variable', sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  title:
    fontFamily: "'Geist Variable', sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
  body:
    fontFamily: "'Geist Variable', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "'Geist Variable', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "5px"
  lg: "10px"
  xl: "14px"
  2xl: "18px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.graphite-900}"
    textColor: "{colors.graphite-50}"
    rounded: "{rounded.lg}"
    padding: "8px 10px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.graphite-700}"
  button-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "8px 10px"
  button-outline-hover:
    backgroundColor: "{colors.graphite-50}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "8px 10px"
  button-ghost-hover:
    backgroundColor: "{colors.graphite-50}"
  button-destructive:
    backgroundColor: "oklch(0.577 0.245 27.325 / 0.1)"
    textColor: "{colors.destructive}"
    rounded: "{rounded.lg}"
    padding: "8px 10px"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "16px"
  card-dark:
    backgroundColor: "{colors.graphite-900}"
    textColor: "{colors.graphite-50}"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "8px 10px"
    height: "32px"
  badge:
    backgroundColor: "{colors.graphite-50}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  badge-destructive:
    backgroundColor: "oklch(0.577 0.245 27.325 / 0.1)"
    textColor: "{colors.destructive}"
---

# Design System: SubPilot

## 1. Overview

**Creative North Star: "The Steady Assistant"**

SubPilot 的视觉系统像一个不慌不忙的财务助理：克制、精准、不讨好也不疏远。它不靠颜色讨好用户，不靠阴影制造层次幻觉，不靠动效炫技。它靠的是精确的数字、清晰的层级、和留出足够呼吸的空间让信息自己说话。

整个系统建立在中性灰阶（Neutral Graphite）之上，唯一带有色彩的是 `destructive` —— 用于真正的危险/删除动作，而非续费提醒。续费的"紧迫感"通过位置、时间标注和克制的色温传达，绝不靠红色轰炸。这是一个刻意的选择：当红色只出现在"删除"时，它才有分量。

**当前系统缺少一个品牌锚点色。** 现有的纯灰阶在"冷静"上做到了极致，但"可靠"需要一个可识别的、属于 SubPilot 的颜色来承载信任感。后续应引入一个克制的品牌色（限定在 ≤10% 屏幕面积，符合 Restrained 策略），用于主要 CTA、焦点环和关键数据强调。在此之前，灰阶系统是完整可用的。

系统明确拒绝：花花绿绿的理财 app、银行后台式数据表格、焦虑营销型红色提醒、为观感堆砌的图表展示。

**Key Characteristics:**
- 中性灰阶为主，色彩是稀缺资源
- 边缘（ring）替代阴影做层次
- 单一 Geist 字体家族，靠权重和尺寸分层
- 紧凑的控件尺寸（button h-8、input h-8），信息密度高于留白炫耀
- 暗色模式是一等公民，非附属功能

## 2. Colors: The Neutral Graphite Palette

一个几乎无色的调色板。所有中性 token 的 chroma 为 0（纯灰轴），唯一带 chroma 的是 `destructive`（红，hue 27）和暗色模式遗留的 `sidebar-primary`（蓝，hue 264 —— 待随品牌锚点统一）。这种克制让色彩本身成为信号：当某处出现颜色时，它一定意味着什么。

### Primary
- **Ink** (`#0a0a0a` / `oklch(0.145 0 0)`): 正文文字、主按钮背景（浅色模式）。系统最深的灰，承载最高对比度。
- **Graphite 900** (`#171717` / `oklch(0.205 0 0)`): 暗色模式的卡片/侧栏背景；浅色模式的主按钮背景等效。主操作色的中性表达。

### Secondary / Tertiary
_本项目无二级/三级品牌色。_ 中性灰阶承担所有非首要角色。品牌锚点色补齐后，将作为唯一 secondary 出现。

### Neutral
- **Paper** (`#ffffff` / `oklch(1 0 0)`): 浅色模式背景、卡片、popover。最亮的表面。
- **Graphite 50** (`#f5f5f5` / `oklch(0.97 0 0)`): secondary / muted / accent 共用的浅灰表面。hover 态背景、次要区域填充。
- **Graphite 100** (`#e5e5e5` / `oklch(0.922 0 0)`): 边框、输入框边线。浅色模式的结构线。
- **Graphite 200** (`#d4d4d4` / `oklch(0.87 0 0)`): 图表最浅档、分隔线。
- **Graphite 300** (`#a1a1a1` / `oklch(0.708 0 0)`): 焦点环（浅色模式）、禁用态文字。
- **Graphite 500** (`#737373` / `oklch(0.556 0 0)`): muted-foreground。次要文字、图表第二档。**注意对比度**：对 Paper 为 4.0:1，低于 AA 4.5:1 要求 —— 用于 ≤14px 非粗体时会不达标，应优先用 Graphite 700。
- **Graphite 700** (`#404040` / `oklch(0.371 0 0)`): 次要文字的 AA 安全替代。图表第三档。
- **Graphite 900 Dark** (`#171717`): 暗色模式卡片/侧栏。
- **Dark BG** (`#0a0a0a`): 暗色模式页面背景。

### Destructive
- **Signal Red** (`#e7000b` / `oklch(0.577 0.245 27.325)`): 仅用于删除/危险动作。不用于续费提醒。在 button/badge 中以 10% 透明度做底色 + 实色文字，避免红色满屏。
- **Signal Red Dark** (`#ff6467` / `oklch(0.704 0.191 22.216)`): 暗色模式下的 destructive 文字色。

### Chart
图表色阶全灰：`#d4d4d4` → `#737373` → `#525252` → `#404040` → `#262626`。刻意去色，因为图表服务于"回答问题"而非"看起来专业"。品牌锚点补齐后，主数据线可改用品牌色，其余保持灰阶。

### Pending: Brand Accent
- **Brand Accent** (`#1447e6` / `oklch(0.488 0.243 264.376)` — 暗色 sidebar-primary 遗留值，**待定**): 当前仅在暗色模式 sidebar-primary 出现，未在浅色模式定义。这是一个占位记录，提示后续 colorize 时应以此为起点或重新选定一个符合"冷静可靠"的克制品牌色。**不要在未确认前大面积使用。**

### Named Rules
**The Color-as-Signal Rule.** 色彩是稀缺资源。中性灰是默认；颜色出现时必须承载语义（危险、品牌焦点、数据强调），绝不为装饰。这意味着：不加彩色分类标签、不彩色化图标、不彩色化进度条。

**The Red-Only-for-Danger Rule.** `destructive` 红色只用于删除和不可逆危险动作。续费提醒、即将到期、超预算等"时间敏感"信息不得使用红色 —— 它们用位置和时间标注传达紧迫，符合 PRODUCT.md 的"平稳的紧迫感"原则。

**The Muted-Foreground Contrast Rule.** `Graphite 500` (#737373) 对 Paper 仅 4.0:1，不满足 AA 正文标准。用于次要文字时优先改用 `Graphite 700` (#404040，对比度 9.0:1)。Graphite 500 仅用于 ≥18px 或 bold ≥14px 的大字，或纯装饰性次要标签。

## 3. Typography

**Display / Body / Label Font:** Geist Variable (sans-serif)，无衬线 fallback。

**Character:** 单一字体家族扛全部层级。Geist 是为屏幕而生的现代等宽灵魂 sans —— 客观、克制、数字可读性强，正符合"可靠"。不引入第二个字体做对比，因为对比_axis 的代价是认知负担，而 SubPilot 要的是"一眼看清"。层级完全靠权重（400→500→600→700）和尺寸建立。

### Hierarchy
- **Display** (700, `clamp(1.5rem, 3vw, 2rem)`, 1.2, letter-spacing -0.01em): 页面主标题（如 Dashboard 的 `h2`）。最大不超过 2rem —— 这是工具不是杂志，标题不需要喊。
- **Headline** (600, 1.5rem, 1.3): 卡片标题、section 标题。承载内容的“名字”。
- **Title** (500, 1rem, 1.5): 卡片内行标题、表单区段标题。语义性强调。
- **Body** (400, 0.875rem, 1.5): 默认正文。行高 1.5 保证多行可读。最大行宽限制在 65–75ch（当前未强制，建议在 prose 区段加 `max-w-prose`）。
- **Label** (500, 0.75rem, 1.4): 按钮文字、badge、表格表头、表单标签。不使用 uppercase + tracked 的 eyebrow 套路 —— 保持正常大小写，用字重区分。

### Named Rules
**The One-Family Rule.** 全系统只用 Geist Variable。不引入 serif display、不引入 mono accent、不引入第二个 sans。层级靠权重和尺寸，不靠字体对比。引入新字体必须经过明确决策，不是“为了好看”。

**The No-Eyebrow Rule.** 不在 section 上方加小号大写加宽字距的 kicker（“ABOUT”“PROCESS”“PRICING”）。这是 2023-era AI 脚手架反射。section 标题用 Headline 自身的字重和尺寸说话，需要语境时用一行正常大小写的副标题。

## 4. Elevation

**本系统默认无阴影。** 卡片用 `ring-1 ring-foreground/10`（一层 1px 半透明描边）代替阴影做边缘定义，dialog/popover 用 `backdrop-blur-xs` + `bg-black/10` 做遮罩。这是一个刻意的克制选择：阴影制造“浮起”幻觉，而 SubPilot 要的是“平面上的清晰分层”，不是“空中的卡片”。

Elevation 策略允许在以下状态引入极克制的 ambient shadow：hover/focus 的卡片轻微提升、dialog/popover 的浮层。但静止态永远保持 flat + edge —— 提升是状态的响应，不是默认。

### Shadow Vocabulary (pending)
当前无定义的 shadow token。补齐时建议：
- **ambient-low** (`box-shadow: 0 1px 2px rgba(0,0,0,0.04)`): 卡片 hover 态的轻微提升。模糊大、偏移小、不透明度极低 —— 是“呼吸”不是“浮起”。
- **ambient-md** (`box-shadow: 0 4px 16px rgba(0,0,0,0.08)`): dialog/popover 浮层。足够把浮层从背景分离，但不到“戏剧性”。

### Named Rules
**The Flat-By-Default Rule.** 静止态表面是 flat 的，靠 ring 边缘定义层次。阴影只作为状态响应出现（hover、浮层），不是默认。如果一个卡片静止态就有阴影，它太努力了。

**The No-Drop-Shadow-on-Text Rule.** 文字永远不加 `text-shadow`。清晰靠对比度，不靠投影。投影文字是 2014 年的设计。

## 5. Components

组件气质：克制而精准，不讨好也不疏远。所有控件偏紧凑（button/input h-8 = 32px），信息密度高于留白炫耀。圆角中等（lg = 10px）—— 不锐利到“工程感”，不圆润到“玩具感”。

### Buttons
- **Shape:** 中等圆角（`rounded-lg` = 10px），紧凑高度（h-8 = 32px），`text-sm font-medium`。
- **Primary:** `bg-primary`（Graphite 900）+ `text-primary-foreground`（Graphite 50），padding `px-2.5`。主操作（新增订阅、保存表单）。hover 时 `bg-primary/80`。
- **Hover / Focus:** `transition-all`；hover 通过背景透明度变化（`/80`）而非整色切换，保持平滑。focus-visible 时 `border-ring` + `ring-3 ring-ring/50` —— 3px 焦点环，可见且不刺眼。active 态 `translate-y-px`（1px 下沉），给一个克制的物理反馈。
- **Outline:** `border-border` + `bg-background`，hover `bg-muted`。次要操作、取消。
- **Ghost:** 透明背景，hover `bg-muted`。导航项、工具栏按钮。
- **Destructive:** `bg-destructive/10` + `text-destructive`。仅用于删除。红色被透明度驯化，不轰炸。
- **Link:** `text-primary underline-offset-4 hover:underline`。内联导航。

### Cards / Containers
- **Corner Style:** 大圆角（`rounded-xl` = 14px），比按钮更柔和——卡片是内容容器，不是操作元素。
- **Background:** `bg-card`（浅色 Paper / 暗色 Graphite 900）。
- **Shadow Strategy:** 无阴影。用 `ring-1 ring-foreground/10`（1px 半透明描边）做边缘。参考 Elevation 章节。
- **Border:** 无 `border`，用 ring 替代。CardFooter 有 `border-t` + `bg-muted/50` 做内分隔。
- **Internal Padding:** `--card-spacing: --spacing(4)` = 16px。sm 尺寸 12px。CardHeader/CardContent/CardFooter 各自承载 padding。

### Inputs / Fields
- **Style:** `h-8`（32px），`rounded-lg`（10px），`border border-input`（Graphite 100），`bg-transparent`（浅色）/ `bg-input/30`（暗色）。`text-base` 移动端、`md:text-sm` 桌面端。
- **Focus:** `border-ring` + `ring-3 ring-ring/50`。与 button focus 一致。
- **Error / Disabled:** `aria-invalid` 时 `border-destructive` + `ring-destructive/20`。disabled 时 `opacity-50` + `pointer-events-none`。
- **Placeholder:** `text-muted-foreground`（Graphite 500）—— **注意对比度**，placeholder 需 4.5:1，Graphite 500 对 Paper 仅 4.0:1。建议提升 placeholder 色 至 Graphite 700 或在 prose 中记录此为待修。

### Badge
- **Style:** `h-5`（20px），`rounded-4xl`（全圆角 pill），`px-2 py-0.5`，`text-xs font-medium`。
- **Default:** `bg-primary text-primary-foreground`。
- **Destructive:** `bg-destructive/10 text-destructive` —— 用于"逾期"等危险状态（非"即将到期"）。
- **Secondary / Outline / Ghost:** 灰阶变体，用于中性分类标签。

### Navigation
- **Style:** 顶部 header，`border-b` 分隔，`px-6 py-3`。导航项为 button 而非 link，ghost 风格。
- **Default:** `text-muted-foreground`（**对比度警告**：当前用 Graphite 500，建议 Graphite 700）。
- **Active:** `text-foreground font-medium`。不靠底色高亮，靠字重 + 字色 —— 克制的当前态。
- **Hover:** `hover:text-foreground`。仅字色变化，无背景。
- **Mobile:** 当前未做响应式收起 —— 待补。

### Dialog / Popover
- **Overlay:** `bg-black/10` + `backdrop-blur-xs`，`duration-100` fade。
- **Panel:** `bg-popover`（同 Paper / Graphite 900）+ `ring` 边缘。无阴影（或 ambient-md，参考 Elevation）。
- **Close:** XIcon 按钮，ghost 风格。

### Table
- **Style:** `text-sm`，`w-full`，`caption-bottom`。行 `border-b` 分隔。
- **无斑马纹**，无 hover 高亮（当前）—— 表格是查阅不是交互。如需行操作，加 `hover:bg-muted/50`。

### Signature: SubscriptionCard / DueSoon Item
- 待文档化 —— 这是 SubPilot 的核心展示组件，承载"续费提醒优先"原则。后续 craft/shape 时应重点设计。

## 6. Do's and Don'ts

### Do:
- **Do** 用中性灰阶作为默认色板，把色彩当作需要语义才出现的稀缺资源。
- **Do** 用 ring 边缘（`ring-1 ring-foreground/10`）代替阴影定义卡片层次；阴影只留给 hover 和浮层。
- **Do** 用 Geist Variable 单一字体家族，靠权重（400/500/600/700）和尺寸建立层级。
- **Do** 用位置和时间标注传达续费紧迫感（"3 天后"在首页顶部），而非颜色。
- **Do** 在浅色模式用 Graphite 900 (#171717) 做主按钮，暗色模式反转为 Graphite 50。
- **Do** 保持控件紧凑（h-8 = 32px），信息密度高于留白炫耀。
- **Do** 让 destructive 红色以 10% 透明度底色 + 实色文字出现，驯化其强度。
- **Do** 让暗色模式作为一等公民设计，不是附属反转。

### Don't:
- **Don't** 用红色表达续费提醒或"即将到期" —— 红色仅用于删除/不可逆危险动作（PRODUCT.md: 不做"焦虑营销"型续费提醒）。
- **Don't** 加彩色分类标签、彩色图标、彩色进度条 —— 色彩不是装饰（PRODUCT.md: 不做花花绿绿的理财 app）。
- **Don't** 堆砌花哨图表来"看起来专业" —— 图表服务于具体问题，当前全灰阶是刻意的（PRODUCT.md: 不做图表展示型 dashboard）。
- **Don't** 给 section 加小号大写加宽字距的 eyebrow kicker（"ABOUT""PROCESS"）—— 这是 AI 脚手架反射。
- **Don't** 用 `border-left` > 1px 的彩色侧边条做强调 —— 绝对禁止。
- **Don't** 用 `background-clip: text` + gradient 做渐变文字 —— 用单一实色，靠字重强调。
- **Don't** 把玻璃拟态（glassmorphism）当默认 —— blur 和玻璃卡片仅极罕见且刻意时使用。
- **Don't** 在静止态卡片上加阴影 —— 阴影是状态响应，不是默认。
- **Don't** 用 Graphite 500 (#737373) 做 ≤14px 非粗体正文 —— 对 Paper 仅 4.0:1，不达 AA。用 Graphite 700 (#404040)。
- **Don't** 引入第二个字体家族做"对比" —— 层级靠权重和尺寸，不靠字体对比。
- **Don't** 用大红色、感叹号、"立即处理！"弹窗制造紧迫感 —— 提醒是信息，不是压力（PRODUCT.md: 平稳的紧迫感）。