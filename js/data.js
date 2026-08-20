/* =============================================================
   JasperPeng — data.js
   全站唯一数据源。导航、下拉面板、分类页、文章页、角色页、
   搜索索引，全部由这一份数据渲染。

   加文章：往 ARTICLES 加一条，填对 section / cat。
           首页、分类页、相关阅读、搜索会自动带上。
   加分类：往对应 section 的 cats 加一条，再跑一次 build.ps1。
   封面图：路径由 slug 推导 —— assets/images/{section}/{slug}.svg
           不存在时会退回占位色块，跑 build.ps1 可批量生成。
   ============================================================= */
(function (w) {
  'use strict';

  var MAIL = 'pengjasper@icloud.com';

  /* ---------------------------------------------------------
     一级板块 · 顺序即导航顺序（Figma「顶」的六项）
     key       导航标识，同时是下拉面板 id 后缀
     dir       目录名，决定 /works/artifacts/ 这样的地址
     cats      二级分类 —— 全部使用「通用版式」
     feature   下拉面板右侧的推荐位（不是分类）
     --------------------------------------------------------- */
  var SECTIONS = [
    {
      key: 'research', label: 'Research', dir: 'research',
      title: 'Ideas worth exploring.',
      lede: '关于创作、技术、文化与存在的笔记，以及还没想清楚的问题。',
      kicker: 'Explore Research', featKicker: 'My Research',
      cats: [
        { slug: 'news',       label: 'News',       desc: '关于这个档案馆的更新、上线与阶段性记录。' },
        { slug: 'philosophy', label: 'Philosophy', desc: '关于创作、技术、文化与存在的笔记与个人思考。' }
      ],
      feature: [
        { to: 'article:the-word',  label: 'The word' },
        { to: 'article:image-read', label: 'Art' }
      ]
    },
    {
      key: 'works', label: 'Works', dir: 'works',
      title: 'Selected Works',
      lede: '手作、平面、插画与影像 —— 做出来的东西，以及做的过程。',
      kicker: 'Explore Works', featKicker: 'Best goods',
      cats: [
        { slug: 'artifacts',     label: 'Artifacts',     desc: '手作物件与实体造物，以及它们的制作过程。' },
        { slug: 'design',        label: 'Design',        desc: '平面、版式与系统设计的实践与规范。' },
        { slug: 'illustrations', label: 'Illustrations', desc: '插画作品与系列创作。' },
        { slug: 'comics',        label: 'Comics',        desc: '短篇漫画与图像叙事实验。' },
        { slug: 'art',           label: 'Art',           desc: '不受媒介限制的自由创作。' },
        { slug: 'photos',        label: 'Photos',        desc: '旅途、城市与日常的摄影记录。' }
      ],
      feature: [
        { to: 'article:tongtong-mask',  label: '嗵嗵仮面' },
        { to: 'article:indian-anklets', label: '印度脚铃' },
        { to: 'article:doudou-seasons', label: 'DOUDOU春夏秋冬' }
      ],
      tags: { kicker: 'Photos', items: [
        { to: 'article:osaka',           label: 'Osaka' },
        { to: 'article:kyoto',           label: 'Kyoto' },
        { to: 'article:nanjing-station', label: 'Nanjing station' }
      ]}
    },
    {
      key: 'universe', label: 'Universe', dir: 'universe',
      title: 'A world of my own.',
      lede: '一座不存在的城市，和支撑它成立的地理、交通与建筑。',
      kicker: 'Explore Universe', featKicker: 'Brands',
      cats: [
        { slug: 'maps',         label: 'Maps',         desc: '虚构世界的地图与地理体系。' },
        { slug: 'terrain',      label: 'Terrain',      desc: '地形、水系与自然环境设定。' },
        { slug: 'metro',        label: 'Metro',        desc: '轨道交通线网与站点系统。' },
        { slug: 'architecture', label: 'Architecture', desc: '建筑、空间与城市肌理。' },
        { slug: 'scenery',      label: 'Scenery',      desc: '风景、光线与场景设定。' }
      ],
      feature: [
        { to: 'article:noote-metro', label: 'NooteMetro' }
      ]
    },
    {
      key: 'characters', label: 'Characters', dir: 'characters',
      title: 'People, stories and identities.',
      lede: '原创角色的设定、关系与他们各自的说话方式。',
      kicker: 'Explore Characters', featKicker: 'OC',
      /* 板块首页是角色浏览器（深色），不是通用版式 */
      landing: true,
      cats: [
        { slug: 'oc',            label: 'OC',            desc: '原创角色设定与三视图。' },
        { slug: 'character',     label: 'Character',     desc: '角色关系、性格与故事线。' },
        { slug: 'illustrations', label: 'Illustrations', desc: '角色相关的插画作品。' },
        { slug: 'guidebook',     label: 'Guidebook',     desc: '角色使用规范与设定集。' }
      ],
      feature: [
        { to: 'char:caomeijiang', label: '草莓酱' },
        { to: 'char:la',          label: '拉' },
        { to: 'char:qi',          label: '祈' },
        { to: 'char:xiahua',      label: '夏花' }
      ]
    },
    {
      key: 'about', label: 'About', dir: 'resources',
      title: 'Tools behind the work.',
      lede: '可下载的素材、视觉规范，以及一些没处归类的东西。',
      kicker: 'About me', featKicker: 'Guidelines',
      cats: [
        { slug: 'resources',  label: 'Resources',     desc: '可下载的素材、字体与图形资源。' },
        { slug: 'guidelines', label: 'Guidelines',    desc: '字体、标识与视觉识别规范。' },
        { slug: 'misc',       label: 'Miscellaneous', desc: '杂项记录与未归类内容。' }
      ],
      feature: [
        { to: 'article:fonts', label: 'Fonts' },
        { to: 'article:logos', label: 'Logos' },
        { to: 'cat:resources', label: 'Illustrations' }
      ]
    },
    {
      /* Contact 没有二级分类，是外链与说明 */
      key: 'contact', label: 'Contact', dir: null,
      kicker: 'Contact', featKicker: 'About me',
      links: [
        { label: 'Mail',    href: 'mailto:' + MAIL },
        { label: 'X',       soon: true, external: true },
        { label: 'Bluesky', soon: true, external: true },
        { label: 'Github',  soon: true, external: true }
      ],
      notes: [
        { kicker: 'About me', text: 'base in PRC' },
        { kicker: 'Donate',   text: '暂未开放', dim: true }
      ]
    }
  ];

  /* ---------------------------------------------------------
     角色 · Figma「角色」画板
     该页固定深色。filters 对应稿子里的「全部 / 年份 / 版本 / 地图」
     --------------------------------------------------------- */
  var CHARACTERS = [
    { slug: 'caomeijiang', name: '草莓酱', role: 'Noote看板娘', age: '19years old', sex: '♀',
      year: '2024', version: 'v3', region: 'Noote 中央区',
      quote: 'Hello, This is puree strawberry',
      bio: '第一个被完整定稿的角色，也是改得最多的一个。前六版都太好看了，好看到没有性格；第七版把配色压暗两度、加了一点不对称，人才立住。',
      res: 'resources' },
    { slug: 'la', name: '拉', role: '沉默的可靠', age: '24years old', sex: '♂',
      year: '2024', version: 'v2', region: 'Noote 北岸',
      quote: '……',
      bio: '几乎没有台词。性格全靠站姿、视线方向，以及别人看他的反应来交代。',
      res: 'resources' },
    { slug: 'qi', name: '祈', role: '话最多的那个', age: '21years old', sex: '♂',
      year: '2025', version: 'v1', region: 'Noote 旧港',
      quote: '所以说啊——你听我讲完嘛',
      bio: '设计难点在于：要让人一眼看出他很吵，但又不能让人觉得烦。答案是把音量放在配色上，而不是表情上。',
      res: 'resources' },
    { slug: 'xiahua', name: '夏花', role: '出场最少', age: '17years old', sex: '♀',
      year: '2025', version: 'v2', region: 'Noote 西丘',
      quote: '我待会儿就走。',
      bio: '只在三张图里出现过，但每次都改变了整组画面的重心。存在感和出场次数无关。',
      res: 'resources' },
    { slug: 'tong', name: '嗵嗵', role: '面具下的沉默', age: 'unknown', sex: '—',
      year: '2025', version: 'v1', region: 'Noote 地下线',
      quote: '（敲了敲面具）',
      bio: '从一张手作面具反推出来的角色。先有物件，后有人 —— 这是唯一一个这样诞生的。',
      res: 'guidelines' },
    { slug: 'doudou', name: 'DOUDOU', role: '四季的容器', age: '—', sex: '—',
      year: '2026', version: 'v4', region: 'Noote 环线沿途',
      quote: '春天留白，冬天只剩轮廓。',
      bio: '同一个角色活过四个季节，四张放在一起看才是完整的一句话。单看任何一张都不算数。',
      res: 'resources' },
    { slug: 'noote', name: 'Noote', role: '世界本身', age: '—', sex: '—',
      year: '2026', version: 'v1', region: '全域',
      quote: '这里的电车晚上会偏绿。',
      bio: '严格说不是角色，是这座城市的拟人。所有其他人都住在他身体里。',
      res: 'guidelines' }
  ];

  /* ---------------------------------------------------------
     文章
     body 块：p 段落 / h2 小标题 / quote 引用 / figure 配图
     --------------------------------------------------------- */
  var A = [];
  function add(o) { A.push(o); }

  /* ===== Works · Artifacts ===== */
  add({ slug: 'indian-anklets', section: 'works', cat: 'artifacts',
    title: '用铃铛和长绳编织一串印度脚铃',
    lede: '福禄寿 FloruitShow 乐队作品中常出现的乐器，《玉珍》《兰若度母》等作品重要的乐器之一，声音清脆悦耳。',
    date: '2026-08-18', dateLabel: '2026年8月18日', read: '5 min read',
    tags: ['Works', '2026年', '手作'],
    body: [
      { t: 'p', v: '如果你听过福禄寿 FloruitShow 的歌，应该会发现她们的音乐里经常出现一些很有意思的传统乐器。印度脚铃就是其中让我印象比较深的一种。它看起来特别简单，就是用一根长绳把很多小铃铛串在一起，但真正用起来的时候，声音特别好听。' },
      { t: 'p', v: '这种铃铛最大的特点是会跟着人的动作一起响。走路、跳舞，或者只是轻轻晃动一下，都会发出清脆的声音。所以听起来会有一种很特别的感觉，好像声音不是从某个固定的地方传出来的，而是跟着人一起移动。' },
      { t: 'quote', v: '声音不是从某个固定的地方传出来的，而是跟着人一起移动。' },
      { t: 'p', v: '福禄寿在舞台上使用印度脚铃的时候，也让我觉得这种乐器特别适合她们的音乐。像《玉珍》《兰若度母》这些作品，本身就有很多传统文化的感觉，再加上铃铛的声音，整个作品就变得更加有自己的味道。' },
      { t: 'figure', cap: '编织过程 · 绳结与间距' },
      { t: 'p', v: '我觉得有意思的是，这种乐器真的很简单。没有什么复杂的结构，就是铃铛和绳子，却可以留下非常明显的声音。小时候我们可能也玩过类似的小铃铛，但到了音乐里，它就突然变成了一种很有氛围感的东西。' }
    ]});

  add({ slug: 'tongtong-mask', section: 'works', cat: 'artifacts',
    title: '嗵嗵仮面：一张面具的重量分配',
    lede: '造型稿画得再好看，戴上十分钟脖子就开始抗议 —— 面具真正的难点在看不见的地方。',
    date: '2026-08-16', dateLabel: '2026年8月16日', read: '6 min read',
    tags: ['Works', '2026年', '手作'],
    body: [
      { t: 'p', v: '做面具最容易被低估的一件事是重量。造型稿画得再好看，一旦材料铺满整张脸，重心就会往前掉，戴上十分钟脖子就开始抗议。' },
      { t: 'h2', v: '把重量往后挪' },
      { t: 'p', v: '解决办法其实很朴素：把结构性的部分做薄，把装饰性的部分往两侧和后脑分散，让整体重心尽量落在两耳连线上。这条线是头部转动的轴，重心压在轴上，脖子就不用一直较劲。' },
      { t: 'figure', cap: '内衬结构与配重点' },
      { t: 'p', v: '最后成品比第一版轻了将近四成，戴一个下午也不难受。造型几乎没改，改的全是看不见的地方 —— 这大概是所有可穿戴物件的共同规律。' }
    ]});

  /* ===== Works · Design ===== */
  add({ slug: 'grid-system', section: 'works', cat: 'design',
    title: '一套够用就好的网格系统',
    lede: '不追求覆盖所有情况，只解决这个档案馆自己的排版问题。',
    date: '2026-08-12', dateLabel: '2026年8月12日', read: '7 min read',
    tags: ['Works', 'Design'],
    body: [
      { t: 'p', v: '十二列、1280 最大宽度、二十的间距单位。听起来平平无奇，但正因为平平无奇，它不会在任何一个页面上出意外。' },
      { t: 'h2', v: '断点只留三个' },
      { t: 'p', v: '九百以下收成单列导航，六百四十以下卡片降为两列。中间那些"看起来也需要调一下"的宽度，实际逐一测过之后发现并不需要 —— 加断点的冲动，多数时候来自没把流体单位用够。' },
      { t: 'p', v: '真正管用的是 clamp。字号、间距、圆角全都交给它，断点只负责改变结构（几列、横排还是竖排），不负责改数值。这样一套下来，需要手动照顾的地方少了三分之二。' }
    ]});

  add({ slug: 'type-scale', section: 'works', cat: 'design',
    title: '中英混排的字号阶梯',
    lede: '同一个字号下，汉字看起来总比拉丁字母大一号。',
    date: '2026-08-11', dateLabel: '2026年8月11日', read: '5 min read',
    tags: ['Works', 'Design'],
    body: [
      { t: 'p', v: '汉字是方的，拉丁字母有升部降部，所以同样 17px，一段中文的视觉重量明显比英文重。混排的时候如果不管，中文会显得又挤又黑。' },
      { t: 'p', v: '我的处理是：中文行高比英文多给 0.15，字间距给一点点正值，标题的字重比英文低一级。三个调整都很小，合起来才把两种文字拉到同一个视觉层面。' },
      { t: 'quote', v: '混排不是让两种文字一样大，是让它们看起来一样重。' }
    ]});

  /* ===== Works · Illustrations ===== */
  add({ slug: 'doudou-seasons', section: 'works', cat: 'illustrations',
    title: 'DOUDOU 春夏秋冬 · 四条时间线',
    lede: '同一个角色，四种季节，四种完全不同的呼吸节奏。',
    date: '2026-08-14', dateLabel: '2026年8月14日', read: '4 min read',
    tags: ['Works', 'Illustrations'],
    body: [
      { t: 'p', v: '这一组的想法很简单：让同一个角色在四个季节里各活一次，看看画面会自己长成什么样。' },
      { t: 'p', v: '春天用了最多的留白，夏天几乎塞满，秋天开始往回收，冬天只剩下轮廓。四张放在一起看，才是完整的一句话；单看任何一张，都像话说了一半。' },
      { t: 'figure', cap: '秋卷 · 局部' }
    ]});

  add({ slug: 'linework', section: 'works', cat: 'illustrations',
    title: '线稿：什么时候该断笔',
    lede: '一条不断的轮廓线会把形体锁死，断开反而更像。',
    date: '2026-08-09', dateLabel: '2026年8月9日', read: '4 min read',
    tags: ['Works', 'Illustrations'],
    body: [
      { t: 'p', v: '刚开始画的时候总想把轮廓封死，觉得线连不上就是没画完。后来发现，受光那一侧的线断掉，形体反而更透气，也更像有光照在上面。' },
      { t: 'p', v: '规律大致是：背光处线重且连续，受光处线轻甚至断开。这不是省事，是让线条承担明暗的职责。' }
    ]});

  /* ===== Works · Comics ===== */
  add({ slug: 'paper-strip', section: 'works', cat: 'comics',
    title: '四格：关于等一班不会来的车',
    lede: '没有对白，只有站台的灯从亮到暗。',
    date: '2026-08-10', dateLabel: '2026年8月10日', read: '2 min read',
    tags: ['Works', 'Comics'],
    body: [
      { t: 'p', v: '四格，没有对白，只有站台的灯从亮到暗。第一格灯全亮，第二格灭了一半，第三格只剩指示牌，第四格什么都没有。' },
      { t: 'figure', cap: '第三格 · 原稿' },
      { t: 'p', v: '不写字是故意的。一旦写了"末班车已过"，这四格就变成了通知；不写，它才是等待本身。' }
    ]});

  /* ===== Works · Art ===== */
  add({ slug: 'color-notes', section: 'works', cat: 'art',
    title: '色彩笔记：灰色其实有温度',
    lede: '同一个明度的灰，偏暖半度和偏冷半度，读起来是两种情绪。',
    date: '2026-08-08', dateLabel: '2026年8月8日', read: '5 min read',
    tags: ['Works', 'Art'],
    body: [
      { t: 'p', v: '把一整面墙刷成中性灰，再在旁边放一块偏暖半度的灰，人眼立刻能读出差别，但说不出差在哪里。这种"说不出"恰恰是灰色最有用的地方。' },
      { t: 'quote', v: '灰色不是没有颜色，是把颜色藏起来了。' },
      { t: 'p', v: '所以做整体偏灰的画面时，我从来不用纯灰。每一块灰都往某个方向偏一点点，让它们之间产生极弱的冷暖关系 —— 观众感觉得到，但不会分心。' }
    ]});

  add({ slug: 'negative-space', section: 'works', cat: 'art',
    title: '留白不是空的',
    lede: '空出来的地方也在参与构图，只是它不说话。',
    date: '2026-08-05', dateLabel: '2026年8月5日', read: '4 min read',
    tags: ['Works', 'Art'],
    body: [
      { t: 'p', v: '把主体挪一挪，剩下的空白形状也跟着变。如果那个空白的形状本身不好看，整张图就不会好看 —— 哪怕主体画得再准。' },
      { t: 'p', v: '检查方法很土：把画面眯成一片模糊，只看黑白块的分布。这时候留白会变成一个具体的形状，好不好一眼就知道。' }
    ]});

  /* ===== Works · Photos ===== */
  add({ slug: 'osaka', section: 'works', cat: 'photos',
    title: 'Osaka：夜行电车的色温',
    lede: '关西的夜晚是偏绿的，这件事在照片里比在现场明显得多。',
    date: '2026-08-06', dateLabel: '2026年8月6日', read: '6 min read',
    tags: ['Works', 'Photos', '旅行'],
    body: [
      { t: 'p', v: '车厢里的荧光灯把所有人的脸都调成同一个色温，只有窗外掠过的招牌在不停打断它。那种打断很有节奏，像呼吸。' },
      { t: 'figure', cap: '环状线 · 车窗' },
      { t: 'p', v: '后期几乎没有调色，因为一旦把绿调回来，那个夜晚就不见了。忠于记忆有时候比忠于白平衡重要。' }
    ]});

  add({ slug: 'kyoto', section: 'works', cat: 'photos',
    title: 'Kyoto：把游客拍进去',
    lede: '与其等一个空无一人的画面，不如承认人也是风景的一部分。',
    date: '2026-08-04', dateLabel: '2026年8月4日', read: '4 min read',
    tags: ['Works', 'Photos', '旅行'],
    body: [
      { t: 'p', v: '在京都等一个没有人的镜头，往往要站上四十分钟。后来我放弃了，改成等一个"人站得刚好"的镜头，反而快得多，画面也更诚实。' },
      { t: 'p', v: '空景照片有一种假，好像这个地方从来没人来过。可它明明每天有几万人经过 —— 把人拍进去，照片才是那一天的照片。' }
    ]});

  add({ slug: 'nanjing-station', section: 'works', cat: 'photos',
    title: 'Nanjing station：候车厅的几何',
    lede: '一个每天几十万人经过的空间，结构反而是最冷静的。',
    date: '2026-08-02', dateLabel: '2026年8月2日', read: '5 min read',
    tags: ['Works', 'Photos'],
    body: [
      { t: 'p', v: '候车厅的屋顶是一组重复的三角桁架，人流再乱，抬头永远是同一个节奏。这种反差本身就值得拍。' },
      { t: 'figure', cap: '南京站 · 屋顶结构' }
    ]});

  /* ===== Research · News ===== */
  add({ slug: 'site-launch', section: 'research', cat: 'news',
    title: 'JasperPeng 个人网站正式上线！来自 2026 年的声音。',
    lede: '这个档案馆为什么存在，以及它接下来会长成什么样子。',
    date: '2026-08-18', dateLabel: '2026年8月18日', read: '8 min read',
    tags: ['Research', 'News'],
    body: [
      { t: 'p', v: '很长一段时间里，我的东西散落在各个平台：插画在一个地方，设定集在另一个地方，随手写的想法则基本上没有地方。' },
      { t: 'h2', v: '为什么要自己做一个' },
      { t: 'p', v: '平台会改版、会关停、会用推荐算法决定谁看得到什么。而档案需要的恰恰是稳定和可检索 —— 这两件事只能自己做。' },
      { t: 'quote', v: '档案的价值不在于当下有多少人看，而在于十年后它还在不在。' },
      { t: 'p', v: '所以有了这个站点。它不追求流量，只追求把东西放好、放稳、找得到。分类会随着内容长出来，而不是先搭好架子再往里塞。' }
    ]});

  add({ slug: 'archive-plan', section: 'research', cat: 'news',
    title: '接下来半年打算做的事',
    lede: '一份写给自己看的、允许被推翻的计划。',
    date: '2026-08-15', dateLabel: '2026年8月15日', read: '4 min read',
    tags: ['Research', 'News'],
    body: [
      { t: 'p', v: '先把已有的东西搬完 —— 这件事最枯燥，但不做完，后面所有的分类都是空的。' },
      { t: 'p', v: '然后是角色页。七个人现在只有名字和一句话，需要补设定集、三视图、关系图。' },
      { t: 'p', v: '最后才是 Universe。那部分工程量最大，也最容易做不完，所以排在最后 —— 排在前面的话，前两件事永远轮不到。' }
    ]});

  /* ===== Research · Philosophy ===== */
  add({ slug: 'the-word', section: 'research', cat: 'philosophy',
    title: 'The word：语言作为一种视觉材料',
    lede: '文字、命名、字体，以及语言与视觉表达之间那条模糊的边界。',
    date: '2026-08-13', dateLabel: '2026年8月13日', read: '7 min read',
    tags: ['Research', 'Philosophy'],
    body: [
      { t: 'p', v: '一个词被写下来的那一刻，它同时变成了两样东西：意思，和形状。大多数时候我们只读前者。' },
      { t: 'h2', v: '当形状开始说话' },
      { t: 'p', v: '但把字号放大到某个程度，形状就会盖过意思。这也是为什么标题的排版从来不只是"把字变大"—— 变大之后它就不再是句子，而是图形。' },
      { t: 'figure', cap: '同一个词的六种字重' },
      { t: 'p', v: '给角色命名的时候我也有同样的感觉。"祈"和"拉"在纸上的重量完全不同，哪怕还没有人知道他们是谁。' }
    ]});

  add({ slug: 'image-read', section: 'research', cat: 'philosophy',
    title: '关于图像的可读性',
    lede: '一张图需要被读懂到什么程度，取决于它想要谁看。',
    date: '2026-08-07', dateLabel: '2026年8月7日', read: '6 min read',
    tags: ['Research', 'Philosophy'],
    body: [
      { t: 'p', v: '可读性不是越高越好。有些图像的价值恰恰在于它拒绝被立刻读懂，逼着人多停留几秒 —— 那几秒是它全部的意义。' },
      { t: 'p', v: '但这件事有前提：拒绝必须是设计出来的，不能是没画清楚。观众分得出来哪种是故意的。' },
      { t: 'quote', v: '看不懂和还没看懂，是两回事。' }
    ]});

  /* ===== Universe · Metro ===== */
  add({ slug: 'noote-metro', section: 'universe', cat: 'metro',
    title: 'NooteMetro：线网的第三次修订',
    lede: '地图、交通系统与虚构的城市环境 —— 这个世界观里被建造得最久的一部分。',
    date: '2026-08-17', dateLabel: '2026年8月17日', read: '9 min read',
    tags: ['Universe', 'Metro'],
    body: [
      { t: 'p', v: '第三版线网最大的改动是承认了一件事：这座城市不需要那么多换乘站。' },
      { t: 'h2', v: '从八条减到六条' },
      { t: 'p', v: '前两版一直在加线，结果中心区挤成一团，外围却什么都没有。这一版反过来，先确定城市边界，再让线路去够它。' },
      { t: 'figure', cap: '第三版线网 · 中心区' },
      { t: 'p', v: '虚构的交通系统一样要讲道理。一旦线网自己说不通 —— 比如两条线在没有理由的地方交汇 —— 整个城市看起来就是假的。' }
    ]});

  add({ slug: 'station-naming', section: 'universe', cat: 'metro',
    title: '站名是怎么取的',
    lede: '一个好站名要同时回答"这是哪"和"这里有什么"。',
    date: '2026-08-01', dateLabel: '2026年8月1日', read: '5 min read',
    tags: ['Universe', 'Metro'],
    body: [
      { t: 'p', v: '真实城市的站名大多来自地名、单位名或地标。虚构城市的难点在于：这些名字得先有来历，才不会像随口编的。' },
      { t: 'p', v: '我的做法是先写一段简短的地方志，站名从里面挑。哪怕读者永远看不到那段地方志，名字读起来也会不一样。' }
    ]});

  /* ===== Universe · Maps ===== */
  add({ slug: 'maps-geography', section: 'universe', cat: 'maps',
    title: 'Maps & Geography：先画海岸线',
    lede: '一切地理设定都从一条不讲道理的海岸线开始。',
    date: '2026-07-29', dateLabel: '2026年7月29日', read: '5 min read',
    tags: ['Universe', 'Maps'],
    body: [
      { t: 'p', v: '海岸线不能画得太规整，规整的海岸线一看就是人造的。真实的海岸永远比你以为的更碎 —— 有一个尺度上的自相似，放大看还是那么碎。' },
      { t: 'p', v: '所以我画的时候是先随手甩一条，再在每一段上继续甩更小的，重复三轮。得到的结果比刻意设计的好看得多。' }
    ]});

  add({ slug: 'map-legend', section: 'universe', cat: 'maps',
    title: '图例决定了地图的性格',
    lede: '同一份数据，换一套图例就是另一座城市。',
    date: '2026-07-26', dateLabel: '2026年7月26日', read: '4 min read',
    tags: ['Universe', 'Maps'],
    body: [
      { t: 'p', v: '把绿地画成大块的浅绿，城市就显得宜居；画成细碎的点状，同一片地就显得荒。数据一个字没改。' },
      { t: 'figure', cap: '两套图例 · 同一份底图' }
    ]});

  /* ===== Universe · Terrain ===== */
  add({ slug: 'terrain-contours', section: 'universe', cat: 'terrain',
    title: 'Terrain：等高线决定了故事',
    lede: '地形不是背景板。坡度改一点，城市该长在哪里就全变了。',
    date: '2026-08-03', dateLabel: '2026年8月3日', read: '6 min read',
    tags: ['Universe', 'Terrain'],
    body: [
      { t: 'p', v: '先画等高线，再放城市，顺序反过来就会出问题 —— 把城建在不该建的地方，之后所有的交通线都要绕。' },
      { t: 'figure', cap: '中部高地 · 等高线草图' },
      { t: 'p', v: '有了地形之后，很多设定会自己冒出来：哪里会缺水、哪里容易被围困、哪条路一定要修隧道。这些都不用编，地形已经替你回答了。' }
    ]});

  add({ slug: 'river-systems', section: 'universe', cat: 'terrain',
    title: '水系：河从哪来，城就在哪',
    lede: '几乎所有真实城市都能用一条河解释清楚，虚构的也一样。',
    date: '2026-07-30', dateLabel: '2026年7月30日', read: '5 min read',
    tags: ['Universe', 'Terrain'],
    body: [
      { t: 'p', v: '河流的走向要服从地形，支流要从高处汇入干流。这条规则一破，地图就假了 —— 而且是那种说不出哪里不对的假。' },
      { t: 'quote', v: '先有水，才有路；先有路，才有城。' }
    ]});

  /* ===== Universe · Architecture ===== */
  add({ slug: 'architecture-spaces', section: 'universe', cat: 'architecture',
    title: 'Architecture & Spaces：给建筑一个年代',
    lede: '一栋楼属于哪个年代，比它长什么样更能决定它可信不可信。',
    date: '2026-07-27', dateLabel: '2026年7月27日', read: '6 min read',
    tags: ['Universe', 'Architecture'],
    body: [
      { t: 'p', v: '把一栋楼的建成年代定下来，它的材料、层高、窗户比例就都被限制住了 —— 这种限制反而让设计变容易，因为可选项一下子少了九成。' },
      { t: 'p', v: '一条街上如果所有楼都是同一个年代，会显得像影视基地。真实的街道总是几个年代混在一起，彼此别扭地共存。' }
    ]});

  add({ slug: 'facade-rhythm', section: 'universe', cat: 'architecture',
    title: '立面的节奏',
    lede: '窗户的排列方式，比楼本身的形状更容易被记住。',
    date: '2026-07-23', dateLabel: '2026年7月23日', read: '4 min read',
    tags: ['Universe', 'Architecture'],
    body: [
      { t: 'p', v: '人记不住一栋楼的轮廓，但记得住它的窗户是密的还是疏的、是竖长还是横宽。立面的节奏就是建筑的字体。' },
      { t: 'figure', cap: '三种开窗节奏' }
    ]});

  /* ===== Universe · Scenery ===== */
  add({ slug: 'scenery-light', section: 'universe', cat: 'scenery',
    title: 'Scenery：一天里最短的那种光',
    lede: '日落前的二十分钟，颜色会做一些平时不做的事。',
    date: '2026-07-28', dateLabel: '2026年7月28日', read: '4 min read',
    tags: ['Universe', 'Scenery'],
    body: [
      { t: 'p', v: '那二十分钟里，阴影是蓝的，受光面是橙的，中间几乎没有过渡。画的时候得敢用这种对比，稍微保守一点就不像了。' },
      { t: 'figure', cap: '黄昏 · 色彩取样' }
    ]});

  add({ slug: 'seasons-frame', section: 'universe', cat: 'scenery',
    title: '四季在同一个取景框里',
    lede: '固定机位，只让季节变 —— 这是检验场景设定最快的方法。',
    date: '2026-07-25', dateLabel: '2026年7月25日', read: '5 min read',
    tags: ['Universe', 'Scenery'],
    body: [
      { t: 'p', v: '同一个角度画四遍，哪些东西该变、哪些不该变，一目了然。不该变的却变了，说明当初就没想清楚。' },
      { t: 'p', v: '这个方法很省事，也很残酷：它会把所有含糊的地方一次性暴露出来。' }
    ]});

  /* ===== Characters · OC ===== */
  add({ slug: 'strawberry-sheet', section: 'characters', cat: 'oc',
    title: '草莓酱：七版之后才立住的角色',
    lede: '前六版都太好看了，好看到没有性格。',
    date: '2026-08-18', dateLabel: '2026年8月18日', read: '5 min read',
    tags: ['Characters', 'OC'],
    body: [
      { t: 'p', v: '草莓酱的设定改了七版。前六版的问题都一样：太顺眼了。每一处都挑不出毛病，合起来就是一张没有记忆点的脸。' },
      { t: 'figure', cap: '三视图 · 定稿版' },
      { t: 'p', v: '第七版把配色压暗了两度，加了一点不对称 —— 左右耳饰不一样，刘海一侧短一截。人立刻就有了脾气。' },
      { t: 'quote', v: '完美对称的角色，看起来像模板。' }
    ]});

  add({ slug: 'oc-palette', section: 'characters', cat: 'oc',
    title: '角色配色的三色律',
    lede: '主色、辅色、点缀色，比例大致是 6:3:1。',
    date: '2026-08-16', dateLabel: '2026年8月16日', read: '4 min read',
    tags: ['Characters', 'OC'],
    body: [
      { t: 'p', v: '六成主色定基调，三成辅色做层次，一成点缀色负责让人记住。点缀色必须只有一处 —— 两处就不叫点缀了。' },
      { t: 'p', v: '七个角色排在一起的时候，这条规律的好处才显出来：每个人都有一个专属的点缀色，远看就能分清谁是谁。' }
    ]});

  /* ===== Characters · Character ===== */
  add({ slug: 'character-relations', section: 'characters', cat: 'character',
    title: '角色关系图：谁欠谁一句话',
    lede: '把没说出口的话画成线，关系图立刻就立体了。',
    date: '2026-08-01', dateLabel: '2026年8月1日', read: '6 min read',
    tags: ['Characters', 'Character'],
    body: [
      { t: 'p', v: '一开始我按"认识 / 不认识"画线，画完发现毫无信息量 —— 一张所有人都连着所有人的网。' },
      { t: 'p', v: '后来改成按"欠对方一句什么话"来连，整张图才活过来。拉欠祈一句道歉，祈欠草莓酱一句实话，夏花谁都不欠。这样一写，性格就不用再解释了。' },
      { t: 'figure', cap: '关系图 · 第二版' }
    ]});

  add({ slug: 'silence-design', section: 'characters', cat: 'character',
    title: '怎么设计一个不说话的角色',
    lede: '台词是最省事的塑造手段，去掉它之后才知道设计够不够。',
    date: '2026-07-27', dateLabel: '2026年7月27日', read: '5 min read',
    tags: ['Characters', 'Character'],
    body: [
      { t: 'p', v: '不说话的角色，全部信息只能靠三样东西传达：站姿、视线方向，以及别人看他的反应。' },
      { t: 'quote', v: '沉默的角色最难藏拙 —— 设计上任何一点偷懒都会被看见。' },
      { t: 'p', v: '拉就是这么来的。他一句台词都没有，但每次出现，旁边的人都会先看他一眼再开口。这一眼就是他的台词。' }
    ]});

  /* ===== Characters · Illustrations ===== */
  add({ slug: 'oc-lineup', section: 'characters', cat: 'illustrations',
    title: '全员合影：五个人怎么站',
    lede: '一张合影里的站位，其实已经把关系全说完了。',
    date: '2026-07-24', dateLabel: '2026年7月24日', read: '4 min read',
    tags: ['Characters', 'Illustrations'],
    body: [
      { t: 'p', v: '把谁放中间、谁半个身子在画外、谁看镜头谁不看，决定了读者第一眼认为谁是主角。' },
      { t: 'figure', cap: '合影 · 站位草图' },
      { t: 'p', v: '最后定的版本里，草莓酱在偏左，中间是空的。空着的位置比站着人的位置更有话说。' }
    ]});

  add({ slug: 'expression-sheet', section: 'characters', cat: 'illustrations',
    title: '表情表：把情绪拆成十二格',
    lede: '十二格不是为了画全，是为了找出这个角色不会做的表情。',
    date: '2026-07-22', dateLabel: '2026年7月22日', read: '5 min read',
    tags: ['Characters', 'Illustrations'],
    body: [
      { t: 'p', v: '画到第九格通常就会卡住，而卡住的那几格，恰恰说明这个角色的边界在哪里。' },
      { t: 'p', v: '祈画不出"沉默"，夏花画不出"急躁"。画不出来不是能力问题，是那个表情不属于他们。' }
    ]});

  /* ===== Characters · Guidebook ===== */
  add({ slug: 'oc-guidebook', section: 'characters', cat: 'guidebook',
    title: 'OC 使用规范（草案）',
    lede: '关于这些角色可以怎么用、不可以怎么用。',
    date: '2026-08-05', dateLabel: '2026年8月5日', read: '4 min read',
    tags: ['Characters', 'Guidebook'],
    body: [
      { t: 'p', v: '简单说：非商业的二次创作欢迎，商业用途请先问一声，不要改动角色的核心设定。' },
      { t: 'h2', v: '什么算核心设定' },
      { t: 'p', v: '名字、点缀色、以及那句签名台词。其余的服装、发型、场景都可以随便改 —— 那些本来就是给人玩的。' }
    ]});

  /* ===== About · Resources ===== */
  add({ slug: 'rainbow-picturebook', section: 'about', cat: 'resources',
    title: '【彩虹绘本】首个 OC 设定集确认！草莓酱三视图资源上新。',
    lede: '第一本设定集的内容、规格与获取方式。',
    date: '2026-08-18', dateLabel: '2026年8月18日', read: '5 min read',
    tags: ['Resources', '2026年'],
    body: [
      { t: 'p', v: '设定集收录草莓酱的三视图、配色规范与七版演进过程，全部为可下载的高清图。' },
      { t: 'h2', v: '规格' },
      { t: 'p', v: 'A4 竖版，共 32 页，附一份可直接取色的色卡文件。立绘为透明背景 PNG，方便二次创作直接使用。' }
    ]});

  add({ slug: 'brush-pack', section: 'about', cat: 'resources',
    title: '常用笔刷与纸纹打包',
    lede: '这三年基本只用这七支笔。',
    date: '2026-08-04', dateLabel: '2026年8月4日', read: '3 min read',
    tags: ['Resources'],
    body: [
      { t: 'p', v: '试过很多笔刷，最后固定下来的只有七支：三支线稿、两支上色、一支纹理、一支橡皮。' },
      { t: 'p', v: '数量少的好处是肌肉记忆稳定 —— 不用在每一步都停下来挑工具。' }
    ]});

  /* ===== About · Guidelines ===== */
  add({ slug: 'fonts', section: 'about', cat: 'guidelines',
    title: 'Fonts：字体与排印资源',
    lede: '档案馆里用到的字体，以及为什么选它们。',
    date: '2026-08-13', dateLabel: '2026年8月13日', read: '5 min read',
    tags: ['Guidelines', 'Fonts'],
    body: [
      { t: 'p', v: '中文正文优先用系统字，理由很实际：加载快、不会因为网络问题掉字、在各种设备上都能正常渲染。' },
      { t: 'quote', v: '最好的字体是用户已经装好的那一款。' },
      { t: 'p', v: '只有标题和标识才用定制字形，而且都转成曲线，不依赖字体文件。' }
    ]});

  add({ slug: 'logos', section: 'about', cat: 'guidelines',
    title: 'Logos：标识系统',
    lede: '一个字母能承担多少识别度。',
    date: '2026-08-12', dateLabel: '2026年8月12日', read: '4 min read',
    tags: ['Guidelines', 'Logos'],
    body: [
      { t: 'p', v: '标识就是一个圆角方块加一个 J。越简单的东西越经得起缩小 —— 16 像素下还认得出来，才算合格。' },
      { t: 'p', v: '测试方法：把它缩到浏览器标签页那么大，隔一米看。看不出来就重做。' }
    ]});

  /* ===== About · Miscellaneous ===== */
  add({ slug: 'archive-naming', section: 'about', cat: 'misc',
    title: '文件命名：给未来的自己留线索',
    lede: '三年后你不会记得 final_v3_真的最终.psd 里是什么。',
    date: '2026-07-20', dateLabel: '2026年7月20日', read: '4 min read',
    tags: ['Miscellaneous'],
    body: [
      { t: 'p', v: '现在统一用「日期-项目-用途-版本」，全小写，用短横线。丑，但三年后还能搜到。' },
      { t: 'quote', v: '命名规范是写给未来的自己看的，不是写给现在的自己看的。' }
    ]});

  add({ slug: 'workspace', section: 'about', cat: 'misc',
    title: '桌面：一张长期在变的照片',
    lede: '每隔一段时间拍一次工位，比日记诚实得多。',
    date: '2026-07-18', dateLabel: '2026年7月18日', read: '3 min read',
    tags: ['Miscellaneous'],
    body: [
      { t: 'p', v: '桌上摆着什么，基本等于最近在忙什么。翻一遍这些照片，比翻备忘录清楚。' },
      { t: 'figure', cap: '2026 年 7 月 · 工位' }
    ]});

  /* 统一补全默认字段 */
  A.forEach(function (a) {
    a.author = a.author || 'JasperPeng';
    /* 封面图路径由 slug 推导，真实文件；缺图时前端回退到占位色块 */
    a.cover = 'assets/images/' + sectionDir(a.section) + '/' + a.slug + '.svg';
  });

  function sectionDir(key) {
    for (var i = 0; i < SECTIONS.length; i++) if (SECTIONS[i].key === key) return SECTIONS[i].dir;
    return 'works';
  }

  w.JP = { SECTIONS: SECTIONS, ARTICLES: A, CHARACTERS: CHARACTERS, MAIL: MAIL };

})(window);
