# BUILD_PLAN — cristi-portfolio 全站重做（v2.0）

> 设计语言借鉴 tokonoma.xyz 的**手法与动效模式**（黑底、荧光点缀、胶囊 UI、
> 巨型标题列表＋悬停浮图、自定义光标、行军蚁虚线、解码文字入场、边缘导航、
> 全屏作品 viewer、故障切片、逐字 stagger）。
> **绝不复制**对方的文案、图片、logo、品牌资产。所有文字沿用 cristi 现有中文文案，
> 所有图片沿用项目内自有资产。
> 概念名：「暗房终端 DARKROOM TERMINAL」—— 黑底白字、荧光黄点缀、等宽字体数据感。

## 0. 铁律（不可违反）

1. **无外部 URL**：`index.html`、`css/*`、`js/*` 中不得出现 `http(s)://`
   （test/smoke.mjs 会断言，svg 的 `xmlns:w3.org` 命名空间除外）。
   因此：**不许外链 webfont、不许引入任何库**，只许 vanilla JS + CSS。
2. **js/data.js 冻结**：12 件作品数据原样保留，一字不改。
   `assets/img/` 下 4 张 AI 图（photo-01~04.jpg）路径不变。
3. **内容冻结**：cristi 身份为「平面设计师 · 时尚摄影师 · 编程工程师」；
   六大板块 hero / 作品 / 关于 / 服务 / 联系 / 页脚全部保留（呈现形式可重组）。
4. **编码约定**（沿用现有）：经典 script 引入（data.js → effects.js → main.js，
   禁止 ES module）；全部挂 `window.PF`；DOM 查询一律走 `data-js` 钩子；
   防御性编码（钩子缺失静默跳过、不抛错、无 console 输出）。
5. **Eurostile 不可用**（商业字体），字体走系统字体栈模拟宽体科技感（见 §1.2）。

---

## 1. 设计语言

### 1.1 色板（css/base.css `:root`）

| token | 值 | 用途 |
|---|---|---|
| `--bg` | `#0A0A0C` | 页面底色（近黑） |
| `--bg-soft` | `#121215` | 行 hover / 卡片底 |
| `--ink` | `#F5F5F3` | 主文字（米白） |
| `--dim` | `rgba(245,245,243,.55)` | 次要文字、caption |
| `--faint` | `rgba(245,245,243,.28)` | 编号、装饰 |
| `--line` | `rgba(245,245,243,.16)` | 分隔线、边框 |
| `--neon` | `#D7FF00` | 荧光黄：唯一强调色（延续酸性版品牌资产） |
| `--neon-ink` | `#0A0A0C` | 荧光底上的文字 |

旧版 `--paper / --accent(橙) / --blue / 硬阴影 / --radius:0` 整套废弃。
新版只有一种圆角：`--pill: 999px`（胶囊）；其余全部直角。

### 1.2 字体栈

```css
--font-display: "PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC",system-ui,sans-serif;
--font-latin: "Helvetica Neue",Helvetica,Arial,system-ui,sans-serif;
--font-mono: ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;
```

- 中文标题：`--font-display`，字重 800/900，行高 1.05–1.15。
- 英文 caption：`--font-latin`，**全大写** + `letter-spacing:.35em` + `.72rem`，
  颜色 `var(--dim)`，荧光态时变 `var(--neon)`。
- 数据/编号/状态行：`--font-mono`，大写，`.72–.8rem`。
- 宽体科技感靠「大写＋宽字距＋高字重」模拟，不做 `scaleX` 拉伸（中文会被拉变形）。

### 1.3 字阶（桌面端，移动端见 §6）

| 用途 | 规格 |
|---|---|
| Hero 标题 | `clamp(3.5rem, 12vw, 10rem)` / 900 / lh 1.08 |
| 板块标题（如「作品」） | `clamp(2.5rem, 7vw, 5.5rem)` / 800 |
| 作品行标题 | `clamp(2rem, 6vw, 4.5rem)` / 800 |
| 服务行标题 | `clamp(1.6rem, 4vw, 3rem)` / 800 |
| 联系邮箱巨链 | `clamp(1.8rem, 6vw, 4.5rem)` / 800，可换行 |
| 正文 | `1rem` / lh 1.9 / `var(--dim)` |
| EN caption | `.72rem` / ls `.35em` / uppercase |

### 1.4 纹理与装饰

- 全站底：极淡点阵（`radial-gradient(rgba(245,245,243,.05) 1px, transparent 1px)`，
  `background-size: 28px`）——只在 hero 有，滚动后纯黑，保证性能。
- 分隔：1px `var(--line)` 横线 ＋ 行军蚁虚线（§3 M7）点缀关键位置。
- 旧版跑马灯保留，改黑底白字、荧光分隔符 `///`。

---

## 2. 板块设计

锚点保持不变：`#top #works #about #services #contact`
（smoke 测试第 3 项依赖，勿改）。

### 2.0 全局铬（global chrome）

- **顶部进度条**（沿用 `data-js="progress"`）：2px，`var(--neon)`。
- **Logo**：左上固定胶囊 `CRISTI®`（描边胶囊，hover 反白）。
  右上固定胶囊 `联系合作 →`（mailto，荧光底黑字）。
- **边缘导航**（`data-js="nav-rail"`，桌面端 ≥701px）：
  fixed 左侧垂直居中，`writing-mode: vertical-rl`，mono 小字，
  `01 作品 / 02 关于 / 03 服务 / 04 联系`，当前板块高亮为荧光黄
  （IntersectionObserver 切换 `.is-active`）。
- **自定义光标**（沿用 `data-js="cursor-dot / cursor-ring"` 并升级，见 M3）。

### 2.1 Hero（`#top`，`data-js="hero"`）

- 100svh，左对齐、垂直居中偏左，左右留 `clamp(1.25rem, 6vw, 6rem)`。
- `eyebrow`（`data-js="decode"`）：`FASHION PHOTOGRAPHY × GRAPHIC DESIGN × CODE`
  —— 解码入场（M1）。
- `h1.hero-title`（`data-js="hero-title"`）：「镜头与纸张之间」，
  JS 按字拆成 `.char` span（沿用酸性版已有模式），逐字 stagger 上升入场（M2）；
  入场完成后每 ~7s 触发一次 280ms 故障切片（M6）。
- `p.hero-sub`：`平面设计师 · 时尚摄影师 · 编程工程师` ＋ 一句陈述
  「用镜头捕捉情绪，用纸张构建品牌。」（沿用现有文案）
- `div.hero-actions`：两个胶囊按钮 —— 「浏览作品」（荧光底黑字）/
  「联系合作」（1px 白描边，hover 反白）。
- 底部 mono 状态行：`SYS.STATUS: ONLINE ── SCROLL ↓`（纯装饰，`aria-hidden`）。
- 底部行军蚁虚线分隔带（M7）。

### 2.2 作品（`#works`，`data-js="works"`）

本站的**招牌交互**，对标参考站的「巨型标题列表＋悬停浮图」。

- 头部：mono 编号 `01` ＋ 巨型「作品」＋ caption `SELECTED WORKS — 12`（数量从数据算）；
  筛选胶囊组（沿用 `data-js="tabs"`）：全部 / 时装摄影 / 平面设计，
  选中态为荧光底黑字胶囊。
- 列表容器 `div.works-list`（`data-js="works-list"`，**取代**旧 `.works-grid`）。
  行由 `PF.renderWorks(filter)` 从 `PF.WORKS` 渲染，每行是一个 `<button>`：

```html
<button class="work-row" data-js="work-row" data-id="w01" data-cat="photo" data-cursor="view">
  <span class="work-row-index">01</span>
  <span class="work-row-titles">
    <span class="work-row-title">霓裳之夜</span>
    <span class="work-row-en">NEON CITY NIGHTS</span>
  </span>
  <span class="work-row-meta">
    <span class="work-row-cat">时装摄影</span>
    <span class="work-row-year">2025</span>
  </span>
</button>
```

- 行样式：上下 1px `var(--line)`，padding `1.4rem 0`；index mono dim；
  title 巨字；en caption 小字 dim；右侧 meta：分类胶囊（描边小胶囊）＋年份 mono。
- 桌面 hover（`@media (hover:hover)` 内）：title 右移 8px、en 变荧光黄、
  行底色 `var(--bg-soft)`；触发悬停浮图（M4）；title 做一次 150ms 故障切片（M6）。
- 点击行 → 全屏 viewer（§2.7）。
- 筛选切换：淡出 → 重渲染 → 逐行 stagger 淡入（沿用现有 tabs 逻辑，改渲染目标）。

### 2.3 关于（`#about`，`data-js="about"`）

- 头部：`02` ＋ 「关于」＋ `ABOUT`。
- 两栏（桌面）：左＝肖像框（行军蚁虚线框 M7，内为 mono 占位文案
  `PORTRAIT / 待提供`——cristi 日后自助把 `assets/img/portrait.jpg` 丢进去即可，
  CSS 用 `img` 覆盖占位，无需改结构）；
  右＝陈述段落（沿用现有三段文案，lead 行加 `data-js="decode"`）。
- 数据行：`60+ 拍摄项目 / 40+ 设计项目 / 8 合作品牌`
  （沿用 `data-js="stat-num"` count-up，改为 mono 巨数字＋dim 标签）。

### 2.4 服务（`#services`，`data-js="services"`）

- 头部：`03` ＋ 「服务」＋ `SERVICES`。
- 3 条手风琴行（静态 HTML，`data-js="service-row"`）：
  `01 时装摄影 / 02 品牌视觉 / 03 平面与画册`（沿用现有标题＋描述文案）。
- 行结构：编号 mono ＋ 巨标题 ＋ 右侧 `＋`（展开后变 `－`，旋转 45° 实现）；
  点击展开描述＋胶囊「预约 →」（mailto，subject 预填服务名）。
  展开动画：`max-height` transition（JS 读 `scrollHeight` 设内联高度，收起清掉）。
- hover：标题变荧光黄。

### 2.5 联系（`#contact`，`data-js="contact"`）

- 头部：`04` ＋ 「联系」＋ `CONTACT`。
- 巨型邮箱链接（`data-js="contact-mail"`，沿用 `hello@cristi.studio`）：
  hover 时做一次解码抖动（M1 的轻量版）＋整行反白。
- 陈述句：「有拍摄或设计需求？发一封邮件，聊聊你的想法。」（沿用）
- 社交胶囊：微信 / 小红书 / Instagram（`href="#"` 占位，沿用；
  `data-js="social-link"` 保留）。

### 2.6 页脚

- mono 微文案：`© <span data-js="year"></span> CRISTI — ALL RIGHTS RESERVED`
  ＋ `BETWEEN LENS & PAPER` ＋ 右侧胶囊 `↑ TOP`（回顶部）。

### 2.7 全屏作品 viewer（overlay，非板块）

```html
<div class="viewer" data-js="viewer" hidden role="dialog" aria-modal="true" aria-label="作品查看">
  <div class="viewer-frame" aria-hidden="true"><!-- 行军蚁 SVG 框 --></div>
  <figure class="viewer-figure">
    <img data-js="viewer-img" alt="">
    <figcaption class="viewer-meta">
      <p class="viewer-en" data-js="viewer-en"></p>
      <h3 class="viewer-title" data-js="viewer-title"></h3>
      <p class="viewer-sub"><span data-js="viewer-cat"></span> · <span data-js="viewer-year"></span></p>
      <p class="viewer-tags" data-js="viewer-tags"></p>
      <p class="viewer-desc" data-js="viewer-desc"></p>
    </figcaption>
  </figure>
  <div class="viewer-nav">
    <button class="pill" data-js="viewer-prev">← 上一件</button>
    <button class="pill" data-js="viewer-next">下一件 →</button>
    <button class="pill pill--neon" data-js="viewer-close">✕ 关闭</button>
  </div>
</div>
```

- 打开：当前筛选列表内的作品数组＋下标；图片 `loading="lazy" decoding="async"`，
  打开时才设 `src`（首屏零成本）。
- 键盘：`Esc` 关闭，`←/→` 上一件/下一件；焦点回到触发行；`html` 加
  `.is-locked { overflow:hidden }` 锁滚动。
- tags 用作品 `palette` 色做小胶囊底（每件作品保留自己的强调色，
  黑底上很出彩；`data.js` 的 palette 字段正好派上用场）。

---

## 3. 动效清单

全部只许 vanilla JS + CSS。`REDUCED` = `matchMedia('(prefers-reduced-motion: reduce)').matches`；
`FINE` = `matchMedia('(hover:hover) and (pointer:fine)').matches`。

| 编号 | 名称 | 触发 | 实现手法 | 降级 |
|---|---|---|---|---|
| M1 | 解码文字入场 | `[data-js="decode"]` 进入视口（IO，一次） | JS：按字符从左到右，用随机字符集（含 CJK 池 `日月水火木金土人手心言`＋符号池）逐字替换，约 600ms 后定稿；`requestAnimationFrame` 节流 | REDUCED/移动端：直接显示终稿 |
| M2 | 逐字 stagger | hero 加载完成（首屏立即执行） | JS 把标题按字拆 `.char` span（中文按字，英文按字母，空格保留）；CSS `.char{translateY(110%)}→0`，`transition-delay: var(--d)`（`--d = i*45ms`）；父级 `overflow:hidden` 做遮罩 | REDUCED：无位移，直接显示 |
| M3 | 自定义光标（升级） | 桌面端 mousemove | 沿用现有 dot+ring：dot 即时跟随（neon 8px），ring 用 rAF lerp（36px 白描边）；`data-cursor="view"` 的行 hover 时 ring 扩到 84px、内显 mono `VIEW`、dot 隐藏；链接 hover 时 ring 缩 0.7。`html.has-cursor` 由 JS 在首次 mousemove 后添加，CSS 仅在 `.has-cursor` 下 `*{cursor:none}` | 非 FINE / ≤700px / REDUCED：不初始化，原生光标 |
| M4 | 悬停浮图 | 作品行 `mouseenter`（仅 FINE 且 >700px） | 单个 fixed `div[data-js="float-img"] > img`；mouseenter 设 `src`（`new Image()` 预加载）；rAF lerp 跟随光标，偏移 (24px, -40px)，`rotate(3deg)`；mouseleave 淡出。列表初始化时 `requestIdleCallback`（无则 setTimeout）预加载全部 12 图 | 移动端：整个节点 `display:none`，点行直接进 viewer |
| M5 | 全屏 viewer | 行 click／键盘 | 见 §2.7；打开/关闭用 `.is-open` 做 opacity+scale 过渡（200ms） | REDUCED：无过渡直接显隐 |
| M6 | 故障切片 | hero 每 ~7s 一次（280ms）；作品行 hover 一次（150ms） | `.is-glitch` 类：两层伪元素 `::before/::after` 复制文字（`attr(data-text)`），clip-path 横向切片＋`translateX` 错位＋红/青 `text-shadow` 偏色；JS 定时加类后移除，`document.hidden` 时暂停 | REDUCED/移动端：不执行 |
| M7 | 行军蚁虚线 | 纯 CSS，无 JS | 内联 SVG `<rect>`：`stroke-dasharray:10 8; animation: ants 1.2s linear infinite`（`stroke-dashoffset` 从 0→18）；`vector-effect: non-scaling-stroke`。用于：hero 底部分隔、viewer 相框、关于肖像框 | REDUCED：`animation:none`（静止虚线） |
| M8 | 边缘导航高亮 | IO 监听 4 个 section | `data-js="nav-rail"` 的链接按可见 section 切 `.is-active`（荧光黄）；CSS 平滑颜色过渡 | 无 JS 时就是普通锚点导航，可用 |
| M9 | 胶囊 UI 反白 | hover / `.is-active` | `.pill{border:1px solid var(--line); border-radius:999px}`；hover/选中：`background:var(--ink); color:var(--bg)` 或荧光版；transition 180ms | 触屏：`:active` 态同样式 |
| M10 | 跑马灯 | 纯 CSS | 沿用现有 `.marquee-track` translateX 循环（内容复制两份）；黑底白字，`///` 荧光分隔 | REDUCED：静止 |
| M11 | 滚动进度 | scroll（rAF 节流） | 沿用 `PF.initProgress`，颜色改 neon | — |
| M12 | 数字滚动 | `stat-num` 进入视口 | 沿用现有 count-up 逻辑，样式改 mono 巨数字 | REDUCED：直接显示终值 |
| M13 | 板块入场 reveal | IO | 沿用 `.reveal → .in` 系统（**保留 v1.2 的 `html.js.reveal.in` 高优先级写法**，防空白页回归）；新样式：`translateY(28px)+opacity` 700ms | REDUCED：直接 `.in`；无 JS：`html:not(.js) .reveal{opacity:1}` |

共享 rAF ticker：M3＋M4 共用一个 rAF 循环（cursor＋float-img 一起更新），
`visibilitychange` hidden 时暂停，visible 恢复；REDUCED 时不启动。

---

## 4. 文件清单

| 文件 | 动作 | 职责 |
|---|---|---|
| `index.html` | **重写** | 新结构：progress / cursor×2 / logo 胶囊 / 联系胶囊 / nav-rail / main(hero,marquee,works,about,services,contact) / footer / viewer overlay / float-img；CSS/JS 引用加 `?v=2.0` |
| `css/base.css` | **重写** | §1 tokens（色板/字体/字阶）＋ reset ＋ 选中态/滚动条/焦点可见性 |
| `css/layout.css` | **重写** | 全板块布局：hero、works-list 行、about 两栏、services 手风琴、contact、footer、viewer、nav-rail（含 ≤700px 底部胶囊条形态） |
| `css/motion.css` | **重写** | M1–M13 全部动效：stagger、glitch、ants、marquee、reveal、pill hover、viewer 过渡 ＋ `prefers-reduced-motion` 总闸 ＋ `@media(max-width:700px)` 动效简化 |
| `css/acid.css` | **删除** | 酸性 hero 已被取代；neon 黄收编为 `--neon` |
| `js/data.js` | **冻结** | 不动 |
| `js/effects.js` | **重写** | `PF.initCursor`(M3)、`PF.initDecode`(M1)、`PF.initStagger`(M2)、`PF.initGlitch`(M6)、`PF.initFloatImg`(M4)、`PF.initRail`(M8)、`PF.initReveal`(M13)、`PF.initProgress`(M11)；共享 ticker；REDUCED/FINE 门控 |
| `js/main.js` | **重写** | `PF.renderWorks(filter)`（渲染 `.work-row` 列表）、`PF.initTabs`（胶囊筛选）、`PF.initViewer`（M5：打开/关闭/上下件/键盘/焦点/锁滚动）、`PF.initServices`（手风琴）、`PF.initStats`(M12)、`PF.initYear`、boot 编排 |
| `test/smoke.mjs` | **更新** | 见 §5 |
| `assets/img/*` | **冻结** | 不动（4 jpg＋12 svg 占位） |
| `dist/cristi-portfolio-standalone.html` | **删除** | v1 遗留快照；删除前 grep 确认无任何引用（预期无） |
| `BUILD_PLAN.md` | 新增 | 本文件 |

注意：`PF.SKILLS` 数据保留在 data.js（冻结），但 v2 不再设技能板块，
`initSkills` 不再实现（smoke 不断言它）。

---

## 5. data-js 钩子与 smoke 测试衔接

### 5.1 钩子清单（index.html 必须全部包含）

```
progress, cursor-dot, cursor-ring,
nav-rail,
hero-title, decode(多个元素),
tabs, works-list, float-img,
viewer, viewer-img, viewer-close, viewer-prev, viewer-next,
service-row(×3 静态), stat-num(×3), year, contact-mail, social-link
```

JS 动态生成（白名单，不在 HTML 里）：`work-row`。

### 5.2 smoke.mjs 更新策略（按现有 7 大项逐条改）

1. **文件存在**：css 改为**恰好 3 个**（`base.css layout.css motion.css`，按名断言）；
   另断言 `css/acid.css` **不存在**、`dist/` 不存在。
2. **data-js 钩子**：HOOKS 换成 §5.1 的静态钩子清单
   （`decode` 至少出现 3 处；`stat-num` 恰好 3 处；`service-row` 恰好 3 处）。
3. **锚点**：不变（`#top #works #about #services #contact` 全有对应 id）。
4. **WORKS 数据**：断言逻辑不变（12 条、cat、id/title/img/palette、文件存在）；
   文案把「12 个 svg」改成「12 个图片文件（jpg/svg）」。
5. **CSS 断点**：`layout.css` 须含 `1024 / 700 / 520` 三档（**新增 700px**）；
   `motion.css` 须含 `prefers-reduced-motion`（不变）。
6. **无外部 URL**：铁律，断言不变（html＋css＋js 全扫）。
7. **class 覆盖**：白名单正则扩展为
   `/^(work-row|work-row-.+|viewer|viewer-.+|char|float-img)$/` ＋ 状态类
   `/^(is-active|is-open|is-locked|is-glitch|in|has-cursor)$/`；
   其余 HTML class 必须在 CSS 选择器中出现。
8. **新增第 8 项**：缓存 bust —— `index.html` 里每个 `css/*.css` 与 `js/*.js`
   引用都必须带 `?v=` 查询串。
9. **新增第 9 项**：`data-js="viewer"` 的元素必须有 `role="dialog"`。

---

## 6. 移动端降级（≤700px，参考站做法）

- **无自定义光标**：`cursor-dot/ring` 全部 `display:none`，不加 `.has-cursor`，
  原生光标；所有 `data-cursor` 逻辑跳过。
- **边缘导航变形**：`nav-rail` 从左侧垂直栏变为**底部固定横向胶囊条**
  （同一元素，media query 改 position/flex-direction/writing-mode），
  加 `env(safe-area-inset-bottom)`；给 `main` 加 `padding-bottom` 防遮挡。
- **悬停浮图关闭**：`float-img` 不渲染；行 hover 样式全部包在
  `@media (hover:hover)` 里，触屏只保留 `:active` 轻反馈。
- **动效简化**：decode 直接终稿；glitch 不执行；stagger 延迟减半；
  marquee 保留（便宜）；reveal 距离从 28px 降到 12px。
- **字阶收缩**：作品行标题 `clamp(1.5rem, 9vw, 2.2rem)`；邮箱巨链允许换行；
  about 两栏变单栏（肖像框在上，`max-width: 320px`）。
- **viewer**：图 `max-height: 52vh`，meta 在下，按钮全宽胶囊、≥44px 触控高。
- 断点保留 `1024 / 768 / 520` 旧档做细节微调，**700px 为功能分水岭**。

---

## 7. 风险点

1. **首屏性能**：decode＋stagger 都是纯文本操作，无图片、无滤镜
   （酸性版的 `feTurbulence` 已随 acid.css 删除，GPU 负担反而下降）。
   12 张作品图：列表行**不直接放 `<img>`**（只在 hover/viewer 时加载），
   首屏实际只请求 HTML＋3 CSS＋3 JS。`viewer-img`/`float-img` 必须
   `loading="lazy" decoding="async"`。
2. **reduce-motion 兼容**：所有动效双门控 —— CSS 侧
   `@media (prefers-reduced-motion: reduce){ *{animation:none!important; transition:none!important} }`
   再补各组件终态；JS 侧 `REDUCED` 常量跳过 decode/glitch/lerp。
   **防空白页**：沿用 v1.2 教训，`.reveal` 在 `html:not(.js)` 下默认可见，
   显示态选择器保持 `html.js.reveal.in` 级别。
3. **自定义光标陷阱**：`cursor:none` 只在 JS 成功添加 `.has-cursor` 后生效
   （首次 mousemove 才加类）；若 JS 中途失败，用户仍有原生光标。
4. **viewer 状态泄漏**：关闭时必须：移除 `.is-locked`、恢复 `body` 滚动、
   把焦点还给触发行、把 `hidden` 加回去；`Esc` 在 viewer 外不劫持。
5. **`data-text` 与 decode 冲突**：glitch 伪元素用 `attr(data-text)`，
   hero 标题做 decode 的元素**不要**同时挂 glitch（hero 用 stagger＋glitch，
   decode 只给 eyebrow/lead 行，避免互相覆盖 textContent）。
6. **GitHub Pages 10 分钟缓存**：`Cache-Control: max-age=600`。
   本次所有 css/js 引用统一 `?v=2.0`；**以后每次改动静态资源必须同步 bump
   版本号**（如 `?v=2.1`），否则用户端 10 分钟内看到旧版。
   cristi 自助换图/改 `data.js` 后同理：等 10 分钟或 Ctrl+F5。
7. **与参考站的界限**：只借手法。文案全部用 cristi 现有中文；
   不出现 tokonoma 字样、不用对方图片、logo 保持 `CRISTI®` 自有标识。
   评审时把关：截图对比若出现可识别的品牌元素，打回。

---

## 8. 实施顺序（给排期的参考）

1. `index.html` 骨架 ＋ `css/base.css`（阻塞后续，先做，可 1 个 implementer）。
2. 并行：`css/layout.css` ／ `css/motion.css` ／ `js/effects.js` ／ `js/main.js`
   （4 个 implementer，接口契约就是 §5.1 的钩子名＋§2 的类名，互不等待）。
3. `test/smoke.mjs` 更新 → `node test/smoke.mjs` → 修到全绿；
   `node --check js/*.js`。
4. commit → push → 等 Pages 发布 → 浏览器实测：
   桌面（hover 浮图、viewer、光标、glitch）＋ 移动 390px（底部导航条、无光标、viewer）＋
   `prefers-reduced-motion` 强制开启验证内容全部可见。
