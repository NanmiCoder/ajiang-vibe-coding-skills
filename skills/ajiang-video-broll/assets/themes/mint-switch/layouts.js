/* 黑白薄荷 · 版式语言：Sherwood 协议讲解片（参考 prompt-motion #89）。
 * 纯黑 ⇄ 骨白整屏硬切。白场是“步骤页”：顶部 01/02/03 步骤条带进度下划线，左栏巨大的薄荷描边等宽编号 + 名字，
 * 右栏浅薄荷底板上浮一张白色 UI 卡；黑场是居中白字（重点词薄荷色）+ 终端卡 + 漂浮的等宽小标签；
 * 结尾是整屏照片压暗 + 居中大字。招牌：标题重点逐字被薄荷高亮块擦出、编号像里程表一样滚动换步。 */
(function () {
  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function io(x) { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function ex(x) { x = clamp(x); return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); }
  function len(s) { var L = 0; s = String(s || '').replace(/<[^>]+>/g, ''); for (var i = 0; i < s.length; i++) L += /[\x00-\xff]/.test(s[i]) ? (s[i] === ' ' ? .3 : .58) : 1; return L || 1; }
  function fit(s, w, max, min) { return Math.max(min, Math.min(max, Math.floor(w / len(s)))); }
  function pad(i) { return (i < 9 ? '0' : '') + (i + 1); }

  BrollCore.template('mint-switch', function (H) {
    var A = H.A, box = H.box, pos = H.pos;
    function cap(sfx) {
      var out = [], last = -9; sfx.sort(function (a, b) { return a[0] - b[0]; });
      sfx.forEach(function (s) { if (s[0] - last >= .15) { out.push([+s[0].toFixed(2), s[1], s[2]]); last = s[0]; } });
      while (out.length > 7) { var k = -1; for (var i = out.length - 1; i > 0; i--) if (/card|check|deal|slide/.test(out[i][1]) && out[i - 1][1] === out[i][1]) { k = i; break; } if (k < 0) k = out.length - 2; out.splice(k, 1); }
      return out;
    }
    // 重点词：每个字后面一块薄荷高亮，依次从左擦出（参考片里 hedge / fund / manager 逐词上底色）
    function boxes(title, hl, t0, dark) {
      var s = title || '', i = hl ? s.indexOf(hl) : -1;
      if (i < 0) return s;
      var chars = hl.match(/[A-Za-z0-9.%+\-]+|\s+|[^\sA-Za-z0-9]{1,2}/g) || [], k = 0;
      var inner = chars.map(function (c) { return '<span class="mt-hb" data-t="' + (t0 + (k++) * .09).toFixed(2) + '">' + c + '</span>'; }).join(''); // 空格也上底色，重点词是一整块
      return s.slice(0, i) + '<span class="mt-hls' + (dark ? ' dk' : '') + '">' + inner + '</span>' + s.slice(i + hl.length);
    }
    function hbUpdate(el, t) { var b = el.querySelectorAll('.mt-hb'); for (var i = 0; i < b.length; i++) { var p = io((t - +b[i].dataset.t) / .22); b[i].style.backgroundSize = (p * 100) + '% 100%'; b[i].classList.toggle('on', p > .5); } }
    // 黑场漂浮的等宽小标签（装饰，确定性伪随机）
    function chips(n, seed, label) {
      var o = '';
      for (var i = 0; i < n; i++) {
        var r1 = ((i * 73 + seed * 31) % 97) / 97, r2 = ((i * 41 + seed * 17) % 89) / 89, side = i % 2;
        var x = side ? 1490 + r1 * 340 : 40 + r1 * 330, y = 160 + r2 * 700;
        var w1 = 40 + Math.round(r2 * 60), w2 = 24 + Math.round(r1 * 40); // 无文字的骨架胶囊：一个点 + 两段灰条，只做质感不出现无意义英文
        o += '<span class="mt-chip" data-i="' + i + '" style="left:' + x.toFixed(0) + 'px;top:' + y.toFixed(0) + 'px"><i style="width:' + w1 + 'px"></i><i style="width:' + w2 + 'px"></i></span>';
      }
      return '<div class="mt-chips"' + A('fade', .3, 1) + '>' + o + '</div>';
    }
    function chipUpdate(el, t) { var c = el.querySelectorAll('.mt-chip'); for (var i = 0; i < c.length; i++) c[i].style.transform = 'translate(' + (Math.sin(t * .5 + i * 1.7) * 14) + 'px,' + (-t * (6 + i % 4 * 2)) + 'px)'; }
    function glow(x, y) { return '<div class="mt-glow" style="left:' + (x - 700) + 'px;top:' + (y - 500) + 'px"></div>'; }

    return {
      /* 开场：黑场 + 柔光，居中两行白字（重点薄荷），两侧漂浮小标签 */
      hero: function (d) {
        var hasImg = !!d.img, sz = hasImg ? fit(d.title, 1080, 112, 64) : fit(d.title, 1150, 132, 80);
        var tY = hasImg ? 186 : 380, subY = tY + sz * 1.22 + 22, cardY = (d.sub ? subY + 74 : tY + sz * 1.22 + 52), ih = 880 - cardY - 78, iw = Math.min(1100, Math.round(ih * 16 / 9));
        return {
          sfx: cap([[.05, 'enter', .45], [.3, 'type', .35], [.9, 'reveal', .45], d.sub ? [1.35, 'slide', .35] : null, hasImg ? [1.7, 'card', .45] : null].filter(Boolean)),
          build: function () {
            var h = '<div class="mt-dark"></div>' + glow(960, hasImg ? 260 : 420) + chips(12, 3, 'agent') +
              (d.kick ? '<div class="abs mt-kick"' + A('fade', .1) + ' style="' + box(460, tY - 44, 1000, 30, 'text-align:center') + '">' + d.kick + '</div>' : '') +
              '<div class="abs ttl mt-on"' + A('up', .3, .6) + ' style="' + box(410, tY, 1100, sz * 2.5, 'text-align:center;font-size:' + sz + 'px') + '">' + boxes(d.title, d.hl, .9, true) + '</div>' +
              (d.sub ? '<div class="abs mt-subd"' + A('up', 1.35) + ' style="' + box(410, hasImg ? subY : tY + sz * 1.22 * Math.ceil(len(d.title) * sz / 1100) + 30, 1100, 50, 'text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis') + '">' + d.sub + '</div>' : '');
            if (hasImg) h += '<div class="abs mt-term"' + A('up', 1.6, .6) + ' style="' + box(960 - iw / 2 - 30, cardY, iw + 60, ih + 78) + '"><div class="mt-tbar"><i></i><i></i><i></i></div>' +
              '<div class="mt-timg mt-himg" style="height:' + ih + 'px"><img src="__BASE__' + d.img + '" alt=""></div></div>';
            return h;
          },
          update: function (t, el) { hbUpdate(el, t); chipUpdate(el, t); var m = el.querySelector('.mt-himg img'); if (m) m.style.transform = 'scale(' + (1.08 - .05 * clamp((t - 1.6) / 5)) + ')'; }
        };
      },

            /* 清单：白场步骤页。顶部步骤条（每个条目一格，进度下划线一格一格走满），
       * 左栏：kicker、标题（重点逐字上薄荷底）、里程表式滚动的大编号 + 条目名；右栏：薄荷底板上的白卡，跟着步骤换图。 */
      list: function (d, sc) {
        var items = (d.items || []).slice(0, 5), n = Math.max(1, items.length), V = n >= 4;  // 4–5 个条目：左栏改成竖排索引，逐个聚焦
        var D = sc && sc.to != null ? sc.to - sc.from : 4, T0 = V ? .8 : 1.0, ST = Math.max(.5, Math.min(1.8, (D - T0 - .7) / n)), TE = T0 + n * ST;
        var segW = (1390 - 24 * (n - 1)) / n, longest = items.reduce(function (a, b) { return len(b.name) > len(a) ? b.name : a; }, '');
        var nameSz = fit(longest, 640, 88, 64), rowH = Math.min(96, Math.floor(430 / n)), vSz = Math.max(36, Math.min(60, Math.floor(600 / len(longest))));
        var sfx = [[0, 'transition', .4]];
        items.forEach(function (it, i) { sfx.push([T0 + i * ST, 'slide', .45]); });
        if (d.aside) sfx.push([Math.min(TE, D - .4) - .1, 'count', .4]);
        [[.25, 'enter', .45], [.6, 'reveal', .4]].forEach(function (e) { if (sfx.length < 7) sfx.push(e); });
        return {
          sfx: cap(sfx),
          build: function () {
            var h = '<div class="mt-paper"></div>';
            items.forEach(function (it, i) {
              var x = 90 + i * (segW + 24);
              h += '<div class="abs mt-step" data-i="' + i + '"' + A('fade', .15 + i * .06, .4) + ' style="' + box(x, 52, segW, 60) + '"><b>' + pad(i) + '</b>' + (V ? '' : '<span>' + it.name + '</span>') + '<i class="mt-trk"><i class="mt-fill"></i></i></div>';
            });
            h += (d.kick ? '<div class="abs mt-kick dk"' + A('fade', .3) + ' style="' + pos(90, 196) + '">' + d.kick + '</div>' : '') +
              '<div class="abs ttl"' + A('up', .25, .5) + ' style="' + pos(90, 232, 'font-size:' + fit(d.title, 680, 76, 64) + 'px;width:700px;line-height:1.15') + '">' + boxes(d.title, d.hl, .75) + '</div>';
            if (V) {
              var y0 = 880 - n * rowH;
              h += '<i class="abs mt-vbar" style="' + box(84, y0 + 14, 8, rowH - 28) + '"></i>';
              items.forEach(function (it, i) {
                h += '<div class="abs mt-vrow" data-i="' + i + '"' + A('up', .5 + i * .07, .45) + ' style="' + box(116, y0 + i * rowH, 680, rowH) + '"><div class="mt-vin" style="font-size:' + vSz + 'px"><b>' + pad(i) + '</b><span>' + it.name + '</span></div></div>';
              });
            } else {
              // 里程表：编号和名字各一列，按步骤上滚
              var nums = items.map(function (it, i) { return '<div>' + pad(i) + '</div>'; }).join(''), names = items.map(function (it) { return '<div>' + it.name + '<span class="mt-dot">.</span></div>'; }).join('');
              h += '<div class="abs mt-odo mt-numo"' + A('up', .55, .5) + ' style="' + box(84, 410, 360, 240) + '"><div class="mt-roll">' + nums + '</div></div>' +
                '<div class="abs mt-steplab"' + A('fade', .7) + ' style="' + pos(400, 588) + '">第 <span class="mt-cur">01</span> / ' + pad(n - 1) + ' 步</div>' +
                '<div class="abs mt-odo mt-nameo"' + A('up', .65, .5) + ' style="' + box(90, 650, 700, nameSz * 1.2) + '"><div class="mt-roll" style="font-size:' + nameSz + 'px">' + names + '</div></div>';
            }
            var ta = Math.min(TE, D - .4) - .2;
            if (d.aside) h += '<div class="abs mt-aside"' + A('fade', ta) + ' style="' + (V ? pos(920, 798) : pos(92, 676 + nameSz * 1.2)) + '">' + (d.aside.label || '') + ' <b>' + H.count(d.aside.value, ta + .05, .6) + (d.aside.suffix || '') + '</b></div>';
            // 右侧底板 + 白卡（每个条目一张，叠在一起切换）
            h += '<div class="abs mt-slab"' + A('fade', .35, .5) + ' style="' + box(860, 170, 640, 700) + '"></div>';
            items.forEach(function (it, i) {
              var tag = it.tag && !/^0?\d+$/.test(String(it.tag).trim()) ? it.tag : '';
              h += '<div class="abs mt-card mt-sc" data-i="' + i + '" style="' + box(920, V && d.aside ? 230 : 270, 520, 500) + '"><div class="mt-ch"><span>STEP ' + pad(i) + '</span><span>' + tag + '</span></div>' +
                '<div class="mt-cimg">' + (it.img ? '<img src="__BASE__' + it.img + '" alt="">' : '') + '</div><div class="mt-cf"><i></i><span>' + it.name + '</span><b>' + pad(i) + ' / ' + pad(n - 1) + '</b></div></div>';
            });
            return h;
          },
          update: function (t, el) {
            hbUpdate(el, t);
            var k = 0, i; for (i = 0; i < n; i++) if (t >= T0 + i * ST) k = i;
            var p = io((t - (T0 + k * ST)) / Math.min(.45, ST * .8)), pos2 = t < T0 ? 0 : (k === 0 ? 0 : k - 1 + p);
            var rn = el.querySelector('.mt-numo .mt-roll'), rm = el.querySelector('.mt-nameo .mt-roll'), cu = el.querySelector('.mt-cur');
            if (rn) rn.style.transform = 'translateY(' + (-pos2 * 240) + 'px)';
            if (rm) rm.style.transform = 'translateY(' + (-pos2 * 1.2) + 'em)';
            if (cu) cu.textContent = pad(k);
            var vb = el.querySelector('.mt-vbar'); if (vb) { vb.style.transform = 'translateY(' + (pos2 * rowH) + 'px)'; vb.style.opacity = t < T0 ? 0 : 1; }
            var vr = el.querySelectorAll('.mt-vin');
            for (i = 0; i < vr.length; i++) { var a0 = t < T0 ? 0 : clamp(1 - Math.abs(pos2 - i)); vr[i].style.transform = 'scale(' + (.68 + .32 * a0) + ')'; vr[i].style.opacity = .34 + .66 * a0; }
            var st = el.querySelectorAll('.mt-step');
            for (i = 0; i < st.length; i++) {
              var f = st[i].querySelector('.mt-fill'), q = i < k ? 1 : i === k ? clamp((t - (T0 + i * ST)) / ST) : 0;
              if (t < T0) q = 0; f.style.transform = 'scaleX(' + q + ')'; st[i].classList.toggle('on', t >= T0 && i <= k);
            }
            var cs = el.querySelectorAll('.mt-sc');
            for (i = 0; i < cs.length; i++) {
              var a = i === k ? (k === 0 ? ex((t - .6) / .5) : p) : (i === k - 1 ? 1 - p : 0);
              cs[i].style.opacity = a; cs[i].style.transform = 'translateY(' + ((i === k ? 1 - a : -(1 - a)) * 40) + 'px) scale(' + (.97 + .03 * a) + ')';
            }
          }
        };
      },

            /* 聚焦：黑场。居中标题（重点上薄荷底），中间一张终端卡：命令行打字（kick）、画面、区间轨、
       * 底部检查项逐个亮起薄荷圆点，右上角 stamp 变成 “✓ deployed” 式的薄荷胶囊。两侧漂浮小标签。 */
      focus: function (d) {
        var checks = (d.checks || []).slice(0, 4), R = d.range, cmd = '$ ' + (d.kick || '').replace(/"/g, '');
        var sfx = [[0, 'transition', .45], [.25, 'enter', .45], [.65, 'reveal', .4], [.95, 'type', .35]];
        checks.forEach(function (c, i) { sfx.push([2.0 + i * .35, 'check', .45]); });
        if (d.stamp) sfx.push([3.35, 'stamp', .55]);
        return {
          sfx: cap(sfx),
          build: function () {
            var h = '<div class="mt-dark"></div>' + glow(960, 160) + chips(12, 7, 'frame') +
              '<div class="abs ttl mt-on"' + A('up', .2, .55) + ' style="' + box(360, 104, 1200, 120, 'text-align:center;white-space:nowrap;font-size:' + fit(d.title, 1100, 96, 72) + 'px') + '">' + boxes(d.title, d.hl, .65, true) + '</div>';
            var ih = R ? 380 : 440, body = '<div class="mt-tcmd">' + H.type(cmd, 1.0, Math.min(1.2, cmd.length * .03)) + '</div>' +
              '<div class="mt-timg" style="height:' + ih + 'px">' + BrollCore.media(d, H) + '</div>';
            if (R) {
              var TW = 920, L = TW * R.from / R.total, W = Math.max(12, TW * (R.to - R.from) / R.total);
              body += '<div class="mt-ttrk"><i class="mt-tr" style="left:' + L + 'px;width:' + W + 'px"></i><span style="left:0">0.0</span><span style="left:' + L + 'px">' + R.from + '</span><span style="right:0">' + R.total + '</span></div>';
            }
            body += '<div class="mt-tchecks' + (checks.length <= 2 ? ' big' : '') + '">' + checks.map(function (c, i) { return '<span class="mt-tc" data-on="' + (2.0 + i * .35) + '"><i></i>' + c + '</span>'; }).join('') + '</div>';
            h += '<div class="abs mt-term"' + A('up', .5, .6) + ' style="' + box(470, 262, 980, R ? 610 : 610) + '"><div class="mt-tbar"><i></i><i></i><i></i>' +
              (d.stamp ? '<span class="mt-dep" data-on="3.35"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' + d.stamp.text + (d.stamp.sub ? '<small>' + d.stamp.sub + '</small>' : '') + '</span>' : '') + '</div>' + body + '</div>';
            return h;
          },
          update: function (t, el) {
            hbUpdate(el, t); chipUpdate(el, t);
            var c = el.querySelectorAll('.mt-tc'); for (var i = 0; i < c.length; i++) { var p = ex((t - +c[i].dataset.on) / .3); c[i].style.opacity = .25 + .75 * p; c[i].classList.toggle('on', p > .3); }
            var dp = el.querySelector('.mt-dep'); if (dp) { var q = ex((t - 3.35) / .35); dp.style.opacity = q; dp.style.transform = 'translateX(' + (1 - q) * 24 + 'px)'; }
            var tr = el.querySelector('.mt-tr'); if (tr) tr.style.transform = 'scaleX(' + io((t - 1.3) / .5) + ')';
            var m = el.querySelector('.mt-timg img,.mt-timg .clip'); if (m) m.style.transform = 'scale(' + (1.04 + .03 * clamp(t / 6)) + ')';
          }
        };
      },

      /* 数字：整屏照片压暗（先上下两半对冲合拢，中间一道薄荷竖线），居中大数字 + caption（重点薄荷），
       * 底部 logo + 薄荷胶囊注记；照片缓慢推近。没有图时用黑场柔光。 */
      metric: function (d) {
        var v = +d.value || 0;
        var sfx = [[0, 'transition', .45], [.15, 'slide', .4], [.6, 'enter', .4], [.75, 'count', .45], [1.95, 'hit', .5], [2.3, 'reveal', .4]];
        if (d.note || d.logo) sfx.push([2.9, 'mark', .4]);
        return {
          sfx: cap(sfx),
          build: function () {
            var str = Math.round(v).toLocaleString('en-US'), cm = (str.match(/,/g) || []).length, digits = (str.length - cm) + cm * .45 + (d.suffix ? .6 * len(d.suffix) : 0), nsz = Math.min(320, Math.floor(1100 / (digits * .62)));
            var hasRow = !!(d.logo || d.note), tot = 46 + nsz + 24 + (d.caption ? 100 : 0) + (hasRow ? 104 : 0), y0 = Math.max(130, Math.round((1080 - tot) / 2) - 24);
            var h = d.img ? '<div class="mt-photo"><div class="mt-half a"><img src="__BASE__' + d.img + '" alt=""></div><div class="mt-half b"><img src="__BASE__' + d.img + '" alt=""></div><i class="mt-split"></i><div class="mt-shade"></div></div>'
              : '<div class="mt-dark"></div>' + glow(960, 420);
            h += (d.kick ? '<div class="abs mt-kick"' + A('fade', .55) + ' style="' + box(460, y0, 1000, 30, 'text-align:center') + '">' + d.kick + '</div>' : '') +
              '<div class="abs num mt-big"' + A('up', .6, .6) + ' style="' + box(360, y0 + 46, 1200, nsz, 'font-size:' + nsz + 'px') + '">' + H.count(v, .7, 1.25) + '<span class="mt-suf">' + (d.suffix || '') + '</span></div>' +
              '<div class="abs ttl mt-on"' + A('up', 2.2, .5) + ' style="' + box(260, y0 + 70 + nsz, 1400, 100, 'text-align:center;white-space:nowrap;font-size:' + fit(d.caption, 1300, 84, 64) + 'px') + '">' + BrollCore.hlify(d.caption || '', d.hl) + '</div>';
            var row = '';
            if (d.logo) row += '<span class="mt-logo"><img src="__BASE__' + d.logo + '" alt=""></span>';
            if (d.note) row += '<span class="mt-notep">' + d.note + '</span>';
            if (row) h += '<div class="abs mt-row"' + A('up', 2.9, .5) + ' style="' + box(360, y0 + 70 + nsz + (d.caption ? 104 : 0), 1200, 80) + '">' + row + '</div>';
            return h;
          },
          update: function (t, el) {
            var p = io(t / .7), a = el.querySelector('.mt-half.a'), b = el.querySelector('.mt-half.b'), s = el.querySelector('.mt-split');
            if (a) {
              a.style.transform = 'translateY(' + (-(1 - p) * 1080) + 'px)'; b.style.transform = 'translateY(' + ((1 - p) * 1080) + 'px)';
              var z = 1.04 + .06 * clamp(t / 8); a.firstChild.style.transform = b.firstChild.style.transform = 'scale(' + z + ')';
              s.style.opacity = t < .7 ? 1 : 1 - clamp((t - .7) / .4); s.style.transform = 'scaleY(' + p + ')';
            }
          }
        };
      }
    };
  });
})();
