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

  /* ---------- 图片格式 ----------
     data.js 里只写 slug，真实扩展名来自 build.ps1 生成的 js/assets.js。
     占位图叫 <slug>.placeholder.svg，不占用 <slug>.png 这个名字 ——
     换图 = 把 <slug>.png（或 .jpg / .webp）丢进同一个目录，什么都不用删，
     然后双击根目录的「刷新图片.cmd」。这是正常流程，控制台是干净的。

     兜底 A：图片加载失败时按 IMG_EXT 顺序换扩展名重试。
             清单过期（换了图还没刷新）时救场。

     兜底 B：连「刷新图片.cmd」都不想跑，把下面这行改成 true ——
             本地预览时会主动探测同名真图，丢完图刷新页面就能看到。
             代价：探测请求打不中会在控制台留一批 404，功能上无害。
             只在 localhost 生效，线上永远不发这些请求。 */
  var AUTO_FIND_IMAGES = false;

  var PH = '.placeholder.svg';
  var IMG_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.svg', PH];
  var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

  function baseOf(src) {
    var s = String(src).replace(/[?#].*$/, '');
    if (s.slice(-PH.length).toLowerCase() === PH) return s.slice(0, -PH.length);
    return s.replace(/\.[a-z0-9]+$/i, '');
  }
  /* A：换扩展名重试 */
  function fixImg(img) {
    var src = img.getAttribute('src') || '';
    if (src.indexOf('assets/images/') < 0) return;
    var base = baseOf(src), n = +(img.getAttribute('data-ext') || 0);
    while (n < IMG_EXT.length && base + IMG_EXT[n] === src) n++;   /* 跳过当前这个 */
    if (n >= IMG_EXT.length) { img.removeAttribute('data-ext'); return; }
    img.setAttribute('data-ext', n + 1);
    img.setAttribute('src', base + IMG_EXT[n]);
  }
  /* img 的 error 不冒泡，只能在捕获阶段接 */
  document.addEventListener('error', function (e) {
    if (e.target && e.target.tagName === 'IMG') fixImg(e.target);
  }, true);

  /* B：本地预览时探测新丢进来的真图 */
  var PROBE_EXT = ['.png', '.jpg', '.webp'];
  var probed = {};                       /* base → 已探过的结果，同一张封面只探一次 */
  /* 用 fetch(HEAD) 探，不用 new Image() ——
     图片加载失败会往控制台写红字，一页十几张就刷屏了；
     fetch 拿到 404 只是 res.ok === false，控制台干干净净。 */
  function probeReal(base, done) {
    if (base in probed) { done(probed[base]); return; }
    if (!window.fetch) { probed[base] = null; done(null); return; }
    var i = 0;
    (function next() {
      if (i >= PROBE_EXT.length) { probed[base] = null; done(null); return; }
      var candidate = base + PROBE_EXT[i++];
      fetch(candidate, { method: 'HEAD', cache: 'no-store' }).then(function (res) {
        if (res.ok) { probed[base] = candidate; done(candidate); }
        else next();
      })['catch'](next);
    })();
  }
  function upgradePlaceholders(root) {
    if (!AUTO_FIND_IMAGES || !LOCAL) return;
    $$('img', root || document).forEach(function (img) {
      var src = img.getAttribute('src') || '';
      if (src.indexOf('assets/images/') < 0) return;
      if (src.slice(-PH.length).toLowerCase() !== PH) return;
      probeReal(baseOf(src), function (found) {
        if (found && img.getAttribute('src') === src) img.setAttribute('src', found);
      });
    });
  }
  function artUrl(slug) { return url('article.html?a=' + encodeURIComponent(slug)); }
  /* 分类链接。带 to: 的分类不生成自己的页面，直接指向别处
     —— 角色板块的「原创角色」就指向那个固定深色的选角色页。 */
  function catUrl(sec, slug) {
    var c = catOf(sec, slug);
    var p = (c && c.to) ? c.to : (sec.dir + '/' + slug + '/');
    if (FILE) {
      if (/\/$/.test(p))       p += 'index.html';
      else if (/\/\?/.test(p)) p = p.replace('/?', '/index.html?');
    }
    return url(p);
  }
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
    /* file:// 下浏览器不会把目录地址解析成 index.html，要自己补。
       带查询串的目录链接（characters/?c=xxx）同样得补，否则一样打不开。 */
    $$('a[href]').forEach(function (a) {
      var h = a.getAttribute('href');
      if (!h || /^(https?:|mailto:|tel:|data:|#)/.test(h)) return;
      if (/\/$/.test(h))        a.setAttribute('href', h + 'index.html');
      else if (/\/\?/.test(h))  a.setAttribute('href', h.replace('/?', '/index.html?'));
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
    'zh-Hans': { skip:'跳到主要内容', archive:'档案', archiveTitle:'最近更新', posterCap:'节日及庆典海报 · 随节庆更新', home:'主页', toHome:'回到首页', more:'查看更多', reading:'继续阅读', otherIn:' 的其他文章',
      count:' 篇内容', soon:'暂未开放', search:'搜索文章、作品、角色…', noResult:'没有找到相关内容',
      bodyOriginal:'正文保持写作时的原文，未作翻译。', notFound:'没有找到这篇文章', notFoundDesc:'链接可能已经失效，或者这篇内容还没有发布。',
      charsReading:'角色相关文章', emptyTitle:'这个分类还没有内容', emptyDesc:'先去看看其他板块，或者回到首页。',
      category:'分类', viewRes:'查看资源', all:'全部', year:'年份', version:'版本', region:'地图', explore:'Explore' },
    'zh-Hant': { skip:'跳到主要內容', archive:'檔案', archiveTitle:'最近更新', posterCap:'節日及慶典海報 · 隨節慶更新', home:'首頁', toHome:'回到首頁', more:'查看更多', reading:'繼續閱讀', otherIn:' 的其他文章',
      count:' 篇內容', soon:'尚未開放', search:'搜尋文章、作品、角色…', noResult:'找不到相關內容',
      bodyOriginal:'正文保持寫作時的原文，未作翻譯。', notFound:'找不到這篇文章', notFoundDesc:'連結可能已失效，或這篇內容尚未發布。',
      charsReading:'角色相關文章', emptyTitle:'這個分類還沒有內容', emptyDesc:'先看看其他版塊，或回到首頁。',
      category:'分類', viewRes:'檢視資源', all:'全部', year:'年份', version:'版本', region:'地圖', explore:'Explore' },
    en: { skip:'Skip to content', archive:'Archive', archiveTitle:'Recently published', posterCap:'Seasonal poster · updated for each festival', home:'Home', toHome:'Back to home', more:'View more', reading:'Keep reading', otherIn:' — more',
      count:' items', soon:'Coming soon', search:'Search articles, works, characters…', noResult:'No results found',
      bodyOriginal:'The article text is kept in the language it was written in, untranslated.', notFound:'Article not found', notFoundDesc:'The link may have expired, or this piece is not published yet.',
      charsReading:'Reading on the characters', emptyTitle:'Nothing here yet', emptyDesc:'Try another section, or head back home.',
      category:'Category', viewRes:'View resources', all:'All', year:'Year', version:'Version', region:'Region', explore:'Explore' },
    ja: { skip:'本文へスキップ', archive:'アーカイブ', archiveTitle:'最近の更新', posterCap:'季節のポスター · 祝祭ごとに更新', home:'ホーム', toHome:'ホームへ戻る', more:'もっと見る', reading:'続けて読む', otherIn:' の他の記事',
      count:' 件', soon:'準備中', search:'記事・作品・キャラクターを検索…', noResult:'該当する内容が見つかりません',
      bodyOriginal:'本文は執筆時の言語のまま、翻訳していません。', notFound:'記事が見つかりません', notFoundDesc:'リンクが無効か、まだ公開されていない可能性があります。',
      charsReading:'キャラクター関連の記事', emptyTitle:'まだコンテンツがありません', emptyDesc:'他のセクションを見るか、ホームへ戻ってください。',
      category:'カテゴリ', viewRes:'リソースを見る', all:'すべて', year:'年', version:'版', region:'地域', explore:'Explore' }
  };
  var LANG = 'zh-Hans';
  try { LANG = localStorage.getItem('jp-lang') || 'zh-Hans'; } catch (e) {}
  if (!I18N[LANG]) LANG = 'zh-Hans';
  function t(k) { return (I18N[LANG] && I18N[LANG][k]) || I18N['zh-Hans'][k] || k; }

  /* ---------- 多语言字段取值 ----------
     data.js 里的四语字段：{ 'zh-Hans':…, 'zh-Hant':…, en:…, ja:… }
     专有名词用 P() 生成，四语同形，天然不翻译。 */
  function T(field) {
    if (field == null) return '';
    if (typeof field === 'string') return field;      /* 兼容纯字符串 */
    return field[LANG] || field['zh-Hans'] || '';
  }

  /* 日期按语言本地化，不在数据里写死 */
  var DATE_LOCALE = { 'zh-Hans': 'zh-CN', 'zh-Hant': 'zh-TW', en: 'en-US', ja: 'ja-JP' };
  function fmtDate(iso) {
    try {
      return new Intl.DateTimeFormat(DATE_LOCALE[LANG] || 'zh-CN',
        { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso + 'T00:00:00'));
    } catch (e) { return iso; }
  }
  /* 阅读时长：数字 + 各语言量词 */
  var READ_FMT = { 'zh-Hans': '# 分钟阅读', 'zh-Hant': '# 分鐘閱讀', en: '# min read', ja: '約 # 分' };
  function fmtRead(min) {
    if (!min) return '';
    return (READ_FMT[LANG] || READ_FMT['zh-Hans']).replace('#', min);
  }

  /* ---------- 解析静态 HTML 上的 data-t 路径 ----------
     页头页脚是 build.ps1 生成的静态标签（没有 JS 也能导航），
     但标签上带 data-t="s.works.label" 这样的路径，
     切换语言时由这里把文案换掉。 */
  function resolvePath(path) {
    var p = path.split('.');
    var kind = p[0];
    if (kind === 'ui') return t(p[1]);
    var sec = secOf(p[1]);
    if (!sec) return null;
    if (kind === 's') return T(sec[p[2]]);
    if (kind === 'c') {
      var c = catOf(sec, p[2]);
      return c ? T(c[p[3]]) : null;
    }
    var idx = parseInt(p[2], 10);
    if (kind === 'f') return sec.feature && sec.feature[idx] ? T(sec.feature[idx].label) : null;
    if (kind === 'g') return sec.tags && sec.tags.items[idx] ? T(sec.tags.items[idx].label) : null;
    if (kind === 'gk') return sec.tags ? T(sec.tags.kicker) : null;
    if (kind === 'l') return sec.links && sec.links[idx] ? T(sec.links[idx].label) : null;
    if (kind === 'n') return sec.notes && sec.notes[idx] ? T(sec.notes[idx][p[3]]) : null;
    return null;
  }

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

  /* 展开面板的内容左边缘对齐顶栏第一个导航项（Figma 的排布）。
     不写死 761px —— 中英日文标签宽度不同，量出来才对得上。
     换语言、改窗宽都要重量一次。 */
  function alignMenus() {
    var hdr = $('[data-header]'), first = $('.nav .nav__link');
    if (!hdr || !first) return;
    if (!isDesktop()) { hdr.style.removeProperty('--menu-left'); return; }
    var l = first.getBoundingClientRect().left;
    hdr.style.setProperty('--menu-left', Math.max(0, Math.round(l)) + 'px');
  }
  addEventListener('resize', alignMenus);

  /* ---------- 03 下拉面板 ---------- */
  (function dropdowns() {
    var triggers = $$('[data-menu]');
    var scrim = $('[data-scrim]'), hdr = $('[data-header]');
    if (!triggers.length) return;
    var open = null, closeT = null, pinned = false;

    function panelOf(trg) { return $('#' + trg.getAttribute('aria-controls')); }

    function show(trg) {
      if (open === trg) return;
      /* 已经开着另一块面板时算「横移」：跳过帘幕动画直接接管，
         否则鼠标在导航上扫一趟会看到一连串开合，很闪。 */
      var swap = !!open;
      hide(swap);
      var p = panelOf(trg);
      if (!p) return;
      p.classList.toggle('is-swap', swap);
      p.classList.add('is-open');
      p.setAttribute('aria-hidden', 'false');
      trg.setAttribute('aria-expanded', 'true');
      if (scrim) scrim.classList.add('is-on');
      if (hdr) hdr.classList.add('is-menu-open');
      open = trg;
    }
    function hide(swap) {
      if (!open) return;
      var p = panelOf(open);
      if (p) {
        p.classList.remove('is-open');
        p.classList.toggle('is-swap', !!swap);
        p.setAttribute('aria-hidden', 'true');
      }
      open.setAttribute('aria-expanded', 'false');
      if (!swap) {
        if (scrim) scrim.classList.remove('is-on');
        if (hdr) hdr.classList.remove('is-menu-open');
      }
      open = null; pinned = false;
    }
    /* 事件回调不能直接接 hide —— 事件对象会被当成 swap 参数（真值） */
    function close() { hide(); }

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
        else { close(); }
      });
      var p = panelOf(trg);
      [trg, p].forEach(function (el) {
        if (!el) return;
        el.addEventListener('mouseleave', function () { if (!pinned) closeT = setTimeout(close, 160); });
        el.addEventListener('mouseenter', function () { clearTimeout(closeT); });
      });
    });
    if (scrim) scrim.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    addEventListener('resize', function () { if (!isDesktop()) close(); });
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

    /* 索引跟着语言重建：搜索词能用当前语言，也能用任一语言的原文 */
    var INDEX = [];
    function allLangs(field) {
      if (!field) return '';
      if (typeof field === 'string') return field;
      return LANGS.map(function (l) { return field[l.code] || ''; }).join(' ');
    }
    function buildIndex() {
      INDEX = ARTICLES.map(function (a) {
        var s = secOf(a.section), c = catOf(s, a.cat);
        return { t: T(a.title), c: T(s ? s.label : '') + ' · ' + T(c ? c.label : ''), u: artUrl(a.slug),
                 img: url(a.cover),
                 k: (allLangs(a.title) + ' ' + allLangs(a.lede) + ' ' +
                     (a.tags || []).map(allLangs).join(' ')).toLowerCase() };
      });
      SECTIONS.forEach(function (s) {
        (s.cats || []).forEach(function (c) {
          INDEX.push({ t: T(c.label), c: T(s.label) + ' · ' + t('category'), u: catUrl(s, c.slug), img: '',
                       k: (allLangs(c.label) + ' ' + allLangs(s.label) + ' ' + allLangs(c.desc)).toLowerCase() });
        });
      });
      CHARACTERS.forEach(function (c) {
        INDEX.push({ t: T(c.name), c: T(secOf('characters').label) + ' · ' + T(c.role),
                     u: url('characters/' + (FILE ? 'index.html' : '') + '?c=' + c.slug),
                     img: charArt(c),
                     k: (allLangs(c.name) + ' ' + allLangs(c.role) + ' ' + allLangs(c.bio)).toLowerCase() });
      });
    }
    buildIndex();
    window.__rebuildSearch = buildIndex;

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

  /* ---------- 07 星体：指针轻微牵引 ----------
     牵引写在 .star（外层）上，呼吸浮动写在 .star__body / .star__glow 上。
     以前两者都写 .star__body：CSS 动画的优先级高于内联 style，
     牵引被动画整个吃掉，鼠标移上去其实一点反应都没有。 */
  (function star() {
    var host = $('[data-star]');
    if (!host || reduce || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var orb = $('.star', host);
    if (!orb) return;
    host.addEventListener('mousemove', function (e) {
      var r = host.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      orb.style.transform = 'translate(' + (x * 16).toFixed(1) + 'px,' + (y * 16).toFixed(1) + 'px)';
    });
    host.addEventListener('mouseleave', function () { orb.style.transform = ''; });
  })();

  /* ---------- 卡片与面包屑构件 ---------- */
  function cardHTML(a) {
    var s = secOf(a.section), c = catOf(s, a.cat), title = T(a.title);
    return '<article class="card reveal"><a class="card__link" href="' + artUrl(a.slug) + '">' +
      '<span class="card__media"><img src="' + url(a.cover) + '" alt="' + esc(title) + '" loading="lazy" width="800" height="800"></span>' +
      '<div class="card__body"><h3 class="card__title">' + esc(title) + '</h3>' +
      '<p class="card__meta"><span>' + esc(T(c ? c.label : (s ? s.label : ''))) + '</span>' +
      '<span>' + esc(fmtDate(a.date)) + '</span><span>' + esc(fmtRead(a.read)) + '</span></p>' +
      '</div></a></article>';
  }
  function listHTML(a) {
    var s = secOf(a.section), c = catOf(s, a.cat), title = T(a.title);
    return '<article class="list__item reveal"><a class="list__link" href="' + artUrl(a.slug) + '">' +
      '<span class="list__media"><img src="' + url(a.cover) + '" alt="' + esc(title) + '" loading="lazy" width="360" height="360"></span>' +
      '<div><h3 class="list__title">' + esc(title) + '</h3>' +
      '<p class="list__meta"><span>' + esc(T(c ? c.label : '')) + '</span><span>' + esc(fmtRead(a.read)) + '</span></p>' +
      '</div></a></article>';
  }
  /* 角色卡：指向角色主页（固定深色那一页），不是文章 */
  function charUrl(slug) {
    return url('characters/' + (FILE ? 'index.html' : '') + '?c=' + encodeURIComponent(slug));
  }
  function charArt(c) { return url(c.art || 'assets/images/characters/' + c.slug + PH); }
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

  /* ---------- 08 文章页 ----------
     正文块。data.js 里 body 可以写成两种：
       1) 直接一段 HTML 字符串   body: '<p>…</p><h2>…</h2>'
       2) 块数组（下面这些 t 值）
            { t:'p',      v:'段落' }
            { t:'h2',     v:'小标题' }   { t:'h3', v:'更小的标题' }
            { t:'quote',  v:'引用' }
            { t:'ul',     v:['一','二'] }  { t:'ol', v:[…] }
            { t:'hr' }
            { t:'img',    src:'assets/images/works/foo.png', cap:'图注', alt:'…' }
            { t:'figure', cap:'图注' }                 // 不给 src 就用封面
            { t:'html',   v:'<div class="…">随便写</div>' }   // 原样输出，不转义
     除了 html / 字符串两种，其余都会转义，写中文标点和 < > 都不会出事。
     排版想自己控就用 html 块 —— 那一段可以写任何标签和 class。 */
  function bodyHTML(a, title) {
    var body = a.body;
    if (typeof body === 'string') return body;          /* 整篇直接写 HTML */
    if (!body || !body.length) return '';
    return body.map(function (b) {
      if (typeof b === 'string') return '<p>' + esc(b) + '</p>';
      switch (b.t) {
        case 'p':     return '<p>' + esc(b.v) + '</p>';
        case 'h2':    return '<h2>' + esc(b.v) + '</h2>';
        case 'h3':    return '<h3>' + esc(b.v) + '</h3>';
        case 'quote': return '<blockquote>' + esc(b.v) + '</blockquote>';
        case 'hr':    return '<hr>';
        case 'html':  return b.v || '';                 /* 原样，不转义 */
        case 'ul': case 'ol': {
          var tag = b.t;
          return '<' + tag + '>' + (b.v || []).map(function (x) {
            return '<li>' + esc(x) + '</li>';
          }).join('') + '</' + tag + '>';
        }
        case 'img': case 'figure': {
          var src = b.src ? url(b.src) : url(a.cover);
          var alt = b.alt || b.cap || title;
          return '<figure class="fig"><span class="fig__media"><img src="' + src +
                 '" alt="' + esc(alt) + '" loading="lazy" width="800" height="800"></span>' +
                 (b.cap ? '<figcaption>' + esc(b.cap) + '</figcaption>' : '') + '</figure>';
        }
      }
      return '';
    }).join('');
  }

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
    var title = T(a.title), lede = T(a.lede);
    document.title = title + ' — JasperPeng';
    var m = $('meta[name="description"]'); if (m) m.setAttribute('content', lede || title);

    /* 正文保持写作时的原文，不做翻译 —— openai.com 同样如此。
       界面（导航/分类/标题/导语/日期）才随语言切换。
       界面语言和正文语言对不上时，先说明一句，免得读者以为翻译坏了。
       繁体读者能直接读简体正文，所以不提示。 */
    var note = (a.bodyLang && a.bodyLang !== LANG && !(a.bodyLang === 'zh-Hans' && LANG === 'zh-Hant'))
      ? '<p class="note-lang">' + esc(t('bodyOriginal')) + '</p>' : '';
    host.innerHTML =
      '<header class="article__head read">' +
        '<div class="tagbar">' +
          (a.tags || []).map(function (x) { return '<span class="tagbar__pill">' + esc(T(x)) + '</span>'; }).join('') +
          '<span class="tagbar__by"><span class="tagbar__avatar" aria-hidden="true">J</span>' + esc(a.author) + '</span>' +
        '</div>' +
        '<h1 class="article__title">' + esc(title) + '</h1>' +
        (lede ? '<p class="article__lede">' + esc(lede) + '</p>' : '') +
        '<p class="article__meta"><time datetime="' + esc(a.date) + '">' + esc(fmtDate(a.date)) + '</time>' +
          '<span>' + esc(T(c ? c.label : '')) + '</span><span>' + esc(fmtRead(a.read)) + '</span></p>' +
      '</header>' +
      '<figure class="article__hero wrap"><span class="fig__media">' +
        '<img src="' + url(a.cover) + '" alt="' + esc(title) + '" width="800" height="800"></span></figure>' +
      '<div class="article__body read">' + note + bodyHTML(a, title) + '</div>';

    paintCrumbs(crumbHTML([
      { label: T(s.label), href: c ? catUrl(s, c.slug) : url('home.html') },
      { label: T(c ? c.label : ''), href: c ? catUrl(s, c.slug) : url('home.html') },
      { label: title }
    ]));

    /* 继续阅读：同分类优先，不足则同板块补齐 */
    var pool = byCat(a.section, a.cat).filter(function (x) { return x.slug !== a.slug; });
    ARTICLES.forEach(function (x) {
      if (pool.length < 3 && x.section === a.section && x.slug !== a.slug && pool.indexOf(x) < 0) pool.push(x);
    });
    var wrap = $('[data-related]');
    if (pool.length && wrap) {
      $('[data-related-grid]').innerHTML = pool.slice(0, 3).map(cardHTML).join('');
      var rt = $('[data-related-title]');
      rt.setAttribute('data-name-key', s.key + (c ? '.' + c.slug : ''));
      rt.textContent = T(c ? c.label : s.label) + t('otherIn');
      $('[data-related-more]').setAttribute('href', c ? catUrl(s, c.slug) : url('home.html'));
      wrap.hidden = false;
    }
    i18n(); reveal(document); patchDirLinks(); upgradePlaceholders();
  }

  /* ---------- 09 分类页 ---------- */
  function renderCategory() {
    var grid = $('[data-cat-grid]');
    if (!grid) return;
    var s = secOf(BODY.getAttribute('data-section')), slug = BODY.getAttribute('data-cat');
    var c = catOf(s, slug);
    if (!s || !c) return;

    document.title = T(c.label) + ' — ' + T(s.label) + ' — JasperPeng';
    /* 分类页的标题 / 描述 / eyebrow 也随语言变 */
    var el;
    if ((el = $('[data-cat-title]'))) el.textContent = T(c.label);
    if ((el = $('[data-cat-desc]')))  el.textContent = T(c.desc);
    if ((el = $('[data-cat-eyebrow]'))) el.textContent = T(s.kicker);
    if ((el = $('meta[name="description"]'))) el.setAttribute('content', T(c.desc));
    var list = byCat(s.key, slug);
    var n = $('[data-cat-count]');
    if (n && list.length) { n.setAttribute('data-n', list.length); n.textContent = list.length + t('count'); }

    var lw = $('[data-cat-list-wrap]');
    if (list.length) {
      /* Figma 通用版式：前 3 篇走 3 列大卡，其余走 2 列小块 */
      grid.innerHTML = list.slice(0, 3).map(cardHTML).join('');
      var rest = list.slice(3);
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
               (x.slug === slug ? ' aria-current="page"' : '') + '>' + esc(T(x.label)) + '</a>';
      }).join('');
      var act = $('[aria-current="page"]', sib);
      if (act) sib.scrollLeft = Math.max(0, act.offsetLeft - 20);
    }
    paintCrumbs(crumbHTML([{ label: T(s.label), href: url('home.html#' + s.key) }, { label: T(c.label) }]));
    i18n(); reveal(document); patchDirLinks(); upgradePlaceholders();
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
               (c.slug === cur ? ' aria-current="true"' : '') + ' aria-label="' + esc(T(c.name)) + '">' +
               '<img src="' + charArt(c) + '" alt="" loading="lazy"></button>';
      }).join('') : '<p class="chars__none">' + t('noResult') + '</p>';
      /* 筛选之后当前角色可能被推到可视区外，把它带回来 */
      var act = $('[data-char][aria-current="true"]', strip);
      if (act && act.scrollIntoView) act.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    function paintStage(c) {
      var name = T(c.name);
      stage.innerHTML =
        '<div class="chars__art"><img src="' + charArt(c) +
          '" alt="' + esc(name) + '" width="800" height="800"></div>' +
        '<div><h1 class="chars__name">' + esc(name) + '</h1>' +
        '<p class="chars__role">' + esc(T(c.role)) + ' · ' + esc(T(c.age)) + ' ' + esc(T(c.sex)) + '</p>' +
        '<p class="chars__quote">' + esc(T(c.quote)) + '</p>' +
        '<p class="chars__bio">' + esc(T(c.bio)) + '</p>' +
        '<div class="chars__cta"><a class="btn btn--primary" href="' +
          catUrl(secOf('about'), c.res) + '">' + esc(t('viewRes')) + '<i class="arr"></i></a></div></div>';
      document.title = name + ' — ' + T(secOf('characters').label) + ' — JasperPeng';
    }
    function select(slug, push) {
      var c = charOf(slug);
      paintStrip(c.slug); paintStage(c); i18n(); patchDirLinks(); upgradePlaceholders();
      paintCrumbs(crumbHTML([
        { label: T(secOf('characters').label), href: url('home.html#characters') },
        { label: T(c.name) }
      ]));
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
    addEventListener("popstate", function () {
      select(new URLSearchParams(location.search).get("c") || CHARACTERS[0].slug, false);
    });

    /* 角色板块下的文章。「原创角色」分类已经改成跳到本页，
       它那两篇文章原本的列表页没了 —— 收在这里，保证站内走得到。 */
    (function reading() {
      var wrap = $('[data-char-reading]'), host = $('[data-char-reading-list]');
      if (!wrap || !host) return;
      var list = ARTICLES.filter(function (a) { return a.section === 'characters'; });
      if (!list.length) return;
      host.innerHTML = list.map(listHTML).join('');
      wrap.hidden = false;
    })();

    select(new URLSearchParams(location.search).get('c') || CHARACTERS[0].slug, false);
  }



  function i18n() {
    /* 纯 UI 词 */
    $$('[data-i18n]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n'));
      if (el.tagName === 'INPUT') el.setAttribute('placeholder', v); else el.textContent = v;
    });
    /* 静态页头页脚里的板块 / 分类名 */
    $$('[data-t]').forEach(function (el) {
      var v = resolvePath(el.getAttribute('data-t'));
      if (v == null) return;
      /* 只换文本节点，保留同级的箭头等图标元素 */
      var done = false;
      for (var i = 0; i < el.childNodes.length; i++) {
        if (el.childNodes[i].nodeType === 3) { el.childNodes[i].nodeValue = v; done = true; break; }
      }
      if (!done) el.insertBefore(document.createTextNode(v), el.firstChild);
    });
    var meta = LANGS.filter(function (l) { return l.code === LANG; })[0];
    document.documentElement.lang = meta ? meta.html : 'zh-CN';
    alignMenus();                 /* 标签换了语言，宽度就变了，重新对齐一次 */

    /* 重刷由 JS 拼出、不带标记的动态文案 */
    var n = $('[data-cat-count]');
    if (n && n.getAttribute('data-n')) n.textContent = n.getAttribute('data-n') + t('count');
    var rt = $('[data-related-title]');
    if (rt && rt.getAttribute('data-name-key')) {
      var parts = rt.getAttribute('data-name-key').split('.');
      var sec = secOf(parts[0]), c = parts[1] ? catOf(sec, parts[1]) : null;
      rt.textContent = T(c ? c.label : (sec ? sec.label : '')) + t('otherIn');
    }
  }

  /* 语言变更后，重新渲染当前页由数据生成的内容 */
  function rerender() {
    if (PAGE === 'article')          renderArticle();
    else if (PAGE === 'category')    renderCategory();
    else if (PAGE === 'characters')  renderCharacters();
    else                             rerenderStaticCards();
    i18n();
  }

  /* 首页的卡片是静态 HTML，用 data-slug 认领对应文章后重写文案 */
  function rerenderStaticCards() {
    $$('[data-slug]').forEach(function (el) {
      var a = artOf(el.getAttribute('data-slug'));
      if (!a) return;
      var sec = secOf(a.section), c = catOf(sec, a.cat);
      var ttl = $('.card__title, .list__title', el);
      if (ttl) ttl.textContent = T(a.title);
      var meta = $('.card__meta, .list__meta', el);
      if (meta) {
        var bits = [T(c ? c.label : sec.label)];
        if (meta.classList.contains('card__meta')) bits.push(fmtDate(a.date));
        bits.push(fmtRead(a.read));
        meta.innerHTML = bits.map(function (b) { return '<span>' + esc(b) + '</span>'; }).join('');
      }
      var img = $('img', el);
      if (img) img.setAttribute('alt', T(a.title));
    });
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
        paint();
        if (window.__rebuildSearch) window.__rebuildSearch();  /* 搜索索引跟着换语言 */
        rerender();                                            /* 重画本页由数据生成的内容 */
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
  alignMenus();
  reveal(document);
  upgradePlaceholders();
  patchDirLinks();
  /* main.js 是 defer，静态 HTML 里的图可能在它跑起来之前就已经失败过一次，
     那时捕获监听还没挂上 —— 这里补一遍。 */
  $$('img').forEach(function (im) { if (im.complete && im.naturalWidth === 0) fixImg(im); });
  document.documentElement.classList.add('js-on');
})();
