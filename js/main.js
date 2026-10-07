/* ============================================================
 * cristi-portfolio · main.js
 * 业务层：作品列表渲染 / 筛选 / 全屏 viewer / 服务手风琴 /
 *         数字滚动 / 年份 / boot 编排。全部挂 window.PF，
 * 经典 script（data.js → effects.js → main.js），无外部依赖。
 * 防御性编码：钩子缺失静默跳过，不抛错，无 console 输出。
 * ============================================================ */
(function () {
  'use strict';

  var PF = (window.PF = window.PF || {});

  var REDUCED = (typeof window.matchMedia === 'function') &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 分类中文名 */
  var CAT_LABEL = { photo: '时装摄影', design: '平面设计' };

  /* 当前渲染出的作品数组（viewer 上下件在其范围内导航） */
  var _listItems = [];

  /* ---------- 小工具 ---------- */
  function each(nodeList, fn) {
    if (!nodeList) return;
    Array.prototype.forEach.call(nodeList, fn);
  }

  function pad2(n) {
    return ('0' + n).slice(-2);
  }

  /* 按背景色亮度决定其上的文字用深色还是浅色 */
  function textOn(hex) {
    var m = (typeof hex === 'string') ? hex.replace('#', '') : '';
    if (m.length === 3) m = m[0] + m[0] + m[1] + m[1] + m[2] + m[2];
    if (!/^[0-9a-fA-F]{6}$/.test(m)) return '#F5F5F3';
    var r = parseInt(m.substr(0, 2), 16);
    var g = parseInt(m.substr(2, 2), 16);
    var b = parseInt(m.substr(4, 2), 16);
    var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.55 ? '#0A0A0C' : '#F5F5F3';
  }

  /* ============================================================
   * PF.renderWorks(filter)
   * 从 PF.WORKS 渲染作品行到 [data-js="works-list"]。
   * filter: 'all' | 'photo' | 'design'
   * ============================================================ */
  PF.renderWorks = function (filter) {
    var list = document.querySelector('[data-js="works-list"]');
    if (!list) return;

    var works = Array.isArray(PF.WORKS) ? PF.WORKS : [];
    var f = (filter === 'photo' || filter === 'design') ? filter : 'all';
    var items = works.filter(function (w) {
      return f === 'all' || w.cat === f;
    });
    _listItems = items;

    var frag = document.createDocumentFragment();

    items.forEach(function (w, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'work-row';
      btn.setAttribute('data-js', 'work-row');
      btn.setAttribute('data-id', w.id);
      btn.setAttribute('data-cat', w.cat);
      btn.setAttribute('data-cursor', 'view');
      btn.setAttribute('aria-label', w.title + ' — 查看作品');

      var idx = document.createElement('span');
      idx.className = 'work-row-index';
      idx.textContent = pad2(i + 1);

      var titles = document.createElement('span');
      titles.className = 'work-row-titles';
      var title = document.createElement('span');
      title.className = 'work-row-title';
      title.textContent = w.title;
      var en = document.createElement('span');
      en.className = 'work-row-en';
      en.textContent = w.titleEn;
      titles.appendChild(title);
      titles.appendChild(en);

      var meta = document.createElement('span');
      meta.className = 'work-row-meta';
      var cat = document.createElement('span');
      cat.className = 'work-row-cat';
      cat.textContent = CAT_LABEL[w.cat] || w.cat;
      var year = document.createElement('span');
      year.className = 'work-row-year';
      year.textContent = w.year;
      meta.appendChild(cat);
      meta.appendChild(year);

      btn.appendChild(idx);
      btn.appendChild(titles);
      btn.appendChild(meta);
      frag.appendChild(btn);
    });

    list.innerHTML = '';
    list.appendChild(frag);

    var countEl = document.querySelector('[data-js="works-count"]');
    if (countEl) countEl.textContent = String(items.length);
  };

  /* ============================================================
   * PF.initTabs — 胶囊筛选
   * 淡出 → 重渲染 → 逐行 stagger 淡入；REDUCED 直接切换。
   * ============================================================ */
  PF.initTabs = function () {
    var tabs = document.querySelector('[data-js="tabs"]');
    var list = document.querySelector('[data-js="works-list"]');
    if (!tabs || !list) return;
    var buttons = Array.prototype.slice.call(
      tabs.querySelectorAll('[data-js="tab"]')
    );
    if (!buttons.length) return;

    var current = 'all';
    var fadeTimer = null;

    function activate(btn) {
      buttons.forEach(function (b) {
        var on = (b === btn);
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }

    function renderIn(filter) {
      PF.renderWorks(filter);
      var rows = list.querySelectorAll('[data-js="work-row"]');
      if (REDUCED || !rows.length) return;
      /* 逐行 stagger 淡入（内联样式，不依赖 CSS 类名） */
      each(rows, function (row) {
        row.style.opacity = '0';
        row.style.transform = 'translateY(14px)';
      });
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          each(rows, function (row, i) {
            row.style.transition =
              'opacity .45s ease ' + (i * 60) + 'ms,' +
              'transform .45s ease ' + (i * 60) + 'ms';
            row.style.opacity = '1';
            row.style.transform = 'translateY(0)';
          });
          setTimeout(function () {
            each(rows, function (row) { row.style.transition = ''; });
          }, rows.length * 60 + 520);
        });
      });
    }

    function switchTo(filter) {
      if (filter === current) return;
      current = filter;
      if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
      if (REDUCED) { renderIn(filter); return; }
      list.style.transition = 'opacity .18s ease';
      list.style.opacity = '0';
      fadeTimer = setTimeout(function () {
        fadeTimer = null;
        renderIn(filter);
        list.style.opacity = '1';
        setTimeout(function () {
          list.style.transition = '';
          list.style.opacity = '';
        }, 260);
      }, 190);
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        activate(btn);
        switchTo(btn.getAttribute('data-tab') || 'all');
      });
    });

    /* 初始渲染 */
    PF.renderWorks('all');
  };

  /* ============================================================
   * PF.initViewer — 全屏作品 viewer（M5）
   * 打开/关闭/上一件/下一件/键盘/焦点返回/滚动锁定。
   * ============================================================ */
  var _viewer = { open: false, index: -1, trigger: null };

  function viewerEls() {
    return {
      root:  document.querySelector('[data-js="viewer"]'),
      img:   document.querySelector('[data-js="viewer-img"]'),
      en:    document.querySelector('[data-js="viewer-en"]'),
      title: document.querySelector('[data-js="viewer-title"]'),
      cat:   document.querySelector('[data-js="viewer-cat"]'),
      year:  document.querySelector('[data-js="viewer-year"]'),
      tags:  document.querySelector('[data-js="viewer-tags"]'),
      desc:  document.querySelector('[data-js="viewer-desc"]'),
      prev:  document.querySelector('[data-js="viewer-prev"]'),
      next:  document.querySelector('[data-js="viewer-next"]'),
      close: document.querySelector('[data-js="viewer-close"]')
    };
  }

  function viewerFill(els, w) {
    if (!w) return;
    if (els.img) {
      els.img.src = w.img; /* 打开时才设 src，首屏零成本 */
      els.img.alt = w.title;
    }
    if (els.en)    els.en.textContent = w.titleEn;
    if (els.title) els.title.textContent = w.title;
    if (els.cat)   els.cat.textContent = CAT_LABEL[w.cat] || w.cat;
    if (els.year)  els.year.textContent = w.year;
    if (els.desc)  els.desc.textContent = w.desc;
    if (els.tags) {
      els.tags.innerHTML = '';
      var tags = Array.isArray(w.tags) ? w.tags : [];
      var ink = textOn(w.palette);
      tags.forEach(function (t) {
        var s = document.createElement('span');
        s.className = 'viewer-tag';
        s.textContent = t;
        s.style.background = w.palette || 'transparent';
        s.style.color = ink;
        els.tags.appendChild(s);
      });
    }
  }

  function viewerOpen(els, index, trigger) {
    var w = _listItems[index];
    if (!w || !els.root) return;
    _viewer.index = index;
    _viewer.trigger = trigger || null;
    _viewer.open = true;
    viewerFill(els, w);
    els.root.hidden = false;
    if (!REDUCED) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          els.root.classList.add('is-open');
        });
      });
    } else {
      els.root.classList.add('is-open');
    }
    document.documentElement.classList.add('is-locked');
    if (els.close) els.close.focus();
  }

  function viewerClose(els) {
    if (!_viewer.open) return;
    _viewer.open = false;
    if (!els.root) return;
    var done = function () {
      els.root.hidden = true;
      if (els.img) { els.img.removeAttribute('src'); els.img.alt = ''; }
      if (_viewer.trigger && document.contains(_viewer.trigger)) {
        _viewer.trigger.focus(); /* 焦点回到触发行 */
      }
      _viewer.trigger = null;
      _viewer.index = -1;
    };
    els.root.classList.remove('is-open');
    document.documentElement.classList.remove('is-locked');
    if (REDUCED) { done(); return; }
    setTimeout(done, 220); /* 等 200ms 过渡结束 */
  }

  function viewerNav(els, dir) {
    if (!_viewer.open || !_listItems.length) return;
    var n = _listItems.length;
    var next = (_viewer.index + dir + n) % n;
    _viewer.index = next;
    viewerFill(els, _listItems[next]);
  }

  PF.initViewer = function () {
    var els = viewerEls();
    if (!els.root) return;
    var list = document.querySelector('[data-js="works-list"]');

    /* 行点击（事件委托，兼容筛选重渲染） */
    if (list) {
      list.addEventListener('click', function (ev) {
        var row = (ev.target && ev.target.closest)
          ? ev.target.closest('[data-js="work-row"]')
          : null;
        if (!row || !list.contains(row)) return;
        var id = row.getAttribute('data-id');
        var index = -1;
        _listItems.forEach(function (w, i) {
          if (w.id === id) index = i;
        });
        if (index >= 0) viewerOpen(els, index, row);
      });
    }

    if (els.prev) els.prev.addEventListener('click', function () {
      viewerNav(els, -1);
    });
    if (els.next) els.next.addEventListener('click', function () {
      viewerNav(els, 1);
    });
    if (els.close) els.close.addEventListener('click', function () {
      viewerClose(els);
    });

    /* 键盘：Esc 关闭，←/→ 切换；viewer 外不劫持 */
    document.addEventListener('keydown', function (ev) {
      if (!_viewer.open) return;
      if (ev.key === 'Escape') {
        viewerClose(els);
      } else if (ev.key === 'ArrowLeft') {
        ev.preventDefault();
        viewerNav(els, -1);
      } else if (ev.key === 'ArrowRight') {
        ev.preventDefault();
        viewerNav(els, 1);
      }
    });
  };

  /* ============================================================
   * PF.initServices — 手风琴
   * 展开：scrollHeight 设 max-height；收起：清空；＋/－ 旋转走 CSS。
   * ============================================================ */
  PF.initServices = function () {
    var rows = document.querySelectorAll('[data-js="service-row"]');
    if (!rows.length) return;

    function setOpen(row, open) {
      var head = row.querySelector('.service-head');
      var body = row.querySelector('.service-body');
      if (!head || !body) return;
      row.classList.toggle('is-open', open);
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
      body.style.maxHeight = open ? body.scrollHeight + 'px' : '';
    }

    each(rows, function (row) {
      var head = row.querySelector('.service-head');
      var body = row.querySelector('.service-body');
      if (!head || !body) return;
      head.addEventListener('click', function () {
        setOpen(row, !row.classList.contains('is-open'));
      });
    });

    /* 窗口变化时重算已展开行的高度 */
    var rzTimer = null;
    window.addEventListener('resize', function () {
      if (rzTimer) clearTimeout(rzTimer);
      rzTimer = setTimeout(function () {
        each(rows, function (row) {
          if (row.classList.contains('is-open')) setOpen(row, true);
        });
      }, 150);
    });
  };

  /* ============================================================
   * PF.initStats — 数字滚动（M12）
   * REDUCED / 无 IO：直接显示终值。
   * ============================================================ */
  function countUp(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (isNaN(target)) { el.textContent = '0'; return; }
    var dur = 1200;
    var t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(target * eased));
      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = String(target);
      }
    }
    requestAnimationFrame(step);
  }

  PF.initStats = function () {
    var nums = document.querySelectorAll('[data-js="stat-num"]');
    if (!nums.length) return;
    function final(el) {
      el.textContent = el.getAttribute('data-count') || '0';
    }
    if (REDUCED || !('IntersectionObserver' in window)) {
      each(nums, final);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        countUp(entry.target);
      });
    }, { threshold: 0.4 });
    each(nums, function (el) { io.observe(el); });
  };

  /* ============================================================
   * PF.initYear — 页脚年份
   * ============================================================ */
  PF.initYear = function () {
    var el = document.querySelector('[data-js="year"]');
    if (!el) return;
    el.textContent = String(new Date().getFullYear());
  };

  /* ============================================================
   * boot 编排：先 effects.js 的 init（防御式调用），再 main.js 自身。
   * ============================================================ */
  var EFFECT_INITS = [
    'initCursor', 'initDecode', 'initStagger', 'initGlitch',
    'initFloatImg', 'initRail', 'initReveal', 'initProgress'
  ];
  var MAIN_INITS = [
    'initTabs', 'initViewer', 'initServices', 'initStats', 'initYear'
  ];

  function callIfFn(name) {
    if (typeof PF[name] === 'function') {
      try { PF[name](); } catch (e) { /* 静默跳过 */ }
    }
  }

  function boot() {
    EFFECT_INITS.forEach(callIfFn);
    MAIN_INITS.forEach(callIfFn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
