# =============================================================
#  JasperPeng — build.ps1
#  用法： powershell -ExecutionPolicy Bypass -File build.ps1
#
#  1. 依据 js/data.js 生成文章封面 SVG（真实文件，已存在则跳过）
#  2. 依据 js/data.js 生成页头 / 页脚，注入所有页面的标记之间
#     -> 静态 HTML（JS 挂了页面也能导航）+ 单一数据源
#  3. 依据 category.html 模板生成 20 个分类页
#
#  改了 data.js 或 category.html 之后重跑一次即可。
# =============================================================

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$data = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'js\data.js')
$U8   = New-Object System.Text.UTF8Encoding $false

# ============ 解析 data.js ============
$secBlocks = @()
foreach ($m in [regex]::Matches($data, "key:\s*'([^']+)',\s*label:\s*'([^']+)',\s*dir:\s*(?:'([^']+)'|null)")) {
    $secBlocks += [pscustomobject]@{ Key=$m.Groups[1].Value; Label=$m.Groups[2].Value
                                     Dir=$m.Groups[3].Value; Start=$m.Index }
}
for ($i = 0; $i -lt $secBlocks.Count; $i++) {
    $s   = $secBlocks[$i]
    $end = if ($i + 1 -lt $secBlocks.Count) { $secBlocks[$i+1].Start } else { $data.IndexOf('var CHARACTERS') }
    if ($end -lt $s.Start) { $end = $data.Length }
    $seg = $data.Substring($s.Start, $end - $s.Start)

    $k = [regex]::Match($seg, "kicker:\s*'([^']+)'")
    $f = [regex]::Match($seg, "featKicker:\s*'([^']+)'")
    $s | Add-Member Kicker     ($(if ($k.Success) { $k.Groups[1].Value } else { $s.Label }))
    $s | Add-Member FeatKicker ($(if ($f.Success) { $f.Groups[1].Value } else { '' }))

    $cats = @()
    foreach ($c in [regex]::Matches($seg, "slug:\s*'([^']+)',\s*label:\s*'([^']+)',\s*desc:\s*'([^']*)'")) {
        $cats += [pscustomobject]@{ Slug=$c.Groups[1].Value; Label=$c.Groups[2].Value; Desc=$c.Groups[3].Value }
    }
    $s | Add-Member Cats $cats

    $feat = @()
    $fm = [regex]::Match($seg, 'feature:\s*\[(.*?)\]', 'Singleline')
    if ($fm.Success) {
        foreach ($x in [regex]::Matches($fm.Groups[1].Value, "to:\s*'([^']+)',\s*label:\s*'([^']+)'")) {
            $feat += [pscustomobject]@{ To=$x.Groups[1].Value; Label=$x.Groups[2].Value }
        }
    }
    $s | Add-Member Feature $feat

    $tags = @()
    $tm = [regex]::Match($seg, 'tags:\s*\{\s*kicker:\s*''([^'']+)'',\s*items:\s*\[(.*?)\]', 'Singleline')
    $tagKicker = ''
    if ($tm.Success) {
        $tagKicker = $tm.Groups[1].Value
        foreach ($x in [regex]::Matches($tm.Groups[2].Value, "to:\s*'([^']+)',\s*label:\s*'([^']+)'")) {
            $tags += [pscustomobject]@{ To=$x.Groups[1].Value; Label=$x.Groups[2].Value }
        }
    }
    $s | Add-Member TagKicker $tagKicker
    $s | Add-Member Tags $tags

    $links = @()
    $lm = [regex]::Match($seg, 'links:\s*\[(.*?)\n\s*\],', 'Singleline')
    if ($lm.Success) {
        foreach ($ln in ($lm.Groups[1].Value -split "`n")) {
            $lb = [regex]::Match($ln, "label:\s*'([^']+)'")
            if (-not $lb.Success) { continue }
            $hr = [regex]::Match($ln, "href:\s*(?:'([^']*)'|mailto)")
            $links += [pscustomobject]@{
                Label = $lb.Groups[1].Value
                Soon  = ($ln -match 'soon:\s*true')
                Href  = $(if ($ln -match "href:\s*'mailto:'\s*\+\s*MAIL") { 'mailto:__MAIL__' }
                          elseif ($hr.Success) { $hr.Groups[1].Value } else { '' })
            }
        }
    }
    $s | Add-Member Links $links
}
$mail = ([regex]::Match($data, "var MAIL\s*=\s*'([^']+)'")).Groups[1].Value
$navSecs = $secBlocks     # 六项都进导航
$dirSecs = $secBlocks | Where-Object { $_.Dir }

function LinkFor($to, $sec, $base) {
    if ($to -like 'article:*') { return $base + 'article.html?a=' + $to.Substring(8) }
    if ($to -like 'cat:*')     { return $base + $sec.Dir + '/' + $to.Substring(4) + '/' }
    if ($to -like 'char:*')    { return $base + 'characters/?c=' + $to.Substring(5) }
    return $to
}

# ============ 生成页头 ============
function Build-Header($base) {
    $nav = ''; $panels = ''
    foreach ($s in $navSecs) {
        $id = 'menu-' + $s.Key
        $nav += @"

          <button class="nav__link" type="button" data-menu aria-expanded="false" aria-controls="$id">$($s.Label)<i class="chev" aria-hidden="true"></i></button>
"@
        # 左栏：分类或外链
        if ($s.Cats.Count) {
            $left = "<p class=""menu__kicker"">$($s.Kicker)</p><ul class=""menu__list"">"
            foreach ($c in $s.Cats) {
                $left += "<li><a href=""$base$($s.Dir)/$($c.Slug)/"">$($c.Label)<i class=""arr"" aria-hidden=""true""></i></a></li>"
            }
            $left += '</ul>'
        } else {
            $left = "<p class=""menu__kicker"">$($s.Kicker)</p><ul class=""menu__list"">"
            foreach ($l in $s.Links) {
                if ($l.Soon) {
                    $left += "<li><span class=""menu__soon"">$($l.Label)<em data-i18n=""soon"">暂未开放</em></span></li>"
                } else {
                    $h = $l.Href.Replace('__MAIL__', $mail)
                    $left += "<li><a href=""$h"">$($l.Label)<i class=""arr"" aria-hidden=""true""></i></a></li>"
                }
            }
            $left += '</ul>'
        }
        # 右栏：推荐位 / 说明
        $right = ''
        if ($s.Feature.Count) {
            $right += "<p class=""menu__kicker"">$($s.FeatKicker)</p><ul class=""menu__list"">"
            foreach ($f in $s.Feature) {
                $right += "<li><a href=""$(LinkFor $f.To $s $base)"">$($f.Label)<i class=""arr"" aria-hidden=""true""></i></a></li>"
            }
            $right += '</ul>'
        }
        if ($s.Tags.Count) {
            $right += "<p class=""menu__kicker"" style=""margin-top:20px"">$($s.TagKicker)</p><div class=""menu__tags"">"
            foreach ($x in $s.Tags) { $right += "<a href=""$(LinkFor $x.To $s $base)"">$($x.Label)</a>" }
            $right += '</div>'
        }
        if ($s.Key -eq 'contact') {
            $right += '<p class="menu__kicker">About me</p><p class="menu__note">base in PRC</p>' +
                      '<p class="menu__kicker" style="margin-top:20px">Donate</p>' +
                      '<p class="menu__note menu__note--dim" data-i18n="soon">暂未开放</p>'
        }
        $cols = if ($right) { 2 } else { 1 }
        $panels += @"

      <div class="menu" id="$id" role="region" aria-label="$($s.Label) 菜单" aria-hidden="true">
        <div class="menu__grid" style="--cols:$cols">
          <div>$left</div>
          <div>$right</div>
        </div>
      </div>
"@
    }

    # 移动端抽屉
    $m = ''
    foreach ($s in $navSecs) {
        $inner = ''
        if ($s.Cats.Count) {
            foreach ($c in $s.Cats) { $inner += "<a href=""$base$($s.Dir)/$($c.Slug)/"">$($c.Label)</a>" }
        } else {
            foreach ($l in $s.Links) {
                if ($l.Soon) { $inner += "<span class=""menu__soon"">$($l.Label)<em data-i18n=""soon"">暂未开放</em></span>" }
                else { $inner += "<a href=""$($l.Href.Replace('__MAIL__',$mail))"">$($l.Label)</a>" }
            }
        }
        $m += @"

        <li class="mnav__item">
          <button class="mnav__head" type="button" data-acc aria-expanded="false">$($s.Label)<i class="chev" aria-hidden="true"></i></button>
          <div class="mnav__panel">$inner</div>
        </li>
"@
    }

    @"
<header class="hdr" data-header>
  <div class="hdr__inner">
    <a class="brand" href="${base}home.html" aria-label="JasperPeng — 首页">
      <span class="brand__mark" aria-hidden="true">J</span>
      <span class="brand__name">JasperPeng</span>
    </a>
    <nav class="nav" aria-label="主导航">$nav
    </nav>
    <div class="hdr__tools">
      <button class="icon-btn" type="button" data-search-open aria-label="搜索" title="搜索 (⌘K)">
        <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16 21 21"/></svg>
      </button>
      <button class="icon-btn burger" type="button" data-burger aria-label="打开菜单" aria-expanded="false" aria-controls="mnav">
        <span class="burger__icon" aria-hidden="true"><span></span><span></span></span>
      </button>
    </div>
  </div>$panels
</header>
<div class="scrim" data-scrim aria-hidden="true"></div>

<div class="mnav" id="mnav" data-mnav hidden>
  <nav aria-label="移动端导航">
    <ul>$m
    </ul>
  </nav>
</div>

<div class="search" data-search hidden>
  <div class="search__panel" role="dialog" aria-modal="true" aria-label="站内搜索">
    <div class="search__bar">
      <svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16 21 21"/></svg>
      <input type="search" data-search-input data-i18n="search" placeholder="搜索文章、作品、角色…" autocomplete="off" spellcheck="false" aria-label="搜索站内内容">
      <kbd>Esc</kbd>
    </div>
    <div class="search__results" data-search-results aria-live="polite"></div>
  </div>
</div>
"@
}

# ============ 生成页脚 ============
function Build-Footer($base) {
    $cols = ''
    foreach ($s in $dirSecs) {
        $c = "<h3>$($s.Kicker)</h3>"
        foreach ($x in $s.Cats) { $c += "<a href=""$base$($s.Dir)/$($x.Slug)/"">$($x.Label)</a>" }
        if ($s.Key -eq 'about') { $c += '<p class="ftr__note">base in PRC</p>' }
        $cols += "      <div class=""ftr__col"">$c</div>`n"
    }
    $contact = $secBlocks | Where-Object { $_.Key -eq 'contact' } | Select-Object -First 1
    $cc = '<h3>Contact</h3>'
    foreach ($l in $contact.Links) {
        if ($l.Soon) { $cc += "<span class=""ftr__soon"">$($l.Label)<em data-i18n=""soon"">暂未开放</em></span>" }
        else { $cc += "<a href=""$($l.Href.Replace('__MAIL__',$mail))"">$($l.Label)</a>" }
    }
    $cc += '<h3>Donate</h3><p class="ftr__note" data-i18n="soon">暂未开放</p>'
    $cols += "      <div class=""ftr__col"">$cc</div>`n"

    @"
<footer class="ftr">
  <div class="wrap">
    <nav class="crumb" aria-label="页面位置" data-crumb>
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

# ============ 1. 封面 SVG ============
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
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800" role="img" aria-label="$slug 封面占位图">
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

$made = 0; $kept = 0
foreach ($m in [regex]::Matches($data, "slug:\s*'([^']+)',\s*section:\s*'([^']+)',\s*cat:\s*'([^']+)'")) {
    $sec = $secBlocks | Where-Object { $_.Key -eq $m.Groups[2].Value } | Select-Object -First 1
    if (-not $sec) { continue }
    $dir = Join-Path $root ('assets\images\' + $sec.Dir)
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $file = Join-Path $dir "$($m.Groups[1].Value).svg"
    if (Test-Path $file) { $kept++; continue }
    [System.IO.File]::WriteAllText($file, (New-Cover $m.Groups[1].Value $sec.Dir), $U8); $made++
}
# 角色立绘占位
foreach ($m in [regex]::Matches($data, "slug:\s*'([^']+)',\s*name:\s*'([^']+)'")) {
    $file = Join-Path $root ("assets\images\characters\" + $m.Groups[1].Value + ".svg")
    if (Test-Path $file) { $kept++; continue }
    [System.IO.File]::WriteAllText($file, (New-Cover $m.Groups[1].Value 'characters'), $U8); $made++
}
Write-Host "封面 SVG：新建 $made，保留已有 $kept"

# ============ 2. 分类页 ============
$tpl = Get-Content -Raw -Encoding UTF8 (Join-Path $root 'category.html')
$pages = 0
foreach ($s in $dirSecs) {
    foreach ($c in $s.Cats) {
        # 注意 DIR 与 SECTION 不同：about 板块的目录名是 resources
        $out = $tpl -replace '\{\{BASE\}\}','../../' -replace '\{\{SECTION\}\}',$s.Key `
                    -replace '\{\{DIR\}\}',$s.Dir `
                    -replace '\{\{SECTION_LABEL\}\}',$s.Kicker -replace '\{\{CAT\}\}',$c.Slug `
                    -replace '\{\{TITLE\}\}',$c.Label -replace '\{\{DESC\}\}',$c.Desc
        $d = Join-Path $root (Join-Path $s.Dir $c.Slug)
        New-Item -ItemType Directory -Force -Path $d | Out-Null
        [System.IO.File]::WriteAllText((Join-Path $d 'index.html'), $out, $U8); $pages++
    }
}
Write-Host "分类页：$pages 个"

# ============ 3. 注入页头 / 页脚 ============
$hdrCache = @{}; $ftrCache = @{}
$injected = 0
Get-ChildItem $root -Recurse -Filter *.html |
  Where-Object { $_.Name -ne 'category.html' -and $_.Name -notlike '_*' } | ForEach-Object {
    $html = Get-Content -Raw -Encoding UTF8 $_.FullName
    if ($html -notmatch '#chrome:header:start') { return }

    $depth = ($_.FullName.Substring($root.Length).TrimStart('\').Split('\').Count) - 1
    $base  = '../' * $depth
    if (-not $hdrCache.ContainsKey($base)) { $hdrCache[$base] = Build-Header $base; $ftrCache[$base] = Build-Footer $base }

    $html = [regex]::Replace($html,
      '(?s)(<!-- #chrome:header:start -->).*?(<!-- #chrome:header:end -->)',
      { param($m) $m.Groups[1].Value + "`n" + $hdrCache[$base] + $m.Groups[2].Value })
    $html = [regex]::Replace($html,
      '(?s)(<!-- #chrome:footer:start -->).*?(<!-- #chrome:footer:end -->)',
      { param($m) $m.Groups[1].Value + "`n" + $ftrCache[$base] + $m.Groups[2].Value })

    [System.IO.File]::WriteAllText($_.FullName, $html, $U8); $injected++
}
Write-Host "注入页头页脚：$injected 个页面"
Write-Host "完成。"
