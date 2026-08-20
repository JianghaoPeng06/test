/* =============================================================
   JasperPeng — main.js

   页头页脚现在是静态 HTML（由 build.ps1 从 partials/ 同步），
   所以这里只负责「行为」，不负责「结构」。
   即使这个文件加载失败，页面依然是可导航的完整站点。

   01 工具    02 页头滚动   03 下拉面板   04 移动导航
   05 搜索    06 入场动画   07 星体交互   08 文章页
   09 分类页  10 角色页     11 语言       12 跳转过渡
   ============================================================= */
(function () {
  'use strict';

  var D = window.JP || { SECTIONS: [], ARTICLES: [], CHARACTERS: [] };
  var SECTIONS = D.SECTIONS, ARTICLES = D.ARTICLES, CHARACTERS = D.CHARACTERS || [];

  /* ---------- 01 工具 ---------- */
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isDesktop = function () { return matchMedia('(min-width: 901px)').matches; };
  var BODY = document.body;
  var BASE = BODY.getAttribute('data-base') || '';
  var PAGE = BODY.getAttribute('data-page') || 'home';
  var FILE = location.protocol === 'file:';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function url(p) { return BASE + p; }
  function artUrl(slug) { return url('article.html?a=' + encodeURIComponent(slug)); }
  function catUrl(sec, slug) { return url(sec.dir + '/' + slug + '/' + (FILE ? 'index.html' : '')); }
  function secOf(k) { for (var i = 0; i < SECTIONS.length; i++) if (SECTIONS[i].key === k) return SECTIONS[i]; return null; }
  function catOf(sec, s) { if (!sec || !sec.cats) return null;
    for (var i = 0; i < sec.cats.length; i++) if (sec.cats[i].slug === s) return sec.cats[i]; return null; }
  function artOf(s) { for (var i = 0; i < ARTICLES.length; i++) if (ARTICLES[i].slug === s) return ARTICLES[i]; return null; }
  function byCat(k, c) {
    return ARTICLES.filter(function (a) { return a.section === k && a.cat === c; })
                   .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  }

  /* 本地 file:// 打开时补全目录索引名（服务器上保持整洁地址） */
  function patchDirLinks() {
    if (!FILE) return;
    $$('a[href$="/"]').forEach(function (a) {
      var h = a.getAttribute('href');
      if (h && !/^(https?:|mailto:|data:)/.test(h)) a.setAttribute('href', h + 'index.html');
    });
  }

  /* ---------- 11 语言（简 / 繁 / 英 / 日）----------
     只翻译界面文案，文章正文保持原语言 */
  var LANGS = [
    { code: 'zh-Hans', label: '简体中文 中国大陆',     html: 'zh-CN' },
    { code: 'zh-Hant', label: '繁體中文 台灣',         html: 'zh-TW' },
    { code: 'en',      label: 'English United States', html: 'en' },
    { code: 'ja',      label: '日本語 日本',            html: 'ja' }
  ];
  var I18N = {
    'zh-Hans': { home:'主页', toHome:'回到首页', more:'查看更多', reading:'继续阅读', otherIn:' 的其他文章',
      count:' 篇内容', soon:'暂未开放', search:'搜索文章、作品、角色…', noResult:'没有找到相关内容',
      notFound:'没有找到这篇文章', notFoundDesc:'链接可能已经失效，或者这篇内容还没有发布。',
      emptyTitle:'这个分类还没有内容', emptyDesc:'先去看看其他板块，或者回到首页。',
      category:'分类', viewRes:'查看资源', all:'全部', year:'年份', version:'版本', region:'地图', explore:'Explore' },
    'zh-Hant': { home:'首頁', toHome:'回到首頁', more:'查看更多', reading:'繼續閱讀', otherIn:' 的其他文章',
      count:' 篇內容', soon:'尚未開放', search:'搜尋文章、作品、角色…', noResult:'找不到相關內容',
      notFound:'找不到這篇文章', notFoundDesc:'連結可能已失效，或這篇內容尚未發布。',
      emptyTitle:'這個分類還沒有內容', emptyDesc:'先看看其他版塊，或回到首頁。',
      category:'分類', viewRes:'檢視資源', all:'全部', year:'年份', version:'版本', region:'地圖', explore:'Explore' },
    en: { home:'Home', toHome:'Back to home', more:'View more', reading:'Keep reading', otherIn:' — more',
      count:' items', soon:'Coming soon', search:'Search articles, works, characters…', noResult:'No results found',
      notFound:'Article not found', notFoundDesc:'The link may have expired, or this piece is not published yet.',
      emptyTitle:'Nothing here yet', emptyDesc:'Try another section, or head back home.',
      category:'Category', viewRes:'View resources', all:'All', year:'Year', version:'Version', region:'Region', explore:'Explore' },
    ja: { home:'ホーム', toHome:'ホームへ戻る', more:'もっと見る', reading:'続けて読む', otherIn:' の他の記事',
      count:' 件', soon:'準備中', search:'記事・作品・キャラクターを検索…', noResult:'該当する内容が見つかりません',
      notFound:'記事が見つかりません', notFoundDesc:'リンクが無効か、まだ公開されていない可能性があります。',
      emptyTitle:'まだコンテンツがありません', emptyDesc:'他のセクションを見るか、ホームへ戻ってください。',
      category:'カテゴリ', viewRes:'リソースを見る', all:'すべて', year:'年', version:'版', region:'地域', explore:'Explore' }
  };
  var LANG = 'zh-Hans';
  try { LANG = localStorage.getItem('jp-lang') || 'zh-Hans'; } catch (e) {}
  if (!I18N[LANG]) LANG = 'zh-Hans';
  function t(k) { return (I18N[LANG] && I18N[LANG][k]) || I18N['zh-Hans'][k] || k; }

  /* ---------- 02 页头滚动状态（单一 rAF 节流）---------- */
  (function headerScroll() {
    var hdr = $('[data-header]'), toTop = $('[data-totop]'), bar = $('[data-progress] span');
    var ticking = false;
    function update() {
      var y = scrollY;
      if (hdr) hdr.classList.toggle('is-scrolled', y > 8);
      if (toTop) toTop.classList.toggle('is-on', y > 640);
      if (bar) {
        var max = document.documentElement.scrollHeight - innerHeight;
        bar.style.width = (max > 0 ? Math.min(100, y / max * 100) : 0) + '%';
      }
      ticking = false;
    }
    addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
    if (toTop) toTop.addEventListener('click', function () {
      scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  })();

  /* ---------- 03 下拉面板 ---------- */
  (function dropdowns() {
    var triggers = $$('[data-menu]');
    var scrim = $('[data-scrim]');
    if (!triggers.length) return;
    var open = null, closeT = null, pinned = false;

    function panelOf(trg) { return $('#' + trg.getAttribute('aria-controls')); }

    function show(trg) {
      if (open === trg) return;
      hide();
      var p = panelOf(trg);
      if (!p) return;
      p.classList.add('is-open');
      p.setAttribute('aria-hidden', 'false');
      trg.setAttribute('aria-expanded', 'true');
      if (scrim) scrim.classList.add('is-on');
      open = trg;
    }
    function hide() {
      if (!open) return;
      var p = panelOf(open);
      if (p) { p.classList.remove('is-open'); p.setAttribute('aria-hidden', 'true'); }
      open.setAttribute('aria-expanded', 'false');
      if (scrim) scrim.classList.remove('is-on');
      open = null; pinned = false;
    }

    triggers.forEach(function (trg) {
      trg.addEventListener('mouseenter', function () { if (isDesktop()) { clearTimeout(closeT); show(trg); } });
      trg.addEventListener('focus',      function () { if (isDesktop()) show(trg); });
      /* hover 已经展开时，点击是「固定住」而不是关闭 ——
         否则鼠标移上去自动展开、再一点就收起，用户会以为点了没反应。
         已经固定之后再点才收起。 */
      trg.addEventListener('click', function (e) {
        e.preventDefault();
        if (open !== trg) { show(trg); pinned = true; }
        else if (!pinned) { pinned = true; }
        else { hide(); }
      });
      var p = panelOf(trg);
      [trg, p].forEach(function (el) {
        if (!el) return;
        el.addEventListener('mouseleave', function () { if (!pinned) closeT = setTimeout(hide, 160); });
        el.addEventListener('mouseenter', function () { clearTimeout(closeT); });
      });
    });
    if (scrim) scrim.addEventListener('click', hide);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
    addEventListener('resize', function () { if (!isDesktop()) hide(); });
  })();

  /* ---------- 04 移动导航 ---------- */
  (function mobileNav() {
    var burger = $('[data-burger]'), drawer = $('[data-mnav]');
    if (!burger || !drawer) return;

    function setOpen(on) {
      burger.setAttribute('aria-expanded', String(on));
      burger.setAttribute('aria-label', on ? '关闭菜单' : '打开菜单');
      BODY.classList.toggle('is-locked', on);
      if (on) { drawer.hidden = false; requestAnimationFrame(function () { drawer.classList.add('is-on'); }); }
      else {
        drawer.classList.remove('is-on');
        setTimeout(function () { if (burger.getAttribute('aria-expanded') === 'false') drawer.hidden = true; }, 320);
      }
    }
    burger.addEventListener('click', function () { setOpen(burger.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') setOpen(false);
    });
    addEventListener('resize', function () { if (isDesktop() && burger.getAttribute('aria-expanded') === 'true') setOpen(false); });
    $$('a', drawer).forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });

    $$('[data-acc]', drawer).forEach(function (h) {
      var panel = h.nextElementSibling;
      h.addEventListener('click', function () {
        var on = h.getAttribute('aria-expanded') === 'true';
        $$('[data-acc]', drawer).forEach(function (o) {
          if (o !== h) { o.setAttribute('aria-expanded', 'false'); o.nextElementSibling.style.height = '0px'; }
        });
        h.setAttribute('aria-expanded', String(!on));
        panel.style.height = on ? '0px' : panel.scrollHeight + 'px';
      });
    });
  })();

  /* ---------- 05 搜索（⌘K / Ctrl+K）---------- */
  (function search() {
    var overlay = $('[data-search]'), input = $('[data-search-input]'), out = $('[data-search-results]');
    if (!overlay || !input || !out) return;

    var INDEX = ARTICLES.map(function (a) {
      var s = secOf(a.section), c = catOf(s, a.cat);
      return { t: a.title, c: (s ? s.label : '') + ' · ' + (c ? c.label : ''), u: artUrl(a.slug),
               img: url(a.cover), k: (a.title + ' ' + (a.lede || '') + ' ' + (a.tags || []).join(' ')).toLowerCase() };
    });
    SECTIONS.forEach(function (s) {
      (s.cats || []).forEach(function (c) {
        INDEX.push({ t: c.label, c: s.label + ' · ' + t('category'), u: catUrl(s, c.slug), img: '',
                     k: (c.label + ' ' + s.label + ' ' + (c.desc || '')).toLowerCase() });
      });
    });
    CHARACTERS.forEach(function (c) {
      INDEX.push({ t: c.name, c: 'Characters · ' + c.role, u: url('characters/' + (FILE ? 'index.html' : '') + '?c=' + c.slug),
                   img: url('assets/images/characters/' + c.slug + '.svg'),
                   k: (c.name + ' ' + c.role + ' ' + (c.bio || '')).toLowerCase() });
    });

    var sel = 0;
    function render(q) {
      var list = q ? INDEX.filter(function (i) {
        return i.k.indexOf(q.toLowerCase()) > -1 || i.t.toLowerCase().indexOf(q.toLowerCase()) > -1;
      }) : INDEX.slice(0, 6);
      sel = 0;
      if (!list.length) { out.innerHTML = '<p class="sr__empty">' + t('noResult') + ' — “' + esc(q) + '”</p>'; return; }
      out.innerHTML = list.slice(0, 8).map(function (i, n) {
        return '<a class="sr' + (n === 0 ? ' is-sel' : '') + '" href="' + i.u + '">' +
          (i.img ? '<img class="sr__thumb" src="' + i.img + '" alt="" loading="lazy">'
                 : '<span class="sr__thumb"></span>') +
          '<span><span class="sr__t">' + esc(i.t) + '</span><span class="sr__c">' + esc(i.c) + '</span></span></a>';
      }).join('');
    }
    function setOpen(on) {
      if (on) {
        overlay.hidden = false; render('');
        requestAnimationFrame(function () { overlay.classList.add('is-on'); input.focus(); });
        BODY.classList.add('is-locked');
      } else {
        overlay.classList.remove('is-on'); BODY.classList.remove('is-locked'); input.value = '';
        setTimeout(function () { overlay.hidden = true; }, 320);
      }
    }
    $$('[data-search-open]').forEach(function (b) { b.addEventListener('click', function () { setOpen(true); }); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) setOpen(false); });
    input.addEventListener('input', function () { render(input.value.trim()); });
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(overlay.hidden); return; }
      if (overlay.hidden) return;
      if (e.key === 'Escape') { setOpen(false); return; }
      var items = $$('.sr', out);
      if (!items.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items.forEach(function (it, n) { it.classList.toggle('is-sel', n === sel); });
        items[sel].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') { e.preventDefault(); items[sel].click(); }
    });
  })();

  /* ---------- 06 入场动画 ---------- */
  var io = null;
  function reveal(root) {
    var els = $$('.reveal:not(.is-in)', root || document);
    if (!els.length) return;
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(function (e) { e.classList.add('is-in'); }); return;
    }
    $$('.grid, .list', root || document).forEach(function (g) {
      $$('.reveal', g).forEach(function (e, i) { e.style.setProperty('--delay', Math.min(i * 70, 350) + 'ms'); });
    });
    if (!io) io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: .12, rootMargin: '0px 0px -60px 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- 07 星体：指针轻微牵引 ---------- */
  (function star() {
    var host = $('[data-star]');
    if (!host || reduce || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var body = $('.star__body', host), gloss = $('.star__gloss', host);
    if (!body) return;
    host.addEventListener('mousemove', function (e) {
      var r = host.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      body.style.transform = 'translate(' + x * 14 + 'px,' + y * 14 + 'px)';
      if (gloss) gloss.style.transform = 'translate(' + x * 26 + 'px,' + y * 26 + 'px)';
    });
    host.addEventListener('mouseleave', function () {
      body.style.transform = ''; if (gloss) gloss.style.transform = '';
    });
  })();

  /* ---------- 卡片与面包屑构件 ---------- */
  function cardHTML(a) {
    var s = secOf(a.section), c = catOf(s, a.cat);
    return '<article class="card reveal"><a class="card__link" href="' + artUrl(a.slug) + '">' +
      '<span class="card__media"><img src="' + url(a.cover) + '" alt="' + esc(a.title) + '" loading="lazy" width="800" height="800"></span>' +
      '<div class="card__body"><h3 class="card__title">' + esc(a.title) + '</h3>' +
      '<p class="card__meta"><span>' + esc(c ? c.label : (s ? s.label : '')) + '</span>' +
      '<span>' + esc(a.dateLabel || a.date) + '</span><span>' + esc(a.read || '') + '</span></p>' +
      '</div></a></article>';
  }
  function listHTML(a) {
    var s = secOf(a.section), c = catOf(s, a.cat);
    return '<article class="list__item reveal"><a class="list__link" href="' + artUrl(a.slug) + '">' +
      '<span class="list__media"><img src="' + url(a.cover) + '" alt="' + esc(a.title) + '" loading="lazy" width="360" height="360"></span>' +
      '<div><h3 class="list__title">' + esc(a.title) + '</h3>' +
      '<p class="list__meta"><span>' + esc(c ? c.label : '') + '</span><span>' + esc(a.read || '') + '</span></p>' +
      '</div></a></article>';
  }
  function crumbHTML(parts) {
    var s = '<a href="' + url('home.html') + '">JasperPeng</a>';
    parts.forEach(function (p, i) {
      var last = i === parts.length - 1;
      s += '<i class="crumb__sep" aria-hidden="true"></i>';
      s += (p.href && !last) ? '<a href="' + p.href + '">' + esc(p.label) + '</a>'
                             : '<span' + (last ? ' aria-current="page"' : '') + '>' + esc(p.label) + '</span>';
    });
    return s;
  }
  function paintCrumbs(html) { $$('[data-crumb]').forEach(function (n) { n.innerHTML = html; }); }

  /* ---------- 08 文章页 ---------- */
  function renderArticle() {
    var host = $('[data-article]');
    if (!host) return;
    var slug = new URLSearchParams(location.search).get('a');
    var a = slug ? artOf(slug) : null;

    if (!a) {
      document.title = t('notFound') + ' — JasperPeng';
      host.innerHTML = '<div class="wrap empty" style="margin-top:48px">' +
        '<p class="h3">' + t('notFound') + '</p><p class="lede">' + t('notFoundDesc') + '</p>' +
        '<a class="btn btn--soft" href="' + url('home.html') + '">' + t('toHome') + '<i class="arr"></i></a></div>';
      paintCrumbs(crumbHTML([{ label: t('notFound') }]));
      return;
    }
    var s = secOf(a.section), c = catOf(s, a.cat);
    document.title = a.title + ' — JasperPeng';
    var m = $('meta[name="description"]'); if (m) m.setAttribute('content', a.lede || a.title);

    var figIdx = 0;
    host.innerHTML =
      '<header class="article__head read">' +
        '<div class="tagbar">' +
          (a.tags || []).map(function (x) { return '<span class="tagbar__pill">' + esc(x) + '</span>'; }).join('') +
          '<span class="tagbar__by"><span class="tagbar__avatar" aria-hidden="true">J</span>' + esc(a.author) + '</span>' +
        '</div>' +
        '<h1 class="article__title">' + esc(a.title) + '</h1>' +
        (a.lede ? '<p class="article__lede">' + esc(a.lede) + '</p>' : '') +
        '<p class="article__meta"><time datetime="' + esc(a.date) + '">' + esc(a.dateLabel) + '</time>' +
          '<span>' + esc(c ? c.label : '') + '</span><span>' + esc(a.read || '') + '</span></p>' +
      '</header>' +
      '<figure class="article__hero wrap"><span class="fig__media">' +
        '<img src="' + url(a.cover) + '" alt="' + esc(a.title) + '" width="800" height="800"></span></figure>' +
      '<div class="article__body read">' + (a.body || []).map(function (b) {
        if (b.t === 'p')     return '<p>' + esc(b.v) + '</p>';
        if (b.t === 'h2')    return '<h2>' + esc(b.v) + '</h2>';
        if (b.t === 'quote') return '<blockquote>' + esc(b.v) + '</blockquote>';
        if (b.t === 'figure') {
          figIdx++;
          return '<figure class="fig"><span class="fig__media"><img src="' + url(a.cover) +
                 '" alt="' + esc(b.cap || a.title) + '" loading="lazy" width="800" height="800"></span>' +
                 (b.cap ? '<figcaption>' + esc(b.cap) + '</figcaption>' : '') + '</figure>';
        }
        return '';
      }).join('') + '</div>';

    var crumb = crumbHTML([
      { label: s.label, href: c ? catUrl(s, c.slug) : url('home.html') },
      { label: c ? c.label : '', href: c ? catUrl(s, c.slug) : url('home.html') },
      { label: a.title }
    ]);
    paintCrumbs(crumb);

    /* 继续阅读：同分类优先，不足则同板块补齐 */
    var pool = byCat(a.section, a.cat).filter(function (x) { return x.slug !== a.slug; });
    ARTICLES.forEach(function (x) {
      if (pool.length < 3 && x.section === a.section && x.slug !== a.slug && pool.indexOf(x) < 0) pool.push(x);
    });
    var wrap = $('[data-related]');
    if (pool.length && wrap) {
      $('[data-related-grid]').innerHTML = pool.slice(0, 3).map(cardHTML).join('');
      var rt = $('[data-related-title]');
      rt.setAttribute('data-name', c ? c.label : s.label);
      rt.textContent = (c ? c.label : s.label) + t('otherIn');
      $('[data-related-more]').setAttribute('href', c ? catUrl(s, c.slug) : url('home.html'));
      wrap.hidden = false;
    }
    i18n(); reveal(document); patchDirLinks();
  }

  /* ---------- 09 分类页 ---------- */
  function renderCategory() {
    var grid = $('[data-cat-grid]');
    if (!grid) return;
    var s = secOf(BODY.getAttribute('data-section')), slug = BODY.getAttribute('data-cat');
    var c = catOf(s, slug);
    if (!s || !c) return;

    document.title = c.label + ' — ' + s.label + ' — JasperPeng';
    var list = byCat(s.key, slug);
    var n = $('[data-cat-count]');
    if (n && list.length) { n.setAttribute('data-n', list.length); n.textContent = list.length + t('count'); }

    /* Figma 通用版式：前 3 篇走 3 列大卡，其余走 2 列小块 */
    if (list.length) {
      grid.innerHTML = list.slice(0, 3).map(cardHTML).join('');
      var rest = list.slice(3), lw = $('[data-cat-list-wrap]');
      if (rest.length && lw) { $('[data-cat-list]').innerHTML = rest.map(listHTML).join(''); lw.hidden = false; }
    } else {
      grid.hidden = true;
      var e = $('[data-cat-empty]'); if (e) e.hidden = false;
    }

    /* 同级分类：可在 Artifacts / Design / … 之间横跳，当前项高亮 */
    var sib = $('[data-siblings]');
    if (sib) {
      sib.innerHTML = s.cats.map(function (x) {
        return '<a class="cats__link" href="' + catUrl(s, x.slug) + '"' +
               (x.slug === slug ? ' aria-current="page"' : '') + '>' + esc(x.label) + '</a>';
      }).join('');
      var act = $('[aria-current="page"]', sib);
      if (act) sib.scrollLeft = Math.max(0, act.offsetLeft - 20);
    }
    paintCrumbs(crumbHTML([{ label: s.label, href: url('home.html#' + s.key) }, { label: c.label }]));
    i18n(); reveal(document); patchDirLinks();
  }

  /* ---------- 10 角色页 ----------
     原地切换 + 地址同步：浏览器返回键能逐个退回上一个角色，
     单个角色的链接也能直接分享。 */
  function renderCharacters() {
    var strip = $('[data-char-strip]');
    if (!strip || !CHARACTERS.length) return;
    var stage = $('[data-char-stage]');
    var filters = $$('[data-char-filter]');
    var values = $('[data-char-values]');
    var mode = 'all', pick = null;

    /* 两级筛选：先选维度（年份 / 版本 / 地图），再选具体值。
       只做排序的话，数据本来就按年份排列，点了看起来毫无反应。 */
    function distinct(key) {
      var seen = {}, out = [];
      CHARACTERS.forEach(function (c) {
        var v = c[key];
        if (v && !seen[v]) { seen[v] = 1; out.push(v); }
      });
      return out.sort(function (a, b) { return String(a).localeCompare(String(b), 'zh'); });
    }
    function paintValues() {
      if (!values) return;
      if (mode === 'all') { values.innerHTML = ''; values.hidden = true; return; }
      values.hidden = false;
      values.innerHTML = distinct(mode).map(function (v) {
        var n = CHARACTERS.filter(function (c) { return c[mode] === v; }).length;
        return '<button class="chars__value" type="button" data-char-value="' + esc(v) + '"' +
               (v === pick ? ' aria-pressed="true"' : ' aria-pressed="false"') +
               '>' + esc(v) + '<em>' + n + '</em></button>';
      }).join('');
    }
    function pool() {
      if (mode === 'all' || !pick) return CHARACTERS.slice();
      return CHARACTERS.filter(function (c) { return c[mode] === pick; });
    }
    function charOf(s) {
      for (var i = 0; i < CHARACTERS.length; i++) if (CHARACTERS[i].slug === s) return CHARACTERS[i];
      return CHARACTERS[0];
    }
    function paintStrip(cur) {
      var list = pool();
      strip.innerHTML = list.length ? list.map(function (c) {
        return '<button class="chars__thumb" type="button" data-char="' + c.slug + '"' +
               (c.slug === cur ? ' aria-current="true"' : '') + ' aria-label="' + esc(c.name) + '">' +
               '<img src="' + url('assets/images/characters/' + c.slug + '.svg') + '" alt="" loading="lazy"></button>';
      }).join('') : '<p class="chars__none">' + t('noResult') + '</p>';
    }
    function paintStage(c) {
      stage.innerHTML =
        '<div class="chars__art"><img src="' + url('assets/images/characters/' + c.slug + '.svg') +
          '" alt="' + esc(c.name) + ' 立绘" width="800" height="800"></div>' +
        '<div><h1 class="chars__name">' + esc(c.name) + '</h1>' +
        '<p class="chars__role">' + esc(c.role) + ' · ' + esc(c.age) + ' ' + esc(c.sex) + '</p>' +
        '<p class="chars__quote">' + esc(c.quote) + '</p>' +
        '<p class="chars__bio">' + esc(c.bio) + '</p>' +
        '<div class="chars__cta"><a class="btn btn--primary" href="' +
          catUrl(secOf('about'), c.res) + '">' + t('viewRes') + '<i class="arr"></i></a></div></div>';
      document.title = c.name + ' — Characters — JasperPeng';
    }
    function select(slug, push) {
      var c = charOf(slug);
      paintStrip(c.slug); paintStage(c); i18n(); patchDirLinks();
      paintCrumbs(crumbHTML([{ label: 'Characters', href: url('home.html#characters') }, { label: c.name }]));
      if (push) history.pushState({ c: c.slug }, '', '?c=' + c.slug);
    }

    strip.addEventListener('click', function (e) {
      var b = e.target.closest('[data-char]');
      if (b) select(b.getAttribute('data-char'), true);
    });
    function currentSlug() {
      var el = $('[data-char][aria-current="true"]', strip);
      return el ? el.getAttribute('data-char') : (new URLSearchParams(location.search).get('c') || CHARACTERS[0].slug);
    }
    filters.forEach(function (f) {
      f.addEventListener('click', function () {
        mode = f.getAttribute('data-char-filter');
        pick = null;                       /* 换维度时清掉旧的取值 */
        filters.forEach(function (o) { o.setAttribute('aria-pressed', String(o === f)); });
        paintValues();
        paintStrip(currentSlug());
      });
    });
    if (values) values.addEventListener('click', function (e) {
      var b = e.target.closest('[data-char-value]');
      if (!b) return;
      var v = b.getAttribute('data-char-value');
      pick = (pick === v) ? null : v;      /* 再点一次取消 */
      paintValues();
      paintStrip(currentSlug());
    });
    addEventListener('popstate', function () {
      select(new URLSearchParams(location.search).get('c') || CHARACTERS[0].slug, false);
    });

    select(new URLSearchParams(location.search).get('c') || CHARACTERS[0].slug, false);
  }



  function i18n() {
    $$('[data-i18n]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n'));
      if (el.tagName === 'INPUT') el.setAttribute('placeholder', v); else el.textContent = v;
    });
    var meta = LANGS.filter(function (l) { return l.code === LANG; })[0];
    document.documentElement.lang = meta ? meta.html : 'zh-CN';
    /* 重刷由 JS 拼出、不带 data-i18n 的动态文案 */
    var n = $('[data-cat-count]');
    if (n && n.getAttribute('data-n')) n.textContent = n.getAttribute('data-n') + t('count');
    var rt = $('[data-related-title]');
    if (rt && rt.getAttribute('data-name')) rt.textContent = rt.getAttribute('data-name') + t('otherIn');
  }

  (function langPicker() {
    var box = $('[data-lang]');
    if (!box) return;
    var btn = $('[data-lang-btn]', box), label = $('[data-lang-label]', box), menu = $('[data-lang-menu]', box);
    menu.innerHTML = LANGS.map(function (l) {
      return '<li><button type="button" role="option" data-code="' + l.code + '" aria-selected="' +
             (l.code === LANG) + '">' + esc(l.label) + '</button></li>';
    }).join('');
    function paint() {
      var m = LANGS.filter(function (l) { return l.code === LANG; })[0] || LANGS[0];
      if (label) label.textContent = m.label;
      $$('[data-code]', menu).forEach(function (o) { o.setAttribute('aria-selected', String(o.getAttribute('data-code') === LANG)); });
    }
    paint();
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      btn.setAttribute('aria-expanded', String(box.classList.toggle('is-open')));
    });
    $$('[data-code]', menu).forEach(function (o) {
      o.addEventListener('click', function () {
        LANG = o.getAttribute('data-code');
        try { localStorage.setItem('jp-lang', LANG); } catch (e) {}
        paint(); i18n();
        box.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false');
      });
    });
    document.addEventListener('click', function () { box.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); });
    box.addEventListener('click', function (e) { e.stopPropagation(); });
  })();

  /* ---------- 12 跳转过渡 ----------
     支持 View Transitions 的浏览器由 CSS 的 @view-transition 接管；
     其余浏览器走这里的淡出，观感一致。 */
  (function pageTransition() {
    if (reduce || 'startViewTransition' in document) return;
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      var h = a.getAttribute('href');
      if (!h || /^(mailto:|tel:|#|javascript:)/.test(h)) return;
      if (a.origin && a.origin !== location.origin) return;
      if (a.pathname === location.pathname && a.search === location.search) return;
      e.preventDefault();
      BODY.classList.add('is-exiting');
      setTimeout(function () { location.href = a.href; }, 240);
    });
    addEventListener('pageshow', function (ev) { if (ev.persisted) BODY.classList.remove('is-exiting'); });
  })();

  /* ---------- 启动 ---------- */
  if (PAGE === 'article')          renderArticle();
  else if (PAGE === 'category')    renderCategory();
  else if (PAGE === 'characters')  renderCharacters();

  i18n();
  reveal(document);
  patchDirLinks();
  document.documentElement.classList.add('js-on');
})();
