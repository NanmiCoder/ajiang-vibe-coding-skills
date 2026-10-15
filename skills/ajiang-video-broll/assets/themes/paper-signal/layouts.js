/* 纸白信号橙 · 版式语言：瑞士国际主义海报。
 * 12 栏网格 + 墨色细线做骨架，巨大的 Geist 数字做索引，中文粗黑体做标题；
 * 橙色只出现在“信号”上：标题重点的色块、扫描条、点亮的格子、结论色块、换页的光条。
 * 入场全部是 clip-path 擦出 / 遮罩升起，不回弹。换页：一道橙色竖条从左推过去，旧画面被它切掉。
 * 内容少时用描边巨号（条目数 / 检查项数）补位，内容多时缩字号、改行距，始终保持网格对齐。 */
(function () {
  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function io(x) { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function ex(x) { x = clamp(x); return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); }
  function len(s) { var L = 0; s = String(s || '').replace(/<[^>]+>/g, ''); for (var i = 0; i < s.length; i++) L += /[\x00-\xff]/.test(s[i]) ? (s[i] === ' ' ? .3 : .56) : 1; return L || 1; }
  function fit(s, w, max, min) { return Math.max(min, Math.min(max, Math.floor(w / len(s)))); }
  function pad(i) { return (i < 9 ? '0' : '') + (i + 1); }
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
  // 非百分比的刻度：取一个“好读”的满格值（1 / 2 / 2.5 / 5 × 10^k），数值大约落在 50%–90%
  function niceMax(v) { if (!(v > 0)) return 1; var e = Math.pow(10, Math.floor(Math.log10(v))), m = [1, 2, 2.5, 5, 10]; for (var i = 0; i < m.length; i++) if (m[i] * e >= v * 1.1) return m[i] * e; return 10 * e; }
  function plainTag(tag, i) { return tag && !/^0?\d+$/.test(String(tag).trim()) ? tag : ''; } // “01”这种和索引重复的 tag 不再显示
  var TR = .5; // 换页时长，和 theme.json motion.transition.dur 一致

  BrollCore.template('paper-signal', function (H) {
    var A = H.A, box = H.box, pos = H.pos;
    function hl(title, h) { return BrollCore.hlify(title || '', h); }
    // 换页：入场时橙条领着擦出；离场时旧画面从左被切掉（保持不透明，不做淡出）
    function wipe(sc, t, el) {
      var D = sc && sc.to != null && sc.from != null ? sc.to - sc.from : null, bar = el.querySelector('.ps-sig');
      if (sc && sc.from > 0 && t < TR) {
        var e = io(t / TR) * 1920; el.style.opacity = 1; el.style.clipPath = 'inset(0 ' + (1920 - e) + 'px 0 0)';
        if (bar) { bar.style.opacity = 1; bar.style.transform = 'translateX(' + (e - 70) + 'px)'; }
      } else if (bar) bar.style.opacity = 0;
      if (D != null && t > D) { var p = io((t - D) / TR) * 100; el.style.opacity = 1; el.style.clipPath = 'inset(0 0 0 ' + p + '%)'; }
    }
    // 标题重点：橙色色块从左擦到右（文字保持墨色）
    function hlBlock(el, t, t0) {
      var hs = el.querySelectorAll('.ttl .hl');
      for (var i = 0; i < hs.length; i++) hs[i].style.backgroundSize = (io((t - t0) / .45) * 100) + '% 100%';
    }
    function corners(x, y, w, h, t) {
      var s = 24, o = '';
      [[x, y, '1 0 0 1'], [x + w - s, y, '1 1 0 0'], [x, y + h - s, '0 0 1 1'], [x + w - s, y + h - s, '0 1 1 0']].forEach(function (c) {
        o += '<i class="ps-cn"' + A('fade', t, .3) + ' style="' + box(c[0], c[1], s, s, 'border-width:' + c[2].split(' ').map(function (k) { return k * 3 + 'px'; }).join(' ')) + '"></i>';
      });
      return o;
    }
    // 描边巨号：内容少的时候在空栏里做“索引”补位（条目数、检查项数）
    function ghost(x, y, txt, size, label, t) {
      return (label ? '<div class="abs ps-lab"' + A('fade', t) + ' style="' + pos(x + 6, y - 32) + '">' + label + '</div>' : '') +
        '<div class="abs ps-idx num"' + A('mask', t + .05, .6) + ' style="' + pos(x, y, 'font-size:' + size + 'px') + '">' + txt + '</div>';
    }
    function sig() { return '<div class="ps-sig"></div>'; }
    function cap(sfx) { // 每场景最多 7 个音效，相邻 ≥ .15s
      var out = [], last = -9; sfx.sort(function (a, b) { return a[0] - b[0]; });
      sfx.forEach(function (s) { if (s[0] - last >= .15) { out.push([+s[0].toFixed(2), s[1], s[2]]); last = s[0]; } });
      while (out.length > 7) {
        var k = -1; for (var i = out.length - 1; i > 0; i--) if (/card|check|deal/.test(out[i][1]) && out[i - 1][1] === out[i][1]) { k = i; break; }
        if (k < 0) k = out.length - 2; out.splice(k, 1);
      }
      return out;
    }

    return {
      /* 开场：上半是“图版区”（描边索引 00 + kick + 16:9 图版），一道通栏粗线切开，下半是巨字标题和副标题。
       * 没有图时粗线上移，标题更大，图版区只留索引和 kick。 */
      hero: function (d, sc) {
        var hasImg = !!d.img, ruleY = hasImg ? 584 : 452, tY = ruleY + 26;
        var sz = fit(d.title, 1740, hasImg ? (d.sub ? 176 : 200) : 210, 96);
        return {
          sfx: cap([[0, 'transition', .4], [.2, 'draw', .35], [.45, 'enter', .5], [1.05, 'reveal', .45], hasImg ? [1.5, 'slide', .35] : null, d.sub ? [1.85, 'mark', .3] : null].filter(Boolean)),
          build: function () {
            var h = sig() +
              '<div class="abs ps-idx num"' + A('mask', .15, .6) + ' style="' + pos(84, 128, 'font-size:' + (hasImg ? 220 : 280) + 'px') + '">00</div>' +
              (d.kick ? '<div class="abs"' + A('fade', .3) + ' style="' + pos(hasImg ? 92 : 470, hasImg ? 520 : 386) + '"><div class="kick">' + d.kick + '</div></div>' : '') +
              '<div class="abs ps-rule"' + A('bar', .2, .7) + ' style="' + box(90, ruleY, 1740, 6) + '"></div>' +
              '<div class="abs ttl"' + A('mask', .45, .7) + ' style="' + pos(84, tY, 'font-size:' + sz + 'px;white-space:nowrap') + '">' + hl(d.title, d.hl) + '</div>' +
              (d.sub ? '<div class="abs ps-sub"' + A('up', 1.2) + ' style="' + pos(92, tY + sz * 1.08 + 24, 'font-size:40px;max-width:1500px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis') + '">' + d.sub + '</div>' : '');
            if (hasImg) h += '<div class="ph ps-img ps-himg" style="' + box(732, 140, 760, 410) + '"><img src="__BASE__' + d.img + '" alt=""></div>' + corners(718, 126, 788, 438, 1.9);
            return h;
          },
          update: function (t, el) {
            wipe(sc, t, el); hlBlock(el, t, 1.0);
            var m = el.querySelector('.ps-himg');
            if (m) { m.style.clipPath = 'inset(0 ' + (1 - io((t - 1.5) / .6)) * 100 + '% 0 0)'; m.firstChild.style.transform = 'scale(' + (1.12 - .07 * ex((t - 1.5) / 4)) + ')'; }
          }
        };
      },

      /* 清单：上半是标题和右侧计数（格子随数字点亮；没有 aside 时换成描边条目数），下半是 n 栏通栏表格——墨线、巨号索引、名字、图版；
       * 只有 1–2 个条目时每栏改成“左字右图”，图版占满栏高。招牌：一根橙色扫描条从左到右扫过整行图版，扫到哪里图就显影到哪里。 */
      list: function (d, sc) {
        var items = (d.items || []).slice(0, 5), n = Math.max(1, items.length), gap = n > 3 ? 24 : 32, cw = (1740 - gap * (n - 1)) / n;
        var sz = fit(d.title, 1080, 128, 72), side = n <= 2;
        var maxLen = items.reduce(function (a, it) { return Math.max(a, len(it.name)); }, 1);
        var numSz = side ? 150 : Math.min(150, Math.floor(cw * .36));
        var nameW = side ? 300 : cw - 8, nameSz = Math.max(34, Math.min(n <= 3 ? 56 : n === 4 ? 48 : 40, Math.floor(nameW / maxLen)));
        var nameY = 456 + numSz * .86;
        var imgY = side ? 456 : Math.max(nameY + nameSz * 1.3 + 24, 656), imgH = 880 - imgY;
        var cells = d.aside ? Math.max(1, Math.min(30, Math.round(+d.aside.value) || 1)) : 0;
        var sfx = [[0, 'transition', .4], [.25, 'enter', .5], [.6, 'reveal', .4]];
        items.forEach(function (it, i) { sfx.push([.8 + i * .16, 'card', .42]); });
        sfx.push([2.0, 'scan', .45]);
        if (d.aside) sfx.push([2.25, 'count', .4]);
        return {
          sfx: cap(sfx),
          build: function () {
            var h = sig() +
              (d.kick ? '<div class="abs"' + A('fade', .15) + ' style="' + pos(90, 112) + '"><div class="kick">' + d.kick + '</div></div>' : '') +
              '<div class="abs ttl"' + A('mask', .3, .65) + ' style="' + pos(84, 152, 'font-size:' + sz + 'px;white-space:nowrap') + '">' + hl(d.title, d.hl) + '</div>' +
              '<div class="abs ps-vrule"' + A('wipeY', .5, .5) + ' style="' + box(1214, 112, 3, 272) + '"></div>';
            if (d.aside) {
              h += '<div class="abs ps-lab"' + A('fade', .6) + ' style="' + pos(1240, 112) + '">' + (d.aside.label || '') + '</div>' +
                '<div class="abs num ps-asidev"' + A('mask', 2.05, .5) + ' style="' + pos(1236, 152, 'font-size:150px;white-space:nowrap') + '">' + H.count(d.aside.value, 2.2, 1.0) + '<span class="ps-suf">' + (d.aside.suffix || '') + '</span></div>';
              for (var c = 0; c < cells; c++) h += '<i class="ps-cell" data-i="' + c + '" style="' + box(1240 + c * (248 / cells), 352, 248 / cells - 2, 24) + '"></i>';
            } else h += ghost(1236, 152, pad(n - 1), 200, '共 ' + n + ' 项', .6);
            items.forEach(function (it, i) {
              var x = 90 + i * (cw + gap), t = .75 + i * .12, tag = plainTag(it.tag, i);
              var ix = side ? x + 340 : x, iw = side ? cw - 340 : cw;
              h += '<div class="abs ps-rule"' + A('bar', t, .5) + ' style="' + box(x, 432, cw, 4) + '"></div>' +
                (tag ? '<div class="abs ps-tag"' + A('fade', t + .9) + ' style="' + pos(x, 448, 'width:' + cw + 'px;text-align:right') + '">' + tag + '</div>' : '') +
                '<div class="abs num ps-colnum"' + A('mask', t + .08, .55) + ' style="' + pos(x - 6, 448, 'font-size:' + numSz + 'px') + '">' + pad(i) + '</div>' +
                '<div class="abs ttl ps-name"' + A('up', t + .22, .5) + ' style="' + pos(x, nameY, 'font-size:' + nameSz + 'px;width:' + nameW + 'px') + '">' + (it.name || '') + '</div>' +
                (it.img ? '<div class="ph ps-img ps-li" data-x="' + ix + '" data-w="' + iw + '" style="' + box(ix, imgY + (side && tag ? 34 : 0), iw, imgH - (side && tag ? 34 : 0), 'clip-path:inset(0 100% 0 0)') + '"><img src="__BASE__' + it.img + '" alt=""></div>' : '');
            });
            h += '<div class="abs ps-scan" style="' + box(0, imgY - 18, 8, imgH + 36) + '"></div>';
            return h;
          },
          update: function (t, el) {
            wipe(sc, t, el); hlBlock(el, t, .6);
            // 扫描条 2.0 → 2.9 秒从 x90 扫到 x1830
            var p = io((t - 2.0) / .9), bx = 60 + p * 1800, scan = el.querySelector('.ps-scan');
            if (scan) { scan.style.transform = 'translateX(' + bx + 'px)'; scan.style.opacity = t > 1.95 && p < 1 ? 1 : 0; }
            var ims = el.querySelectorAll('.ps-li');
            for (var i = 0; i < ims.length; i++) {
              var x = +ims[i].dataset.x, w = +ims[i].dataset.w, r = clamp((bx - x) / w);
              ims[i].style.clipPath = 'inset(0 ' + (1 - r) * 100 + '% 0 0)';
              var im = ims[i].firstChild; if (im) im.style.transform = 'scale(' + (1.12 - .07 * ex((t - 2) / 4)) + ')';
            }
            // 计数格：跟着数字一格一格点亮
            var cs = el.querySelectorAll('.ps-cell'), lit = Math.round(cs.length * BrollCore.EASE.cubic(clamp((t - 2.2) / 1.0)));
            for (var j = 0; j < cs.length; j++) cs[j].classList.toggle('on', j < lit);
          }
        };
      },

      /* 聚焦：左边大图版（先被一块橙色信号板盖住，再揭开），右栏是瑞士式“说明表”：区间标尺 + 编号检查行（贴底对齐）；
       * 没有区间时右栏上方用描边巨号写检查项数；右栏什么都没有时图版加宽。结论用橙色实心块压在图版右下角。 */
      focus: function (d, sc) {
        var checks = (d.checks || []).slice(0, 4), R = d.range, nC = checks.length, sz = fit(d.title, 1390, 112, 72);
        var empty = !nC && !R, iw = empty ? 1390 : 1040;
        var rowH = nC > 3 ? 66 : nC > 2 ? 76 : 96, rowY = R ? 600 : 880 - nC * rowH, rtSz = nC > 2 ? 40 : 48;
        var sfx = [[0, 'transition', .4], [.3, 'enter', .45], [.75, 'slide', .4]];
        if (R) sfx.push([1.15, 'draw', .35]);
        checks.forEach(function (c, i) { sfx.push([1.6 + i * .42 + .25, 'check', .45]); });
        if (d.stamp) sfx.push([3.4, 'stamp', .6]);
        return {
          sfx: cap(sfx),
          build: function () {
            var lab = R ? '片段 ' + R.from + '–' + R.to + ' 秒' : '回放';
            var h = sig() +
              (d.kick ? '<div class="abs"' + A('fade', .1) + ' style="' + pos(90, 104) + '"><div class="kick">' + d.kick + '</div></div>' : '') +
              '<div class="abs ttl"' + A('mask', .25, .6) + ' style="' + pos(84, 146, 'font-size:' + sz + 'px;white-space:nowrap') + '">' + hl(d.title, d.hl) + '</div>' +
              '<div class="ph ps-fimg" style="' + box(90, 300, iw, 585, 'opacity:0') + '">' + BrollCore.media(d, H) + '<i class="ps-scanh"></i>' +
              '<span class="ps-rec"><i></i>' + lab + '</span></div>' +
              '<div class="abs ps-panel" style="' + box(90, 300, iw, 585) + '"></div>' + corners(76, 286, iw + 28, 613, 1.1) +
              '<div class="abs ps-vrule"' + A('wipeY', .5, .6) + ' style="' + box(90 + iw + 50, 430, 3, 450) + '"></div>';
            if (R) {
              var L = 620 * R.from / R.total, W = 620 * (R.to - R.from) / R.total, ticks = '';
              for (var k = 0; k <= 10; k++) ticks += '<i style="left:' + (k * 62) + 'px;height:' + (k % 5 ? 10 : 20) + 'px"></i>';
              h += '<div class="abs ps-lab"' + A('fade', .9) + ' style="' + pos(1210, 430) + '">区间 · 共 ' + R.total + ' 秒</div>' +
                '<div class="abs num"' + A('mask', 1.0, .5) + ' style="' + pos(1206, 462, 'font-size:64px;white-space:nowrap') + '">' + R.from + '<span class="ps-arrow"><svg viewBox="0 0 40 20" width="40" height="20"><path d="M2 10H34M26 3l8 7-8 7" fill="none" stroke="currentColor" stroke-width="3"/></svg></span>' + R.to + '</div>' +
                '<div class="abs ps-ruler"' + A('fade', 1.1) + ' style="' + box(1210, 548, 620, 20) + '">' + ticks + '</div>' +
                '<div class="abs ps-range"' + A('bar', 1.15, .5) + ' style="' + box(1210 + L, 548, W, 20) + '"></div>';
            } else if (nC) h += ghost(1206, 470, pad(nC - 1), nC > 2 ? 170 : 220, '检查项 · 共 ' + nC + ' 项', .9);
            checks.forEach(function (c, i) {
              var t = 1.6 + i * .42, y = rowY + i * rowH;
              h += '<div class="abs ps-rule thin"' + A('bar', t - .05, .4) + ' style="' + box(1210, y, 620, 2) + '"></div>' +
                '<div class="abs ps-row"' + A('up', t, .45) + ' style="' + box(1210, y + 2, 620, rowH - 2) + '"><span class="ps-ri">' + String.fromCharCode(65 + i) + '</span><span class="ps-rt" style="font-size:' + Math.min(rtSz, Math.floor(500 / len(c))) + 'px">' + c + '</span>' +
                '<i class="ps-ck" data-t="' + (t + .25) + '"><svg viewBox="0 0 30 30"><path d="M7 15.5l5 5 11-11" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="square"/></svg></i></div>';
            });
            if (nC) h += '<div class="abs ps-rule"' + A('bar', 1.55 + nC * .42, .4) + ' style="' + box(1210, rowY + nC * rowH, 620, 4) + '"></div>';
            if (d.stamp) h += '<div class="abs ps-stamp"' + A('wipe', 3.4, .3) + ' style="' + pos(90 + iw, 885, 'transform:translate(-100%,-100%)') + '">' + d.stamp.text + (d.stamp.sub ? '<small>' + d.stamp.sub + '</small>' : '') + '</div>';
            return h;
          },
          update: function (t, el) {
            wipe(sc, t, el); hlBlock(el, t, .8);
            var pn = el.querySelector('.ps-panel'), im = el.querySelector('.ps-fimg');
            // 信号板：.3–.7 从左盖上，.75–1.15 向右揭开
            if (t < .75) pn.style.clipPath = 'inset(0 ' + (1 - io((t - .3) / .4)) * 100 + '% 0 0)';
            else pn.style.clipPath = 'inset(0 0 0 ' + io((t - .75) / .4) * 100 + '%)';
            im.style.opacity = t >= .74 ? 1 : 0;
            var m = im.querySelector('img,.clip'); if (m) m.style.transform = 'scale(' + (1.1 - .07 * ex((t - .75) / 4)) + ')';
            var sh = im.querySelector('.ps-scanh'); if (sh) { var q = ((t - 1.2) / 2.6) % 1; sh.style.opacity = t > 1.2 ? .9 : 0; sh.style.transform = 'translateY(' + (q * 585) + 'px)'; }
            var ck = el.querySelectorAll('.ps-ck'); for (var i = 0; i < ck.length; i++) ck[i].style.transform = 'scale(' + ex((t - +ck[i].dataset.t) / .25) + ')';
          }
        };
      },

      /* 数字：一个顶天的 Geist 数字占满左半屏（% 是唯一的橙；中文单位用墨色小字），下面一条 100 格刻度尺：
       * 百分比按 0–100，其他数值按“好读的满格值”（1240 → 满格 2,000）逐格点亮，尺子末端光标持续闪烁。
       * 右栏：图版 + 注记 + logo；右栏没有内容时，数字和刻度尺放宽到整屏。 */
      metric: function (d, sc) {
        var v = +d.value || 0, suf = d.suffix || '', isPct = suf.indexOf('%') >= 0;
        var max = isPct ? 100 : niceMax(v), frac = clamp(v / max), wide = !d.img && !d.logo && !d.note;
        var str = fmt(v), commas = (str.match(/,/g) || []).length, digitsN = str.length - commas;
        var em = digitsN * .6 + commas * .3 + (suf ? (isPct ? .42 : .34 * len(suf)) + .06 : 0);
        var nsz = Math.min(560, Math.floor((wide ? 1400 : 1040) / em)), RW = wide ? 1400 : 1000, cell = RW / 100;
        var rY = Math.round(150 + nsz * .84 + 36), capY = rY + 96;
        var sfx = [[0, 'transition', .4], [.35, 'enter', .45], [.55, 'count', .45], [1.75, 'hit', .5], [2.2, 'reveal', .4]];
        if (d.img) sfx.push([1.0, 'slide', .35]);
        if (d.note) sfx.push([2.8, 'mark', .4]);
        return {
          sfx: cap(sfx),
          build: function () {
            var h = sig() +
              (d.kick ? '<div class="abs"' + A('fade', .15) + ' style="' + pos(90, 104) + '"><div class="kick">' + d.kick + '</div></div>' : '') +
              '<div class="abs num ps-big"' + A('mask', .35, .8) + ' style="' + pos(62, 150, 'font-size:' + nsz + 'px') + '">' + H.count(v, .45, 1.3) + '<span class="' + (isPct ? 'ps-pct' : 'ps-unit') + '">' + suf + '</span></div>' +
              '<div class="abs ps-tickbg"' + A('fade', .5) + ' style="' + box(90, rY, RW, 26, 'background-size:' + cell + 'px 100%') + '"></div>' +
              '<div class="abs ps-tickon" style="' + box(90, rY, RW, 26, 'background-size:' + cell + 'px 100%;clip-path:inset(0 100% 0 0)') + '"></div><i class="abs ps-cur" style="' + box(90, rY - 8, 6, 42) + '"></i>' +
              '<div class="abs ps-lab"' + A('fade', .6) + ' style="' + pos(90, rY + 38) + '">0</div><div class="abs ps-lab"' + A('fade', .6) + ' style="' + pos(90 + RW, rY + 38, 'transform:translateX(-100%)') + '">' + (isPct ? '100%' : '满格 ' + fmt(max) + ' ' + suf) + '</div>' +
              (d.caption ? '<div class="abs ttl"' + A('mask', 1.9, .6) + ' style="' + pos(88, capY, 'font-size:' + fit(d.caption, wide ? 1400 : 1040, 80, 64) + 'px;white-space:nowrap') + '">' + hl(d.caption, d.hl) + '</div>' : '');
            if (!wide) h += '<div class="abs ps-vrule"' + A('wipeY', .6, .6) + ' style="' + box(1150, 130, 3, 750) + '"></div>';
            if (d.logo) h += '<div class="abs ps-lab"' + A('fade', 1.4) + ' style="' + pos(1190, d.img ? 300 : 430) + '">制作工具</div><div class="abs"' + A('fade', 1.5) + ' style="' + box(1190, d.img ? 330 : 460, 200, 50) + '"><img class="logo-ink" src="__BASE__' + d.logo + '" alt="" style="width:100%;height:100%;object-fit:contain;object-position:left"></div>';
            if (d.img) h += '<div class="ph ps-img ps-mimg" style="' + box(1190, 430, 640, 360) + '"><img src="__BASE__' + d.img + '" alt=""></div>' + corners(1176, 416, 668, 388, 1.6);
            if (d.note) h += '<div class="abs ps-note"' + A('up', 2.8, .5) + ' style="' + pos(1190, d.img ? 818 : 600) + '"><b></b>' + d.note + '</div>';
            return h;
          },
          update: function (t, el) {
            wipe(sc, t, el); hlBlock(el, t, 2.3);
            var p = BrollCore.EASE.cubic(clamp((t - .45) / 1.3)), cells = Math.round(100 * frac * p);
            el.querySelector('.ps-tickon').style.clipPath = 'inset(0 ' + (100 - cells) + '% 0 0)';
            var cur = el.querySelector('.ps-cur'); cur.style.transform = 'translateX(' + (cells * cell) + 'px)';
            cur.style.opacity = t < .45 ? 0 : t < 1.75 ? 1 : (Math.floor((t - 1.75) * 2.5) % 2 ? .15 : 1);
            var m = el.querySelector('.ps-mimg'); if (m) { m.style.clipPath = 'inset(0 ' + (1 - io((t - 1.0) / .6)) * 100 + '% 0 0)'; m.firstChild.style.transform = 'scale(' + (1.1 - .07 * ex((t - 1) / 4)) + ')'; }
          }
        };
      }
    };
  });
})();
