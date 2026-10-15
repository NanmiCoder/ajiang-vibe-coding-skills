/* 孔版印刷（Riso Print）— prompt-motion #170 Risograph studio intro
 * 版式语言：米色纸上的孔版海报 —— 满屏色带（粉斜纹 / 黄斜纹 / 网点 / 竖细纹）切成上下或左右两块，
 * 字压在纸色标签框里，大字粉蓝套印错位，粉圆蓝圆正片叠底出重叠色；换页 = 新的一块印版（花纹满屏）从下往上抽走。 */
BrollCore.template('riso-print', function (H) {
  var A = H.A, box = H.box, pos = H.pos, hlify = BrollCore.hlify;
  function cl(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function eo(x) { x = cl(x); return 1 - Math.pow(1 - x, 3); }
  function eio(x) { x = cl(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function bk(x) { x = cl(x); var c = 1.7, c3 = c + 1; return 1 + c3 * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
  function q(el, s) { return el.querySelector(s); }
  function qa(el, s) { return el.querySelectorAll(s); }
  var grain = '<div class="ri-grain"></div>';
  // 换页印版：整屏花纹在 t=0 盖住，0.08–0.5s 往上抽走
  function plate(cls) { return '<div class="ri-plate ' + cls + '"></div>'; }
  function plateUpd(t, el) { var p = q(el, '.ri-plate'); if (p) p.style.transform = 'translateY(' + (-104 * eio((t - .08) / .42)) + '%)'; }
  function fit(text, max, w) { var n = (text || '').length || 1; return Math.max(34, Math.min(max, Math.floor(w / n))); }

  return {
    /* hero：上粉斜纹带 + 下黄斜纹带，粉圆先“印”在中间再被色带吃掉；上带纸色框里放标题，下带巨字（hl）套印 */
    hero: function (d) {
      // 有图：巨字靠左（x80–1220），右下角一张套印画框（避开字幕行和头像）；没图：巨字满宽居中
      var big = d.hl || d.kick || '', img = d.img || d.clip, bs = img ? fit(big, 210, 1120) : fit(big, 230, 1640);
      var sfx = [[.05, 'enter', .5], [.5, 'slide', .4], [.75, 'slide', .35], [1.0, 'reveal', .5], [1.5, 'hit', .45]];
      if (img) sfx.push([1.85, 'shot', .4]);
      if (d.sub) sfx.push([2.2, 'type', .3]);
      return {
        sfx: sfx,
        build: function () {
          var ph = img ? '<div class="abs"' + A('wipe', 1.75, .45) + ' style="' + box(1316, 596, 540, 300, 'background:var(--fg);mix-blend-mode:multiply') + '"></div>' +
            '<div class="abs ri-frame"' + A('wipeY', 1.8, .5) + ' style="' + box(1290, 570, 540, 300) + '">' + BrollCore.media(d, H) + '</div>' : '';
          return '<div class="ri-paper"></div>' +
            '<div class="abs ri-band ri-stripe-pink" data-k="top" style="' + box(0, 0, 1920, 530) + '"></div>' +
            '<div class="abs ri-band ri-stripe-yel" data-k="bot" style="' + box(0, 530, 1920, 560) + '"></div>' +
            '<div class="abs ri-circ" style="' + box(760, 240, 400, 400, 'background:var(--accent)') + '"></div>' +
            '<div class="abs ri-box"' + A('wipe', 1.0, .5) + ' style="' + box(150, 90, 1300, 370, 'display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:20px 50px') + '">' +
              '<div class="ri-kick">' + (d.kick || '') + '</div>' +
              '<div class="ttl ri-ttl"' + A('misreg', 1.15, .6) + ' style="font-size:' + fit(d.title, 100, 1150) + 'px">' + (d.title || '') + '</div>' +
              (d.sub ? '<div class="ri-sub"' + A('fade', 2.1, .5) + '>' + d.sub + '</div>' : '') + '</div>' +
            (img ? '<div class="abs ri-giant"' + A('misreg', 1.5, .6) + ' style="' + pos(80, 720 - bs * .5, 'width:1160px;text-align:left;font-size:' + bs + 'px') + '">' + big + '</div>'
                 : '<div class="abs ri-giant"' + A('misreg', 1.5, .6) + ' style="' + pos(0, 600, 'width:1920px;text-align:center;font-size:' + bs + 'px') + '">' + big + '</div>') + ph + grain;
        },
        update: function (t, el) {
          var c = q(el, '.ri-circ'), s = t < .5 ? bk(t / .45) : 1 - eio((t - .55) / .35) * .15;
          c.style.transform = 'scale(' + s + ')'; c.style.opacity = t > .9 ? 0 : 1;
          var top = q(el, '[data-k=top]'), bot = q(el, '[data-k=bot]');
          top.style.transform = 'translateX(' + (-100 * (1 - eo((t - .45) / .45))) + '%)';
          bot.style.transform = 'translateX(' + (100 * (1 - eo((t - .65) / .45))) + '%)';
          top.style.backgroundPosition = (t * 24) + 'px 0'; bot.style.backgroundPosition = (-t * 24) + 'px 0';
        }
      };
    },

    /* list：左边整条黄色竖栏放巨型序号（01→02→03 翻牌），右边一张套印画框逐张盖印；栏里竖排条目清单逐个点亮；最后一条黄斜幅压过来写 aside */
    list: function (d) {
      var items = d.items || [], n = items.length || 1, D = 2.3 / n;
      var t0 = function (i) { return .55 + i * D; };
      var sfx = [[0, 'transition', .45], [.35, 'type', .35]];
      items.forEach(function (it, i) { sfx.push([t0(i) + .05, i ? 'card' : 'stamp', i ? .45 : .5]); });
      if (d.aside) sfx.push([3.05, 'hit', .5], [3.3, 'count', .4]);
      return {
        sfx: sfx,
        build: function () {
          // 条目少时清单字更大、间距更松，竖栏不空
          var cfs = n <= 3 ? 42 : 34, cgap = n <= 3 ? 92 : 72, cy0 = n <= 3 ? 580 : 560;
          var h = '<div class="ri-paper"></div>' +
            '<div class="abs" style="' + box(0, 0, 520, 1080, 'background:var(--accent2)') + '"' + A('wipeY', .25, .45) + '></div>' +
            '<div class="abs ri-label"' + A('fade', .45) + ' style="' + pos(60, 90, 'font-size:26px') + '">' + (d.kick || '') + '</div>' +
            '<div class="abs ri-num ri-flip" style="' + pos(36, 150, 'font-size:340px') + '">01</div>' +
            '<div class="abs ri-stripe-pink" style="' + box(1580, 0, 340, 1080) + '"' + A('wipeY', .3, .5) + '></div>' +
            '<div class="abs ttl ri-ttl"' + A('misreg', .35, .6) + ' style="' + pos(600, 100, 'font-size:' + fit(d.title, 78, 880) + 'px;max-width:900px') + '">' + hlify(d.title || '', d.hl) + '</div>' +
            '<div class="abs" style="' + box(630, 250, 900, 480, 'background:var(--accent);mix-blend-mode:multiply') + '"' + A('fade', .5) + '></div>' +
            '<div class="abs ri-frame" style="' + box(600, 222, 900, 480) + '">';
          items.forEach(function (it, i) { h += '<img class="ri-img" data-i="' + i + '" src="__BASE__' + it.img + '" alt="">'; });
          h += '</div>';
          items.forEach(function (it, i) {
            // 条目名限宽 x600–1440（aside 斜幅在它右边），标签另算宽度
            var nw = d.aside ? 840 : 900, tw = it.tag ? Math.min(220, 24 + String(it.tag).length * 20) : 0;
            h += '<div class="abs ri-name" data-i="' + i + '" style="' + pos(600, 752, 'width:' + nw + 'px;display:flex;align-items:baseline;gap:22px;white-space:nowrap;overflow:hidden') + '">' +
              '<div class="ttl ri-ttl" style="font-size:' + fit(it.name, 96, Math.min(640, nw - tw - 22)) + 'px;line-height:1.08">' + it.name + '</div>' +
              (it.tag ? '<div class="ri-tag" style="font-size:34px">' + it.tag + '</div>' : '') + '</div>';
            h += '<div class="abs ri-chip" data-i="' + i + '" style="' + pos(60, cy0 + i * cgap, 'max-width:430px;font-size:' + cfs + 'px') + '"><b>0' + (i + 1) + '</b>' + it.name + '</div>';
          });
          // 栏底一块粉网点补位（装饰，可经过字幕行）
          var dy = Math.min(940, cy0 + (n - 1) * cgap + 64 + 48);
          h += '<div class="abs ri-dots ri-dots-s"' + A('wipeY', .5, .5) + ' style="' + box(0, dy, 520, 1080 - dy) + '"></div>';
          // aside 斜幅：从右侧压进来，落在画框右下、条目名右边（x1470 起），不压条目名、不进字幕行
          if (d.aside) h += '<div class="abs ri-banner" style="' + box(1470, 772, 560, 116, '--r:-8deg') + '">' +
            '<span class="ri-banner-t">' + d.aside.label + ' <b>' + H.count(d.aside.value, 3.3, .6) + (d.aside.suffix || '') + '</b></span></div>';
          return h + grain + plate('ri-stripe-yel');
        },
        update: function (t, el) {
          plateUpd(t, el);
          var cur = -1; for (var i = 0; i < n; i++) if (t >= t0(i)) cur = i;
          var num = q(el, '.ri-flip'), ci = Math.max(0, cur), pf = cl((t - t0(ci)) / .22);
          num.textContent = (ci + 1 < 10 ? '0' : '') + (ci + 1);
          num.style.opacity = cur < 0 ? cl((t - .3) / .2) : 1;
          num.style.transform = 'scaleY(' + (cur < 0 ? 1 : .2 + .8 * bk(pf)) + ')'; num.style.transformOrigin = 'center 60%';
          var off = 12 * (1 - eo(pf)); num.style.textShadow = (6 + off) + 'px ' + (4 + off * .6) + 'px 0 color-mix(in srgb,var(--fg) 70%,transparent)';
          qa(el, '.ri-img').forEach(function (m) {
            var i = +m.dataset.i, p = eio((t - t0(i)) / .35);
            m.style.clipPath = 'inset(0 0 ' + ((1 - p) * 100) + '% 0)'; m.style.opacity = t >= t0(i) ? 1 : 0;
          });
          qa(el, '.ri-name').forEach(function (m) {
            var i = +m.dataset.i, on = i === cur, p = eo((t - t0(i)) / .35);
            m.style.opacity = on ? p : 0; m.style.transform = 'translateX(' + (1 - p) * 40 + 'px)';
          });
          qa(el, '.ri-chip').forEach(function (m) {
            var i = +m.dataset.i, p = cl((t - .5 - i * .08) / .3), lit = t >= t0(i);
            m.style.opacity = p; m.style.transform = 'translateX(' + (1 - eo(p)) * -30 + 'px)';
            m.className = 'abs ri-chip' + (lit ? ' on' : '') + (i === cur ? ' cur' : '');
          });
          var b = q(el, '.ri-banner');
          if (b) { var pb = eo((t - 3.0) / .35); b.style.transform = 'rotate(-8deg) translateX(' + (1 - pb) * 700 + 'px)'; b.style.backgroundPosition = (t * 30) + 'px 0'; }
        }
      };
    },

    /* focus：满屏粉网点；左上黄标签写标题，大画框带蓝色错版底块；右边纸色标签逐条打勾；画框下一排圆点就是时间轴；最后一个大粉圆“盖章” */
    focus: function (d) {
      var checks = d.checks || [], sfx = [[0, 'transition', .45], [.55, 'slide', .4]];
      checks.forEach(function (c, i) { sfx.push([1.35 + i * .45, 'check', .45]); });
      if (d.range) sfx.push([1.1 + (checks.length ? .0 : .3), 'draw', .35]);
      if (d.stamp) sfx.push([3.2, 'stamp', .6]);
      if (checks.length === 1 && !d.stamp) sfx.push([1.75, 'mark', .35]);
      sfx.sort(function (a, b) { return a[0] - b[0]; });
      for (var k = 1; k < sfx.length; k++) if (sfx[k][0] - sfx[k - 1][0] < .15) sfx[k][0] = +(sfx[k - 1][0] + .15).toFixed(2);
      return {
        sfx: sfx,
        build: function () {
          // 自适应：检查项 ≤2 时画框放大（无 range 600 高，有 range 500 高以便时间轴不进字幕行），检查项竖向居中于画框；只有 1 条时做成大标签
          var nC = checks.length, big = nC <= 2, fh = d.range ? 500 : (big ? 600 : 500), fw = big ? Math.round(fh * 1.92) : 960;
          var fx = 110, fy = 282, cx = fx + fw + 70, cfs = nC === 1 ? 72 : 54, cg = nC === 1 ? 0 : 112;
          var cy = fy + fh / 2 - ((nC - 1) * cg) / 2 - cfs * .75;
          var h = '<div class="ri-paper"></div><div class="abs ri-dots" style="' + box(0, 0, 1920, 1080) + '"></div>' +
            '<div class="abs ri-box ri-yel"' + A('wipe', .3, .45) + ' style="' + pos(110, 80, 'padding:18px 40px 22px;max-width:1000px') + '">' +
              '<div class="ri-kick" style="color:var(--fg)">' + (d.kick || '') + '</div>' +
              '<div class="ttl ri-ttl" style="font-size:' + fit(d.title, 80, 920) + 'px">' + hlify(d.title || '', d.hl) + '</div></div>' +
            '<div class="abs" style="' + box(fx + 32, fy + 30, fw, fh, 'background:var(--fg);mix-blend-mode:multiply') + '"' + A('wipe', .55, .5) + '></div>' +
            '<div class="abs ri-frame ri-fpush"' + A('wipeY', .7, .5) + ' style="' + box(fx, fy, fw, fh) + '">' + BrollCore.media(d, H) + '</div>';
          if (d.range) {
            var N = Math.max(8, Math.min(30, Math.round(d.range.total))), gap = fw / N, a = d.range.from / d.range.total * N, b = d.range.to / d.range.total * N;
            for (var i = 0; i < N; i++) {
              var on = i + .5 >= a && i + .5 <= b;
              h += '<i class="abs ri-rd' + (on ? ' on' : '') + '"' + A('pop', 1.1 + i * .02, .3) + ' style="' + box(fx + i * gap + gap / 2 - 12, fy + fh + 30, 24, 24) + '"></i>';
            }
            h += '<div class="abs ri-tag"' + A('fade', 1.3) + ' style="' + pos(fx, fy + fh + 62, 'font-size:22px') + '">' + d.range.from + 's</div>' +
              '<div class="abs ri-tag"' + A('fade', 1.3) + ' style="' + pos(fx + fw - 140, fy + fh + 62, 'font-size:22px;width:140px;text-align:right') + '">' + d.range.to + 's</div>';
          }
          checks.forEach(function (c, i) {
            var t = 1.35 + i * .45, sz = nC === 1 ? 64 : 46;
            h += '<div class="abs ri-box ri-check"' + A('pop', t, .4) + ' style="' + pos(cx, cy + i * cg, 'font-size:' + cfs + 'px;max-width:' + (1890 - cx) + 'px') + '">' +
              '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 46 46"><circle cx="23" cy="23" r="21" fill="var(--accent)"/><path d="M12 24l7 7 15-16" fill="none" stroke="var(--fg)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"' + A('draw', t + .12, .3) + '/></svg>' +
              '<span>' + c + '</span></div>';
          });
          // 只有 1 条且没章：标签下方加一条黄斜纹短幅当底座，右栏不空
          if (nC === 1 && !d.stamp) h += '<div class="abs ri-stripe-yel"' + A('wipe', 1.6, .45) + ' style="' + box(cx - 30, cy + cfs * 1.9, 1920 - cx + 30, 46) + '"></div>';
          if (d.stamp) h += '<div class="abs ri-stampc" style="' + box(Math.min(fx + fw - 240, 1180), 120, 300, 300) + '"><b>' + d.stamp.text + '</b>' + (d.stamp.sub ? '<small>' + d.stamp.sub + '</small>' : '') + '</div>';
          return h + grain + plate('ri-vlines');
        },
        update: function (t, el) {
          plateUpd(t, el);
          var fi = q(el, '.ri-fpush img, .ri-fpush .clip'); if (fi) fi.style.transform = 'scale(' + (1.02 + .03 * eio(t / 6)) + ')';
          var dt = q(el, '.ri-dots'); dt.style.backgroundPosition = (t * 14) + 'px ' + (t * 8) + 'px,' + (35 - t * 10) + 'px ' + (35 + t * 6) + 'px';
          var s = q(el, '.ri-stampc');
          if (s) { var p = (t - 3.2) / .4; s.style.opacity = p > 0 ? 1 : 0; s.style.transform = 'scale(' + (p < 1 ? .3 + .7 * bk(p) : 1 + .015 * Math.sin((t - 3.6) * 3)) + ') rotate(' + (-10 + 4 * (1 - eo(p))) + 'deg)'; }
        }
      };
    },

    /* metric：粉蓝两个大圆从两侧推来叠成维恩图，重叠处出现深色星芒；粉圆里是数字，蓝圆里是叠印成蓝单色的图；标签在上，结论在下 */
    metric: function (d) {
      var sfx = [[0, 'transition', .45], [.35, 'slide', .4], [.75, 'hit', .5], [1.0, 'count', .4], [1.9, 'reveal', .45]];
      if (d.note) sfx.push([2.7, 'stamp', .5]);
      return {
        sfx: sfx,
        build: function () {
          // 数字宽度估算（Archivo Black：数字≈.62em，千分位逗号≈.3em，后缀按 .45em 字号，中文 1em/英文 .7em）→ 限在粉圆可用宽 560 内
          var v = Math.round(+d.value || 0).toLocaleString('en-US'), suf = d.suffix || '', w = 0;
          for (var i = 0; i < v.length; i++) w += /[0-9]/.test(v[i]) ? .62 : .3;
          for (var j = 0; j < suf.length; j++) w += .45 * (/[\u3000-\u9fff]/.test(suf[j]) ? 1 : .8);
          var ns = Math.min(250, Math.floor(560 / Math.max(w, 1))), wide = w * ns > 470;
          var hasImg = !!d.img, kickIn = !hasImg && d.kick;
          // 没图：蓝圆里放纸色网点 + kick 文字（kick 不再放顶上），不留空圆
          var blue = hasImg ? '<img src="__BASE__' + d.img + '" alt="" class="ri-duo">'
            : '<div class="ri-vdots"></div>' + (kickIn ? '<div class="ri-vkick" style="font-size:' + fit(d.kick, 76, 400) + 'px">' + d.kick + '</div>' : '');
          return '<div class="ri-paper"></div>' +
            (kickIn ? '' : '<div class="abs ri-kick"' + A('fade', .4) + ' style="' + pos(0, 70, 'width:1520px;text-align:center;font-size:40px;font-weight:900;font-family:var(--title);letter-spacing:.02em;color:var(--fg);text-transform:none') + '">' + (d.kick || '') + '</div>') +
            '<div class="abs ri-vc" data-k="b" style="' + box(870, 130, 640, 640, 'background:var(--fg)') + '">' + blue + '</div>' +
            '<div class="abs ri-vc" data-k="p" style="' + box(410, 130, 640, 640, 'background:var(--accent)') + '"></div>' +
            '<svg class="abs ri-star" viewBox="-100 -100 200 200" style="' + (wide ? box(895, 525, 130, 130) : box(870, 340, 180, 180)) + '"><polygon points="' + (function () { var p = []; for (var i = 0; i < 16; i++) { var r = i % 2 ? 52 : 96, a = i * Math.PI / 8; p.push((r * Math.sin(a)).toFixed(1) + ',' + (-r * Math.cos(a)).toFixed(1)); } return p.join(' '); })() + '" fill="var(--ink)"/></svg>' +
            '<div class="abs ri-vnum" style="' + pos((wide ? 730 : Math.min(730, 862 - w * ns / 2)) - 300, 440 - ns * .5, 'width:600px;text-align:center;font-size:' + ns + 'px') + '">' + H.count(d.value, 1.0, 1.0) + '<span style="font-size:.45em">' + suf + '</span></div>' +
            '<div class="abs ttl ri-ttl"' + A('misreg', 1.9, .6) + ' style="' + pos(0, 792, 'width:1920px;text-align:center;font-size:' + fit(d.caption, 72, 1100) + 'px') + '">' + (d.caption || '').replace(d.hl, '<span class="ri-hlbox">' + d.hl + '</span>') + '</div>' +
            (d.note ? '<div class="abs ri-note" style="' + pos(1500, 640, '--r:-8deg') + '">' + d.note + '</div>' : '') +
            (d.logo ? '<div class="abs"' + A('fade', 2.2) + ' style="' + box(1660, 990, 180, 44) + '"><img src="__BASE__' + d.logo + '" alt="" style="width:100%;height:100%;display:block"></div>' : '') +
            grain + plate('ri-stripe-pink');
        },
        update: function (t, el) {
          plateUpd(t, el);
          var p = eo((t - .25) / .6), b = bk((t - .25) / .6);
          q(el, '[data-k=p]').style.transform = 'translateX(' + (1 - b) * -700 + 'px)';
          q(el, '[data-k=b]').style.transform = 'translateX(' + (1 - b) * 700 + 'px)';
          var s = q(el, '.ri-star'), ps = (t - .75) / .4;
          s.style.opacity = ps > 0 ? 1 : 0; s.style.transform = 'scale(' + (ps < 1 ? bk(ps) : 1) + ') rotate(' + (t * 20) + 'deg)';
          var nm = q(el, '.ri-vnum'); nm.style.opacity = p; var o = 3 + 12 * (1 - eo((t - .8) / .6));
          nm.style.textShadow = o + 'px ' + o * .7 + 'px 0 color-mix(in srgb,var(--fg) 75%,transparent)';
          var vk = q(el, '.ri-vkick'); if (vk) { var pk = eo((t - 1.2) / .5); vk.style.opacity = pk; vk.style.transform = 'translateY(' + (1 - pk) * 30 + 'px)'; }
          var vd = q(el, '.ri-vdots'); if (vd) vd.style.backgroundPosition = (t * 10) + 'px ' + (-t * 6) + 'px';
          var nt = q(el, '.ri-note');
          if (nt) { var pn = (t - 2.7) / .4; nt.style.opacity = pn > 0 ? 1 : 0; nt.style.transform = 'rotate(-8deg) scale(' + (pn < 1 ? .4 + .6 * bk(pn) : 1) + ')'; }
        }
      };
    }
  };
});
