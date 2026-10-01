/* ============================================================
 * cristi-portfolio · main.js
 * 入口：DOMContentLoaded 后先渲染作品网格，再按序启动所有动效 init。
 * PF.renderWorks 挂在命名空间上，供 Tab 筛选复用。
 * ============================================================ */
(function () {
  'use strict';

  var PF = (window.PF = window.PF || {});

  /* ---------- 内部工具 ---------- */
  function byHook(name) {
    return document.querySelector('[data-js="' + name + '"]');
  }
  function text(parent, tag, cls, str) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    el.textContent = str == null ? '' : String(str);
    parent.appendChild(el);
    return el;
  }

  /* ============================================================
   * PF.renderWorks(filter) —— 渲染作品网格
   * filter: 'all' | 'photo' | 'design'
   * 卡片：图片 / 标题 / 年份·英文名 / tags / hover 遮罩 desc
   * 渲染后 stagger 重播 .in（Tab 切换时复用）
   * ============================================================ */
  PF.renderWorks = function (filter) {
    var grid = byHook('works-grid');
    if (!grid) return;

    var f = filter || 'all';
    var list = PF.WORKS || [];
    var frag = document.createDocumentFragment();

    list.forEach(function (w) {
      if (!w || (f !== 'all' && w.cat !== f)) return;

      var card = document.createElement('article');
      card.className = 'work-card';
      card.setAttribute('data-js', 'work-card');
      if (w.palette) card.style.setProperty('--accent', w.palette);

      // 媒体
      var media = document.createElement('div');
      media.className = 'work-card-media';
      var img = document.createElement('img');
      img.src = w.img || '';
      img.alt = w.title || '';
      img.loading = 'lazy';
      media.appendChild(img);
      card.appendChild(media);

      // 信息区：标题 / 年份·英文名 / tags
      var body = document.createElement('div');
      body.className = 'work-card-body';
      text(body, 'h3', 'work-card-title', w.title);
      var meta = text(
        body,
        'p',
        'work-card-meta',
        [w.titleEn, w.year].filter(Boolean).join(' · ')
      );
      meta.style.fontSize = '0.78rem';
      meta.style.letterSpacing = '0.08em';
      meta.style.opacity = '0.65';
      meta.style.margin = '0 0 0.75rem';
      if (w.tags && w.tags.length) {
        var ul = document.createElement('ul');
        ul.className = 'work-card-tags';
        w.tags.forEach(function (t) {
          text(ul, 'li', '', t);
        });
        body.appendChild(ul);
      }
      card.appendChild(body);

      // hover 遮罩：英文名 + 描述
      var overlay = document.createElement('div');
      overlay.className = 'work-card-overlay';
      text(overlay, 'strong', '', w.titleEn || w.title);
      text(overlay, 'p', '', w.desc);
      card.appendChild(overlay);

      frag.appendChild(card);
    });

    grid.textContent = '';
    grid.appendChild(frag);

    // stagger 重播入场
    var cards = grid.querySelectorAll('[data-js="work-card"]');
    Array.prototype.forEach.call(cards, function (card, i) {
      window.setTimeout(function () {
        card.classList.add('in');
      }, 60 + i * 70);
    });
  };

  /* ============================================================
   * 启动
   * ============================================================ */
  function boot() {
    // 有 JS 的标记：base.css 的无 JS 降级样式据此失效
    document.documentElement.classList.add('js');

    var inits = [
      'initCursor',
      'initReveal',
      'initProgress',
      'initTabs',
      'initSkills',
      'initMenu',
      'initSmoothScroll'
    ];

    try {
      if (typeof PF.renderWorks === 'function') PF.renderWorks('all');
    } catch (err) {
      /* 渲染失败不阻断其余 init */
    }
    /* 页脚年份 */
    try {
      var yearEl = byHook('year');
      if (yearEl) yearEl.textContent = String(new Date().getFullYear());
    } catch (err) {
      /* 忽略 */
    }
    inits.forEach(function (name) {
      try {
        if (typeof PF[name] === 'function') PF[name]();
      } catch (err) {
        /* 单个 init 失败不阻断其余 */
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
