# JasperPeng — 个人设计 / 艺术 / 世界观 / 研究档案站

> 这份 README 是给「重开对话后继续做这个项目」用的交接文档。
> 记录了架构决策、为什么这么做、踩过的坑、当前进度和待办。

---

## 1. 这是什么

一个纯静态个人档案网站，六个板块：Research / Works / Universe / Characters / About / Contact。
一个纯静态个人档案网站，六个板块：Research / Works / Universe / Characters / About / Contact。

- **设计源**：`my web figma.svg`（19MB，已放进项目根目录，最终依据）
  早先那份 `Untitled.svg` 旧稿已不在项目里
- **视觉蓝本**：openai.com 为主，apple.com 为辅
- **技术栈**：无框架、无构建依赖的纯 HTML / CSS / JS。只有一个 PowerShell 脚本做静态生成
- **运行方式**：VS Code 的 **Live Server**（用户实际用的就是这个）；`file://` 直接打开也做了兼容

---

## 2. 文件结构

```
D:\Claude\figma\
├── index.html              扉页（全屏封面，无导航，点 Explore 进首页）
├── home.html               首页
├── article.html            文章模板    ?a=<slug>
├── category.html           分类模板（**生成源**，含 {{TOKEN}}，不要直接访问）
├── characters/index.html   角色页（深色锁定）  ?c=<slug>
│
├── js/data.js              ★ 全站唯一数据源（板块 / 分类 / 文章 / 角色）
├── js/assets.js            图片清单（build.ps1 自动生成，不要手改）
├── js/main.js              全部交互行为
├── css/style.css           设计系统 + 全部样式
│
├── build.ps1               ★ 静态生成器
├── 刷新图片.cmd            换完图双击它（就是跑一次 build.ps1）
├── 本地预览.ps1            简易静态服务器（5599），行为对齐 Live Server
│
├── assets/images/          46 张 `<slug>.placeholder.svg` 占位图 + poster.svg
│                           换真图 = 丢一张 `<slug>.png` 进来，不用删占位图
├── assets/icons/favicon.svg
│
├── works/ research/ universe/ characters/ resources/   19 个生成的分类页
│                           （`characters/oc/` 不再生成 —— 那一项直接跳角色页）
│
├── my web figma.svg        Figma 导出的设计稿（19MB，不参与构建，别删）
└── jasperpeng-site.zip     ⚠ 旧打包，早于本轮所有改动，**已过期，可以删**
```

---

## 3. 核心架构决策（以及为什么）

### 3.1 单一数据源 + 静态生成

`js/data.js` 是唯一数据源，定义了板块、分类、文章、角色。

`build.ps1` 读它，按这个顺序做四件事：

1. **占位图**：每个 slug 若一张真图都没有，就生成一张 `<slug>.placeholder.svg`。
   已经有真图（png/jpg/…）就跳过，不会把真图盖掉。
2. **图片清单** `js/assets.js`：扫描 `assets/images/**`，记下每个 slug 实际存在的文件（见 §3.4）
3. **分类页**：从 `category.html` 模板生成 **19 个**，套
   `{{BASE}} {{DIR}} {{SECTION}} {{CAT}} {{TITLE}} {{DESC}}`；
   带 `to:` 的分类不生成，旧目录还会被删掉（见 §3.5）
4. **注入**：把页头 / 页脚写进每个页面 `<!-- #chrome:header:start -->` 与 `:end` 之间；
   顺手补上 `js/assets.js` 的 `<script>`（必须排在 `data.js` 之前），
   并按清单校正静态 HTML 里手写的图片路径

改了 `js/data.js` 或 `category.html` 之后重跑一次即可：

```bash
powershell -ExecutionPolicy Bypass -File build.ps1
```

> **为什么页头页脚是静态 HTML 而不是 JS 注入？**
> 早期版本用 JS 注入头尾，结果 JS 一失败页面就只剩一对空标签，
> 连导航都没有。改成静态注入后：没有 JS 也是可导航的完整站点，
> 而单一数据源靠构建脚本保住。

### 3.2 路径解析

每个页面 `<body data-base="...">`：根目录为空，`/works/artifacts/` 下为 `../../`。
JS 拼链接时一律加这个前缀，所以任何层级都指得准。

`file://` 下浏览器不会把目录地址解析成 `index.html`，
所以 `main.js` 的 `patchDirLinks()` 会在 `location.protocol === 'file:'` 时补全文件名。
部署到服务器则保持 `/works/artifacts/` 整洁地址。

### 3.3 栅格是「推导」的，不是坐标搬运

Figma 坐标不直接翻译成 CSS。优先级链条（来自用户给的提示词 §18，很关键）：

> **信息架构 > 视觉层级 > 比例关系 > 具体像素坐标**

容器 `--content: 1240px`，用 grid + gap 推导，在 1280 屏上恰好还原设计稿：

```
3 列大卡  (1240 - 44×2) / 3 = 384   ← 设计稿值
2 列列表  (1240 - 70)   / 2 = 585   ← 设计稿值
页脚 5 列 (1240 - 110×4)/ 5 = 160   ← 设计稿值
```

用户的栅格数值经核算是**精确的**，不要改容器宽度。

> ⚠ 例外：卡片间距 `--gap-card` 已从 Figma 的 44px 收到 **32px**（openai 实测约 24，取折中）。
> 这是用户明确要求「向 openai 靠拢」后的偏离，容器宽度 1240 保持不动。

### 3.4 图片路径 —— 换图不用改代码

`data.js` 里**不写扩展名**，只写 slug。

**占位图叫 `<slug>.placeholder.svg`**，不占用 `<slug>.png` 这个名字。
所以换图就是「把 `<slug>.png` 丢进同一个目录」，**什么都不用删**。

真实文件名由两层决定：

1. **构建期**：`build.ps1` 扫 `assets/images/**` 生成 `js/assets.js`
   （`window.JP_ASSETS`，键是 `<目录>/<slug>`）。同一 slug 有多种格式时按
   `png > jpg > jpeg > webp > avif > gif > svg > placeholder.svg` 取 ——
   真图永远压过占位图。这份清单必须**排在 `data.js` 之前**加载，构建时自动注入 `<script>`。
   构建还会把静态 HTML 里手写的图片路径（首页那几张卡）按清单校正一遍。
2. **运行期兜底**：`main.js` 在捕获阶段接 `img` 的 `error`，按同一顺序换扩展名重试。
   清单过期时救场。

**日常操作**：图丢进去 → 双击根目录的 **`刷新图片.cmd`**（就是跑一次 `build.ps1`）。

> `main.js` 顶部还有个 `AUTO_FIND_IMAGES`，改成 `true` 就连构建都不用跑
> —— 本地预览时会主动探测同名真图。代价是探测请求会在控制台留一批 404
> （功能无害，但会盖住真正的报错），所以默认关着。

### 3.5 分类可以「不生成页面，直接跳转」

分类对象加 `to: '<路径>'` 就行：

```js
{ slug: 'oc', label: L('原创角色', …), to: 'characters/', desc: L(…) }
```

这样导航、移动菜单、页脚、同级分类条里的这一项都指向 `to`，
`build.ps1` 不再为它生成分类页，**并且会把之前生成过的目录删掉**（不留孤儿页）。

目前只有「原创角色」用了：点它直接进那个固定深色的选角色页，
而不是先看一个文章列表。

> ⚠ 副作用：该分类下的文章（`strawberry-sheet` / `oc-palette`）就没有列表页了。
> 所以角色页底部加了一栏「角色相关文章」，收录**整个角色板块**的 7 篇文章，
> 保证内容仍然在站内走得到。改 `to` 的时候记得一并想这件事。

---

## 4. 从 Figma 实测出来的关键数据

| 项目 | 值 | 来源 |
|---|---|---|
| 顶栏高 | 72px | 画板 1280×72 |
| 导航字号 | **17px** | openai.com 实测（原稿约 14px，按规范提高） |
| 导航项间距 | **43px** | 稿件路径坐标实测 42.9px |
| 下拉面板 | 背景**通栏**（1280×439，含顶栏）；内容块 **761 宽**，x 499→1260 | 「主页顶部栏展示」七张画板实测 |
| 展开内容左缘 | **499**，正好落在第一个导航项 Research（字形 x 510.6）上 | 同上 —— 所以实现里改成「量出第一个导航项」而不是写死 761 |
| 展开内容上下留白 | 上 32 / 下 72 | kicker y=104，面板底 439 |
| 展开列 | 4 列 × 160，第 1 列后留 50 间距 | 同上 |
| 展开遮罩 | `#9C9C9C` @ 68%（实现里收到 45%） | 画板上压的整幅矩形 |
| 卡片图比例 | **全部 1:1 正方形** | 占位图统计：180² ×30、384² ×15、328² ×9 |
| 主按钮 | 188×52（圆角 26） | 稿件 |
| 次按钮 | 154×44 | 稿件 |
| 星体 | 420 正圆 / 2px 模糊 | 稿件 `<rect rx="210">`；质感照用户给的参考图重做（见 §6） |
| 内容边距 | 稿件 20px（1280 屏）；**本站是 `--gutter: clamp(20,3.2vw,40)`，1280 下算出 40** | 见 §9 待办 2 |

### 配色（全部来自 Figma 导出）

```
--text #1A1A1A   --text-muted #727272   --placeholder #EDEDED
--border #E6E6E6 --border-2 #CCCCCC     --bg-2 #F5F5F5
--star  #4BB6EC  ← 全稿唯一的彩色
```

> ⚠ `#6155F5` 是 **Figma 批注框底色**，不是品牌色。早期误当强调色用过，已纠正。
> 强调色 `--accent: #1F8FC9` 是由星体色加深得来（保证文字对比度过 AA）。

> ⚠ `--text-faint` 原稿是 `#9C9C9C`，白底对比度仅 **2.75**（12px 小字读不清），
> 已压到 `#767676`（4.58，刚过 AA）。层级改由字号承担。

---

## 5. Figma 批注（`说明文档` 图层）里的硬性规则

这些是设计者写在稿子里的要求，实现时必须遵守：

- 页脚（`Frame 52`）**每页常驻**，其中「顶」是面包屑，记录层级
- `View more` 按钮**同一页只出现一次**，放在右上角
- 文章页的**深色标签栏**由作者手动加标签 + 作者信息
- 「继续阅读」栏**自动放置同类型文章** —— 这个词**只在文章页用**，首页那一栏叫「最近更新」
- 导航跳转的二级页**统一用「通用版式」**，可按板块特性一对一调整
  （地图板块因更新慢，只留 3 列大板块，不要下方 6 个小板块）
- **角色页固定深色模式**，为了沉浸感；「查看资源」链到资源板块
- **「原创角色」分类不是文章列表**：这一项直接跳到角色页 `characters/`（见 §3.5）；
  更早试过在该分类页铺一排角色卡，用户否掉了 —— 不要中间那一层
- 立绘用 **PNG 透明背景**
- 卡片悬停有动画，点击进入对应文章

---

## 6. 用户明确的偏好

- **不要返回按钮**。apple.com / openai.com 都没有，完全依赖浏览器返回键 + 常驻导航
- 顶栏 **Apple 式常驻吸顶**（扉页除外 —— 全屏封面压条导航会破坏「翻开一本书」的感觉）
- **90% 符合设计稿即可**，字号等可按规范调整；排版尽量按稿子，但「规矩不是一成不变的」
- 用户非专业建站者，希望以资深建站师视角**主动提出更好的方案**，但**改动他的数据前要先问**
- 节日海报（16:9 全宽）**纯美学展示，刻意不可点击** —— 加跳转会和下方板块重复
- **文章正文不翻译**，保持写作时的原文（openai.com 同样如此）。只有界面/导航/标题/导语随语言切换
- 联系方式：**pengjasper@icloud.com**（真实邮箱）；X / Bluesky / Github 暂不做，显示「暂未开放」
- 角色页的「年份/版本/地图」是**筛选器**（用于查找角色），不是排序
- **UI 向 openai.com 靠拢，动画和交互向 apple.com 靠拢**（用户原话）
- **顶栏导航项右边不要向下的箭头**（Figma 稿里就没有）
- 展开面板的**内容左缘对齐第一个导航项**，左边那段留白是设计里就有的呼吸
- 「原创角色」这一项**不再是文章选择界面**，点了直接进那个固定深色的选角色页
- **文章的内容和排版用户要能自己改**，包括直接在源码里写 HTML（见 §10）
- 首页星体：质感照用户给的那张参考图 ——
  珠光皂泡感、边缘一圈亮环、内部彩光缓慢漂移并互相融合、一层细颗粒；
  动作要求「**小幅度缓慢上下沉浮**」+「**里面的光芒随机闪耀融合**」。
  实现：5 团彩光各带一组漂移 + 一组明灭动画，两组周期都互质（13/17/21/15/19 秒
  与 7.3/9.1/11.7/8.5/6.7 秒），叠起来看不出循环；沉浮 11s / -14px。
  更早参照过用户自己部署的 `jianghao.kdns.fr`（三段渐变 + `blur(2px)` + 6s 浮动），
  Figma 给的 420 正圆 / 2px 模糊也对得上。

---

## 7. 多语言系统

四语（简 / 繁 / 英 / 日）已完整回归测试过：
切换后残留中文只剩专有名词和语言选择器本身，都是有意保留的。

### 设计

`data.js` 里用两个构造器：

```js
L(简, 繁, En, 日)   // 四语字段
P(专有名词)          // 四语同形，天然不翻译
```

**专有名词不翻译**：`JasperPeng` `嗵嗵仮面` `NooteMetro` `DOUDOU` `草莓酱/拉/祈/夏花/嗵嗵/Noote`

**翻译范围**：板块名、分类名、板块标题/导语、文章标题/导语、角色角色描述/台词/简介、全部 UI 词。
**不翻译**：文章正文（`body`）—— 保持原文，与 openai.com 一致。

**日期**不写死，存 ISO 值，由 `Intl.DateTimeFormat` 按语言格式化。
**阅读时长**存数字，由 `READ_FMT` 按语言拼量词。

### 静态 HTML 如何跟着切换

页头页脚是构建期生成的静态 HTML（写入简体文案），但每个标签带路径：

```html
<button class="nav__link" data-t="s.works.label">作品</button>
<a data-t="c.works.artifacts.label">手作</a>
<span data-t="l.contact.1.label">X</span>
```

`main.js` 的 `resolvePath()` 解析这些路径，切换语言时**只替换文本节点**，
保留同级的图标元素（下拉里的 `.arr` 箭头等）。顶栏导航项本身现在没有图标。

路径语法：

| 前缀 | 含义 | 例 |
|---|---|---|
| `s.<key>.<字段>` | 板块字段 | `s.works.label` / `s.works.kicker` |
| `c.<key>.<slug>.<字段>` | 分类字段 | `c.works.artifacts.desc` |
| `f.<key>.<序号>.label` | 下拉推荐位 | `f.works.0.label` |
| `g.<key>.<序号>.label` / `gk.<key>` | 标签胶囊 / 其标题 | `g.works.0.label` |
| `l.<key>.<序号>.label` | 联系方式链接 | `l.contact.1.label` |
| `n.<key>.<序号>.<字段>` | 说明块 | `n.contact.0.text` |
| `ui.<键>` | 纯 UI 词 | 也可用 `data-i18n="<键>"` |

首页的静态卡片挂 `data-slug="<文章 slug>"`，切换语言时由 `rerenderStaticCards()` 按 slug 重写标题和元信息。

---

## 8. 已修复的 bug（保留记录，避免重蹈覆辙）

| # | Bug | 根因 |
|---|---|---|
| 1 | **全站点不动**（最严重） | `.search-overlay { display: grid }` 盖过浏览器默认的 `[hidden]{display:none}`，一层透明遮罩长期铺满全屏拦截所有点击。修复：`[hidden] { display: none !important }` |
| 2 | 首屏文字不显示、整个 main.js 抛错 | `t()` 在 `I18N` 赋值前被搜索模块调用 —— 变量提升只提升声明不提升赋值。修复：把语言表移到工具函数之后 |
| 3 | 悬停展开后点击反而关闭下拉 | 用户会以为「点了没反应」。改成 hover 预览 + click 固定，第二次点击才收起 |
| 4 | 1024px 下星体外晕溢出视口 | 收窄星体给外晕留位；用 `overflow-x: clip` 而非 `hidden`（`hidden` 会让根元素变成滚动容器、废掉页头 sticky） |
| 5 | 角色筛选器点了没反应 | 做成了排序，而数据本来就按年份排列。改成两级筛选：选维度 → 出取值胶囊 → 筛出子集 |
| 6 | `<h3>` 嵌在 `<span>` 里 | 无效 HTML。改为 `<div>` / `<p>` |
| 7 | 分类页 canonical 404 | 用了板块 key（`about`）而不是目录名（`resources`）。模板加 `{{DIR}}` 令牌 |
| 8 | 切英文后残留 24 处中文 | 只做了 UI 词翻译，内容层没做。已重建整套 i18n（见 §7） |
| 9 | **文章页正文整块空白**（最严重的遗留 bug） | `renderArticle()` 里用了一个从没定义过的 `note` 变量 → `ReferenceError` 抛在 `host.innerHTML =` 上，整个 main.js 的 IIFE 中断：正文、相关阅读、连启动时的 `i18n()` 全都没跑。**上一版 README 说「各页面无控制台报错」是错的**。修复：把 `note` 按原意补成「界面语言 ≠ 正文语言」的提示（`t('bodyOriginal')`） |
| 10 | 角色缩略图选中框上半截被切 | `.chars__strip` 是 `overflow-x: auto`，而 `overflow-x` 一旦不是 `visible`，`overflow-y` 也会被算成 `auto` —— 上下同样会裁。原来只有 `padding-bottom`。修复：四周留白 + 选中环从 `outline` 换成 `box-shadow` |
| 11 | 星体的指针牵引其实一直没生效 | 牵引（内联 `style.transform`）和呼吸（CSS 动画的 `transform`）写在同一个元素上，**CSS 动画优先级高于内联样式**，牵引被整个吃掉。修复：牵引挂 `.star`，呼吸挂 `.star__body` |
| 12 | 角色缩略图 `aria-label` 是 `[object Object]` | `esc(c.name)` 直接拼了四语对象。修复：`esc(T(c.name))` |
| 13 | 换图之后首页那几张卡断链 | 首页的卡片图是**手写**在 `home.html` 里的，不走清单。占位图一改名就全断。修复：构建时按清单把静态 HTML 里的 `assets/images/...` 路径也校正一遍 |
| 14 | 自动探测新图刷了满屏 404 红字 | `new Image()` 加载失败会写控制台；换成 `fetch(HEAD)` 也一样（Chrome 对 fetch 的 404 同样记 console error）。结论：探测天然有噪音，所以 `AUTO_FIND_IMAGES` 默认关闭，正常流程走「刷新图片.cmd」 |

### ⚠ 测试方法论（重要教训）

**不要用 `element.click()` 验证交互** —— 它直接派发到元素，**绕过命中测试**。
Bug #1 就是这样躲过我全部自动化测试的：测试全绿，真实鼠标一个都点不到。

正确做法：
- 用真实坐标点击（`computer` 工具的 `left_click`）
- 用 `document.elementFromPoint(x, y)` 做命中测试
- 用真实 HTTP 服务器测（预览面板会把页面转成 `data:` URI，相对路径全失效 —— 那是**预览器行为**，不是站点 bug）

本地测试服务器：`本地预览.ps1`（PowerShell HttpListener，监听 5599），
行为与 Live Server 一致 —— 目录请求返回 `index.html`。用户日常用 Live Server，
这个脚本是给自动化验证用的：

```bash
powershell -ExecutionPolicy Bypass -File 本地预览.ps1
```

> 之前这份脚本放在会话临时目录里，换一次会话路径就变了。现在收进项目根目录。

**验证时的坑**：浏览器面板不显示时**不合成帧，CSS 过渡不会推进**，
`getComputedStyle` 读到的永远是过渡起点、截图也拿不到。
要看「最终态」就先临时注入 `*{transition:none!important}` 再量。

---

## 9. 当前状态

### 已完成并验证

- **23 个 HTML 页面**：19 个分类页 + 扉页 / 首页 / 文章 / 角色，另加 `category.html` 模板
  （构建时「注入页头页脚 22 个」是对的 —— 扉页没有页头页脚标记）
- 静态断链 **0**（脚本逐文件解析 `href` / `src` 核对过）
- **没有孤儿页**：没有任何 HTML 是「存在但无人链接」的
- 1280 / 975 / 375 各档**无横向溢出**
- 深色模式（跟随系统）+ 角色页深色锁定
- 各页面重新加载**无控制台报错**
- 47 个图片文件（46 张 `.placeholder.svg` + `poster.svg`），全部真实文件、无 `data:` 内联

**本轮（按 Figma 排布改顶栏 + 图片格式 + 自由排版 + 星体质感）已做并验证：**

| 需求 | 做法 | 验证 |
|---|---|---|
| 顶栏不要向下箭头 | `build.ps1` 生成 `nav__link` 时不再输出 `<i class="chev">`，CSS 里那条规则也删了 | 页面上 `.nav__link .chev` 数量 = 0 |
| 展开栏左缘对齐第一个导航项 | 背景通栏，内容块 `margin-left: var(--menu-left)`；`alignMenus()` 运行时量出第一个导航项的 left 写进 `--menu-left`，resize / 换语言都重量 | 六个面板内容左缘都 == 第一个导航项左缘；简/英/日三种语言分别 717 / 544 / 462，全部吻合 |
| 「原创角色」不再是文章列表 | 该分类加 `to: 'characters/'`（见 §3.5），导航/移动菜单/页脚/同级分类条全部指向深色角色页，`characters/oc/` 不再生成并已删除 | 四处链接实测都是 `characters/`；`characters/oc/` 返回 404 且无人链接 |
| 不要留下垃圾页面 | 构建时检测到带 `to` 的分类若有旧目录就删掉 | 断链 0、孤儿页 0 |
| 那两篇文章别掉出站点 | 角色页底部新增「角色相关文章」栏，列出整个角色板块的 7 篇 | 7 条链接全部可达 |
| PNG / JPG 换图 | 占位图改名 `<slug>.placeholder.svg`，不再占用 `<slug>.png`；清单按格式优先级取；构建还会校正静态 HTML 里手写的图片路径 | 真的放了透明 PNG（600×800 立绘）、JPG、以及「**不跑构建**直接丢 PNG」三种情况，全部正确显示 |
| 正文能自己写 | `body` 支持 `p/h2/h3/quote/ul/ol/hr/img/figure/html` 十种块，也支持整篇写成 HTML 字符串（见 §10） | 十种块逐个渲染检查过：转义正确、原样 HTML 生效、自定义 `src` 生效 |
| 星体质感 | 见 §6 | computed style 确认 5 团光 + 10 组动画（5 漂移 + 5 明灭）+ `blur(2px)` + 亮环 + 颗粒都在 |

### 🔧 未完成 / 待验证

1. **视觉上仍然没有人眼确认过**。全部靠 `elementFromPoint` + computed style 验证 ——
   浏览器面板不显示时不合成帧，**CSS 过渡不会推进**，截图也拿不到。
   星体的新质感、展开栏的观感，**需要在 Live Server 里亲眼看一遍**。
   最可能要调的几个数：
   - `.star__body i { opacity }` 由 `sh1…sh5` 控制（现在在 .28–.82 之间起伏）—— 彩光的存在感
   - `.star__body::before { opacity }`（现 `.5`）—— 颗粒的粗细
   - `.star__body::after` 里 93% 那一段的白色透明度（现 `.92`）—— 亮环的强弱
   - `@keyframes orbFloat` 的 `-14px` / `11s` —— 沉浮幅度与快慢

2. **展开面板右缘对的是本站版心（gutter 40），不是 Figma 的 20**。
   Figma 在 1280 下右边距 20、内容宽 761；本站 gutter 是 `clamp(20,3.2vw,40)`，
   1280 下算出来 40，所以内容宽 681。左缘完全吻合（这是用户明确要求的那一条），
   右缘跟着全站版心走。要完全复刻 Figma 就得把 `--gutter` 改成 20，但那会影响所有页面。

3. **导航默认语言的取舍**：简体模式下导航是「研究/作品/世界观/角色/关于/联系」，
   Figma 稿里画的是英文。想保留英文导航就改 `data.js` 里各 section `label` 的
   `zh-Hans` 值（一处一行）。**需要问用户**。

4. 39 篇文章中只有 `indian-anklets` 是 Figma 原文，其余标题多取自图层名、正文为占位创作。

5. `AUTO_FIND_IMAGES` 默认关闭。打开的话控制台会有一批探测 404（功能无害），
   会盖住真正的报错，所以调试时记得关回去。

---

## 10. 日常维护

### 加一篇文章 / 自己写正文和排版

往 `js/data.js` 的 `ARTICLES` 加一条，填对 `section` / `cat`，标题导语用 `L()` 四语：

```js
add({ slug: 'my-slug', section: 'works', cat: 'artifacts', date: '2026-09-01', read: 5,
  title: L('中文标题','繁體標題','English title','日本語タイトル'),
  lede:  L('…','…','…','…'),
  tags: [L('作品','作品','Works','ワークス')],
  body: [ { t:'p', v:'正文…' } ]   // 正文保持原文，不翻译
});
```

首页、分类页、相关阅读、搜索会自动带上。**不用改任何 HTML。**

**正文 `body` 可以怎么写**（想怎么排版就怎么排）：

```js
body: [
  { t:'p',      v:'段落' },
  { t:'h2',     v:'小标题' },
  { t:'h3',     v:'更小的标题' },
  { t:'quote',  v:'引用' },
  { t:'ul',     v:['第一条','第二条'] },        // t:'ol' 是有序列表
  { t:'hr' },                                   // 分隔线
  { t:'img',    src:'assets/images/works/foo.png', cap:'图注', alt:'替代文字' },
  { t:'figure', cap:'不给 src 就用这篇文章的封面' },
  { t:'html',   v:'<div class="随便什么">这一段原样输出，不转义</div>' }
]
```

想完全自己控排版，整篇直接写 HTML 也行：

```js
body: '<p>第一段</p><h2>标题</h2><div class="my-layout">…</div>'
```

> 除了 `html` 块和「整篇字符串」这两种，其余都会自动转义 ——
> 正文里写 `<` `>` `&` 不会出事。反过来，用 `html` 时内容由你自己负责。
> 字符串形式还能塞 `<img src="assets/images/…">`，路径从**站点根目录**算起
> （文章页在根目录，所以直接写 `assets/…` 就对）。

### 加分类 / 改模板 / 改头尾

```bash
powershell -ExecutionPolicy Bypass -File build.ps1
```

> ⚠ `build.ps1` 和 `serve.ps1` 必须存为 **UTF-8 with BOM**。
> Windows PowerShell 5.1 读无 BOM 的中文会当成 ANSI，直接解析报错。

### 换真实图片

1. 把 `<slug>.png`（或 `.jpg` / `.webp`）丢进 `assets/images/{板块目录}/`
2. 双击根目录的 **`刷新图片.cmd`**

就这两步。**不用删任何文件，也不用改任何代码** ——
占位图叫 `<slug>.placeholder.svg`，跟真图不重名，构建时会自动让位。

角色立绘同理，放 `assets/images/characters/{slug}.png`（Figma 批注要求 PNG 透明背景，
角色页用的是 `object-fit: contain`，不会裁掉边）。

支持的格式，优先级从高到低：
`png` > `jpg` > `jpeg` > `webp` > `avif` > `gif` > `svg` > `placeholder.svg`

- 透明 PNG：卡片是 `object-fit: cover`，透明处会露出底色 `--placeholder`；立绘不裁切
- JPG：想要轻量就用它，同一 slug 里 png 会压过 jpg，别两个都放

> 想连「刷新图片.cmd」都省掉，把 `main.js` 顶部的 `AUTO_FIND_IMAGES` 改成 `true`。
> 代价是控制台会多一批探测用的 404（见 §3.4）。

> 首页那张海报是 `assets/images/poster.svg`，不在 slug 体系里，
> 换成 `poster.png` 的话要顺手改一下 `home.html` 里那一行 `src`。

---

## 11. PowerShell 踩坑记录

- **负索引回绕**：`$arr[0..-1]` 在数组只剩 1 个元素时会**反向返回整个数组**，
  不是空数组。写路径规整（消解 `..`）时被这个坑过两次，导致链接检查器误报 200 条断链。
  改用 `System.Collections.Generic.List` + `RemoveAt()`。
- **zip 反斜杠**：`Compress-Archive` 和 .NET Framework 的 `ZipFile.CreateFromDirectory`
  在 Windows 上都会把 zip 条目名写成反斜杠，不符合 ZIP 规范
  （macOS/Linux 解压会得到一堆名字带 `\` 的散文件）。
  必须用 `ZipArchive.CreateEntry()` 手写正斜杠条目名。
- **`Remove-Item`** 在本环境某些路径下会被沙箱拦截，用 Bash 的 `rm` 更稳。

---

## 12. 参考资料

- 用户提供的提示词文档：`D:\下载\新建 Microsoft Word 文档.docx`
  （其中 §18 的优先级链条和「图片必须真实文件、禁止 base64」两条最有价值）
- **Figma 源文件：项目根目录的 `my web figma.svg`**（`D:\下载\` 下还有一份副本）
  顶栏那七张画板叫「主页顶部栏展示」，展开态的所有数值都是从那里量的，
  组名是 HTML 实体编码的中文，用 `grep -bo` 找字节偏移再 `dd` 截片段最省事
- 用户参考的第三方实现：`D:\下载\index (1).html` / `style.css` / `main.js`
  （其 `.reveal` / `.is-visible` 在 CSS 里根本没定义，入场动画实际未生效；搜索结果也无样式）
- 用户自己部署的旧版：`https://jianghao.kdns.fr`
  （早期星体参照过它：`.gradient-orb` 三段渐变 + `blur(2px)` + 6s `floating` 浮动）
