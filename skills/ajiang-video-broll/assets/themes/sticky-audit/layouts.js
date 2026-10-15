/* 便签复盘 sticky-audit — 参考 prompt-motion #208（Second brain service promo）
 * 版式语言：一面“证据墙”。冷白方格底上散着模糊的文档、截图、便签碎片，一根竖向审计线从左扫到右，
 * 扫过的碎片变清晰、贴上彩色编号、用橙色连线串起来；底部一条四色阶段轨道（橙 / 紫 / 蓝 / 绿方块）跟着推进；
 * 需要“交付结果”时，画面收进一个深色终端窗口，逐条跑测试亮绿色 PASS。粗黑无衬线标题 + 等宽小字。 */
BrollCore.template('sticky-audit', function (H) {
  var A = H.A, box = H.box, pos = H.pos;
  var PC = ['var(--p1)', 'var(--p2)', 'var(--p3)', 'var(--p4)', 'var(--p1)'];
  function cl(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function ez(x) { x = cl(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function q(el, s) { el._q = el._q || {}; return el._q[s] || (el._q[s] = [].slice.call(el.querySelectorAll(s))); }
  function hl(t, h) { return BrollCore.hlify(t || '', h); }
  function tick(sz, col) { return '<svg class="sa-tick" width="' + sz + '" height="' + sz + '" viewBox="0 0 24 24"><path d="M4.5 12.5l4.8 4.8L19.5 7" fill="none" stroke="' + (col || 'currentColor') + '" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'; }
  function pad(i) { return (i < 9 ? '0' : '') + (i + 1); }

  // 背景碎片（只有骨架，不写字）：[x, y, w, h, 旋转, 种类]
  var WALL = [[-50, 140, 300, 150, -2, 0], [330, 40, 260, 110, 1.5, 1], [1060, 30, 300, 120, -1, 0], [1580, 440, 300, 170, 2, 1],
              [1620, 700, 280, 150, -2, 2], [-70, 520, 230, 200, 2, 1], [-40, 820, 330, 150, -1.5, 2], [1240, 860, 320, 150, 1, 0]];
  function wall(skip) {
    var h = '';
    WALL.forEach(function (w, i) {
      if (skip && skip.indexOf(i) >= 0) return;
      h += '<div class="sa-ev sa-blur abs" data-cx="' + (w[0] + w[2] / 2) + '"' + A('fade', .05 + i * .04, .5) + ' style="' + box(w[0], w[1], w[2], w[3], '--r:' + w[4] + 'deg;transform:rotate(' + w[4] + 'deg)') + '">' +
        '<div class="sa-evh"><i style="background:' + PC[i % 4] + '"></i><b style="width:' + (40 + (i * 37) % 60) + '%"></b></div>' +
        (w[5] === 2 ? '<div class="sa-wave">' + new Array(26).join('<s></s>') + '</div>' : '<b class="sa-ln" style="width:85%"></b><b class="sa-ln" style="width:' + (50 + (i * 23) % 40) + '%"></b>' + (w[5] ? '<b class="sa-ln" style="width:62%"></b>' : '')) + '</div>';
    });
    return h;
  }
  function scanEl(y0, y1) { return '<div class="sa-scan abs" style="' + box(0, y0, 3, y1 - y0) + '"><i class="sa-band"></i><span class="sa-sc"></span></div>'; }
  // 扫描线位置 + 被扫过的碎片变清晰
  function scan(el, t, t0, t1, x0, x1, total) {
    var p = ez((t - t0) / (t1 - t0)), x = x0 + (x1 - x0) * p, s = q(el, '.sa-scan')[0];
    if (s) { s.style.transform = 'translateX(' + x + 'px)'; s.style.opacity = t < t0 - .05 || p >= 1 ? 0 : 1; }
    var hit = 0;
    q(el, '.sa-blur').forEach(function (c) {
      var k = t < t0 ? 0 : cl((x - +c.dataset.cx) / 160); if (p >= 1) k = 1;
      c.style.filter = k < 1 ? 'blur(' + ((1 - k) * 4).toFixed(1) + 'px)' : 'none'; c.classList.toggle('sharp', k > .5);
    });
    q(el, '.sa-item').forEach(function (c) { if (x >= +c.dataset.cx || p >= 1) hit++; });
    var lab = s && s.querySelector('.sa-sc'); if (lab) lab.textContent = total ? pad(hit - 1) + ' / ' + pad(total - 1) : '';
    return x;
  }
  // 底部阶段轨道：labels 为节点名
  function track(labels, t0, step) {
    var n = labels.length, X0 = 120, X1 = 1480, h = '<div class="abs sa-track"' + A('fade', t0 - .4, .5) + ' style="' + box(X0, 1008, X1 - X0, 2) + '"><i class="sa-prog"></i></div>';
    labels.forEach(function (l, i) {
      var x = n > 1 ? X0 + (X1 - X0 - 260) * i / (n - 1) : X0;
      h += '<div class="abs sa-node" data-x="' + x + '"' + A('fade', t0 - .3 + i * .05, .4) + ' style="' + pos(x, 974) + '"><b>' + pad(i) + '</b><span>' + l + '</span></div>' +
        '<i class="abs sa-sq" data-x="' + x + '" style="' + box(x - 2, 1000, 16, 16, 'background:' + PC[i % 4]) + '"></i>';
    });
    return h;
  }
  function trackUpd(el, x) {
    var pg = q(el, '.sa-prog')[0]; if (pg) pg.style.transform = 'scaleX(' + cl((x - 120) / 1360) + ')';
    q(el, '.sa-node').forEach(function (n) { n.classList.toggle('on', x >= +n.dataset.x); });
    q(el, '.sa-sq').forEach(function (n) { n.style.transform = x >= +n.dataset.x ? 'scale(1.35)' : 'scale(1)'; });
  }
  function squares(cx, y, t) {
    var h = '';
    for (var i = 0; i < 4; i++) h += '<i class="abs"' + A('pop', t + i * .07, .4) + ' style="' + box(cx + i * 24, y, 16, 16, 'background:' + PC[i]) + '"></i>';
    return h;
  }

  return {
    hero: function (d) {
      return {
        sfx: [[.1, 'enter', .4], [.5, 'reveal', .4], [1.2, 'scan', .35], [2.6, 'mark', .4]],
        build: function () {
          return wall() + (d.img ? '<div class="sa-card sa-blur abs" data-cx="1700" style="' + box(1545, 600, 340, 220, '--r:2deg;transform:rotate(2deg);padding:10px') + '"><img src="__BASE__' + d.img + '" alt=""></div>' : '') +
            squares(900, 300, .2) +
            '<div class="abs" style="' + box(160, 360, 1600, 260, 'display:flex;justify-content:center;align-items:center') + '"><div class="ttl"' + A('@title', .4, .7) + ' style="font-size:110px;text-align:center">' + hl(d.title, d.hl) + '</div></div>' +
            (d.sub ? '<div class="abs sa-sub"' + A('up', .9, .6) + ' style="' + box(260, 650, 1400, 50) + '">' + d.sub + '</div>' : '') + scanEl(0, 1080);
        },
        update: function (t, el) { scan(el, t, 1.2, 3.0, 40, 1880); }
      };
    },

    list: function (d) {
      var items = (d.items || []).slice(0, 5), n = items.length || 1;
      // 卡宽：少条目时放大（受纵向空间 360–890 限制），整排水平居中；名字按行数算卡高；整块在 360–890 里竖向居中
      var w = Math.min(n <= 2 ? 548 : 440, Math.floor((1380 - (n - 1) * 36) / n)), ih = Math.round(w * .66);
      var nfs = Math.max(34, Math.min(n <= 2 ? 48 : 42, Math.floor(w / 9)));
      var lines = Math.max.apply(null, items.map(function (it) { return Math.ceil((it.name || '').length * nfs / (w - 24)) || 1; }).concat([1]));
      var ch = ih + 50 + Math.round(lines * nfs * 1.15) + 16, zig = n >= 2 ? 84 : 0;
      var X0 = 120 + Math.max(0, (1380 - n * w - (n - 1) * 36) / 2), Y0 = 360 + Math.max(0, Math.round((530 - ch - zig) / 2));
      var T0 = 1.0, T1 = 2.9, xs = items.map(function (it, i) { return X0 + i * (w + 36) + (i % 2 ? 10 : 0); });
      var hitT = xs.map(function (x) { var p = (x + w / 2 - 60) / 1500; return T0 + (T1 - T0) * (p < .5 ? Math.cbrt(p / 4) : 1 - Math.cbrt(2 * (1 - p)) / 2); });
      var sfx = [[.1, 'enter', .4], [.45, 'mark', .35], [T0, 'scan', .35]];
      var lastT = 0; items.forEach(function (it, i) { var tt = +(hitT[i] + .02).toFixed(2); if (sfx.length < 6 && tt - lastT >= .2) { sfx.push([tt, 'card', .4]); lastT = tt; } });
      if (d.aside) sfx.push([3.0, 'count', .4]);
      return {
        sfx: sfx,
        build: function () {
          var h = wall([1, 2, 3]);
          if (d.kick) h += '<div class="abs sa-tag"' + A('pop', .1, .35) + ' style="' + pos(120, 86) + '">' + d.kick + '</div>';
          h += '<div class="abs ttl"' + A('@title', .3, .7) + ' style="' + pos(120, 128, 'font-size:84px;max-width:1020px;line-height:1.1') + '">' + hl(d.title, d.hl) + '</div>';
          if (d.aside) h += '<div class="abs sa-sticky"' + A('drop', .6, .7) + ' style="' + box(1200, 104, 270, 210, '--r:3deg') + '"><span>' + d.aside.label + '</span><b>' + H.count(d.aside.value, 3.0, .5) + '<small>' + (d.aside.suffix || '') + '</small></b></div>';
          var svg = '<svg class="ov">';
          items.forEach(function (it, i) {
            if (i < n - 1) {
              var y1 = Y0 + (i % 2) * zig + ih / 2, y2 = Y0 + ((i + 1) % 2) * zig + ih / 2;
              svg += '<path d="M' + (xs[i] + w - 20) + ' ' + y1 + ' C' + (xs[i] + w + 20) + ' ' + y1 + ' ' + (xs[i + 1] - 20) + ' ' + y2 + ' ' + (xs[i + 1] + 20) + ' ' + y2 + '" fill="none" stroke="var(--p1)" stroke-width="3" stroke-dasharray="8 7" data-dash="8 7"' + A('draw', hitT[i + 1], .3) + '/>' +
                '<circle cx="' + (xs[i + 1] + 20) + '" cy="' + y2 + '" r="7" fill="var(--p1)"' + A('pop', hitT[i + 1] + .1, .3) + '/>';
            }
          });
          h += svg + '</svg>';
          items.forEach(function (it, i) {
            var y = Y0 + (i % 2) * zig, rot = [-1.6, 1.2, -.8, 1.6, -1.2][i];
            h += '<div class="sa-card sa-blur sa-item abs" data-cx="' + (xs[i] + w / 2) + '"' + A('fade', .5 + i * .1, .5) + ' style="' + box(xs[i], y, w, ch, 'transform:rotate(' + rot + 'deg)') + '">' +
              '<div class="sa-evh"><i style="background:' + PC[i % 4] + '"></i><em>' + (it.tag || pad(i)) + '</em></div>' +
              '<div class="sa-img" style="height:' + ih + 'px"><img src="__BASE__' + it.img + '" alt=""></div>' +
              '<div class="sa-name" style="font-size:' + nfs + 'px">' + it.name + '</div>' +
              '<span class="sa-flag" style="background:' + PC[i % 4] + '"' + A('pop', hitT[i], .3) + '>' + pad(i) + '</span></div>';
          });
          h += track(items.map(function (it) { return it.name; }), T0) + scanEl(330, 1050);
          return h;
        },
        update: function (t, el) { trackUpd(el, scan(el, t, T0, T1, 60, 1560, n)); }
      };
    },

    focus: function (d) {
      var checks = (d.checks || []).slice(0, 4), LP = checks.length ? 440 : 0;
      var X = 120, Y = 100, W = 1370, Hh = 780, RX = X + LP + 40, RW = W - LP - 80;
      var IW = Math.min(RW, LP ? 860 : 1040), IH = Math.round(IW * 9 / 16);
      Hh = Math.min(780, 204 + IH + (d.range ? 96 : 52));
      var CT = 2.1, step = Math.min(.4, 1.3 / Math.max(1, checks.length));
      var sfx = [[0, 'transition', .35], [.25, 'enter', .4], [.9, 'type', .35]];
      checks.forEach(function (c, i) { if (i < 3) sfx.push([CT + i * step, 'check', .4]); });
      if (d.stamp) sfx.push([Math.max(3.3, CT + checks.length * step), 'stamp', .5]);
      else if (checks.length) sfx.push([+(CT + checks.length * step + .15).toFixed(2), 'mark', .35]);
      return {
        sfx: sfx,
        build: function () {
          var h = wall([0, 1, 2, 4, 6, 7]) + '<div class="sa-term abs" style="' + box(X, Y, W, Hh) + '">' +
            '<div class="sa-tbar"><i></i><i></i><i></i><span>' + (d.kick || '') + '</span>' + (d.range ? '<em>● ' + d.range.from + 's – ' + d.range.to + 's</em>' : '') + '</div>';
          if (LP) {
            h += '<div class="abs sa-tree" style="' + box(0, 44, LP, Hh - 44) + '"><i class="sa-cur abs" style="' + box(0, 0, LP, 74) + '"></i>';
            checks.forEach(function (c, i) {
              var t = CT + i * step;
              h += '<div class="abs sa-tr"' + A('up', .7 + i * .1, .4) + ' style="' + box(28, 40 + i * 92, LP - 56, 74) + '"><b style="color:' + PC[i % 4] + '">' + pad(i) + '</b><span>' + c + '</span>' +
                '<em class="sa-pass"' + A('pop', t + .15, .3) + '>' + tick(16, '#0E1A12') + '通过</em></div>';
            });
            // 面板下半部给一个汇总：n / n 项通过 + 几行日志骨架，左栏不空
            if (checks.length) {
              var sy = Hh - 44 - 230, tS = CT + checks.length * step + .1;
              h += '<div class="abs sa-log"' + A('fade', 1.0, .5) + ' style="' + box(28, 40 + checks.length * 92 + 20, LP - 56, Math.max(40, sy - checks.length * 92 - 70)) + '">' +
                '<b style="width:78%"></b><b style="width:52%"></b><b style="width:66%"></b><b style="width:40%"></b><b style="width:58%"></b></div>' +
                '<div class="abs sa-sum"' + A('up', tS, .45) + ' style="' + box(28, sy, LP - 56, 190) + '"><span>检查项</span><b>' + checks.length + '<small> / ' + checks.length + '</small></b><em>' + tick(18, 'var(--p4)') + '全部通过</em></div>';
            }
            h += '</div><i class="abs" style="' + box(LP, 44, 1, Hh - 44, 'background:rgba(255,255,255,.08)') + '"></i>';
          }
          var tl = (d.title || '').length * 66 / 1.02;
          h += '<div class="abs sa-prompt" style="' + box(LP + 40, 84, RW, 90) + '"><span class="sa-gt">›</span><span class="sa-ty ttl">' + H.type(d.title || '', .9, .8) + '</span><span class="sa-full ttl">' + hl(d.title, d.hl) + '</span></div>';
          h += '<div class="abs sa-shot"' + A('focus', 1.5, .7) + ' style="' + box(LP + 40, 204, IW, IH) + '">' + BrollCore.media(d, H) + '</div>';
          if (d.range) {
            var L = IW * d.range.from / d.range.total, RW2 = IW * (d.range.to - d.range.from) / d.range.total;
            h += '<div class="abs" style="' + box(LP + 40, 204 + IH + 34, IW, 4, 'background:rgba(255,255,255,.12)') + '"></div>' +
              '<div class="abs"' + A('bar', 1.9, .6) + ' style="' + box(LP + 40 + L, 204 + IH + 30, RW2, 12, 'background:var(--p4)') + '"></div>' +
              '<div class="abs sa-mono"' + A('fade', 2.1) + ' style="' + pos(LP + 40, 204 + IH + 54) + '">0.0s</div>' +
              '<div class="abs sa-mono"' + A('fade', 2.2) + ' style="' + pos(LP + 40 + IW, 204 + IH + 54, 'color:var(--p4);translate:-100% 0') + '">' + d.range.from + 's → ' + d.range.to + 's / ' + d.range.total + 's</div>';
          }
          if (d.stamp) h += '<div class="abs sa-ok"' + A('stamp', Math.max(3.3, CT + checks.length * step), .4) + ' style="' + pos(LP + 40 + IW - 30, 230, 'transform-origin:right top;translate:-100% 0;--r:0deg') + '"><span class="sa-okt">' + tick(36, '#0E1A12') + d.stamp.text + '</span>' + (d.stamp.sub ? '<small>' + d.stamp.sub + '</small>' : '') + '</div>';
          h += '</div>';
          if (checks.length) h += track(checks, CT);
          return h;
        },
        update: function (t, el) {
          var term = q(el, '.sa-term')[0], p = ez((t - .1) / .7);
          if (term) term.style.clipPath = 'inset(' + (1 - p) * 350 + 'px ' + (1 - p) * 500 + 'px round 10px)';
          var full = t >= 1.75; q(el, '.sa-ty').forEach(function (e) { e.style.display = full ? 'none' : ''; }); q(el, '.sa-full').forEach(function (e) { e.style.display = full ? '' : 'none'; });
          var k = Math.floor((t - CT) / step), cur = q(el, '.sa-cur')[0];
          if (cur) { cur.style.opacity = t < CT || k >= checks.length + 1 ? 0 : 1; cur.style.transform = 'translateY(' + (40 + Math.max(0, Math.min(checks.length - 1, k)) * 92) + 'px)'; }
          var n = checks.length, x = t < CT ? 60 : 120 + Math.min(1, (t - CT + .3) / (n * step)) * 1360;
          trackUpd(el, x);
        }
      };
    },

    metric: function (d) {
      var cap = (d.caption || '').replace(d.hl, '<span class="hl">' + d.hl + '</span>');
      var dy = (!d.img && !d.note && !d.logo) ? 80 : 0, cfs = Math.max(48, Math.min(68, Math.floor(1100 / Math.max(1, (d.caption || '').length))));
      var sfx = [[0, 'transition', .35], [.25, 'scan', .3], [.5, 'count', .45], [1.5, 'draw', .35]];
      if (d.note) sfx.push([2.2, 'card', .4]);
      if (d.logo) sfx.push([2.7, 'check', .4]);
      return {
        sfx: sfx,
        build: function () {
          var h = wall([0, 3, 5, 6]);
          h += squares(d.kick ? 640 : 912, 172 + dy, .1);
          if (d.kick) h += '<div class="abs sa-kick"' + A('fade', .2, .5) + ' style="' + pos(746, 166 + dy, 'width:600px') + '">' + d.kick + '</div>';
          h += '<div class="abs" style="' + box(0, 200 + dy, 1920, 320, 'display:flex;justify-content:center') + '"><div class="sa-num"' + A('@number', .45, .7) + '>' + H.count(d.value, .5, 1.1) + '<small>' + (d.suffix || '') + '</small></div></div>';
          h += '<div class="abs" style="' + box(400, 540 + dy, 1120, 100, 'display:flex;justify-content:center') + '"><div class="ttl"' + A('@title', 1.2, .6) + ' style="font-size:' + cfs + 'px;white-space:nowrap">' + cap + '</div></div>';
          for (var i = 0; i < 4; i++) h += '<i class="abs"' + A('bar', 1.5 + i * .1, .3) + ' style="' + box(840 + i * 62, 664 + dy, 54, 5, 'background:' + PC[i]) + '"></i>';
          if (d.img) h += '<div class="sa-card sa-blur abs" data-cx="320" style="' + box(130, 560, 380, 250, 'transform:rotate(-3deg);padding:10px') + '"><img src="__BASE__' + d.img + '" alt=""></div>';
          if (d.note) h += '<div class="abs sa-sticky"' + A('drop', 2.2, .7) + ' style="' + box(1250, 620, 270, 180, '--r:4deg;display:grid;place-items:center') + '"><b style="font-size:' + Math.max(28, Math.min(40, Math.floor(220 / Math.max(1, (d.note || '').length)))) + 'px;text-align:center;line-height:1.2;white-space:nowrap">' + d.note + '</b></div>';
          if (d.logo) h += '<div class="abs" style="' + box(0, 712, 1920, 70, 'display:flex;justify-content:center') + '"><div class="sa-chip"' + A('lift', 2.6, .5) + '><img src="__BASE__' + d.logo + '" alt=""><em>' + tick(22, '#0E1A12') + '</em></div></div>';
          return h + scanEl(0, 1080);
        },
        update: function (t, el) { scan(el, t, .2, 1.5, 40, 1880); }
      };
    }
  };
});
