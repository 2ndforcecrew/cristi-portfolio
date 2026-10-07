/* ============================================================
 * cristi-portfolio · effects.js（v2.0 重写）
 * 动效层：全部挂载到 window.PF 命名空间，经典 script（非 module）。
 *
 * 导出：
 *  PF.initCursor   (M3) 自定义光标：dot 即时跟随＋ring rAF lerp；
 *                       [data-cursor="view"] 行 hover 时 ring 扩 84px＋显 VIEW
 *  PF.initDecode   (M1) 解码文字入场（IO 触发一次，~600ms）
 *  PF.initStagger  (M2) hero-title 按字拆 .char，--d = i*45ms
 *  PF.initGlitch   (M6) hero-title 每 ~7s 故障切片 280ms
 *  PF.initFloatImg (M4) 作品行悬停浮图（单例，rAF lerp 跟随）
 *  PF.initRail     (M8) 边缘导航 IO 高亮 .is-active
 *  PF.initReveal   (M13) 板块入场 .reveal → .in
 *  PF.initProgress (M11) 顶部滚动进度条（rAF 节流）
 *  PF.initShowcase (M14) 纵滚驱动横移画廊（sticky + translate3d 轨道）
 *
 * 约定：
 *  - DOM 查询一律走 [data-js="..."] 钩子；例外：.reveal（入场样式类，
 *    无对应钩子，沿用 v1 约定）、.progress-bar（progress 钩子内部子元素）、
 *    [data-cursor="view"]（main.js 动态渲染的行，属性选择器）。
 *  - 状态类只用白名单：has-cursor / in / is-active / is-glitch / char；
 *    其余视觉态走内联样式，不新增类名契约。
 *  - 防御性编码：钩子缺失静默跳过，不抛错、无 console 输出、无外部请求。
 *
 * 给 CSS / main.js 实现者的契约：
 *  - html.has-cursor 下 *{cursor:none}；.cursor-dot/.cursor-ring 必须用
 *    `translate: -50% -50%` 做居中（JS 写内联 transform，会覆盖 transform 属性）。
 *  - .cursor-ring 需要 width/height/opacity 的 transition；VIEW 文字排版
 *    （mono 居中）由 CSS 负责，JS 只填 textContent。
 *  - .float-img 初始 opacity:0 + visibility:hidden（移动端 display:none），
 *    需要 opacity transition 做淡入淡出。
 *  - .hero-title.is-glitch 的 ::before/::after 用 attr(data-text) 做切片。
 *  - .char 用 var(--d) 做 transition-delay；父级 overflow:hidden 做遮罩。
 *  - main.js 渲染的作品行须带 data-cursor="view" 与 data-id（对应 PF.WORKS id）。
 * ============================================================ */
(function () {
  'use strict';

  var PF = (window.PF = window.PF || {});

  /* ---------------- 环境门控 ---------------- */
  var REDUCED = !!(
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  var FINE = !!(
    window.matchMedia &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
  );
  function narrow() {
    return window.innerWidth <= 700;
  }

  /* ---------------- rAF 垫片 ---------------- */
  var raf = (function () {
    if (window.requestAnimationFrame) {
      return function (fn) {
        return window.requestAnimationFrame(fn);
      };
    }
    return function (fn) {
      return window.setTimeout(function () {
        fn(Date.now());
      }, 16);
    };
  })();
  var caf = (function () {
    if (window.cancelAnimationFrame) {
      return function (id) {
        window.cancelAnimationFrame(id);
      };
    }
    return function (id) {
      window.clearTimeout(id);
    };
  })();

  /* ---------------- data-js 查询 ---------------- */
  function byHook(name) {
    return document.querySelector('[data-js="' + name + '"]');
  }
  function allHooks(name) {
    return Array.prototype.slice.call(
      document.querySelectorAll('[data-js="' + name + '"]')
    );
  }

  /* ---------------- 防重复初始化 ---------------- */
  var inited = {};
  function once(key) {
    if (inited[key]) return true;
    inited[key] = true;
    return false;
  }

  /* ============================================================
   * 共享 rAF ticker（M3 光标 ring＋M4 浮图共用）
   * visibilitychange：hidden 暂停，visible 恢复。
   * ============================================================ */
  var tickFns = [];
  var tickOn = false;
  var tickId = 0;

  function tickLoop() {
    if (!tickOn) return;
    for (var i = 0; i < tickFns.length; i++) {
      try {
        tickFns[i]();
      } catch (e) {
        /* 单个 tick 失败不影响其余，静默 */
      }
    }
    tickId = raf(tickLoop);
  }
  function tickStart() {
    if (tickOn || !tickFns.length) return;
    tickOn = true;
    if (document.hidden) return; // 等 visible 时由 visibilitychange 恢复
    tickId = raf(tickLoop);
  }
  function tickStop() {
    tickOn = false;
    if (tickId) {
      caf(tickId);
      tickId = 0;
    }
  }
  function tickAdd(fn) {
    if (typeof fn !== 'function') return;
    if (tickFns.indexOf(fn) === -1) tickFns.push(fn);
    tickStart();
  }
  if (document.addEventListener) {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) tickStop();
      else tickStart();
    });
  }

  /* ============================================================
   * PF.initCursor (M3) —— 自定义光标
   * 门控：仅 FINE 且 >700px 且 !REDUCED 初始化；否则隐藏光标元素。
   * 首次 mousemove 后 html 加 .has-cursor（CSS 据此隐藏原生光标）。
   * [data-cursor="view"] 行 hover：ring 扩到 84px、内显 VIEW、dot 隐藏。
   * ============================================================ */
  PF.initCursor = function () {
    if (once('cursor')) return;
    var dot = byHook('cursor-dot');
    var ring = byHook('cursor-ring');
    if (!dot || !ring) return;

    if (REDUCED || !FINE || narrow()) {
      dot.style.display = 'none';
      ring.style.display = 'none';
      return;
    }

    // 光标元素不拦截鼠标事件（双保险，CSS 也应设 pointer-events:none）
    dot.style.pointerEvents = 'none';
    ring.style.pointerEvents = 'none';

    var html = document.documentElement;
    var mx = -100,
      my = -100,
      rx = -100,
      ry = -100;
    var seen = false; // 是否收到过 mousemove
    var outside = false; // 光标是否离开窗口
    var viewEl = null; // 当前 hover 的 [data-cursor="view"] 行

    dot.style.opacity = '0';
    ring.style.opacity = '0';

    function paint() {
      var on = seen && !outside;
      ring.style.opacity = on ? '1' : '0';
      dot.style.opacity = on && !viewEl ? '1' : '0'; // VIEW 态 dot 隐藏
    }

    // ring 滞后跟随：注册到共享 ticker
    tickAdd(function () {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
    });

    function onMove(e) {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)'; // 即时跟随
      if (!seen) {
        seen = true;
        rx = mx;
        ry = my;
        html.classList.add('has-cursor');
        paint();
      }
    }
    window.addEventListener('mousemove', onMove, { passive: true });

    function setView(row) {
      if (row === viewEl) return;
      viewEl = row;
      // VIEW 态走 CSS 类（.cursor-ring.is-view：84px 荧光圆＋::after 显 VIEW 字）
      ring.classList.toggle('is-view', !!row);
      paint();
    }

    // 事件委托：作品行由 main.js 动态渲染；
    // 非作品行的链接/按钮 hover 时 ring 缩 0.7（.is-link）
    function closestView(t) {
      return t && t.closest ? t.closest('[data-cursor="view"]') : null;
    }
    function closestLink(t) {
      return t && t.closest ? t.closest('a,button') : null;
    }
    document.addEventListener('mouseover', function (e) {
      var row = closestView(e.target);
      setView(row);
      ring.classList.toggle('is-link', !row && !!closestLink(e.target));
    });
    document.addEventListener('mouseout', function (e) {
      if (viewEl) {
        var to = e.relatedTarget;
        if (!to || closestView(to) !== viewEl) setView(null);
      }
    });

    // 离窗隐藏、回窗恢复
    document.addEventListener('mouseleave', function () {
      outside = true;
      paint();
    });
    document.addEventListener('mouseenter', function () {
      outside = false;
      paint();
    });
  };

  /* ============================================================
   * PF.initDecode (M1) —— 解码文字入场
   * [data-js="decode"] 进入视口（IO，一次）：从左到右逐字解码，~600ms 定稿。
   * 字符集：CJK 池（日月水火木金土人手心言）＋符号/数字池。
   * REDUCED / 非 FINE / ≤700px：直接显示终稿（HTML 里已是终稿文本）。
   * ============================================================ */
  var DECODE_CJK = '日月水火木金土人手心言';
  var DECODE_SYM = '×/\\|<>[]{}#$%&*@!?+=01';
  var DECODE_POOL = DECODE_CJK + DECODE_SYM;
  function randGlyph() {
    return DECODE_POOL.charAt(Math.floor(Math.random() * DECODE_POOL.length));
  }

  function decodeEl(el) {
    var finalText = el.textContent;
    if (!finalText) return;
    var chars = Array.from(finalText);
    var dur = 600;
    var t0 = 0;
    function frame(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var settled = Math.floor(p * chars.length);
      var out = '';
      for (var i = 0; i < chars.length; i++) {
        var c = chars[i];
        if (i < settled || c === ' ' || c === '\n' || c === '\t') out += c;
        else out += randGlyph();
      }
      el.textContent = out;
      if (p < 1) {
        raf(frame);
      } else {
        el.textContent = finalText; // 确保与终稿一字不差
      }
    }
    raf(frame);
  }

  PF.initDecode = function () {
    if (once('decode')) return;
    var els = allHooks('decode');
    if (!els.length) return;
    // 降级：直接终稿
    if (REDUCED || !FINE || narrow()) return;
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          io.unobserve(en.target);
          decodeEl(en.target);
        });
      },
      { threshold: 0.4 }
    );
    els.forEach(function (el) {
      // 含子元素的节点跳过（只处理纯文本，避免破坏结构）
      if (!el.querySelector('*')) io.observe(el);
    });
  };

  /* ============================================================
   * PF.initStagger (M2) —— hero 标题逐字 stagger
   * 按字拆成 .char span（中文按字），--d = i*45ms；首屏立即执行。
   * REDUCED 由 CSS 侧处理（无位移直接显示），JS 照常拆字。
   * ============================================================ */
  PF.initStagger = function () {
    if (once('stagger')) return;
    var title = byHook('hero-title');
    if (!title) return;
    if (title.querySelector('.char')) return; // 已拆过：防重复执行
    var text = title.textContent;
    if (!text) return;
    title.setAttribute('aria-label', text);
    title.textContent = '';
    Array.from(text).forEach(function (ch, i) {
      var s = document.createElement('span');
      s.className = 'char';
      s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--d', i * 45 + 'ms');
      s.textContent = ch === ' ' ? ' ' : ch;
      title.appendChild(s);
    });
    // 触发入场：等首帧把 110% 初始态绘制出来后再加 .in，
    // stagger 过渡才能跑起来（CSS：.hero-title.in .char）
    raf(function () {
      raf(function () {
        title.classList.add('in');
      });
    });
  };

  /* ============================================================
   * PF.initGlitch (M6) —— 故障切片
   * hero-title 每 ~7s 加 .is-glitch，280ms 后移除；
   * document.hidden 时暂停；REDUCED 跳过。
   * （data-text 已在 HTML 上，伪元素用 attr(data-text) 复制文字）
   * ============================================================ */
  PF.initGlitch = function () {
    if (once('glitch')) return;
    if (REDUCED || narrow()) return; // 移动端不执行（BUILD_PLAN §3 M6）
    var title = byHook('hero-title');
    if (!title) return;
    if (!title.getAttribute('data-text')) {
      title.setAttribute('data-text', title.textContent || '');
    }
    function zap() {
      if (!document.hidden) {
        title.classList.add('is-glitch');
        window.setTimeout(function () {
          title.classList.remove('is-glitch');
        }, 280);
      }
      window.setTimeout(zap, 6500 + Math.random() * 2500); // ~7s
    }
    window.setTimeout(zap, 4000 + Math.random() * 3000);

    // 作品行 hover：标题做一次 150ms 故障切片（行由 main.js 动态渲染，事件委托）
    var rowBusy = null;
    document.addEventListener('mouseover', function (e) {
      var row =
        e.target && e.target.closest
          ? e.target.closest('.work-row')
          : null;
      if (!row || row === rowBusy) return;
      rowBusy = row;
      var t = row.querySelector('.work-row-title');
      if (t) {
        if (!t.getAttribute('data-text')) {
          t.setAttribute('data-text', t.textContent || '');
        }
        t.classList.add('is-glitch');
        window.setTimeout(function () {
          t.classList.remove('is-glitch');
        }, 150);
      }
    });
    document.addEventListener('mouseout', function (e) {
      if (!rowBusy) return;
      var to = e.relatedTarget;
      if (
        !to ||
        !to.closest ||
        to.closest('.work-row') !== rowBusy
      ) {
        rowBusy = null;
      }
    });
  };

  /* ============================================================
   * PF.initFloatImg (M4) —— 作品行悬停浮图
   * 单例 [data-js="float-img"]；行 mouseenter 设 img src；
   * rAF lerp 跟随光标，偏移 (24,-40)，rotate(3deg)；
   * requestIdleCallback（无则 setTimeout）预加载全部作品图。
   * 门控：非 FINE 或 ≤700px 跳过（CSS 侧 display:none）。
   * ============================================================ */
  PF.initFloatImg = function () {
    if (once('floatimg')) return;
    if (REDUCED || !FINE || narrow()) return;
    var box = byHook('float-img');
    if (!box) return;
    var img = box.querySelector('img');
    if (!img) return;
    var works = PF.WORKS || [];

    box.style.pointerEvents = 'none';

    // 预加载全部作品图（首屏零成本：hover/viewer 时才需要）
    function preloadAll() {
      for (var i = 0; i < works.length; i++) {
        var src = works[i] && works[i].img;
        if (src) {
          var im = new Image();
          im.src = src;
        }
      }
    }
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(preloadAll, { timeout: 2500 });
    } else {
      window.setTimeout(preloadAll, 1200);
    }

    var tx = 0,
      ty = 0,
      cx = 0,
      cy = 0;
    var visible = false;

    // lerp 跟随：注册到共享 ticker
    tickAdd(function () {
      cx += (tx - cx) * 0.16;
      cy += (ty - cy) * 0.16;
      box.style.transform =
        'translate3d(' + cx + 'px,' + cy + 'px,0) rotate(3deg)';
    });

    function findWork(id) {
      for (var i = 0; i < works.length; i++) {
        if (works[i] && works[i].id === id) return works[i];
      }
      return null;
    }
    function show(row) {
      var w = findWork(row.getAttribute('data-id'));
      if (w && w.img && img.getAttribute('src') !== w.img) img.src = w.img;
      if (!visible) {
        visible = true;
        box.classList.add('is-on');
      }
    }
    function hide() {
      if (!visible) return;
      visible = false;
      box.classList.remove('is-on');
    }

    document.addEventListener(
      'mousemove',
      function (e) {
        tx = e.clientX + 24;
        ty = e.clientY - 40;
      },
      { passive: true }
    );

    // 事件委托：行由 main.js 动态渲染；
    // showcase 幻灯片不弹浮图（大图本身已是预览，VIEW 光标盘仍由 initCursor 负责）
    var cur = null;
    function closestView(t) {
      var el = t && t.closest ? t.closest('[data-cursor="view"]') : null;
      if (el && el.closest('.showcase')) return null;
      return el;
    }
    document.addEventListener('mouseover', function (e) {
      var row = closestView(e.target);
      if (row === cur) return;
      cur = row;
      if (row) show(row);
      else hide();
    });
    document.addEventListener('mouseout', function (e) {
      if (!cur) return;
      var to = e.relatedTarget;
      if (!to || closestView(to) !== cur) {
        cur = null;
        hide();
      }
    });
  };

  /* ============================================================
   * PF.initRail (M8) —— 边缘导航高亮
   * IO 监听各板块，当前可见板块的 nav-rail 链接加 .is-active。
   * 无 IO 时保持普通锚点导航（不加类）。
   * ============================================================ */
  PF.initRail = function () {
    if (once('rail')) return;
    var rail = byHook('nav-rail');
    if (!rail) return;
    var links = Array.prototype.slice.call(
      rail.querySelectorAll('a[href^="#"]')
    );
    if (!links.length) return;

    var secs = [];
    links.forEach(function (a) {
      var id = (a.getAttribute('href') || '').slice(1);
      if (!id) return;
      var sec = byHook(id) || document.getElementById(id);
      if (sec) secs.push({ id: id, link: a, el: sec });
    });
    if (!secs.length) return;

    function setActive(id) {
      secs.forEach(function (s) {
        s.link.classList.toggle('is-active', s.id === id);
      });
    }
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) setActive(en.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );
    secs.forEach(function (s) {
      io.observe(s.el);
    });
  };

  /* ============================================================
   * PF.initReveal (M13) —— 板块入场
   * IO 给 .reveal 加 .in（.reveal 是唯一的样式类查询例外）；
   * REDUCED 或无 IO：直接加 .in。
   * ============================================================ */
  PF.initReveal = function () {
    if (once('reveal')) return;
    var els = Array.prototype.slice.call(
      document.querySelectorAll('.reveal')
    );
    if (!els.length) return;

    if (REDUCED || !('IntersectionObserver' in window)) {
      els.forEach(function (el) {
        el.classList.add('in');
      });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('in');
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    els.forEach(function (el) {
      io.observe(el);
    });
  };

  /* ============================================================
   * PF.initShowcase (M14) —— 纵滚驱动横移画廊（Locomotive 式）
   * .showcase-sec 很高，.showcase 用 sticky 钉住视口；
   * 按滚动进度把横向轨道 translate3d 横移；
   * 当前面板 = 面板中心最接近视口中心的那个，切 .is-active，
   * 触发分层 caption 入场 + Ken Burns；同步计数器与底部进度条。
   * REDUCED：位移照常（用户滚动驱动），动效由 CSS 总闸关闭。
   * ============================================================ */
  PF.initShowcase = function () {
    if (once('showcase')) return;
    var sec = byHook('showcase-sec');
    var box = byHook('showcase');
    if (!sec || !box) return;
    var track = byHook('showcase-slides');
    var idxEl = byHook('showcase-idx');
    var barEl = byHook('showcase-bar');
    if (!track) return;

    var slides = [];
    var cur = -1;
    var travel = 0; // 轨道总行程（px）
    function collect() {
      slides = Array.prototype.slice.call(
        track.querySelectorAll('.showcase-slide')
      );
    }
    collect();
    if (!slides.length) return;

    function pad(n) {
      return (n < 10 ? '0' : '') + n;
    }
    function setActive(i) {
      if (i === cur) return;
      cur = i;
      slides.forEach(function (s, k) {
        s.classList.toggle('is-active', k === i);
        s.setAttribute('aria-hidden', k === i ? 'false' : 'true');
        s.tabIndex = k === i ? 0 : -1;
      });
      if (idxEl) idxEl.textContent = pad(i + 1);
    }

    // 按轨道实际宽度设定滚动行程：travel + 1.2 屏
    function measure() {
      travel = Math.max(0, track.scrollWidth - box.clientWidth);
      sec.style.height =
        Math.round(travel + window.innerHeight * 1.2) + 'px';
    }

    var ticking = false;
    function update() {
      ticking = false;
      // slides 可能由 main.js 后渲染：每次重采，数量变化时重置
      var fresh = track.querySelectorAll('.showcase-slide');
      if (fresh.length !== slides.length) {
        collect();
        cur = -1;
      }
      if (!slides.length) return;
      var r = sec.getBoundingClientRect();
      var total = r.height - window.innerHeight;
      var p = total > 0 ? -r.top / total : 0;
      p = Math.max(0, Math.min(1, p));
      // 横移轨道
      track.style.transform =
        'translate3d(' + (-p * travel).toFixed(1) + 'px,0,0)';
      // 当前面板：中心最接近视口中心的那个
      var vc = window.innerWidth / 2;
      var best = 0;
      var bestD = Infinity;
      slides.forEach(function (s, k) {
        var c = s.offsetLeft + s.offsetWidth / 2 - p * travel;
        var d = Math.abs(c - vc);
        if (d < bestD) {
          bestD = d;
          best = k;
        }
      });
      setActive(best);
      if (barEl) {
        barEl.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      }
    }
    function requestTick() {
      if (!ticking) {
        ticking = true;
        raf(update);
      }
    }
    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('resize', function () {
      measure();
      requestTick();
    });
    measure();
    update();
  };

  /* ============================================================
   * PF.initProgress (M11) —— 顶部滚动进度条（scroll rAF 节流）
   * 优先写 .progress-bar 的 transform: scaleX；无该子元素时回退 --p 变量。
   * 颜色（neon）由 CSS 负责。
   * ============================================================ */
  PF.initProgress = function () {
    if (once('progress')) return;
    var wrap = byHook('progress');
    if (!wrap) return;
    var bar = wrap.querySelector('.progress-bar');

    var ticking = false;
    function update() {
      ticking = false;
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var y = h.scrollTop || window.pageYOffset || 0;
      var p = max > 0 ? y / max : 0;
      p = Math.max(0, Math.min(1, p));
      if (bar) {
        bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      } else {
        wrap.style.setProperty('--p', p.toFixed(4));
      }
    }
    function requestTick() {
      if (!ticking) {
        ticking = true;
        raf(update);
      }
    }
    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('resize', requestTick);
    update();
  };
})();
