/* 包豪斯几何（Bauhaus Grid）— prompt-motion #227 Type, form, space showreel
 * 版式语言：设计学院作品集的取景器 —— 米白纸 + 150px 细网格 + 四角十字 + 底部刻度尺 / 当前缓动曲线标注；
 * 内容被切进格子，蓝黄红黑的半圆、四分圆、三角、方块填满其余格子并按 90° 节拍翻转；聚焦页是一张履历卡（CV），数字页是整屏橙红 + 立体衬线斜体大字。 */
BrollCore.template('bauhaus-grid', function (H) {
  var A = H.A, box = H.box, pos = H.pos;
  function cl(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function eo(x) { x = cl(x); return 1 - Math.pow(1 - x, 4); }
  function eio(x) { x = cl(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function bk(x, c) { x = cl(x); c = c || 2.2; var c3 = c + 1; return 1 + c3 * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
  function R(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function q(el, s) { return el.querySelector(s); }
  function qa(el, s) { return el.querySelectorAll(s); }
  function fit(text, max, w) { var n = (text || '').length || 1; return Math.max(34, Math.min(max, Math.floor(w / n))); }
  function fin(sfx) {
    sfx.sort(function (a, b) { return a[0] - b[0]; });
    while (sfx.length > 7) { var m = 1; for (var i = 2; i < sfx.length; i++) if (sfx[i][2] < sfx[m][2]) m = i; sfx.splice(m, 1); }
    for (var k = 1; k < sfx.length; k++) if (sfx[k][0] - sfx[k - 1][0] < .15) sfx[k][0] = +(sfx[k - 1][0] + .15).toFixed(2);
    return sfx;
  }
  var COL = ['var(--bh-blue)', 'var(--bh-yellow)', 'var(--bh-red)', 'var(--bh-black)'];
  var KIND = ['circle', 'half', 'quarter', 'tri', 'square', 'dot', 'half', 'quarter'];
  function shapeStyle(kind, color) {
    var s = 'background:' + color + ';';
    if (kind === 'circle') return s + 'border-radius:50%';
    if (kind === 'half') return s + 'border-radius:50%;clip-path:inset(0 0 50% 0)';
    if (kind === 'quarter') return s + 'border-radius:100% 0 0 0';
    if (kind === 'tri') return s + 'clip-path:polygon(0 0,100% 0,0 100%)';
    if (kind === 'dot') return s + 'border-radius:50%;transform:scale(.5)';
    return s + 'clip-path:inset(14%)';
  }
  // 一个格子：外层负责入场缩放 + 90° 翻转，内层是形状
  function cell(x, y, s, seed, t0) {
    var k = KIND[Math.floor(R(seed) * KIND.length)], c = COL[Math.floor(R(seed + 7) * 4)], r0 = Math.floor(R(seed + 3) * 4) * 90;
    return '<div class="abs bh-cell" data-s="' + seed + '" data-t="' + t0 + '" data-r="' + r0 + '" style="' + box(x + 12, y + 12, s - 24, s - 24) + '"><i style="' + shapeStyle(k, c) + '"></i></div>';
  }
  function cellUpd(el, t, beat) {
    qa(el, '.bh-cell').forEach(function (c) {
      var s = +c.dataset.s, t0 = +c.dataset.t, r0 = +c.dataset.r, p = (t - t0) / .5;
      var ph = t - t0 - .9 - R(s + 1) * .6, k = ph > 0 ? Math.floor(ph / beat) : 0, f = ph > 0 ? eio(((ph % beat) / beat - .55) / .45) : 0;
      var dir = R(s + 9) > .5 ? 1 : -1, ang = r0 + dir * 90 * (k + (R(s + k * 3) > .45 ? f : 0));
      c.style.opacity = p > 0 ? 1 : 0;
      c.style.transform = 'scale(' + (p < 1 ? bk(p) : 1).toFixed(3) + ') rotate(' + (ang + (p < 1 ? (1 - eo(p)) * -90 : 0)).toFixed(1) + 'deg)';
    });
  }
  // 取景框：四角十字、左上标签、左下场次、右下缓动、底部刻度尺 + 播放头
  function frame(idx, name, ease, tone) {
    var ticks = '';
    for (var x = 60; x <= 1860; x += 30) ticks += '<line x1="' + x + '" y1="' + (x % 150 === 60 ? 1036 : 1044) + '" x2="' + x + '" y2="1052"/>';
    function cross(x, y) { return '<line x1="' + (x - 16) + '" y1="' + y + '" x2="' + (x + 16) + '" y2="' + y + '"/><line x1="' + x + '" y1="' + (y - 16) + '" x2="' + x + '" y2="' + (y + 16) + '"/>'; }
    return '<div class="bh-frame ' + (tone || '') + '"><svg class="ov" viewBox="0 0 1920 1080">' + cross(48, 48) + cross(1872, 48) + cross(48, 1000) + cross(1872, 1000) +
      '<g class="bh-ticks">' + ticks + '</g><line class="bh-head" x1="60" y1="1030" x2="60" y2="1056"/></svg>' +
      '<span class="bh-lab" style="left:80px;top:38px">OIIOII / B-ROLL REEL ’26</span>' +
      '<span class="bh-lab" style="left:80px;top:990px">' + idx + ' — ' + name + '</span>' +
      '<span class="bh-lab" style="right:80px;top:990px">EASE ' + ease + '</span></div>';
  }
  function frameUpd(el, t) { var h = q(el, '.bh-head'); if (h) h.setAttribute('transform', 'translate(' + (cl(t / 4) * 1800).toFixed(1) + ',0)'); }
  function grid(x0, y0, cols, rows, s, t0) {
    var g = '<svg class="ov bh-grid">';
    for (var c = 0; c <= cols; c++) g += '<line x1="' + (x0 + c * s) + '" y1="' + y0 + '" x2="' + (x0 + c * s) + '" y2="' + (y0 + rows * s) + '"' + A('draw', t0 + c * .02, .5) + '/>';
    for (var r = 0; r <= rows; r++) g += '<line x1="' + x0 + '" y1="' + (y0 + r * s) + '" x2="' + (x0 + cols * s) + '" y2="' + (y0 + r * s) + '"' + A('draw', t0 + r * .03, .6) + '/>';
    return g + '</svg>';
  }

  return {
    /* hero：左边粗黑大标题（hl 红），右边 5×4 的几何格阵按对角线波浪弹进、随后按节拍 90° 翻转 */
    hero: function (d) {
      var sfx = [[.1, 'enter', .45], [.3, 'draw', .35], [.7, 'hit', .5], [1.3, 'reveal', .4]];
      if (d.img) sfx.push([1.0, 'shot', .35]);
      if (d.sub) sfx.push([1.8, 'type', .3]);
      // 标题排法：一行放得下就一行；否则在 hl 前断行（不在词中间断开）；都不行就按两行估字号
      var title = d.title || '', hl = d.hl && title.indexOf(d.hl) >= 0 ? d.hl : '', W = 860, ttl, fs;
      if (W / (title.length + .3) >= 120) { fs = Math.min(140, Math.floor(W / (title.length + .3))); ttl = BrollCore.hlify(title, hl); }
      else if (hl && title.indexOf(hl) > 0) {
        var a = title.slice(0, title.indexOf(hl)), b = title.slice(title.indexOf(hl));
        fs = Math.max(64, Math.min(140, Math.floor(W / (Math.max(a.length, b.length) + .3))));
        ttl = a + '<br>' + BrollCore.hlify(b, hl);
      } else { fs = Math.max(64, Math.min(130, Math.floor(W * 2 / (title.length + .3)))); ttl = BrollCore.hlify(title, hl); }
      return {
        sfx: fin(sfx),
        build: function () {
          var h = '<div class="abs bh-paper"></div>' + grid(1050, 220, 5, 4, 150, .2);
          // 有图：图被裁成半圆拱，占 2×2 格（列 1–2、行 1–2），其余格子照常填几何
          for (var r = 0; r < 4; r++) for (var c = 0; c < 5; c++) if (!(d.img && c >= 1 && c <= 2 && r >= 1 && r <= 2)) h += cell(1050 + c * 150, 220 + r * 150, 150, r * 5 + c + 11, .35 + (r + c) * .06);
          if (d.img) h += '<div class="abs bh-shot"' + A('spin', .95, .6) + ' style="' + box(1200, 370, 300, 300, 'border-radius:150px 150px 0 0') + '"><img src="__BASE__' + d.img + '" alt=""></div>';
          h += '<div class="abs bh-hcol" style="' + box(120, 140, 900, 800) + '">' +
            (d.kick ? '<div class="bh-kick"' + A('fade', .2) + '>' + d.kick + '</div>' : '') +
            '<div class="bh-ttl"' + A('slam', .7, .5) + ' style="font-size:' + fs + 'px">' + ttl + '<i class="bh-dot"></i></div>' +
            (d.sub ? '<div class="bh-serif"' + A('up', 1.8) + ' style="font-size:44px;max-width:860px;margin-top:12px">' + d.sub + '</div>' : '') + '</div>';
          return h + frame('00', 'OPEN', 'power4.out');
        },
        update: function (t, el) { cellUpd(el, t, .9); frameUpd(el, t); }
      };
    },

    /* list：整屏 12×4 细网格，条目各占一个 2×2 大格（图被裁成圆 / 拱 / 四分圆 / 方），名字落在下面一格；其余格子填满几何并按节拍翻转；右下黑色大格写 aside */
    list: function (d) {
      var items = d.items || [], n = items.length || 1, S = 150, X0 = 90, Y0 = 240;
      var cols = items.map(function (it, i) { return Math.round(i * 10 / n + (10 / n - 2) / 2); });
      var ti = function (i) { return .6 + i * (1.5 / n); };
      // 错落节奏：奇数条目整体上移一格（图占第 0–1 行、名字第 2 行）；右上会碰到头像圆的不上移
      var row = items.map(function (it, i) { return i % 2 && X0 + (cols[i] + 2) * S <= 1520 ? 0 : 1; });
      function pad(i) { return (i < 9 ? '0' : '') + (i + 1); }
      var sfx = [[0, 'transition', .45], [.15, 'draw', .35]];
      items.forEach(function (it, i) { sfx.push([ti(i), 'hit', i ? .42 : .5]); });
      if (d.aside) sfx.push([2.6, 'count', .4]);
      var CLIP = ['border-radius:50%', 'border-radius:150px 150px 0 0', 'border-radius:300px 0 0 0', 'border-radius:0', 'border-radius:0 0 150px 150px'];
      return {
        sfx: fin(sfx),
        build: function () {
          var h = '<div class="abs bh-paper"></div><div class="abs bh-ring" style="' + box(1100, 80, 700, 700) + '"></div>' + grid(X0, Y0, 12, 4, S, .05);
          var used = {};
          items.forEach(function (it, i) { var c = cols[i], r0 = row[i]; for (var rr = r0; rr <= r0 + 2; rr++) used[c + ',' + rr] = used[(c + 1) + ',' + rr] = 1; });
          if (d.aside) used['10,2'] = used['11,2'] = used['10,3'] = used['11,3'] = 1;
          for (var r = 0; r < 4; r++) for (var c = 0; c < 12; c++) if (!used[c + ',' + r]) h += cell(X0 + c * S, Y0 + r * S, S, r * 12 + c + 3, .25 + (r + c) * .04);
          h += '<div class="abs bh-ttl"' + A('slam', .25, .45) + ' style="' + pos(X0, 108, 'font-size:' + fit(d.title, 78, 1300) + 'px;white-space:nowrap') + '">' + BrollCore.hlify(d.title || '', d.hl) + '<i class="bh-dot"></i></div>' +
            (d.kick ? '<div class="abs bh-kick"' + A('fade', .35) + ' style="' + pos(X0 + 4, 76) + '">' + d.kick + '</div>' : '');
          items.forEach(function (it, i) {
            var x = X0 + cols[i] * S;
            var y = Y0 + row[i] * S, tg = it.tag && it.tag !== pad(i) && it.tag !== String(i + 1) ? ' · ' + it.tag : '';
            h += '<div class="abs bh-shot"' + A('spin', ti(i), .55) + ' style="' + box(x, y, 2 * S, 2 * S, CLIP[i % CLIP.length]) + '"><img src="__BASE__' + it.img + '" alt=""></div>' +
              '<div class="abs bh-name"' + A('up', ti(i) + .2, .45) + ' style="' + box(x, y + 2 * S, 2 * S, S) + '"><span class="bh-no">' + pad(i) + tg + '</span><b style="font-size:' + fit(it.name, 46, 258) + 'px">' + it.name + '</b></div>';
          });
          if (d.aside) h += '<div class="abs bh-aside"' + A('wipeY', 2.5, .4) + ' style="' + box(X0 + 10 * S, Y0 + 2 * S, 2 * S, 2 * S) + '"><span class="bh-no" style="color:var(--bh-cream)">' + d.aside.label + '</span><b>' + H.count(d.aside.value, 2.6, .7) + '<small>' + (d.aside.suffix || '') + '</small></b></div>';
          return h + frame('01', 'LIST', 'sine.inOut');
        },
        update: function (t, el) {
          cellUpd(el, t, .8); frameUpd(el, t);
          var r = q(el, '.bh-ring'); r.style.transform = 'translate(' + (Math.sin(t * .6) * 60).toFixed(1) + 'px,' + (Math.cos(t * .5) * 30).toFixed(1) + 'px)';
        }
      };
    },

    /* focus：炭黑底上一张米白履历卡（CV）—— 页眉等宽小字 + 细线，左边画面 + 时间刻度 + 衬线大标题带红点，右边编号清单逐行划线落字、行尾一个几何图标；红色圆章带旋转环形字 */
    focus: function (d) {
      var checks = d.checks || [], sfx = [[0, 'transition', .45], [.2, 'slide', .4], [.75, 'shot', .35]];
      checks.forEach(function (c, i) { sfx.push([1.3 + i * .35, 'key', .4]); });
      sfx.push([1.05, 'reveal', .4]);
      if (d.stamp) sfx.push([3.1, 'stamp', .55]);
      var ICON = [['circle', 'var(--bh-blue)'], ['half', 'var(--bh-red)'], ['tri', 'var(--bh-yellow)'], ['quarter', 'var(--bh-black)']];
      return {
        sfx: fin(sfx),
        build: function () {
          var h = '<div class="abs" style="' + box(0, 0, 1920, 1080, 'background:var(--bh-char)') + '"></div>' +
            '<div class="abs bh-cv" style="' + box(90, 96, 1740, 790) + '">' +
              '<span class="bh-mono" style="left:60px;top:34px">履历 · ' + (d.kick || '') + '</span>' +
              '<div class="bh-rule"' + A('bar', .5, .6) + ' style="' + box(60, 72, 1620, 2) + '"></div>' +
              '<div class="bh-shot2"' + A('wipe', .7, .6) + ' style="' + box(60, 104, 860, 450) + '">' + BrollCore.media(d, H) + '</div>';
          if (d.range) {
            var L = 860 * d.range.from / d.range.total, W = 860 * (d.range.to - d.range.from) / d.range.total, tk = '';
            for (var i = 0; i <= 50; i++) tk += '<i style="left:' + (i * 860 / 50).toFixed(1) + 'px;height:' + (i % 10 ? 8 : 16) + 'px"></i>';
            h += '<div class="bh-ruler" style="' + box(60, 570, 860, 18) + '">' + tk + '</div>' +
              '<div' + A('bar', 1.0, .6) + ' style="' + box(60 + L, 590, W, 8, 'position:absolute;background:var(--bh-red)') + '"></div>' +
              '<span class="bh-mono" style="left:60px;top:604px">' + d.range.from + 's</span><span class="bh-mono" style="left:' + (60 + L) + 'px;top:604px;color:var(--bh-red)">→ ' + d.range.to + 's / ' + d.range.total + 's</span>';
          }
          h += '<div class="abs bh-cvt"' + A('focus', 1.05, .6) + ' style="' + pos(56, 632, 'font-size:' + fit(d.title, 82, 860) + 'px;white-space:nowrap') + '">' + (d.title || '').replace(d.hl, '<span style="color:var(--bh-red)">' + d.hl + '</span>') + '<i class="bh-dot"></i></div>';
          // 右栏：清单贴底（底线 736），上面剩下的高度用几何格阵补满（按节拍翻转，和片头 / 列表同一套形状）；右上角落在头像圆下只放几何
          var nC = checks.length, RH = nC <= 2 ? 112 : 96, st = 736 - nC * RH, top = nC ? st - 56 : 736;
          var GH = top - 104, gr = Math.max(1, Math.round(GH / 170)), gs = Math.min(170, Math.floor(GH / gr)), gc = Math.floor(680 / gs);
          h += grid(1000, 104, gc, gr, gs, .5);
          for (var gy = 0; gy < gr; gy++) for (var gx = 0; gx < gc; gx++) h += cell(1000 + gx * gs, 104 + gy * gs, gs, gy * 7 + gx + 41, .6 + (gx + gy) * .07);
          if (nC) h += '<span class="bh-mono" style="left:1000px;top:' + (st - 40) + 'px">检查项 · ' + nC + '</span><div class="bh-rule"' + A('bar', .9, .5) + ' style="' + box(1000, st - 10, 680, 2) + '"></div>';
          checks.forEach(function (c, i) {
            var t = 1.3 + i * .35, y = st + i * RH, ic = ICON[i % 4], fz = fit(c, nC <= 2 ? 64 : 52, 520);
            h += '<span class="bh-mono"' + A('fade', t) + ' style="left:1000px;top:' + (y + RH / 2 - 10) + 'px">' + (i < 9 ? '0' : '') + (i + 1) + '</span>' +
              '<div class="abs bh-row"' + A('up', t, .45) + ' style="' + pos(1060, y + (RH - fz * 1.2) / 2, 'font-size:' + fz + 'px') + '">' + c + '</div>' +
              '<i class="abs"' + A('spin', t + .15, .5) + ' style="' + box(1624, y + RH / 2 - 22, 44, 44, shapeStyle(ic[0], ic[1])) + '"></i>' +
              '<div class="bh-rule thin"' + A('bar', t + .05, .5) + ' style="' + box(1000, y + RH - 2, 680, 1) + '"></div>';
          });
          h += '<span class="bh-mono" style="left:1610px;top:762px">01 / 01</span>' +
            '<div class="bh-rule thin" style="' + box(60, 748, 1620, 1) + '"></div></div>';
          if (d.stamp) {
            var sub = ((d.stamp.sub || d.stamp.text) + ' · ').repeat(6);
            h += '<div class="abs bh-seal" style="' + box(880, 90, 240, 240) + '"><svg viewBox="-120 -120 240 240" class="bh-sealring"><defs><path id="bhsr" d="M0,-100A100,100 0 1,1 -0.1,-100"/></defs><text><textPath href="#bhsr">' + sub + '</textPath></text></svg><b>' + d.stamp.text + '</b></div>';
          }
          return h + frame('02', 'FOCUS', 'back.out(1.7)', 'dark');
        },
        update: function (t, el) {
          frameUpd(el, t); cellUpd(el, t, 1.0);
          var cv = q(el, '.bh-cv'), p = (t - .1) / .6;
          cv.style.transform = 'translateY(' + ((1 - eo(p)) * 320).toFixed(1) + 'px) rotate(' + ((1 - eo(p)) * -3).toFixed(2) + 'deg)';
          cv.style.opacity = p > 0 ? 1 : 0;
          var s = q(el, '.bh-seal');
          if (s) { var ps = (t - 3.05) / .45; s.style.opacity = ps > 0 ? 1 : 0; s.style.transform = 'scale(' + (ps < 1 ? .2 + .8 * bk(ps) : 1) + ')'; q(s, '.bh-sealring').style.transform = 'rotate(' + (t * 40) + 'deg)'; }
        }
      };
    },

    /* metric：整屏橙红；背景是描边空心字跑马灯；中间立体衬线斜体巨数（挤出厚度逐渐长出来）；左下等宽参数表 + logo，右边旋转环形字章写 note，左上一张小图 */
    metric: function (d) {
      var sfx = [[0, 'transition', .45], [.3, 'hit', .55], [.45, 'count', .4], [1.5, 'reveal', .4]];
      if (d.note) sfx.push([2.3, 'mark', .4]);
      if (d.img) sfx.push([1.9, 'card', .35]);
      return {
        sfx: fin(sfx),
        build: function () {
          var mq = ((d.kick || d.caption || '') + ' · ').repeat(8), v = String(d.value) + (d.suffix || ''), ns = v.length > 4 ? 340 : 440;
          var h = '<div class="abs" style="' + box(0, 0, 1920, 1080, 'background:var(--bh-orange)') + '"></div>' +
            '<div class="abs bh-mq" data-k="0" style="' + pos(0, 20) + '">' + mq + '</div>' +
            '<div class="abs bh-mq" data-k="1" style="' + pos(0, 420) + '">' + mq + '</div>' +
            '<div class="abs bh-mq" data-k="2" style="' + pos(0, 820) + '">' + mq + '</div>' +
            '<div class="abs bh-big" style="' + pos(0, 330 - ns * .55, 'width:1920px;text-align:center;font-size:' + ns + 'px') + '"><span' + A('slam', .25, .5) + ' style="display:inline-block;transform-origin:center">' + H.count(d.value, .4, 1.0) + '<span style="font-size:.5em">' + (d.suffix || '') + '</span></span></div>' +
            '<div class="abs bh-cap"' + A('up', 1.5) + ' style="' + pos(260, 690, 'width:1400px;text-align:center;font-size:' + fit(d.caption, 68, 1300) + 'px') + '">' + (d.caption || '').replace(d.hl, '<span class="bh-capmark">' + d.hl + '</span>') + '</div>' +
            (d.kick ? '<div class="abs bh-mk"' + A('fade', 1.25, .5) + ' style="' + pos(0, 598, 'width:1920px') + '"><i></i>' + d.kick + '<i></i></div>' : '') +
            (d.logo ? '<img class="abs"' + A('fade', 1.9) + ' src="__BASE__' + d.logo + '" alt="" style="' + pos(100, 820, 'height:40px;filter:brightness(0) invert(.95)') + '">' : '') +
            (d.img ? '<div class="abs bh-pic"' + A('pop', 1.9, .5) + ' style="' + box(100, 110, 380, 214, '--r:-4deg') + '"><img src="__BASE__' + d.img + '" alt=""></div>' : '');
          if (d.note) {
            var nt = (d.note + ' · ').repeat(Math.max(2, Math.ceil(28 / (d.note.length + 3))));
            h += '<div class="abs bh-seal dark" style="' + box(1520, 560, 280, 280) + '"><svg viewBox="-140 -140 280 280" class="bh-sealring"><defs><path id="bhnr" d="M0,-112A112,112 0 1,1 -0.1,-112"/></defs><text style="font-size:26px">' + '<textPath href="#bhnr">' + nt + '</textPath></text></svg><i style="' + shapeStyle('half', 'var(--bh-yellow)') + ';position:absolute;left:90px;top:90px;width:100px;height:100px"></i></div>';
          }
          return h + frame('03', 'METRIC', 'expo.out', 'light');
        },
        update: function (t, el) {
          frameUpd(el, t);
          qa(el, '.bh-mq').forEach(function (m) { var k = +m.dataset.k; m.style.transform = 'translateX(' + ((k % 2 ? -1 : 1) * 60 * t - (k % 2 ? 0 : 900)).toFixed(1) + 'px)'; });
          var b = q(el, '.bh-big'), dep = Math.round(16 * eo((t - .6) / .9)), sh = [];
          for (var i = 1; i <= dep; i++) sh.push(i + 'px ' + i + 'px 0 var(--bh-deep)');
          sh.push((dep + 6) + 'px ' + (dep + 12) + 'px 30px rgba(60,10,0,.35)');
          b.style.textShadow = sh.join(',');
          var s = q(el, '.bh-seal');
          if (s) { var ps = (t - 2.25) / .5; s.style.opacity = ps > 0 ? 1 : 0; s.style.transform = 'scale(' + (ps < 1 ? .2 + .8 * bk(ps) : 1) + ')'; q(s, '.bh-sealring').style.transform = 'rotate(' + (-t * 30) + 'deg)'; }
        }
      };
    }
  };
});
