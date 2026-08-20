# =============================================================
#  JasperPeng — build.ps1
#  用法： powershell -ExecutionPolicy Bypass -File build.ps1
#        （换完图片也可以直接双击根目录的「刷新图片.cmd」）
#
#  依据 js/data.js，按顺序做四件事：
#  1. 占位图：某个 slug 一张真图都没有时，生成 <slug>.placeholder.svg
#     已经有真图（png/jpg/…）就跳过，绝不覆盖
#  2. 图片清单 js/assets.js：扫 assets/images/**，记下每个 slug 实际存在的文件
#     同一 slug 多种格式时 png > jpg > jpeg > webp > avif > gif > svg > placeholder
#  3. 分类页：从 category.html 生成；带 to: 的分类不生成，旧目录会被删掉
#  4. 注入页头 / 页脚到所有页面的标记之间，并且
#     · 补上 js/assets.js 的 script 标签（必须排在 data.js 之前）
#     · 按清单校正静态 HTML 里手写的图片路径
#
#  静态 HTML 写入简体文案（没有 JS 也能导航），同时带
#  data-t="s.works.label" 这样的路径，切换语言时由 main.js 换成对应语言。
#
#  改了 data.js 或 category.html 之后重跑一次即可。
#  ⚠ 本文件必须存为 UTF-8 with BOM，否则 PowerShell 5.1 读中文会报错。
# =============================================================

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$data = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'js\data.js')
$U8   = New-Object System.Text.UTF8Encoding $false

# ---------- 解析 L(简,繁,英,日) / P(专有名词) ----------
# 手写取参，比正则可靠：字符串里出现括号也不会截断
function Get-Loc([string]$text, [int]$openParen) {
    $i = $openParen + 1
    $out = @(); $cur = $null; $inStr = $false; $esc = $false
    while ($i -lt $text.Length) {
        $ch = $text[$i]
        if ($inStr) {
            if ($esc)             { $cur += $ch; $esc = $false }
            elseif ($ch -eq '\')  { $esc = $true }
            elseif ($ch -eq "'")  { $inStr = $false; $out += $cur; $cur = $null }
            else                  { $cur += $ch }
        } else {
            if ($ch -eq "'")      { $inStr = $true; $cur = '' }
            elseif ($ch -eq ')')  { break }
        }
        $i++
    }
    if ($out.Count -eq 0) { return '' }
    return $out[0]                       # 简体作为静态默认值
}

# 在一段文本里找 `<name>: L(...)` 或 `<name>: P(...)`，返回简体值
function Field([string]$seg, [string]$name) {
    $m = [regex]::Match($seg, [regex]::Escape($name) + '\s*:\s*[LP]\s*\(')
    if (-not $m.Success) { return '' }
    return Get-Loc $seg ($m.Index + $m.Length - 1)
}

# ---------- 板块 ----------
$secs = @()
foreach ($m in [regex]::Matches($data, "key:\s*'([^']+)',\s*dir:\s*(?:'([^']+)'|null)")) {
    $secs += [pscustomobject]@{ Key = $m.Groups[1].Value; Dir = $m.Groups[2].Value; Start = $m.Index }
}
$charsAt = $data.IndexOf('var CHARACTERS')
for ($i = 0; $i -lt $secs.Count; $i++) {
    $s   = $secs[$i]
    $end = if ($i + 1 -lt $secs.Count) { $secs[$i + 1].Start } else { $charsAt }
    if ($end -le $s.Start) { $end = $data.Length }
    $seg = $data.Substring($s.Start, $end - $s.Start)
    $s | Add-Member Seg        $seg
    $s | Add-Member Label      (Field $seg 'label')
    $s | Add-Member Kicker     (Field $seg 'kicker')
    $s | Add-Member FeatKicker (Field $seg 'featKicker')

    # cats
    # 分类可以带 to:'<路径>' —— 表示这一项不生成自己的分类页，
    # 导航里直接指向那个路径（角色板块的「原创角色」就指向深色的选角色页）。
    $cats = @()
    $catEnd = $seg.IndexOf('feature:'); if ($catEnd -lt 0) { $catEnd = $seg.Length }
    $catMatches = @([regex]::Matches($seg, "slug:\s*'([^']+)',\s*label:\s*[LP]\s*\("))
    for ($ci = 0; $ci -lt $catMatches.Count; $ci++) {
        $c = $catMatches[$ci]
        if ($c.Index -ge $catEnd) { continue }
        $slug  = $c.Groups[1].Value
        $label = Get-Loc $seg ($c.Index + $c.Length - 1)
        # 这一条分类的文本范围：到下一条分类为止，且不越过 feature:
        $stop = if ($ci + 1 -lt $catMatches.Count) { [Math]::Min($catMatches[$ci + 1].Index, $catEnd) } else { $catEnd }
        $one  = $seg.Substring($c.Index, $stop - $c.Index)
        $dm   = [regex]::Match($one, 'desc:\s*[LP]\s*\(')
        $desc = if ($dm.Success) { Get-Loc $seg ($c.Index + $dm.Index + $dm.Length - 1) } else { '' }
        $tm2  = [regex]::Match($one, "to:\s*'([^']+)'")
        $to   = if ($tm2.Success) { $tm2.Groups[1].Value } else { '' }
        $cats += [pscustomobject]@{ Slug = $slug; Label = $label; Desc = $desc; To = $to }
    }
    $s | Add-Member Cats $cats

    # feature
    $feat = @()
    $fm = [regex]::Match($seg, 'feature:\s*\[')
    if ($fm.Success) {
        $close = $seg.IndexOf(']', $fm.Index)
        $fseg  = $seg.Substring($fm.Index, $close - $fm.Index)
        foreach ($x in [regex]::Matches($fseg, "to:\s*'([^']+)'\s*,\s*label:\s*[LP]\s*\(")) {
            $feat += [pscustomobject]@{ To = $x.Groups[1].Value
                                        Label = (Get-Loc $fseg ($x.Index + $x.Length - 1)) }
        }
    }
    $s | Add-Member Feature $feat

    # tags（Works 板块的 Photos 胶囊）
    $tags = @(); $tagKicker = ''
    $tm = [regex]::Match($seg, 'tags:\s*\{')
    if ($tm.Success) {
        $tseg = $seg.Substring($tm.Index, [Math]::Min(900, $seg.Length - $tm.Index))
        $tagKicker = Field $tseg 'kicker'
        foreach ($x in [regex]::Matches($tseg, "to:\s*'([^']+)'\s*,\s*label:\s*[LP]\s*\(")) {
            $tags += [pscustomobject]@{ To = $x.Groups[1].Value
                                        Label = (Get-Loc $tseg ($x.Index + $x.Length - 1)) }
        }
    }
    $s | Add-Member TagKicker $tagKicker
    $s | Add-Member Tags $tags

    # links / notes（Contact）
    $links = @(); $notes = @()
    $lm = [regex]::Match($seg, 'links:\s*\[')
    if ($lm.Success) {
        $close = $seg.IndexOf("\n      ],", $lm.Index)
        if ($close -lt 0) { $close = $seg.IndexOf('],', $lm.Index) }
        $lseg = $seg.Substring($lm.Index, $close - $lm.Index)
        foreach ($ln in ($lseg -split "`n")) {
            $lb = [regex]::Match($ln, 'label:\s*[LP]\s*\(')
            if (-not $lb.Success) { continue }
            $links += [pscustomobject]@{
                Label = (Get-Loc $ln ($lb.Index + $lb.Length - 1))
                Soon  = ($ln -match 'soon:\s*true')
                Mail  = ($ln -match "href:\s*'mailto:'")
            }
        }
    }
    $nm = [regex]::Match($seg, 'notes:\s*\[')
    if ($nm.Success) {
        $nseg = $seg.Substring($nm.Index)
        foreach ($x in [regex]::Matches($nseg, 'kicker:\s*[LP]\s*\(')) {
            $k = Get-Loc $nseg ($x.Index + $x.Length - 1)
            $tx = [regex]::Match($nseg.Substring($x.Index), 'text:\s*[LP]\s*\(')
            $v = if ($tx.Success) { Get-Loc $nseg ($x.Index + $tx.Index + $tx.Length - 1) } else { '' }
            $dim = ($nseg.Substring($x.Index, [Math]::Min(400, $nseg.Length - $x.Index)) -match 'dim:\s*true')
            $notes += [pscustomobject]@{ Kicker = $k; Text = $v; Dim = $dim }
        }
    }
    $s | Add-Member Links $links
    $s | Add-Member Notes $notes
}
$mail = ([regex]::Match($data, "var MAIL\s*=\s*'([^']+)'")).Groups[1].Value
$dirSecs = $secs | Where-Object { $_.Dir }

function Esc([string]$s) { $s -replace '&','&amp;' -replace '<','&lt;' -replace '>','&gt;' -replace '"','&quot;' }

function LinkFor($to, $sec, $base) {
    if ($to -like 'article:*') { return $base + 'article.html?a=' + $to.Substring(8) }
    if ($to -like 'cat:*')     { return $base + $sec.Dir + '/' + $to.Substring(4) + '/' }
    if ($to -like 'char:*')    { return $base + 'characters/?c=' + $to.Substring(5) }
    return $to
}

# 分类的链接：带 to: 的走 to（不生成自己的页面），否则走 <目录>/<slug>/
function CatHref($sec, $cat, $base) {
    if ($cat.To) { return $base + $cat.To }
    return $base + $sec.Dir + '/' + $cat.Slug + '/'
}

# ---------- 页头 ----------
function Build-Header($base) {
    $nav = ''; $panels = ''
    foreach ($s in $secs) {
        $id = 'menu-' + $s.Key
        $nav += "`n          <button class=""nav__link"" type=""button"" data-menu data-t=""s.$($s.Key).label"" aria-expanded=""false"" aria-controls=""$id"">$(Esc $s.Label)</button>"

        # 左栏
        $left = "<p class=""menu__kicker"" data-t=""s.$($s.Key).kicker"">$(Esc $s.Kicker)</p><ul class=""menu__list"">"
        if ($s.Cats.Count) {
            foreach ($c in $s.Cats) {
                $left += "<li><a href=""$(CatHref $s $c $base)"" data-t=""c.$($s.Key).$($c.Slug).label"">$(Esc $c.Label)<i class=""arr"" aria-hidden=""true""></i></a></li>"
            }
        } else {
            $li = 0
            foreach ($l in $s.Links) {
                if ($l.Soon) {
                    $left += "<li><span class=""menu__soon"" data-t=""l.$($s.Key).$li.label"">$(Esc $l.Label)<em data-i18n=""soon"">暂未开放</em></span></li>"
                } else {
                    $h = if ($l.Mail) { "mailto:$mail" } else { '#' }
                    $left += "<li><a href=""$h"" data-t=""l.$($s.Key).$li.label"">$(Esc $l.Label)<i class=""arr"" aria-hidden=""true""></i></a></li>"
                }
                $li++
            }
        }
        $left += '</ul>'

        # 右栏
        $right = ''
        if ($s.Feature.Count) {
            $right += "<p class=""menu__kicker"" data-t=""s.$($s.Key).featKicker"">$(Esc $s.FeatKicker)</p><ul class=""menu__list"">"
            $fi = 0
            foreach ($f in $s.Feature) {
                $right += "<li><a href=""$(LinkFor $f.To $s $base)"" data-t=""f.$($s.Key).$fi.label"">$(Esc $f.Label)<i class=""arr"" aria-hidden=""true""></i></a></li>"
                $fi++
            }
            $right += '</ul>'
        }
        if ($s.Tags.Count) {
            $right += "<p class=""menu__kicker menu__kicker--sp"" data-t=""gk.$($s.Key)"">$(Esc $s.TagKicker)</p><div class=""menu__tags"">"
            $gi = 0
            foreach ($x in $s.Tags) {
                $right += "<a href=""$(LinkFor $x.To $s $base)"" data-t=""g.$($s.Key).$gi.label"">$(Esc $x.Label)</a>"
                $gi++
            }
            $right += '</div>'
        }
        if ($s.Notes.Count) {
            $ni = 0
            foreach ($n in $s.Notes) {
                $sp = if ($ni -gt 0) { ' menu__kicker--sp' } else { '' }
                $right += "<p class=""menu__kicker$sp"" data-t=""n.$($s.Key).$ni.kicker"">$(Esc $n.Kicker)</p>"
                $dim = if ($n.Dim) { ' menu__note--dim' } else { '' }
                $right += "<p class=""menu__note$dim"" data-t=""n.$($s.Key).$ni.text"">$(Esc $n.Text)</p>"
                $ni++
            }
        }
        $cols = if ($right) { 2 } else { 1 }
        $panels += @"

      <div class="menu" id="$id" role="region" aria-label="$(Esc $s.Label)" aria-hidden="true">
        <div class="menu__grid" style="--cols:$cols">
          <div>$left</div>
          <div>$right</div>
        </div>
      </div>
"@
    }

    # 移动端抽屉
    $m = ''
    foreach ($s in $secs) {
        $inner = ''
        if ($s.Cats.Count) {
            foreach ($c in $s.Cats) { $inner += "<a href=""$(CatHref $s $c $base)"" data-t=""c.$($s.Key).$($c.Slug).label"">$(Esc $c.Label)</a>" }
        } else {
            $li = 0
            foreach ($l in $s.Links) {
                if ($l.Soon) { $inner += "<span class=""menu__soon"" data-t=""l.$($s.Key).$li.label"">$(Esc $l.Label)<em data-i18n=""soon"">暂未开放</em></span>" }
                else { $inner += "<a href=""mailto:$mail"" data-t=""l.$($s.Key).$li.label"">$(Esc $l.Label)</a>" }
                $li++
            }
        }
        $m += @"

        <li class="mnav__item">
          <button class="mnav__head" type="button" data-acc data-t="s.$($s.Key).label" aria-expanded="false">$(Esc $s.Label)<i class="chev" aria-hidden="true"></i></button>
          <div class="mnav__panel">$inner</div>
        </li>
"@
    }

    @"
<header class="hdr" data-header>
  <div class="hdr__inner">
    <a class="brand" href="${base}home.html" aria-label="JasperPeng">
      <span class="brand__mark" aria-hidden="true">J</span>
      <span class="brand__name">JasperPeng</span>
    </a>
    <nav class="nav" aria-label="Primary">$nav
    </nav>
    <div class="hdr__tools">
      <button class="icon-btn" type="button" data-search-open aria-label="Search" title="⌘K">
        <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16 21 21"/></svg>
      </button>
      <button class="icon-btn burger" type="button" data-burger aria-label="Menu" aria-expanded="false" aria-controls="mnav">
        <span class="burger__icon" aria-hidden="true"><span></span><span></span></span>
      </button>
    </div>
  </div>$panels
</header>
<div class="scrim" data-scrim aria-hidden="true"></div>

<div class="mnav" id="mnav" data-mnav hidden>
  <nav aria-label="Mobile">
    <ul>$m
    </ul>
  </nav>
</div>

<div class="search" data-search hidden>
  <div class="search__panel" role="dialog" aria-modal="true" aria-label="Search">
    <div class="search__bar">
      <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16 21 21"/></svg>
      <input type="search" data-search-input data-i18n="search" placeholder="搜索文章、作品、角色…" autocomplete="off" spellcheck="false" aria-label="Search">
      <kbd>Esc</kbd>
    </div>
    <div class="search__results" data-search-results aria-live="polite"></div>
  </div>
</div>
"@
}

# ---------- 页脚 ----------
function Build-Footer($base) {
    $cols = ''
    foreach ($s in $dirSecs) {
        $c = "<h3 data-t=""s.$($s.Key).kicker"">$(Esc $s.Kicker)</h3>"
        foreach ($x in $s.Cats) {
            $c += "<a href=""$(CatHref $s $x $base)"" data-t=""c.$($s.Key).$($x.Slug).label"">$(Esc $x.Label)</a>"
        }
        $cols += "      <div class=""ftr__col"">$c</div>`n"
    }
    $contact = $secs | Where-Object { $_.Key -eq 'contact' } | Select-Object -First 1
    $cc = "<h3 data-t=""s.contact.kicker"">$(Esc $contact.Kicker)</h3>"
    $li = 0
    foreach ($l in $contact.Links) {
        if ($l.Soon) { $cc += "<span class=""ftr__soon"" data-t=""l.contact.$li.label"">$(Esc $l.Label)<em data-i18n=""soon"">暂未开放</em></span>" }
        else { $cc += "<a href=""mailto:$mail"" data-t=""l.contact.$li.label"">$(Esc $l.Label)</a>" }
        $li++
    }
    $ni = 0
    foreach ($n in $contact.Notes) {
        $cc += "<h3 data-t=""n.contact.$ni.kicker"">$(Esc $n.Kicker)</h3>"
        $cc += "<p class=""ftr__note"" data-t=""n.contact.$ni.text"">$(Esc $n.Text)</p>"
        $ni++
    }
    $cols += "      <div class=""ftr__col"">$cc</div>`n"

    @"
<footer class="ftr">
  <div class="wrap">
    <nav class="crumb" aria-label="Breadcrumb" data-crumb>
      <a href="${base}home.html">JasperPeng</a>
    </nav>
    <div class="ftr__grid">
$cols    </div>
    <div class="ftr__bar">
      <p class="ftr__copy">JasperPeng©2026</p>
      <div class="lang" data-lang>
        <button class="lang__btn" type="button" data-lang-btn aria-expanded="false" aria-haspopup="listbox">
          <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.75"/><path d="M3.25 12h17.5M12 3.25c4.8 5.5 4.8 12.1 0 17.5-4.8-5.4-4.8-12 0-17.5Z"/></svg>
          <span data-lang-label>简体中文 中国大陆</span><i class="chev" aria-hidden="true"></i>
        </button>
        <ul class="lang__menu" role="listbox" data-lang-menu></ul>
      </div>
    </div>
  </div>
</footer>
"@
}

# ---------- 占位图的画法（配色 + 六种图形）----------
$palette = @{
    'works'      = @('#EFEDE9', '#E3DDD2', '#C9BFAE', '#8E8378')
    'research'   = @('#ECEEF2', '#DDE3EC', '#AFC0D8', '#7C8CA6')
    'universe'   = @('#EBEFEC', '#DCE6DF', '#A8C4B4', '#75907F')
    'characters' = @('#F0ECEE', '#E5DEE1', '#CBB8C0', '#8F7C84')
    'resources'  = @('#EDEEEF', '#E0E3E5', '#BEC5CB', '#868D94')
}
function Get-Seed([string]$s) { $h = 0; foreach ($ch in $s.ToCharArray()) { $h = ($h * 31 + [int]$ch) % 100000 }; $h }

function New-Cover([string]$slug, [string]$dir) {
    $p = $palette[$dir]; if (-not $p) { $p = $palette['works'] }
    $seed = Get-Seed $slug; $kind = $seed % 6
    $a = $p[0]; $b = $p[1]; $c = $p[2]; $d = $p[3]
    $body = switch ($kind) {
        0 { $out=''; for ($i=0; $i -lt 5; $i++) { $rr=130+$i*62; $op=[math]::Round(0.55-$i*0.09,2)
              $out += "  <circle cx='400' cy='430' r='$rr' fill='none' stroke='$c' stroke-width='$(14-$i*2)' opacity='$op'/>`n" }
            $out + "  <circle cx='400' cy='430' r='72' fill='$d' opacity='0.85'/>" }
        1 { $out=''; for ($y=0; $y -lt 4; $y++) { for ($x=0; $x -lt 4; $x++) {
              $off=(($x+$y+$seed)%3)*14; $s2=96+(($x*$y+$seed)%3)*18; $op=[math]::Round(0.30+((($x+$y)%4)*0.14),2)
              $out += "  <rect x='$(108+$x*148)' y='$(108+$y*148+$off)' width='$s2' height='$s2' rx='10' fill='$c' opacity='$op'/>`n" } }; $out }
        2 { $r=200+($seed%5)*22; $cx=340+(($seed/7)%9)*18; $cy=340+(($seed/3)%9)*18
            "  <circle cx='$cx' cy='$cy' r='$r' fill='url(#orb)'/>`n" +
            "  <circle cx='$($cx-[math]::Round($r*0.34))' cy='$($cy-[math]::Round($r*0.34))' r='$([math]::Round($r*0.36))' fill='#FFFFFF' opacity='0.5'/>`n" +
            "  <circle cx='$cx' cy='$cy' r='$r' fill='none' stroke='$d' stroke-width='2' opacity='0.26'/>" }
        3 { $out=''; for ($i=0; $i -lt 7; $i++) { $w=52+(($i+$seed)%3)*30; $op=[math]::Round(0.22+(($i%3)*0.16),2)
              $out += "  <rect x='$(-180+$i*150)' y='-220' width='$w' height='1300' fill='$c' opacity='$op' transform='rotate(24 400 400)'/>`n" }; $out }
        4 { $out=''; for ($y=0; $y -lt 9; $y++) { for ($x=0; $x -lt 9; $x++) {
              $rr=6+[math]::Round((($x*2+$y*3+$seed)%7)*2.6,1); $op=[math]::Round(0.24+((($x+$y+$seed)%5)*0.13),2)
              $out += "  <circle cx='$(92+$x*77)' cy='$(92+$y*77)' r='$rr' fill='$c' opacity='$op'/>`n" } }; $out }
        default { "  <rect x='96' y='150' width='430' height='430' rx='16' fill='$c' opacity='0.55'/>`n" +
                  "  <rect x='214' y='236' width='430' height='430' rx='16' fill='$d' opacity='0.34'/>`n" +
                  "  <rect x='158' y='196' width='430' height='430' rx='16' fill='none' stroke='$d' stroke-width='2' opacity='0.5'/>" }
    }
@"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800" role="img" aria-label="$slug">
  <!-- TODO: replace placeholder with final asset -->
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="$a"/><stop offset="1" stop-color="$b"/></linearGradient>
    <radialGradient id="orb" cx="0.38" cy="0.34" r="0.72"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.45" stop-color="$c"/><stop offset="1" stop-color="$d"/></radialGradient>
  </defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  <g transform="rotate($($seed % 24 - 12) 400 400)">
$body
  </g>
</svg>
"@
}

# ---------- 1. 占位图 ----------
# 占位图叫 <slug>.placeholder.svg，不占用 <slug>.png 这个名字 ——
# 换真图时只要把 <slug>.png 丢进同一个目录就行，不用先删掉占位图。
$IMG_EXT = @('.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.svg')   # 真图，靠前的优先
$PLACEHOLDER = '.placeholder.svg'

# 这个 slug 有没有真图（占位图不算）
function Has-Real([string]$dir, [string]$slug) {
    foreach ($e in $IMG_EXT) { if (Test-Path (Join-Path $dir ($slug + $e))) { return $true } }
    return $false
}
function Ensure-Cover([string]$dir, [string]$slug, [string]$paletteKey) {
    if (Has-Real $dir $slug) { return 'real' }
    $ph = Join-Path $dir ($slug + $PLACEHOLDER)
    if (Test-Path $ph) { return 'kept' }
    [System.IO.File]::WriteAllText($ph, (New-Cover $slug $paletteKey), $U8)
    return 'made'
}

$made = 0; $kept = 0; $real = 0
foreach ($m in [regex]::Matches($data, "slug:\s*'([^']+)',\s*section:\s*'([^']+)',\s*cat:\s*'([^']+)'")) {
    $sec = $secs | Where-Object { $_.Key -eq $m.Groups[2].Value } | Select-Object -First 1
    if (-not $sec) { continue }
    $dir = Join-Path $root ('assets\images\' + $sec.Dir)
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    switch (Ensure-Cover $dir $m.Groups[1].Value $sec.Dir) {
        'made' { $made++ } 'kept' { $kept++ } 'real' { $real++ }
    }
}
$charDir = Join-Path $root 'assets\images\characters'
New-Item -ItemType Directory -Force -Path $charDir | Out-Null
foreach ($m in [regex]::Matches($data, "slug:\s*'([^']+)',\s*name:\s*[LP]\s*\(")) {
    switch (Ensure-Cover $charDir $m.Groups[1].Value 'characters') {
        'made' { $made++ } 'kept' { $kept++ } 'real' { $real++ }
    }
}
Write-Host "占位图：新建 $made，保留 $kept；已换成真图 $real"

# ---------- 2. 图片清单 ----------
# 扫出 assets/images 下每个 slug 真实存在的文件，写成 js/assets.js。
# data.js 只写 slug，扩展名由这份清单决定 —— 换图不用改任何代码。
# 同一个 slug 有多种格式时按 $IMG_EXT 的顺序取，占位图排在最后：
# 只要目录里有 <slug>.png，它就一定压过 <slug>.placeholder.svg。
$phRank = $IMG_EXT.Count
$manifest = [ordered]@{}
foreach ($d in (Get-ChildItem (Join-Path $root 'assets\images') -Directory)) {
    foreach ($f in (Get-ChildItem $d.FullName -File)) {
        $name = $f.Name
        if ($name.ToLower().EndsWith($PLACEHOLDER)) {
            $stem = $name.Substring(0, $name.Length - $PLACEHOLDER.Length); $i = $phRank
        } else {
            $i = [array]::IndexOf($IMG_EXT, $f.Extension.ToLower())
            if ($i -lt 0) { continue }
            $stem = [System.IO.Path]::GetFileNameWithoutExtension($name)
        }
        $key = $d.Name + '/' + $stem
        if ($manifest.Contains($key) -and $manifest[$key].Rank -le $i) { continue }
        $manifest[$key] = [pscustomobject]@{ Rank = $i; Path = 'assets/images/' + $d.Name + '/' + $name }
    }
}
$rows = @()
foreach ($k in $manifest.Keys) { $rows += ('  "' + $k + '": "' + $manifest[$k].Path + '"') }
$assetsJs = @"
/* 由 build.ps1 自动生成 —— 不要手改。
   换图：把 <slug>.png / .jpg 丢进 assets/images/<板块目录>/，
   然后双击根目录的「刷新图片.cmd」（或重跑 build.ps1）。
   占位图 <slug>.placeholder.svg 会自动让位，不用手动删。 */
window.JP_ASSETS = {
$($rows -join ",`n")
};
"@
[System.IO.File]::WriteAllText((Join-Path $root 'js\assets.js'), $assetsJs, $U8)
Write-Host "图片清单：$($manifest.Count) 条 → js/assets.js"

# ---------- 3. 分类页 ----------
$tpl = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'category.html')
$pages = 0
foreach ($s in $dirSecs) {
    foreach ($c in $s.Cats) {
        # 带 to: 的分类不生成自己的页面 —— 导航直接指向别处。
        # 如果之前生成过，顺手删掉，免得留下一个没人链接的孤儿页。
        if ($c.To) {
            $stale = Join-Path $root (Join-Path $s.Dir $c.Slug)
            if (Test-Path $stale) { Remove-Item $stale -Recurse -Force; Write-Host "  清理孤儿页：$($s.Dir)/$($c.Slug)/" }
            continue
        }
        # 注意 DIR 与 SECTION 不同：about 板块的目录名是 resources
        $out = $tpl -replace '\{\{BASE\}\}','../../' -replace '\{\{SECTION\}\}',$s.Key `
                    -replace '\{\{DIR\}\}',$s.Dir `
                    -replace '\{\{SECTION_LABEL\}\}',(Esc $s.Kicker) -replace '\{\{CAT\}\}',$c.Slug `
                    -replace '\{\{TITLE\}\}',(Esc $c.Label) -replace '\{\{DESC\}\}',(Esc $c.Desc)
        $d = Join-Path $root (Join-Path $s.Dir $c.Slug)
        New-Item -ItemType Directory -Force -Path $d | Out-Null
        [System.IO.File]::WriteAllText((Join-Path $d 'index.html'), $out, $U8); $pages++
    }
}
Write-Host "分类页：$pages 个"

# ---------- 4. 注入页头 / 页脚 ----------
$hdrCache = @{}; $ftrCache = @{}; $injected = 0
Get-ChildItem $root -Recurse -Filter *.html |
  Where-Object { $_.Name -ne 'category.html' -and $_.Name -notlike '_*' } | ForEach-Object {
    $html = Get-Content -Raw -Encoding UTF8 $_.FullName
    if ($html -notmatch '#chrome:header:start') { return }
    $depth = ($_.FullName.Substring($root.Length).TrimStart('\').Split('\').Count) - 1
    $base  = '../' * $depth
    if (-not $hdrCache.ContainsKey($base)) { $hdrCache[$base] = Build-Header $base; $ftrCache[$base] = Build-Footer $base }
    $html = [regex]::Replace($html, '(?s)(<!-- #chrome:header:start -->).*?(<!-- #chrome:header:end -->)',
      { param($m) $m.Groups[1].Value + "`n" + $hdrCache[$base] + $m.Groups[2].Value })
    $html = [regex]::Replace($html, '(?s)(<!-- #chrome:footer:start -->).*?(<!-- #chrome:footer:end -->)',
      { param($m) $m.Groups[1].Value + "`n" + $ftrCache[$base] + $m.Groups[2].Value })
    # 静态 HTML 里手写的图片路径（首页那几张卡）也按清单校正一遍，
    # 免得换了图 / 改了扩展名之后这些硬编码的 src 变成断链。
    $html = [regex]::Replace($html, '((?:\.\./)*)assets/images/([^"/]+)/([^"]+?)"', {
        param($mm)
        $pfx = $mm.Groups[1].Value; $dir = $mm.Groups[2].Value; $file = $mm.Groups[3].Value
        if ($file.ToLower().EndsWith($PLACEHOLDER)) { $stem = $file.Substring(0, $file.Length - $PLACEHOLDER.Length) }
        else { $stem = [System.IO.Path]::GetFileNameWithoutExtension($file) }
        $key = $dir + '/' + $stem
        if ($manifest.Contains($key)) { return $pfx + $manifest[$key].Path + '"' }
        return $mm.Value
    })
    # 图片清单必须排在 data.js 之前 —— data.js 生成 cover 路径时要读它
    if ($html -notmatch 'js/assets\.js') {
        $html = [regex]::Replace($html, '<script src="([^"]*)js/data\.js"></script>',
          { param($m) '<script src="' + $m.Groups[1].Value + 'js/assets.js"></script>' + "`n" + $m.Value })
    }
    [System.IO.File]::WriteAllText($_.FullName, $html, $U8); $injected++
}
Write-Host "注入页头页脚：$injected 个页面"
Write-Host "完成。"
