# cristi-portfolio

时装摄影 × 平面设计的个人作品集网站。

扁平化视觉风格，带炫酷动效与交互：自定义光标、滚动进度条、作品筛选、滚动显现动画、移动端汉堡菜单。**纯静态、零构建、离线可用**——HTML + CSS + JS，不依赖任何外部 CDN 或网络资源。

## 目录结构

```
cristi-portfolio/
├── index.html          # 页面结构（Hero / 作品 / 关于 / 服务 / 联系）
├── css/
│   ├── base.css        # 变量、重置、基础样式
│   ├── layout.css      # 布局 + 1024 / 768 / 520 三档响应式
│   └── motion.css      # 动效（含 prefers-reduced-motion 降级）
├── js/
│   ├── data.js         # 作品数据（WORKS 数组，12 条：时装摄影 × 平面设计）
│   ├── main.js         # 交互主逻辑（筛选、菜单、进度条等）
│   └── effects.js      # 动效（自定义光标、滚动显现等）
├── assets/
│   └── img/            # 作品占位图（12 张 svg，待替换为真实照片）
├── test/
│   └── smoke.mjs       # 冒烟测试（Node，零依赖）
└── README.md
```

作品数据与展示分离：增删改作品只动 `js/data.js`，不用碰页面结构。

## 本地预览

推荐用本地服务器（避免 `file://` 下的路径小毛病）：

```bash
cd cristi-portfolio
python3 -m http.server 8000
```

浏览器打开 http://localhost:8000 即可。

也可以直接双击 `index.html` 用浏览器打开，基本功能同样可用。

## 把占位图换成真实照片（一步到位）

`assets/img/` 里是 12 张 svg 占位图。替换只需两步：

1. **同名替换**：把你的真实照片放进 `assets/img/`，文件名与占位图保持一致（例如占位图叫 `photo-01.svg`，你的照片就命名为 `photo-01.svg`——直接覆盖，零改动）。
2. **改扩展名**（仅当照片格式与占位图不同时）：打开 `js/data.js`，找到对应作品的 `img` 字段，只改扩展名即可，例如：
   ```js
   img: "assets/img/photo-01.svg"   // 改成
   img: "assets/img/photo-01.jpg"
   ```

建议：照片宽度 1600px 左右、单张压缩到 200KB 以内，加载更快。刷新页面即生效。

## 待替换：社交链接

联系区的「微信 / 小红书 / Instagram」三个链接目前是 `href="#"` 占位。
cristi 拿到真实链接后，直接在 `index.html` 里把 `#` 换成对应 URL 即可，不用改 JS。

（`js/data.js` 里曾经有 `PF.SERVICES` / `PF.SOCIALS` 两组数据，但从未被渲染——服务区与社交链接都是 HTML 硬编码——已删除，避免维护两份数据。）

## 部署

任意静态托管都能直接上线，无需构建步骤：

- GitHub Pages / Netlify / Vercel / Cloudflare Pages
- 阿里云 OSS、腾讯云 COS 等对象存储 + CDN

把整个 `cristi-portfolio` 目录上传即可。

## 测试

```bash
node test/smoke.mjs
```

Node ≥ 16，零依赖。断言清单：

- 关键文件/目录存在（`index.html`、`js/data.js`、`css/` 下 3 个样式表、`assets/img/`）
- `index.html` 含全部 8 个 `data-js` 钩子（progress、cursor-dot、cursor-ring、tabs、works-grid、menu-btn、nav、year）
- 每个 `href="#x"` 锚点都有对应的 `id="x"`
- `js/data.js`：`WORKS` 恰好 12 条；`cat` 只含 `photo` / `design`；每条含 `id` / `title` / `img` / `palette`；`img` 引用的 12 个 svg 真实存在于 `assets/img/`
- `css/layout.css` 含 1024 / 768 / 520 三档 media query；`css/motion.css` 含 `prefers-reduced-motion`
- `index.html`、`css/*`、`js/*` 中无 `http(s)://` 外部 URL（离线要求）
- `index.html` 里的每个 class 都在 CSS 中有定义（JS 动态生成的 `work-card*` / `skill*` 走白名单）

输出 `PASS` / `FAIL` 明细；任一失败则 exit code 非零。改完数据或样式后跑一遍即可验证。
