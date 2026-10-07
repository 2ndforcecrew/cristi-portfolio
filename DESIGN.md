---
version: alpha
name: Darkroom Terminal
description: cristi 个人作品集的设计系统——暗黑终端美学，荧光黄点缀，中文巨字 + 英文大写 caption，胶囊 UI 语言。
colors:
  primary: "#F5F5F3"
  secondary: "#D7FF00"
  bg: "#0A0A0C"
  bg-soft: "#121215"
  ink: "#F5F5F3"
  dim: "rgba(245, 245, 243, 0.55)"
  faint: "rgba(245, 245, 243, 0.28)"
  line: "rgba(245, 245, 243, 0.16)"
  neon: "#D7FF00"
  neon-ink: "#0A0A0C"
typography:
  hero-title:
    fontFamily: "PingFang SC, Hiragino Sans GB, Microsoft YaHei, Noto Sans SC, system-ui, sans-serif"
    fontSize: 72px
    fontWeight: 900
    lineHeight: 1.08
    letterSpacing: "-0.01em"
  section-title:
    fontFamily: "PingFang SC, Hiragino Sans GB, Microsoft YaHei, Noto Sans SC, system-ui, sans-serif"
    fontSize: 56px
    fontWeight: 800
    lineHeight: 1.1
  work-row-title:
    fontFamily: "PingFang SC, Hiragino Sans GB, Microsoft YaHei, Noto Sans SC, system-ui, sans-serif"
    fontSize: 48px
    fontWeight: 800
    lineHeight: 1.1
  body:
    fontFamily: "PingFang SC, Hiragino Sans GB, Microsoft YaHei, Noto Sans SC, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.9
  caption-en:
    fontFamily: "Helvetica Neue, Helvetica, Arial, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.35em"
  mono:
    fontFamily: "ui-monospace, SF Mono, Menlo, Consolas, monospace"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.25em"
rounded:
  pill: 999px
  none: 0px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  section: 96px
---

## Overview

Darkroom Terminal（暗房终端）是 cristi 作品集的视觉语言：近黑底色上的米白中文巨字，
配荧光黄（#D7FF00）作为唯一的强调色。英文只以全大写、宽字距的小字 caption 形式出现，
等宽字体承担编号、状态行等"终端"细节。整体克制、呼吸感强，作品本身是视觉焦点。

语言策略：中文为主（标题/正文），英文为辅（caption 全大写 + 0.35em 字距）。

## Colors

- **bg (#0A0A0C)**：页面底色，近黑而非纯黑，更柔和。
- **ink (#F5F5F3)**：主文字，米白而非纯白，降低刺眼感。
- **neon (#D7FF00)**：唯一的强调色。只用于：主按钮、当前导航态、计数器高亮、
  自定义光标 VIEW 盘、进度条。滥用荧光黄会稀释它的冲击力。
- **dim / faint**：次要文字与装饰用米白的不同透明度，不要引入灰色色相。
- **line**：1px 分隔线、描边，透明度 0.16，极细。

## Typography

- 中文标题用 `--font-display` 系统字体栈，字重 800/900，行高 1.05–1.15。
  不做 scaleX 拉伸（中文会被拉变形），宽体科技感靠"大写英文＋宽字距＋高字重"模拟。
- 英文 caption：全大写 + letter-spacing 0.35em + 0.72rem，颜色 dim，荧光态变 neon。
- 编号/状态/计数：等宽字体 mono，大写，0.72–0.8rem。

## Shape & Components

- 圆角只有一种：`--pill: 999px`（胶囊）。其余全部直角。
- **pill**：1px `line` 描边胶囊按钮；hover/选中态反白（ink 底 + bg 字）或荧光版
  （neon 底 + neon-ink 字），过渡 180ms。
- **nav-rail**：顶部居中固定胶囊导航，含 4 个板块锚点；当前板块高亮为荧光底黑字；
  hover / focus-visible 为 #16A34A 绿底白字（用户明确指定，第二强调色例外）。
- **work-row**：作品列表行，button 元素；上下 1px line 分隔；左起：mono 编号、
  巨字中文标题＋英文 caption、右为分类小胶囊＋年份。桌面 hover：标题右移、
  英文变荧光黄、行底变 bg-soft。
- **showcase**：首屏纵滚驱动横移画廊（Locomotive 式）；sticky 钉住视口，
  下滚按进度 translate3d 横移轨道（行程 = 轨道宽 − 视口宽，区段高 = 行程 + 1.2 屏）；
  作品面板 72vw/76svh（移动端 82vw/62svh），1px line 描边；
  当前面板（中心最接近视口中心）caption 四层 stagger 入场
  （序号/标题/英文名/分类胶囊，延迟 .05/.14/.23/.32s）＋ Ken Burns 缓推
  （panel-zoom 7s，scale 1.04→1.16）；左下 caption，右下计数，底部 2px neon 进度条。
- **viewer**：全屏作品查看 overlay，role=dialog；大图＋右侧信息栏；Esc/←/→ 键盘操作。

## Motion

- 动效只用 transform / opacity / translate / rotate，不碰 layout 属性。
- 入场：解码文字（ASCII 乱码→逐字定稿）、标题逐字 stagger 上升、板块 reveal 上浮。
- 横移画廊 caption：四层 stagger 入场（opacity＋translate，.05/.14/.23/.32s 延迟），
  Slider Revolution 式分层；当前面板图片 Ken Burns 缓推（scale 1.04→1.16，7s）。
- 故障切片 glitch：伪元素复制文字做横向切片＋红/青偏色，短促 150–280ms。
- 行军蚁：SVG 虚线描边 `stroke-dashoffset` 持续爬行，用于分隔线与相框。
- 所有动效必须过两道门：`prefers-reduced-motion` 直接给终态；移动端（≤700px）
  简化或关闭（无自定义光标、无悬停浮图）。

## Don'ts

- 不要引入第二种强调色（nav-rail hover 的 #16A34A 为用户明确指定的例外）；
  不要用纯黑 #000 / 纯白 #fff（nav-rail hover 白字为用户明确指定的例外）。
- 不要外链 webfont 或第三方库（离线要求，零外部 URL）。
- 不要在米白文字上再加灰色色相；不要圆角卡片（除了胶囊）。
