/* ============================================================
 * cristi-portfolio · effects.js
 * 动效层：全部挂载到 window.PF 命名空间。
 *
 * 约定：
 *  - DOM 查询一律走 [data-js="..."] 属性钩子；唯一例外是 initReveal
 *    查 .reveal（入场样式类，没有对应的 data-js 钩子）。
 *  - 状态类：.is-active（选中/展开） .in（入场完成） .is-hover（光标悬停态）。
 *  - 防御性编码：钩子元素不存在时静默跳过，不抛错、无 console 输出。
 *  - 无外部请求。
 * ============================================================ */
(function () {
  'use strict';

  var PF = (window.PF = window.PF || {});

  /* ---------- 内部工具：只按 data-js 钩子查询 ---------- */
  function byHook(name) {
    return document.querySelector('[data-js="' + name + '"]');
  }
  function allHooks(name) {
    return Array.prototype.slice.call(
      document.querySelectorAll('[data-js="' + name + '"]')
    );
  }
  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  /* ============================================================
   * PF.initCursor —— 自定义光标跟随（rAF）
   * 触屏双保险：matchMedia('(pointer: coarse)') 直接禁用；
   * 另监听一次 touchstart，混合设备上即时拆除。
   * ============================================================ */
  PF.initCursor = function () {
    var dot = byHook('cursor-dot');
    var ring = byHook('cursor-ring');
    if (!dot || !ring) return; // HTML 未提供光标元素：静默跳过

    var coarse =
      window.matchMedia &&
      window.matchMedia('(pointer: coarse)').matches;
    var reduceMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (coarse || reduceMotion) {
      dot.style.display = 'none';
      ring.style.display = 'none';
      return;
    }

    // 初始化成功：body 加 .has-cursor（CSS 据此显示光标并隐藏系统光标）
    document.body.classList.add('has-cursor');

    var x = -100, y = -100, rx = -100, ry = -100;
    var shown = false, active = true, raf = 0;

    dot.style.opacity = '0';
    ring.style.opacity = '0';

    function onMove(e) {
      x = e.clientX;
      y = e.clientY;
      if (!shown) {
        shown = true;
        rx = x;
        ry = y;
        dot.style.opacity = '1';
        ring.style.opacity = '1';
      }
    }

    function loop() {
      if (!active) return;
      rx += (x - rx) * 0.16; // 圆环滞后跟随
      ry += (y - ry) * 0.16;
      dot.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      raf = requestAnimationFrame(loop);
    }

    // 触屏第二道保险：首次触摸即拆除光标
    function kill() {
      if (!active) return;
      active = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      dot.style.display = 'none';
      ring.style.display = 'none';
      document.body.classList.remove('has-cursor');
      dot.classList.remove('is-hover');
      ring.classList.remove('is-hover');
    }
    window.addEventListener('touchstart', kill, { passive: true, once: true });

    // 悬停可交互元素 → 光标元素本身加 .is-hover（放大态由 CSS 负责）
    var HOVER_SEL =
      'a, button, input, textarea, select, label, ' +
      '[data-js="work-card"], [data-js="tab"], [data-js="menu-btn"]';
    document.addEventListener('mouseover', function (e) {
      var t =
        e.target && e.target.closest ? e.target.closest(HOVER_SEL) : null;
      dot.classList.toggle('is-hover', !!t);
      ring.classList.toggle('is-hover', !!t);
    });

    // 鼠标离窗隐藏、回窗恢复
    document.addEventListener('mouseleave', function () {
      dot.style.opacity = '0';
      ring.style.opacity = '0';
    });
    document.addEventListener('mouseenter', function () {
      if (shown) {
        dot.style.opacity = '1';
        ring.style.opacity = '1';
      }
    });

    window.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(loop);
  };

  /* ============================================================
   * PF.initReveal —— 滚动入场：IntersectionObserver 给 .reveal 加 .in
   * （.reveal 是唯一的样式类查询例外：入场元素没有 data-js 钩子）
   * ============================================================ */
  PF.initReveal = function () {
    var els = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (!els.length) return;

    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
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
      { threshold: 0.15, rootMargin: '0px 0px -6% 0px' }
    );
    els.forEach(function (el) { io.observe(el); });
  };

  /* ============================================================
   * PF.initProgress —— 顶部滚动进度条
   * ============================================================ */
  PF.initProgress = function () {
    var wrap = byHook('progress');
    if (!wrap) return;

    var ticking = false;
    function update() {
      ticking = false;
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var p = max > 0 ? h.scrollTop / max : 0;
      // 进度条走 transform: scaleX(var(--p))，transform-only
      wrap.style.setProperty('--p', clamp(p, 0, 1).toFixed(4));
    }
    function requestTick() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }
    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('resize', requestTick);
    update();
  };

  /* ============================================================
   * PF.initTabs —— 作品分类筛选（all / photo / design）+ stagger 重播
   * 按钮过滤键取 data-tab（兼容 data-filter）
   * ============================================================ */
  PF.initTabs = function () {
    var tabs = allHooks('tab');
    if (!tabs.length) return;

    tabs.forEach(function (btn) {
      btn.addEventListener('click', function () {
        tabs.forEach(function (b) {
          b.classList.remove('is-active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');
        var f =
          btn.getAttribute('data-tab') ||
          btn.getAttribute('data-filter') ||
          'all';
        if (typeof PF.renderWorks === 'function') PF.renderWorks(f);
      });
    });
  };

  /* ============================================================
   * PF.initSkills —— 技能条：由 PF.SKILLS 渲染 + 宽度动画
   * CSS 约定：.skill-fill 用 --w（0~1 小数）+ scaleX 做 transform-only 动画。
   * HTML 无 skills 容器时，在 [data-js="about"] 末尾自动创建。
   * 另附带 [data-js="stat-num"] 数字滚动（data-count）。
   * ============================================================ */
  PF.initSkills = function () {
    var skills = PF.SKILLS || [];

    // 1) 渲染技能条
    var box = byHook('skills');
    if (!box && skills.length) {
      var about = byHook('about');
      if (!about) return;
      box = document.createElement('div');
      box.className = 'skills';
      box.setAttribute('data-js', 'skills');
      skills.forEach(function (s) {
        var item = document.createElement('div');
        item.className = 'skill';

        var head = document.createElement('div');
        head.className = 'skill-head';
        var name = document.createElement('span');
        name.textContent = s.name || '';
        var pct = document.createElement('span');
        pct.className = 'pct';
        pct.textContent = clamp(parseInt(s.level, 10) || 0, 0, 100) + '%';
        head.appendChild(name);
        head.appendChild(pct);

        var track = document.createElement('div');
        track.className = 'skill-track';
        var fill = document.createElement('div');
        fill.className = 'skill-fill';
        fill.setAttribute('data-level', String(clamp(parseInt(s.level, 10) || 0, 0, 100)));
        // 初始态：scaleX(0)；transform-only 保证动画流畅
        fill.style.transform = 'scaleX(0)';
        fill.style.transformOrigin = 'left center';
        fill.style.transition =
          'transform 1s cubic-bezier(0.2, 0.7, 0.2, 1)';
        fill.style.setProperty('--w', '0');
        track.appendChild(fill);

        item.appendChild(head);
        item.appendChild(track);
        box.appendChild(item);
      });
      about.appendChild(box);
    }

    // 2) 进入视口后 stagger 展开
    var fills = box
      ? Array.prototype.slice.call(box.querySelectorAll('.skill-fill'))
      : [];
    function lightUp() {
      fills.forEach(function (fill, i) {
        var lv = clamp(parseInt(fill.getAttribute('data-level'), 10) || 0, 0, 100);
        window.setTimeout(function () {
          fill.style.setProperty('--w', String(lv / 100));
          fill.style.transform = 'scaleX(' + lv / 100 + ')';
        }, i * 120);
      });
    }
    if (!fills.length) {
      /* 无技能条：直接进入数字滚动 */
    } else if ('IntersectionObserver' in window && box) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            lightUp();
            io.disconnect();
          }
        });
      }, { threshold: 0.3 });
      io.observe(box);
    } else {
      lightUp();
    }

    // 3) stat-num 数字滚动
    var nums = allHooks('stat-num');
    if (!nums.length) return;
    function countUp(el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      if (isNaN(target)) return;
      var dur = 1200;
      var t0 = null;
      function step(ts) {
        if (t0 === null) t0 = ts;
        var p = clamp((ts - t0) / dur, 0, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    if ('IntersectionObserver' in window) {
      var nio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            countUp(en.target);
            nio.unobserve(en.target);
          }
        });
      }, { threshold: 0.5 });
      nums.forEach(function (n) { nio.observe(n); });
    } else {
      nums.forEach(countUp);
    }
  };

  /* ============================================================
   * PF.initMenu —— 移动端菜单开合
   * 状态挂在 [data-js="nav"] 元素上的 .is-open（CSS：.nav.is-open .nav-links）
   * ============================================================ */
  PF.initMenu = function () {
    var btn = byHook('menu-btn');
    var nav = byHook('nav');
    if (!btn || !nav) return;

    function set(open) {
      nav.classList.toggle('is-open', open);
      btn.classList.toggle('is-active', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    }
    btn.addEventListener('click', function () {
      set(!nav.classList.contains('is-open'));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) set(false);
    });
  };

  /* ============================================================
   * PF.initSmoothScroll —— 锚点平滑滚动，抵消固定导航高度
   * ============================================================ */
  PF.initSmoothScroll = function () {
    document.addEventListener('click', function (e) {
      var a =
        e.target && e.target.closest
          ? e.target.closest('a[href^="#"]')
          : null;
      if (!a) return;
      var hash = a.getAttribute('href');
      if (!hash || hash === '#') return;
      var target = document.getElementById(hash.slice(1));
      if (!target) return;

      e.preventDefault();
      var nav = byHook('nav');
      var offset = nav ? nav.offsetHeight : 72;
      var top =
        target.getBoundingClientRect().top + window.pageYOffset - offset - 8;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });

      // 若移动菜单开着，随手关掉（状态在 nav.is-open 上）
      var btn = byHook('menu-btn');
      if (nav && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        if (btn) {
          btn.classList.remove('is-active');
          btn.setAttribute('aria-expanded', 'false');
          btn.setAttribute('aria-label', '打开菜单');
        }
      }
      if (window.history && history.replaceState) {
        history.replaceState(null, '', hash);
      }
    });
  };
})();
