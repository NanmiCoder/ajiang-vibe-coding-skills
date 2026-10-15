/* 复古旭日（Retro Sunburst）— prompt-motion #53 Recipe brand 20th anniversary
 * 版式语言：居中对称的庆典包装海报 —— 满屏旭日放射条一直慢转，主体永远居中（描边厚字 / 金边白卡），
 * 锯齿金徽章盖在角上，数字弹出时从中心炸一把纸屑、之后纸屑和星光持续飘落；奶油场和可可深场交替，换页是圆形光圈。 */
BrollCore.template('retro-sunburst', function (H) {
  var A = H.A, box = H.box, pos = H.pos;
  function cl(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function eo(x) { x = cl(x); return 1 - Math.pow(1 - x, 3); }
  function bk(x, c) { x = cl(x); c = c || 1.9; var c3 = c + 1; return 1 + c3 * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
  function R(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function q(el, s) { return el.querySelector(s); }
  function qa(el, s) { return el.querySelectorAll(s); }
  function fit(text, max, w) { var n = (text || '').length || 1; return Math.max(34, Math.min(max, Math.floor(w / n))); }
  function hlBig(title, hl) { return hl && title.indexOf(hl) >= 0 ? title.replace(hl, '<span class="rs-big">' + hl + '</span>') : title; }
  // 声音：排序、相邻 ≥0.15s、最多 7 个（先丢增益最小的）
  function fin(sfx) {
    sfx.sort(function (a, b) { return a[0] - b[0]; });
    while (sfx.length > 7) { var m = 1; for (var i = 2; i < sfx.length; i++) if (sfx[i][2] < sfx[m][2]) m = i; sfx.splice(m, 1); }
    for (var k = 1; k < sfx.length; k++) if (sfx[k][0] - sfx[k - 1][0] < .15) sfx[k][0] = +(sfx[k - 1][0] + .15).toFixed(2);
    return sfx;
  }
  var COLS = ['var(--accent)', 'var(--accent2)', '#E4572E', '#5E8C3A', '#FFF4DC', '#8C5A2B'];
  function burst(dark) { return '<div class="rs-burst' + (dark ? ' dk' : '') + '"></div><div class="rs-glow' + (dark ? ' dk' : '') + '"></div>'; }
  function confetti(n) {
    var h = '';
    for (var i = 0; i < n; i++) h += '<i class="rs-cf" data-i="' + i + '" style="width:' + (8 + R(i) * 10 | 0) + 'px;height:' + (14 + R(i + 50) * 12 | 0) + 'px;background:' + COLS[i % COLS.length] + '"></i>';
    return h;
  }
  function sparkles(n, dark) {
    var h = '';
    for (var i = 0; i < n; i++) h += '<svg class="rs-sp" data-i="' + i + '" viewBox="-10 -10 20 20" style="left:' + (80 + R(i + 9) * 1760 | 0) + 'px;top:' + (60 + R(i + 19) * 900 | 0) + 'px"><path d="M0-10Q1-1 10 0Q1 1 0 10Q-1 1-10 0Q-1-1 0-10Z" fill="' + (dark ? 'var(--accent2)' : '#fff') + '"/></svg>';
    return h;
  }
  // 纸屑：t0 从 (cx,cy) 炸开带重力；没有 t0 = 从顶上循环飘落
  function confUpd(el, t, t0, cx, cy) {
    qa(el, '.rs-cf').forEach(function (c) {
      var i = +c.dataset.i, x, y, a, tau;
      if (t0 != null) {
        tau = t - t0; if (tau < 0) { c.style.opacity = 0; return; }
        a = R(i + 3) * Math.PI * 2; var v = 500 + R(i + 7) * 900, dr = (1 - Math.exp(-2.2 * tau)) / 2.2;
        x = cx + Math.cos(a) * v * dr; y = cy + Math.sin(a) * v * dr - 260 * dr + 260 * tau * tau + 60 * tau;
      } else {
        var sp = 120 + R(i + 5) * 160; tau = t;
        x = R(i + 1) * 1920 + Math.sin(t * 1.3 + i) * 30; y = ((R(i + 2) * 1200 + t * sp) % 1200) - 80;
      }
      c.style.opacity = 1;
      c.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + ((R(i + 11) - .5) * 900 * tau).toFixed(1) + 'deg) scaleY(' + Math.cos(tau * (5 + R(i) * 6) + i).toFixed(2) + ')';
    });
  }
  function spUpd(el, t) {
    qa(el, '.rs-sp').forEach(function (s) { var i = +s.dataset.i, k = Math.max(0, Math.sin(t * 2.4 + i * 1.7)); s.style.transform = 'scale(' + (k * 1.2).toFixed(2) + ') rotate(' + (t * 40) + 'deg)'; });
  }
  function base(t, el) { var b = q(el, '.rs-burst'); if (b) b.style.transform = 'rotate(' + (t * 5).toFixed(2) + 'deg)'; spUpd(el, t); }
  function badge(x, y, s, inner, cls) {
    return '<div class="abs rs-badge ' + (cls || '') + '" style="' + box(x - s / 2, y - s / 2, s, s) + '"><div class="rs-badge-in">' + inner + '</div></div>';
  }
  function spinIn(n, t, t0, rEnd) { var p = (t - t0) / .55; n.style.opacity = p > 0 ? 1 : 0; n.style.transform = 'scale(' + (p < 1 ? bk(p, 2.2) : 1) + ') rotate(' + ((1 - eo(p)) * -200 + (rEnd || 0) + Math.sin(t * 1.5) * 3) + 'deg)'; }

  return {
    /* hero：旭日正中一个橙色描边厚字（hl）弹出，炸纸屑；上面橙色小标签、下面棕色副标题。有图时标题上移，金边白卡托着图荡进下半屏 */
    hero: function (d) {
      var sfx = [[.15, 'enter', .45], [.4, 'hit', .55], [.55, 'reveal', .4]];
      if (d.img) sfx.push([.95, 'card', .45]);
      if (d.sub) sfx.push([1.3, 'type', .3]);
      return {
        sfx: fin(sfx),
        build: function () {
          var im = !!d.img, ts = im ? fit(d.title, 104, 1080) : fit(d.title, 150, 1300);
          var yK = im ? 66 : 290, yT = im ? 150 : 390, yS = im ? 150 + ts * 1.15 + 16 : 660;
          return burst(false) + confetti(44) + sparkles(8, false) +
            (d.kick ? '<div class="abs" style="' + pos(410, yK, 'width:1100px;text-align:center') + '"><span class="rs-pill"' + A('pop', .15, .45) + '>' + d.kick + '</span></div>' : '') +
            '<div class="abs rs-ttl" style="' + pos(im ? 410 : 260, yT, 'width:' + (im ? 1100 : 1400) + 'px;text-align:center;font-size:' + ts + 'px') + '"><span' + A('pop', .35, .6) + ' style="display:inline-block">' + hlBig(d.title || '', d.hl) + '</span></div>' +
            (d.sub ? '<div class="abs rs-sub"' + A('up', 1.3) + ' style="' + pos(410, yS, 'width:1100px;text-align:center;font-size:' + (im ? 34 : 40) + 'px') + '">' + d.sub + '</div>' : '') +
            (im ? '<div class="abs rs-card rs-hc" style="' + box(560, yS + (d.sub ? 66 : 10), 800, Math.min(480, 860 - yS - (d.sub ? 66 : 10))) + '"><div class="rs-img" style="height:100%">' + BrollCore.media(d, H) + '</div></div>' : '');
        },
        update: function (t, el) {
          base(t, el); confUpd(el, t, .45, 960, d.img ? 220 : 480);
          var c = q(el, '.rs-hc');
          if (c) { var p = (t - .9) / .7, b = bk(p, 1.5); c.style.opacity = p > 0 ? 1 : 0;
            c.style.transform = 'translateY(' + ((1 - b) * 140 + Math.sin(t * 1.4) * 4).toFixed(1) + 'px) scale(' + (1.3 - .3 * b).toFixed(3) + ') rotate(' + ((1 - eo(p)) * 14 - 1.5 + Math.sin(t * 1.1) * .6).toFixed(2) + 'deg)'; }
        }
      };
    },

    /* list：标题居中，下面的金边白卡排成一把“扇”——中间大、两端小且向外倾、沿弧线下沉；
       卡片按顺序从大且歪的状态“托”到位，锯齿序号章跟着卡片旋入；落定后整把扇子轻轻呼吸；底部橙色胶囊写 aside */
    list: function (d) {
      var items = (d.items || []).slice(0, 5), n = items.length || 1,
          W0 = [520, 500, 470, 400, 335][n - 1], SPR = [0, 300, 560, 640, 700][n - 1], AR = n >= 4 ? .8 : .62,
          ti = function (i) { return .55 + i * (1.5 / n); };
      function geo(i) {
        var u = n > 1 ? (i - (n - 1) / 2) / ((n - 1) / 2) : 0;
        return { u: u, cx: 960 + u * SPR, s: n === 2 ? 1 : 1 - .22 * u * u, dy: n === 2 ? 0 : u * u * 80, r: u * (n === 2 ? 5 : 7) };
      }
      var sfx = [[0, 'transition', .45], [.25, 'type', .3]];
      items.forEach(function (it, i) { sfx.push([ti(i), 'card', i ? .42 : .48]); });
      if (d.aside) sfx.push([2.75, 'count', .4]);
      return {
        sfx: fin(sfx),
        build: function () {
          var h = burst(false) + confetti(30) + sparkles(6, false) +
            '<div class="abs rs-ttl" style="' + pos(410, 96, 'width:1100px;text-align:center;font-size:' + fit(d.title, 88, 1060) + 'px') + '"><span' + A('pop', .2, .5) + ' style="display:inline-block">' + hlBig(d.title || '', d.hl) + '</span></div>' +
            (d.kick ? '<div class="abs rs-kick"' + A('fade', .3) + ' style="' + pos(410, 222, 'width:1100px;text-align:center') + '">' + d.kick + '</div>' : '');
          var w = W0, ih = Math.round((w - 46) * AR), anyTag = items.some(function (it) { return it.tag && !/^0?\d{1,2}$/.test(it.tag); }),
              ch = ih + 46 + 14 + 62 + (anyTag ? 46 : 0), cy = d.aside ? 555 : 580;
          items.forEach(function (it, i) {
            var g = geo(i), x = Math.round(g.cx - w / 2), y = Math.round(cy - ch / 2 + g.dy), bs = Math.min(116, w * .3);
            var tag = it.tag && !/^0?\d{1,2}$/.test(it.tag) ? it.tag : '';
            h += '<div class="abs rs-card rs-lc" data-i="' + i + '" style="' + box(x, y, w, ch, 'z-index:' + Math.round(10 + g.s * 10)) + '">' +
              '<div class="rs-img" style="height:' + ih + 'px">' + (it.img ? '<img src="__BASE__' + it.img + '" alt="">' : '') + '</div>' +
              '<div class="rs-name" style="font-size:' + Math.max(44, fit(it.name, 56, w - 60)) + 'px">' + (it.name || '') + '</div>' +
              (tag ? '<div class="rs-tag">' + tag + '</div>' : '') +
              badge(bs / 2 - 30, bs / 2 - 34, bs, '<b style="font-size:' + Math.round(bs * .34) + 'px">0' + (i + 1) + '</b>', 'rs-lb" data-i="' + i) + '</div>';
          });
          if (d.aside) h += '<div class="abs" style="' + pos(410, 828, 'width:1100px;text-align:center') + '"><span class="rs-pill big"' + A('pop', 2.7, .45) + '>' + (d.aside.label || '') + ' <b>' + H.count(d.aside.value || 0, 2.75, .7) + '</b> ' + (d.aside.suffix || '') + '</span></div>';
          return h;
        },
        update: function (t, el) {
          base(t, el); confUpd(el, t);
          var breathe = Math.sin(t * 1.2) * .006;
          qa(el, '.rs-lc').forEach(function (c) {
            var i = +c.dataset.i, g = geo(i), p = (t - ti(i)) / .6, b = bk(p, 1.6);
            c.style.opacity = p > 0 ? 1 : 0;
            c.style.transform = 'translateY(' + ((1 - b) * 120 + Math.sin(t * 1.6 + i) * 4).toFixed(1) + 'px) scale(' + ((1.4 - .4 * b) * g.s * (1 + breathe)).toFixed(3) + ') rotate(' + (g.r + (1 - eo(p)) * (i % 2 ? 16 : -16) + Math.sin(t * 1.1 + i * 1.3) * .5).toFixed(2) + 'deg)';
          });
          qa(el, '.rs-lb').forEach(function (b) { spinIn(b, t, ti(+b.dataset.i) + .35, -10); });
        }
      };
    },

    /* focus：可可深场。金边白卡（图 + 底栏 kick）从大且歪荡进正中，右上角锯齿章盖印；卡下金色大标题、一行星号勾选、橙色时间胶囊 */
    focus: function (d) {
      var checks = d.checks || [], sfx = [[0, 'transition', .45], [.25, 'slide', .4], [1.15, 'reveal', .45]];
      checks.forEach(function (c, i) { sfx.push([1.65 + i * .3, 'check', .4]); });
      if (d.range) sfx.push([2.7, 'key', .35]);
      if (d.stamp) sfx.push([3.1, 'stamp', .6]);
      return {
        sfx: fin(sfx),
        build: function () {
          var ex = Math.min(150, (d.range ? 0 : 82) + (checks.length ? 0 : 68)), cw = Math.round(800 + ex * 800 / 510), chh = 510 + ex;
          var h = burst(true) + confetti(36) + sparkles(10, true) +
            '<div class="abs rs-card rs-fc" style="' + box(960 - cw / 2, 70, cw, chh) + '">' +
              '<div class="rs-img" style="height:' + (420 + ex) + 'px">' + BrollCore.media(d, H) + '</div>' +
              '<div class="rs-strip">' + (d.kick || '') + '</div></div>' +
            '<div class="abs rs-gold" style="' + pos(260, 612 + ex, 'width:1400px;text-align:center;font-size:' + fit(d.title, 88, 1200) + 'px') + '"><span' + A('pop', 1.15, .55) + ' style="display:inline-block">' + hlBig(d.title || '', d.hl).replace('rs-big', 'rs-big sm') + '</span></div>';
          if (checks.length) {
            h += '<div class="abs rs-checks" style="' + pos(160, 730 + ex, 'width:1600px') + '">';
            checks.forEach(function (c, i) { h += '<span' + A('pop', 1.65 + i * .3, .4) + '><svg viewBox="-10 -10 20 20"><path d="M0-10Q1-1 10 0Q1 1 0 10Q-1 1-10 0Q-1-1 0-10Z" fill="var(--accent2)"/></svg>' + c + '</span>'; });
            h += '</div>';
          }
          if (d.range) h += '<div class="abs" style="' + pos(160, 812 + ex, 'width:1600px;text-align:center') + '"><span class="rs-pill"' + A('pop', 2.7, .4) + '>' + d.range.from + 's &nbsp;•&nbsp; ' + d.range.to + 's</span></div>';
          if (d.stamp) h += badge(Math.min(1398, 960 + cw / 2), 110, 240, '<b class="w">' + d.stamp.text + '</b>' + (d.stamp.sub ? '<small>' + d.stamp.sub + '</small>' : ''), 'rs-fs');
          return h;
        },
        update: function (t, el) {
          base(t, el); confUpd(el, t);
          var c = q(el, '.rs-fc'), p = (t - .2) / .75, b = bk(p, 1.4);
          c.style.opacity = p > 0 ? 1 : 0;
          c.style.transform = 'translate(' + ((1 - eo(p)) * -260).toFixed(1) + 'px,' + ((1 - b) * 80).toFixed(1) + 'px) scale(' + ((1.32 - .32 * b) * (1 - .03 * cl((t - 1) / 3))).toFixed(3) + ') rotate(' + ((1 - eo(p)) * -12).toFixed(2) + 'deg)';
          var s = q(el, '.rs-fs'); if (s) spinIn(s, t, 3.05, 8);
        }
      };
    },

    /* metric：奶油旭日正中巨大描边数字弹出 + 金色光圈扩散 + 纸屑炸开；下面结论；左下金边拍立得，右下锯齿大章写 note，底部白胶囊放 logo */
    metric: function (d) {
      var sfx = [[0, 'transition', .45], [.3, 'hit', .55], [.45, 'count', .4], [1.5, 'reveal', .45]];
      if (d.img) sfx.push([1.9, 'card', .4]);
      if (d.note) sfx.push([2.45, 'stamp', .55]);
      return {
        sfx: fin(sfx),
        build: function () {
          var v = Math.round(+d.value || 0).toLocaleString('en-US') + (d.suffix || ''), bare = !d.img && !d.note && !d.logo, dy = bare ? 50 : 0;
          var ns = Math.min(v.length > 4 ? 280 : 360, Math.floor(1300 / (v.length * .72))) * (bare ? 1.08 : 1) | 0;
          var cap = String(d.caption || ''), capH = d.hl && cap.indexOf(d.hl) >= 0 ? cap.replace(d.hl, '<span class="rs-hl">' + d.hl + '</span>') : cap;
          var cs = fit(cap, 72, bare ? 960 : 1060);
          return burst(false) + '<div class="abs rs-ring" style="' + box(560, 40 + dy, 800, 800) + '"></div>' + confetti(48) + sparkles(8, false) +
            (d.kick ? '<div class="abs" style="' + pos(410, 96 + dy * .6, 'width:1100px;text-align:center') + '"><span class="rs-pill"' + A('pop', .1, .4) + '>' + d.kick + '</span></div>' : '') +
            '<div class="abs" style="' + pos(260, 180 + dy, 'width:1400px;text-align:center') + '"><span class="rs-big num"' + A('pop', .25, .65) + ' style="display:inline-block;font-size:' + ns + 'px">' + H.count(+d.value || 0, .4, 1.1) + '<span style="font-size:.42em">' + (d.suffix || '') + '</span></span></div>' +
            (bare ? '<div class="abs rs-rib-w" style="' + pos(260, 640, 'width:1400px;text-align:center') + '"><span class="rs-ribbon"' + A('pop', 1.5, .55) + ' style="font-size:' + cs + 'px">' + capH + '</span></div>'
                  : '<div class="abs rs-ttl" style="' + pos(410, 600, 'width:1100px;text-align:center;font-size:' + cs + 'px') + '"><span' + A('up', 1.5) + ' style="display:inline-block">' + capH + '</span></div>') +
            (d.img ? '<div class="abs rs-card rs-pol"' + A('lift', 1.9, .6) + ' style="' + box(70, 640, 380, 250, '--r:-8deg;padding:12px') + '"><div class="rs-img" style="height:100%"><img src="__BASE__' + d.img + '" alt=""></div></div>' : '') +
            (d.note ? badge(1640, 700, 300, '<b class="note" style="font-size:' + Math.min(48, Math.floor(210 / (d.note.length || 1))) + 'px">' + d.note + '</b>', 'rs-nb') : '') +
            (d.logo ? '<div class="abs rs-logo"' + A('pop', 2.2, .4) + ' style="' + box(850, 810, 220, 64) + '"><img src="__BASE__' + d.logo + '" alt=""></div>' : '');
        },
        update: function (t, el) {
          base(t, el); confUpd(el, t, .35, 960, 400);
          var r = q(el, '.rs-ring'), p = cl((t - .3) / 1.1);
          r.style.opacity = p > 0 && p < 1 ? 1 - p : 0; r.style.transform = 'scale(' + (.2 + 1.3 * eo(p)) + ')';
          var nb = q(el, '.rs-nb'); if (nb) spinIn(nb, t, 2.4, -8);
          var rb = q(el, '.rs-rib-w'); if (rb) rb.style.transform = 'rotate(' + (-2 + Math.sin(t * 1.3) * .6).toFixed(2) + 'deg)';
        }
      };
    }
  };
});
