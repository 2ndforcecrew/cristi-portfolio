#!/usr/bin/env node
/**
 * cristi-portfolio 冒烟测试（v2.2，零依赖，只用 Node 内建模块）
 *
 * 用法（在项目根目录执行）:
 *   node test/smoke.mjs
 *
 * 断言清单：
 *  1. 关键文件存在：index.html、js/data.js、css/ 下恰好 3 个 .css
 *     （base.css/layout.css/motion.css）；acid.css 与 dist/ 已删除
 *  2. index.html 含 v2 全部静态 data-js 钩子；decode≥3 处、stat-num 恰好 3 处、
 *     service-row 恰好 3 处
 *  3. 每个 href="#x" 锚点在页面里都有对应的 id="x"
 *  4. js/data.js：WORKS 恰好 12 条；cat 只含 photo/design；
 *     每条含 id/title/img/palette；img 引用的 12 个图片文件真实存在于 assets/img/
 *  5. css/layout.css 含 1024/700/520 三档 media query；
 *     css/motion.css 含 prefers-reduced-motion
 *  6. index.html、css/*、js/* 中无 http(s):// 外部 URL（离线要求）
 *  7. index.html 里出现的每个 class，都至少在一个 CSS 文件的选择器里有定义
 *     （JS 动态生成的 work-row* / viewer* / char / float-img 与状态类走白名单）
 *  8. index.html 里每个 css/*.css 与 js/*.js 引用都带 ?v= 缓存 bust 查询串
 *  9. data-js="viewer" 的元素必须有 role="dialog"
 *
 * 输出 PASS/FAIL 明细；任一失败则进程 exit code 为 1。
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let passed = 0;
let failed = 0;

function check(name, ok, detail = '') {
  if (ok) {
    passed++;
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed++;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function read(p) {
  try {
    return readFileSync(join(ROOT, p), 'utf8');
  } catch {
    return null;
  }
}

function isDir(p) {
  try {
    return statSync(join(ROOT, p)).isDirectory();
  } catch {
    return false;
  }
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 通用括号匹配：从 text[start]（必须是 ([{ 之一）开始，
 * 找到与之配对的闭括号下标；能正确跳过字符串、转义和注释。
 * 失败返回 -1。
 */
function matchBracket(text, start) {
  const pairs = { '(': ')', '[': ']', '{': '}' };
  const open = text[start];
  if (!pairs[open]) return -1;
  const stack = [pairs[open]];
  let quote = null;
  for (let i = start + 1; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '/' && text[i + 1] === '/') {
      const nl = text.indexOf('\n', i);
      i = nl === -1 ? text.length : nl;
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 1;
      continue;
    }
    if (pairs[c]) { stack.push(pairs[c]); continue; }
    if (c === ')' || c === ']' || c === '}') {
      if (stack.length === 0 || stack[stack.length - 1] !== c) return -1;
      stack.pop();
      if (stack.length === 0) return i;
    }
  }
  return -1;
}

/** 从 js/data.js 源码中提取 WORKS 数组内的顶层对象字面量（字符串数组）。 */
function parseWorksArray(src) {
  const m = src.match(/\bWORKS\b/);
  if (!m) return null;
  const arrStart = src.indexOf('[', m.index);
  if (arrStart === -1) return null;
  const arrEnd = matchBracket(src, arrStart);
  if (arrEnd === -1) return null;
  const body = src.slice(arrStart + 1, arrEnd);
  const objs = [];
  let i = 0;
  while (i < body.length) {
    const o = body.indexOf('{', i);
    if (o === -1) break;
    const e = matchBracket(body, o);
    if (e === -1) break;
    objs.push(body.slice(o, e + 1));
    i = e + 1;
  }
  return objs;
}

/** 对象字面量文本中是否存在 key: 键。 */
function hasKey(objText, key) {
  return new RegExp(`\\b${escapeRegExp(key)}\\s*:`).test(objText);
}

/** 提取对象字面量中 key: 'value' 的字符串值（处理转义）；键不存在返回 null。 */
function stringField(objText, key) {
  const m = objText.match(new RegExp(`\\b${escapeRegExp(key)}\\s*:\\s*(['"\`])`));
  if (!m) return null;
  const q = m[1];
  let j = m.index + m[0].length;
  let val = '';
  while (j < objText.length) {
    const c = objText[j];
    if (c === '\\') { val += objText[j + 1] ?? ''; j += 2; continue; }
    if (c === q) return val;
    val += c;
    j++;
  }
  return null; // 引号未闭合
}

/** 把 img 字段值解析为项目根目录下的相对路径。 */
function resolveImg(imgValue) {
  let v = imgValue.trim().replace(/^\.\//, '').replace(/^\/+/, '');
  if (!v.startsWith('assets/')) v = `assets/img/${v}`;
  return v;
}

function underAssetsImg(relPath) {
  const parts = relPath.split(sep);
  return parts.length >= 3 && parts[0] === 'assets' && parts[1] === 'img';
}

/** 找出文本中的 http(s):// 外部 URL（排除 xmlns 等命名空间与本机地址）。 */
function findExternalUrls(text) {
  const out = [];
  const re = /https?:\/\/[^\s"'<>()\]\\]+/g;
  let m;
  while ((m = re.exec(text))) {
    const url = m[0].replace(/[.,;:!?]+$/, '');
    const low = url.toLowerCase();
    if (low.includes('w3.org')) continue; // svg xmlns 命名空间，非外部资源
    if (/^https?:\/\/(localhost|127\.0\.0\.1)([:/]|$)/.test(low)) continue;
    const line = text.slice(0, m.index).split('\n').length;
    out.push(`L${line}: ${url}`);
  }
  return out;
}

function countHook(htmlText, h) {
  const re = new RegExp(`data-js\\s*=\\s*["']${escapeRegExp(h)}["']`, 'g');
  return (htmlText.match(re) || []).length;
}

// ---------------------------------------------------------------- 1. 文件存在
const html = read('index.html');
const dataJs = read('js/data.js');
check('index.html 存在', html !== null);
check('js/data.js 存在', dataJs !== null);
check('assets/img/ 目录存在', isDir('assets/img'));

let cssFiles = [];
if (isDir('css')) {
  try {
    cssFiles = readdirSync(join(ROOT, 'css')).filter((f) => f.endsWith('.css')).sort();
  } catch { /* 保持空数组 */ }
}
check('css/ 下恰好 3 个 .css 文件', cssFiles.length === 3, `实际: ${cssFiles.join(', ') || '(无)'}`);
check('css/base.css 存在', cssFiles.includes('base.css'));
check('css/layout.css 存在', cssFiles.includes('layout.css'));
check('css/motion.css 存在', cssFiles.includes('motion.css'));
check('css/acid.css 已删除', !existsSync(join(ROOT, 'css/acid.css')));
check('dist/ 已删除', !existsSync(join(ROOT, 'dist')));

let jsFiles = [];
if (isDir('js')) {
  try {
    jsFiles = readdirSync(join(ROOT, 'js')).filter((f) => f.endsWith('.js')).sort();
  } catch { /* 保持空数组 */ }
}
check('js/data.js 可列出', jsFiles.includes('data.js'));
check('js/effects.js 可列出', jsFiles.includes('effects.js'));
check('js/main.js 可列出', jsFiles.includes('main.js'));

// ---------------------------------------------------------------- 2. data-js 钩子（v2）
const htmlText = html ?? '';
const HOOKS_ONCE = [
  'progress', 'cursor-dot', 'cursor-ring', 'nav-rail', 'hero-title',
  'tabs', 'works-list', 'float-img', 'showcase', 'showcase-sec',
  'viewer', 'viewer-img', 'viewer-close', 'viewer-prev', 'viewer-next',
  'year', 'contact-mail',
];
for (const h of HOOKS_ONCE) {
  check(`data-js 钩子 "${h}" 存在`, countHook(htmlText, h) >= 1);
}
check('data-js="decode" 至少 3 处', countHook(htmlText, 'decode') >= 3, `实际 ${countHook(htmlText, 'decode')} 处`);
check('data-js="stat-num" 恰好 3 处', countHook(htmlText, 'stat-num') === 3, `实际 ${countHook(htmlText, 'stat-num')} 处`);
check('data-js="service-row" 恰好 3 处', countHook(htmlText, 'service-row') === 3, `实际 ${countHook(htmlText, 'service-row')} 处`);
check('data-js="social-link" 至少 1 处', countHook(htmlText, 'social-link') >= 1);

// ---------------------------------------------------------------- 3. 锚点 id 对应
{
  const hrefs = new Set();
  const re = /href\s*=\s*["']#([^"'\s>]+)["']/g;
  let m;
  while ((m = re.exec(htmlText))) hrefs.add(m[1]);
  if (hrefs.size === 0) {
    check('锚点 href="#x" 均有对应 id', true, '页面无 # 锚点');
  } else {
    const missing = [...hrefs].filter(
      (x) => !new RegExp(`id\\s*=\\s*["']${escapeRegExp(x)}["']`).test(htmlText),
    );
    check(
      '锚点 href="#x" 均有对应 id',
      missing.length === 0,
      missing.length ? `缺失: ${missing.map((x) => `#${x}`).join(', ')}` : `共 ${hrefs.size} 个锚点`,
    );
  }
}

// ---------------------------------------------------------------- 4. WORKS 数据
{
  const objs = dataJs === null ? null : parseWorksArray(dataJs);
  check('js/data.js 中能解析出 WORKS 数组', objs !== null);
  const list = objs ?? [];
  check('WORKS 恰好 12 条', list.length === 12, `实际 ${list.length} 条`);

  const CAT_OK = new Set(['photo', 'design']);
  const badCat = [];
  const missingKeys = [];
  const imgProblems = [];
  const imgSet = new Set();

  list.forEach((obj, idx) => {
    const n = idx + 1;
    for (const k of ['id', 'title', 'img', 'palette']) {
      if (!hasKey(obj, k)) missingKeys.push(`第${n}条缺 ${k}`);
    }
    const cat = stringField(obj, 'cat');
    if (cat === null || !CAT_OK.has(cat)) badCat.push(`第${n}条 cat=${JSON.stringify(cat)}`);
    const img = stringField(obj, 'img');
    if (img === null) {
      imgProblems.push(`第${n}条 img 字段缺失或非字符串`);
    } else {
      const rel = resolveImg(img);
      imgSet.add(rel);
      if (!underAssetsImg(rel)) {
        imgProblems.push(`第${n}条 img 未指向 assets/img/：${img}`);
      } else if (!existsSync(join(ROOT, rel))) {
        imgProblems.push(`第${n}条 img 文件不存在：${rel}`);
      } else if (!/\.(svg|jpg|jpeg|png|webp)$/i.test(rel)) {
        imgProblems.push(`第${n}条 img 非图片格式：${rel}`);
      }
    }
  });

  check('每条 WORKS 含 id/title/img/palette', missingKeys.length === 0, missingKeys.slice(0, 5).join('; ') || `已检查 ${list.length} 条`);
  check('cat 只含 photo/design', badCat.length === 0, badCat.slice(0, 5).join('; ') || `已检查 ${list.length} 条`);
  check(
    'img 引用的 12 个图片文件真实存在于 assets/img/（jpg/svg）',
    imgProblems.length === 0 && imgSet.size === 12,
    imgProblems.slice(0, 5).join('; ') || `引用 ${imgSet.size} 个不重复文件`,
  );
}

// ---------------------------------------------------------------- 5. CSS 断点与动效偏好
{
  const layout = read('css/layout.css');
  check('css/layout.css 可读', layout !== null);
  for (const bp of ['1024', '700', '520']) {
    check(
      `layout.css 含 ${bp}px 档 media query`,
      layout !== null && new RegExp(`@media[^{]*${bp}\\s*px`, 'i').test(layout),
    );
  }
  const motion = read('css/motion.css');
  check(
    'motion.css 含 prefers-reduced-motion',
    motion !== null && /prefers-reduced-motion/.test(motion),
  );
}

// ---------------------------------------------------------------- 6. 无外部 URL（离线要求）
{
  const targets = ['index.html', ...cssFiles.map((f) => `css/${f}`), ...jsFiles.map((f) => `js/${f}`)];
  const hits = [];
  for (const t of targets) {
    const text = read(t);
    if (text === null) continue;
    const urls = findExternalUrls(text);
    if (urls.length) hits.push(`${t} → ${urls.slice(0, 5).join('；')}${urls.length > 5 ? `（等 ${urls.length} 处）` : ''}`);
  }
  check(
    'index.html/css/js 无 http(s):// 外部 URL',
    hits.length === 0,
    hits.length ? hits.join(' ｜ ') : `已扫描 ${targets.length} 个文件`,
  );
}

// ---------------------------------------------------------------- 7. HTML class 与 CSS 定义对应
{
  const cssText = cssFiles.map((f) => read(`css/${f}`) ?? '').join('\n');

  const classRe = /class\s*=\s*["']([^"']+)["']/g;
  const htmlClasses = new Set();
  let m;
  while ((m = classRe.exec(htmlText))) {
    for (const c of m[1].trim().split(/\s+/)) {
      if (c) htmlClasses.add(c);
    }
  }

  // JS 动态生成的类（main.js / effects.js 渲染或切换，CSS 已有对应定义）：白名单跳过
  const JS_GENERATED = /^(work-row|work-row-.+|viewer|viewer-.+|char|float-img|showcase-slide|showcase-.+)$/;
  const STATE_CLASSES = /^(is-active|is-open|is-locked|is-glitch|in|has-cursor|is-view|is-link)$/;

  const undefinedClasses = [...htmlClasses].filter((c) => {
    if (JS_GENERATED.test(c)) return false;
    if (STATE_CLASSES.test(c)) return false;
    return !new RegExp(`\\.${escapeRegExp(c)}(?![\\w-])`).test(cssText);
  });

  check(
    'index.html 的每个 class 都在 CSS 中有定义',
    undefinedClasses.length === 0,
    undefinedClasses.length
      ? `未定义: ${undefinedClasses.join(', ')}`
      : `共 ${htmlClasses.size} 个 class（含 JS 动态生成/状态类白名单）`,
  );
}

// ---------------------------------------------------------------- 8. 缓存 bust（?v=）
{
  const refs = [];
  const re = /(?:href|src)\s*=\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(htmlText))) {
    const v = m[1];
    if (/^(css|js)\//.test(v)) refs.push(v);
  }
  const missing = refs.filter((v) => !/\?v=/.test(v));
  check(
    'css/js 引用全部带 ?v= 缓存 bust',
    refs.length > 0 && missing.length === 0,
    missing.length ? `缺失: ${missing.join(', ')}` : `共 ${refs.length} 个引用`,
  );
}

// ---------------------------------------------------------------- 9. viewer role=dialog
{
  const m = htmlText.match(/<[^>]*data-js\s*=\s*["']viewer["'][^>]*>/);
  check(
    'data-js="viewer" 的元素有 role="dialog"',
    m !== null && /role\s*=\s*["']dialog["']/.test(m[0]),
    m ? m[0].slice(0, 80) + '…' : '未找到 viewer 元素',
  );
}

// ---------------------------------------------------------------- 10. v2.2 横移画廊 + 导航 hover
{
  check('无 ?v=2.1 残留', !/\?v=2\.1/.test(htmlText));
  check('静态资源版本为 ?v=2.2', /\?v=2\.2/.test(htmlText));

  const layoutCss = read('css/layout.css') ?? '';
  const motionCss = read('css/motion.css') ?? '';
  const mainJs = read('js/main.js') ?? '';
  const effectsJs = read('js/effects.js') ?? '';

  check(
    'motion.css 含 panel-zoom（Ken Burns）',
    /@keyframes\s+panel-zoom/.test(motionCss),
  );
  check(
    'motion.css 含 caption 分层入场（nth-child 延迟）',
    /\.showcase-slide\.is-active\s+\.showcase-cap\s*>\s*:nth-child\(4\)/.test(motionCss),
  );
  check(
    'layout.css 含 #16A34A（导航 hover 绿底）',
    /#16A34A/i.test(layoutCss),
  );
  check(
    'layout.css 含 .nav-rail a:hover 规则',
    /\.nav-rail\s+a:hover/.test(layoutCss),
  );
  check(
    'layout.css .showcase-slides 为横向轨道（flex + max-content）',
    /\.showcase-slides\s*\{[^}]*display\s*:\s*flex/.test(layoutCss) &&
      /width\s*:\s*max-content/.test(layoutCss),
  );
  check(
    'layout.css .showcase-slide 为固定尺寸面板',
    /width\s*:\s*min\(\s*72vw\s*,\s*900px\s*\)/.test(layoutCss) &&
      /height\s*:\s*min\(\s*76svh\s*,\s*720px\s*\)/.test(layoutCss),
  );
  check(
    'main.js renderShowcase 含 4 层 caption（含 cap-cat）',
    /showcase-cap-index/.test(mainJs) &&
      /showcase-cap-title/.test(mainJs) &&
      /showcase-cap-en/.test(mainJs) &&
      /showcase-cap-cat/.test(mainJs),
  );
  check(
    'effects.js initShowcase 用 translate3d 横移轨道',
    /translate3d\(['"]?\s*\+?\s*\(\s*-p\s*\*\s*travel\s*\)/.test(effectsJs) ||
      /translate3d/.test(effectsJs),
  );
}

// ---------------------------------------------------------------- 汇总
console.log('--------------------------------------------------');
console.log(`汇总：${passed} 通过 / ${failed} 失败`);
process.exit(failed === 0 ? 0 : 1);
