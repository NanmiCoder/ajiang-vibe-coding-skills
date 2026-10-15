/* 彩卡拼贴（Color Cards）— prompt-motion #190 Claude self-promo spot
 * 版式语言：一张张满屏饱和色卡（蓝 / 黄 / 绿 / 橙 / 粉）像翻牌一样推进，每张卡上一个“作品物件”（窗口 / 纸张）配一句粗体短语，
 * 圆点和圆角方块漂在边上；最后所有色卡缩成深色桌面上的倾斜拼贴，中间一张米白主卡。粗黑体 + 斜体衬线 + 等宽小字。 */
BrollCore.template('color-cards', function (H) {
  var A = H.A, box = H.box, pos = H.pos;
  function cl(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function eo(x) { x = cl(x); return 1 - Math.pow(1 - x, 3); }
  function eio(x) { x = cl(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function bk(x, c) { x = cl(x); c = c || 1.7; var c3 = c + 1; return 1 + c3 * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
  function q(el, s) { return el.querySelector(s); }
  function qa(el, s) { return el.querySelectorAll(s); }
  function fit(text, max, w) { var n = (text || '').length || 1; return Math.max(34, Math.min(max, Math.floor(w / n))); }
  function fin(sfx) {
    sfx.sort(function (a, b) { return a[0] - b[0]; });
    while (sfx.length > 7) { var m = 1; for (var i = 2; i < sfx.length; i++) if (sfx[i][2] < sfx[m][2]) m = i; sfx.splice(m, 1); }
    for (var k = 1; k < sfx.length; k++) if (sfx[k][0] - sfx[k - 1][0] < .15) sfx[k][0] = +(sfx[k - 1][0] + .15).toFixed(2);
    return sfx;
  }
  // 色卡配色：底色 / 大字色 / 装饰色
  var PAL = [['var(--cc-blue)', 'var(--cc-yellow)', 'rgba(255,255,255,.14)'], ['var(--cc-yellow)', 'var(--cc-black)', 'rgba(255,255,255,.35)'],
             ['var(--cc-green)', 'var(--cc-cream)', 'var(--cc-yellow)'], ['var(--cc-orange)', 'var(--cc-black)', 'rgba(255,255,255,.2)'], ['var(--cc-pink)', 'var(--cc-black)', 'var(--cc-blue)']];
  function win(img, x, y, w, h, extra) {
    return '<div class="abs cc-win" style="' + box(x, y, w, h, extra || '') + '"><div class="cc-bar"><i></i><i></i><i></i></div><div class="cc-shot">' + img + '</div></div>';
  }
  // 漂浮形状：[类型, x, y, 尺寸, 颜色, 旋转]
  function shapes(list, t0) {
    return list.map(function (s, i) {
      var st = s[0] === 'ring' ? 'border:' + Math.round(s[3] * .16) + 'px solid ' + s[4] + ';border-radius:50%' :
        s[0] === 'dot' ? 'background:' + s[4] + ';border-radius:50%' : s[0] === 'pill' ? 'background:' + s[4] + ';border-radius:999px' : 'background:' + s[4] + ';border-radius:' + Math.round(s[3] * .2) + 'px';
      var hh = s[0] === 'pill' ? s[3] * .45 : s[3];
      return '<div class="abs cc-shape" data-i="' + i + '" data-t="' + (t0 + i * .06) + '" style="' + box(s[1], s[2], s[3], hh, st + ';--r:' + (s[5] || 0) + 'deg') + '"></div>';
    }).join('');
  }
  function shapeUpd(el, t) {
    qa(el, '.cc-shape').forEach(function (n) {
      var i = +n.dataset.i, t0 = +n.dataset.t, p = (t - t0) / .55, r = parseFloat(n.style.getPropertyValue('--r')) || 0;
      n.style.opacity = p > 0 ? 1 : 0;
      n.style.transform = 'translate(' + (Math.sin(t * .9 + i * 1.3) * 14).toFixed(1) + 'px,' + (Math.cos(t * .7 + i) * 12).toFixed(1) + 'px) scale(' + (p < 1 ? bk(p, 2) : 1).toFixed(3) + ') rotate(' + (r + Math.sin(t * .5 + i) * 4).toFixed(1) + 'deg)';
    });
  }

  return {
    /* hero：米白底 + 漂浮彩色几何；粗黑大标题逐字弹起，hl 装进一颗橙色胶囊横向撑开；斜体衬线副标题 */
    hero: function (d) {
      var title = d.title || '', hl = d.hl && title.indexOf(d.hl) >= 0 ? d.hl : '', parts = hl ? title.split(hl) : [title];
      var chars = (parts[0] || '').split(''), tail = hl ? (parts.slice(1).join(hl)).split('') : [];
      var tHl = .3 + chars.length * .05 + .1, W = d.img ? 860 : 1500, L = title.length + (hl ? .7 : 0), fs, brk = false;
      // 一行放得下就一行；放不下且有 hl：在 hl 前断行（hl 胶囊整块落第二行）；否则自然换两行
      if (W / L >= 110) fs = Math.min(150, Math.floor(W / L));
      else if (hl && chars.length) { brk = true; fs = Math.max(64, Math.min(140, Math.floor(W / Math.max(chars.length, hl.length + tail.length + .7)))); }
      else fs = Math.max(64, Math.min(130, Math.floor(W * 2 / L)));
      var sfx = [[.05, 'enter', .45], [.3, 'type', .35], [tHl, 'reveal', .5]];
      if (d.img) sfx.push([.6, 'card', .35]);
      if (d.sub) sfx.push([tHl + .7, 'slide', .35]);
      return {
        sfx: fin(sfx),
        build: function () {
          var h = '<div class="abs" style="' + box(0, 0, 1920, 1080, 'background:var(--cc-cream)') + '"></div>' +
            shapes([['dot', 1430, -170, 560, 'var(--cc-yellow)'], ['sq', -140, 700, 520, 'var(--cc-pink)', 12], ['sq', 1560, 720, 420, 'var(--cc-blue)', -14],
                    ['pill', 960, -40, 280, 'var(--cc-green)', -8], ['dot', d.img ? 990 : 1220, d.img ? 860 : 640, 80, 'var(--cc-orange)'], ['ring', 150, 90, 130, 'var(--cc-yellow)'], ['sq', d.img ? 1000 : 1360, d.img ? 300 : 300, 70, 'var(--cc-blue)', 8]], 0);
          if (d.img) h += win('<img src="__BASE__' + d.img + '" alt="">', 1080, 420, 740, 460, '--r:3deg');
          h += '<div class="abs cc-hcol" style="' + box(140, 0, W, 1080) + '">' +
            (d.kick ? '<div class="cc-mono"' + A('fade', .2) + '>' + d.kick + '</div>' : '') +
            '<div class="cc-ttl" style="font-size:' + fs + 'px">';
          chars.forEach(function (c, i) { h += '<span class="cc-ch"' + A('lift', .3 + i * .05, .5) + '>' + c + '</span>'; });
          if (brk) h += '<br>';
          if (hl) h += '<span class="cc-pill"' + A('pop', tHl, .5) + '>' + hl + '</span>';
          tail.forEach(function (c, i) { h += '<span class="cc-ch"' + A('lift', tHl + .2 + i * .05, .5) + '>' + c + '</span>'; });
          h += '</div>' + (d.sub ? '<div class="cc-serif"' + A('up', tHl + .7) + ' style="font-size:' + (d.img ? 48 : 56) + 'px;margin-top:16px">' + d.sub + '</div>' : '') + '</div>';
          return h;
        },
        update: function (t, el) {
          shapeUpd(el, t);
          var w = q(el, '.cc-win');
          if (w) { var p = (t - .55) / .6; w.style.opacity = p > 0 ? 1 : 0; w.style.transform = 'translateY(' + ((1 - bk(p, 1.4)) * 160 + Math.sin(t * .8) * 6).toFixed(1) + 'px) rotate(' + (3 - 1.5 * eo(p) + Math.sin(t * .6) * .4).toFixed(2) + 'deg)'; }
        }
      };
    },

    /* list：每个条目一张满屏色卡，从右边推进来（上一张被压到底下）；最后所有色卡缩小、倾斜，散成深色桌面上的拼贴，中间弹出米白主卡写标题 */
    list: function (d) {
      var items = d.items || [], n = items.length || 1, D = 2.15 / n, C = 2.45, k = n <= 2 ? .32 : n === 3 ? .3 : .27;
      // 拼贴落点（卡片中心相对画面中心的偏移 + 旋转）：右上让出头像圆（y≤395），底部尽量不压字幕行
      var POS = n <= 2 ? [[-580, -200, -6], [680, 100, 5]] : n === 3 ? [[-630, -290, -6], [640, 100, 5], [-540, 200, 4]] :
        [[-650, -340, -6], [-660, 20, 4], [0, -370, -3], [690, 20, 6], [760, 320, -5]];
      var sfx = [];
      items.forEach(function (it, i) { sfx.push([.1 + i * D, i ? 'slide' : 'transition', .45]); });
      sfx.push([C, 'deal', .5], [C + .4, 'card', .5]);
      if (d.aside) sfx.push([C + .8, 'count', .35]);
      return {
        sfx: fin(sfx),
        build: function () {
          var h = '<div class="abs" style="' + box(0, 0, 1920, 1080, 'background:var(--cc-table)') + '"></div>';
          items.forEach(function (it, i) {
            var P = PAL[i % PAL.length];
            h += '<div class="abs cc-panel" data-i="' + i + '" style="' + box(0, 0, 1920, 1080, 'background:' + P[0]) + '">' +
              '<div class="abs" style="' + box(1300, 640, 620, 620, 'border-radius:50%;background:' + P[2]) + '"></div>' +
              '<div class="abs" style="' + box(80, 820, 90, 90, 'border-radius:50%;background:' + P[2]) + '"></div>' +
              '<div class="abs cc-mono" style="' + pos(120, 150, 'color:' + P[1] + ';opacity:.8') + '">' + (i < 9 ? '0' : '') + (i + 1) + ' / ' + (n < 10 ? '0' : '') + n + (d.kick ? ' · ' + d.kick : '') + '</div>' +
              '<div class="abs cc-ttl" style="' + pos(120, 460, 'color:' + P[1] + ';font-size:' + fit(it.name, 130, 620) + 'px;max-width:640px') + '">' + it.name + '</div>' +
              (it.tag ? '<div class="abs cc-serif" style="' + pos(126, 630, 'color:' + P[1] + ';font-size:60px') + '">' + it.tag + '</div>' : '') +
              win('<img src="__BASE__' + it.img + '" alt="">', 770, 300, 740, 470, '--r:-2deg') + '</div>';
          });
          h += '<div class="abs cc-tcard" style="' + box(580, 345, 760, 390) + '">' +
            (d.kick ? '<div class="cc-serif" style="font-size:40px;color:var(--cc-orange)">' + d.kick + '</div>' : '') +
            '<div class="cc-ttl" style="font-size:' + fit(d.title, 84, 630) + 'px;color:var(--cc-black);white-space:nowrap">' + BrollCore.hlify(d.title || '', d.hl) + '</div>' +
            (d.aside ? '<div class="cc-aside">' + d.aside.label + ' <b>' + H.count(d.aside.value, C + .8, .7) + '</b>' + (d.aside.suffix || '') + '</div>' : '') +
            '<i class="cc-dotc" style="background:var(--cc-yellow);right:-40px;top:-50px;width:130px;height:130px"></i><i class="cc-dotc" style="background:var(--cc-blue);left:-30px;bottom:-34px;width:90px;height:90px;border-radius:22px"></i></div>';
          return h;
        },
        update: function (t, el) {
          var c = eio((t - C) / .65);
          qa(el, '.cc-panel').forEach(function (p) {
            var i = +p.dataset.i, s0 = .1 + i * D, e = eio((t - s0) / .45), nx = i < n - 1 ? eio((t - s0 - D) / .45) : 0;
            var P = POS[i % POS.length], dx = (1 - e) * 1920 - nx * 260 * (1 - c), sc = 1 - (1 - k) * c - nx * .04 * (1 - c);
            var fl = c > 0 ? Math.sin(t * 1.2 + i * 2) * 6 * c : 0;
            p.style.opacity = t >= s0 ? 1 : 0;
            p.style.transform = 'translate(' + (dx + P[0] * c).toFixed(1) + 'px,' + (P[1] * c + fl).toFixed(1) + 'px) scale(' + sc.toFixed(4) + ') rotate(' + (P[2] * c).toFixed(2) + 'deg)';
            p.style.borderRadius = (c * 100).toFixed(0) + 'px';
            p.style.boxShadow = c > 0 ? '0 ' + (90 * c).toFixed(0) + 'px 160px -40px rgba(12,9,4,' + (.7 * c).toFixed(2) + ')' : '';
            q(p, '.cc-win').style.transform = 'rotate(' + (-2 + 2 * eo((t - s0 - .1) / .5)) + 'deg) translateY(' + ((1 - eo((t - s0 - .05) / .5)) * 120).toFixed(1) + 'px)';
          });
          var tc = q(el, '.cc-tcard'), pt = (t - C - .35) / .55;
          tc.style.opacity = pt > 0 ? 1 : 0; tc.style.transform = 'scale(' + (pt < 1 ? .5 + .5 * bk(pt, 2) : 1 + .01 * Math.sin(t * 1.5)) + ') rotate(' + (pt < 1 ? (1 - eo(pt)) * 6 : 0) + 'deg)';
        }
      };
    },

    /* focus：深色桌面 + 出血的巨型衬线符号；左边一个“窗口”放画面，底部时间轴高亮选段；右边一串深色胶囊，先灰后亮逐个打勾；标题压在清单下面，橙色胶囊章拍在窗口角 */
    focus: function (d) {
      // 右栏 = 清单 + 标题，整体在窗口高度内垂直居中；顶边不高于 400（让出头像圆），底边不压字幕行
      var checks = d.checks || [], nC = checks.length, RH = nC >= 4 ? 80 : 92, title = d.title || '';
      var tfs = title.length * 84 <= 700 ? 84 : 72, tLines = Math.ceil(title.length * tfs / 700), tH = Math.round(tfs * 1.08 * tLines);
      var WH = d.range ? 720 : 640, colH = nC * RH + (nC ? 24 : 0) + tH, cy0 = Math.max(400, Math.round(130 + WH / 2 - colH / 2));
      if (cy0 + colH > 892) cy0 = Math.max(330, 892 - colH);
      var ty = cy0 + nC * RH + (nC ? 24 : 0);
      var sfx = [[0, 'transition', .45], [.2, 'slide', .4], [.6, 'reveal', .35]];
      checks.forEach(function (c, i) { sfx.push([1.3 + i * .45 + .35, 'check', .45]); });
      sfx.push([1.1 + checks.length * .45 + .2, 'type', .3]);
      if (d.stamp) sfx.push([3.2, 'stamp', .55]);
      return {
        sfx: fin(sfx),
        build: function () {
          var h = '<div class="abs" style="' + box(0, 0, 1920, 1080, 'background:var(--cc-table)') + '"></div>' +
            '<div class="abs cc-glyph" data-k="0" style="' + pos(-30, -170, 'font-size:1000px') + '">{</div>' +
            '<div class="abs cc-glyph" data-k="1" style="' + pos(1180, 380, 'font-size:900px') + '">?</div>' +
            '<div class="abs cc-glyph" data-k="2" style="' + pos(40, 760, 'font-size:360px') + '">( )</div>' +
            '<div class="abs cc-dwin" style="' + box(80, 130, 1000, WH) + '">' +
              '<div class="cc-dbar"><span>' + (d.kick || '') + '</span><i></i><i></i><i></i></div>' +
              '<div class="cc-shot"' + A('wipe', .55, .6) + ' style="' + box(20, 70, 960, 540) + '">' + BrollCore.media(d, H) + '</div>';
          if (d.range) {
            var L = 960 * d.range.from / d.range.total, W = 960 * (d.range.to - d.range.from) / d.range.total;
            h += '<div class="abs" style="' + box(20, 640, 960, 10, 'background:rgba(243,239,228,.12);border-radius:5px') + '"></div>' +
              '<div class="abs"' + A('bar', 1.0, .6) + ' style="' + box(20 + L, 636, W, 18, 'background:var(--cc-ok);border-radius:9px') + '"></div>';
          }
          h += '</div>';
          checks.forEach(function (c, i) {
            h += '<div class="abs cc-chk" data-i="' + i + '" style="' + pos(1130, cy0 + i * RH) + '"><span class="cc-cb"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#FBFAF6" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' + c + '</div>';
          });
          h += '<div class="abs cc-ttl"' + A('up', 1.1 + checks.length * .45 + .2) + ' style="' + pos(1130, ty, 'color:var(--cc-cream);width:700px;line-height:1.08;font-size:' + tfs + 'px') + '">' + (d.title || '').replace(d.hl, '<span style="color:var(--cc-yellow)">' + d.hl + '</span>') + '</div>';
          if (d.stamp) h += '<div class="abs cc-stamp"' + A('slam', 3.2, .35) + ' style="' + pos(820, 130 + WH - 70, '--r:-6deg;transform-origin:center') + '">' + d.stamp.text + (d.stamp.sub ? '<small>' + d.stamp.sub + '</small>' : '') + '</div>';
          return h;
        },
        update: function (t, el) {
          qa(el, '.cc-glyph').forEach(function (g) { var k = +g.dataset.k; g.style.transform = 'translate(' + (Math.sin(t * .4 + k) * 20 - t * 6 * (k - 1)).toFixed(1) + 'px,' + (Math.cos(t * .3 + k) * 14).toFixed(1) + 'px)'; });
          var w = q(el, '.cc-dwin'), p = eo((t - .1) / .55);
          w.style.opacity = p; w.style.transform = 'translateY(' + ((1 - bk((t - .1) / .55, 1.3)) * 140).toFixed(1) + 'px)';
          qa(el, '.cc-chk').forEach(function (c) {
            var i = +c.dataset.i, t0 = 1.3 + i * .45, pa = eo((t - t0) / .35), on = t >= t0 + .35;
            c.style.opacity = pa * (on ? 1 : .45); c.style.transform = 'translateX(' + ((1 - pa) * 50).toFixed(1) + 'px)';
            c.className = 'abs cc-chk' + (on ? ' on' : '');
            var cb = q(c, '.cc-cb'), pb = (t - t0 - .35) / .3; cb.style.transform = 'scale(' + (on ? (pb < 1 ? .6 + .4 * bk(pb, 2.5) : 1) : 1) + ')';
          });
        }
      };
    },

    /* metric：深色桌面四边露出倾斜的彩卡（其中一张是图），一张米白主卡从下面托上来；卡里巨大数字、等宽小标、结论；黑色按钮写 note，光标点一下 */
    metric: function (d) {
      var sfx = [[0, 'transition', .45], [.15, 'slide', .4], [.55, 'count', .4], [1.5, 'reveal', .4]];
      if (d.note) sfx.push([2.1, 'card', .35], [2.9, 'key', .45]);
      return {
        sfx: fin(sfx),
        build: function () {
          var v = String(d.value) + (d.suffix || ''), ns = v.length > 4 ? 240 : 300;
          return '<div class="abs" style="' + box(0, 0, 1920, 1080, 'background:var(--cc-table)') + '"></div>' +
            '<div class="abs cc-peek" data-k="0" style="' + box(-140, 40, 560, 330, 'background:var(--cc-yellow);--r:-12deg') + '"></div>' +
            '<div class="abs cc-peek" data-k="1" style="' + box(1560, -60, 520, 320, 'background:var(--cc-green);--r:9deg') + '"></div>' +
            '<div class="abs cc-peek" data-k="2" style="' + box(1560, 740, 560, 340, 'background:var(--cc-blue);--r:-8deg') + '"></div>' +
            '<div class="abs cc-peek" data-k="3" style="' + box(-80, 860, 520, 300, 'background:var(--cc-orange);--r:7deg') + '"></div>' +
            (d.img ? '<div class="abs cc-peek" data-k="4" style="' + box(70, 520, 470, 300, 'background:var(--cc-pink);--r:-9deg;padding:18px') + '"><img src="__BASE__' + d.img + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:14px;display:block"></div>' : '') +
            '<div class="abs cc-main" style="' + box(400, 110, 1120, 740) + '">' +
              (d.logo ? '<img src="__BASE__' + d.logo + '" alt="" style="position:absolute;left:56px;top:50px;height:34px">' : '') +
              '<div class="cc-big" style="font-size:' + ns + 'px">' + H.count(d.value, .55, 1.0) + '<span style="font-size:.5em">' + (d.suffix || '') + '</span></div>' +
              (d.kick ? '<div class="cc-mono"' + A('fade', 1.2) + ' style="color:var(--cc-orange);font-size:34px;margin-top:6px">' + d.kick + '</div>' : '') +
              '<div class="cc-ttl"' + A('up', 1.5) + ' style="font-size:' + fit(d.caption, 64, 1000) + 'px;color:var(--cc-black);margin-top:18px">' + (d.caption || '').replace(d.hl, '<span style="color:var(--cc-orange)">' + d.hl + '</span>') + '</div>' +
              (d.note ? '<div class="cc-btn"' + A('pop', 2.1, .45) + '>' + d.note + '<i><svg viewBox="0 0 24 24" width="30" height="30"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="var(--cc-cream)" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></i><b class="cc-rip"></b></div>' : '') +
            '</div>' +
            (d.note ? '<svg class="abs cc-cur" viewBox="0 0 24 24" style="' + box(0, 0, 54, 54) + '"><path d="M4 2l15 9.5-6.5 1.5 3.8 7-2.8 1.5-3.8-7L5 18z" fill="#FBFAF6" stroke="#13120D" stroke-width="1.4" stroke-linejoin="round"/></svg>' : '');
        },
        update: function (t, el) {
          qa(el, '.cc-peek').forEach(function (c) {
            var k = +c.dataset.k, p = eo((t - k * .06) / .6), r = parseFloat(c.style.getPropertyValue('--r')) || 0, dir = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, 0]][k];
            c.style.transform = 'translate(' + ((1 - p) * 400 * dir[0] + Math.sin(t * .8 + k) * 8).toFixed(1) + 'px,' + ((1 - p) * 300 * dir[1] + Math.cos(t * .7 + k) * 8).toFixed(1) + 'px) rotate(' + (r + Math.sin(t * .5 + k) * 1.5).toFixed(2) + 'deg)';
          });
          var m = q(el, '.cc-main'), pm = (t - .1) / .7;
          m.style.transform = 'translateY(' + ((1 - bk(pm, 1.2)) * 900).toFixed(1) + 'px) rotate(' + ((1 - eo(pm)) * 5).toFixed(2) + 'deg)';
          var cur = q(el, '.cc-cur');
          if (cur) {
            var pc = eio((t - 2.4) / .5), x = 1600 + (1130 - 1600) * pc, y = 1000 + (700 - 1000) * pc, press = t > 2.9 && t < 3.05 ? .85 : 1;
            cur.style.opacity = t > 2.35 ? 1 : 0; cur.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + press + ')';
            var rp = q(el, '.cc-rip'), pr = cl((t - 2.9) / .5); rp.style.opacity = pr > 0 && pr < 1 ? 1 - pr : 0; rp.style.transform = 'scale(' + (.3 + pr * 1.6) + ')';
          }
        }
      };
    }
  };
});
