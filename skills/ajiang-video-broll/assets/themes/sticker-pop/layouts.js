/* 贴纸波普 · 版式语言：白板上的系统示意图（参考 prompt-motion #2 Celld explainer）。
 * 每个元素都是“窗口贴纸”：粗墨色描边 + 彩色标题栏 + 胶囊标签 + 硬投影（墨色带一点紫调，不用纯黑）；
 * 窗口之间用会流动的虚线连起来，星星、警示胶带、带放射线的徽章像贴纸一样拍上去；
 * 标题小而硬（左上角 + 黄色框住重点），清单卡片高低错落地拍在白板上，聚焦页整屏翻成荧光绿底。换页：硬切。 */
(function () {
  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function back(x, c) { x = clamp(x); c = c || 1.7; var c3 = c + 1; return 1 + c3 * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
  function len(s) { var L = 0; s = String(s || '').replace(/<[^>]+>/g, ''); for (var i = 0; i < s.length; i++) L += /[\x00-\xff]/.test(s[i]) ? (s[i] === ' ' ? .3 : .6) : 1; return L || 1; }
  function fit(s, w, max, min) { return Math.max(min, Math.min(max, Math.floor(w / len(s)))); }
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
  function niceMax(v) { if (!(v > 0)) return 1; var e = Math.pow(10, Math.floor(Math.log10(v))), m = [1, 2, 2.5, 5, 10]; for (var i = 0; i < m.length; i++) if (m[i] * e >= v * 1.1) return m[i] * e; return 10 * e; }
  function plainTag(tag) { return tag && !/^0?\d+$/.test(String(tag).trim()) ? tag : ''; }
  var INK = 'var(--ink)';
  var COL = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c1)'];
  var ROT = [-2.5, 1.8, -1.2, 2.4, -1.8];

  BrollCore.template('sticker-pop', function (H) {
    var A = H.A, box = H.box, pos = H.pos;
    // 音效：先保证“必须有”的，再按优先级补到 7 个以内，相邻 ≥ .15s
    function pick(must, extra) {
      var out = [], all = must.concat(extra);
      all.forEach(function (s) {
        if (out.length >= 7) return;
        for (var i = 0; i < out.length; i++) if (Math.abs(out[i][0] - s[0]) < .15) return;
        out.push([+s[0].toFixed(2), s[1], s[2]]);
      });
      return out.sort(function (a, b) { return a[0] - b[0]; });
    }
    function head(d, title, hl, t) {
      return (d.kick ? '<div class="abs sp-kick"' + A('pop', t, .4) + ' style="' + pos(90, 62, '--r:-2deg') + '">' + d.kick + '</div>' : '') +
        '<div class="abs ttl sp-ttl"' + A('up', t + .15, .45) + ' style="' + pos(90, 116, 'font-size:' + fit(title, 1380, 80, 64) + 'px') + '">' + BrollCore.hlify(title || '', hl) + '</div>';
    }
    function win(x, y, w, h, color, label, tag, body, t, rot, cls) {
      return '<div class="sp-win ' + (cls || '') + '"' + A('pop', t, .5) + ' style="' + box(x, y, w, h, '--r:' + (rot || 0) + 'deg') + '">' +
        '<div class="sp-bar" style="background:' + color + '"><span class="sp-pill">' + label + '</span>' + (tag ? '<span class="sp-btag">' + tag + '</span>' : '<span class="sp-dots"><i></i><i></i><i></i></span>') + '</div>' +
        '<div class="sp-body">' + body + '</div></div>';
    }
    function star(x, y, s, color, t, cls) {
      var p = '', k; for (k = 0; k < 16; k++) { var r = k % 2 ? s * .42 : s * .5, a = Math.PI * 2 * k / 16; p += (k ? 'L' : 'M') + (s / 2 + Math.cos(a) * r).toFixed(1) + ' ' + (s / 2 + Math.sin(a) * r).toFixed(1); }
      return '<svg class="abs sp-star ' + (cls || '') + '"' + A('spin', t, .5) + ' width="' + s + '" height="' + s + '" style="' + pos(x, y) + '"><path d="' + p + 'Z" fill="' + color + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/></svg>';
    }
    function tape(x, y, w, rot, t) { return '<div class="abs sp-tape"' + A('pop', t, .35) + ' style="' + box(x, y, w, 34, '--r:' + rot + 'deg') + '"></div>'; }
    function rays(cx, cy, r, t) { // 徽章四周的放射短线
      var o = '', k; for (k = 0; k < 8; k++) { var a = -Math.PI / 2 + (k - 3.5) * .38 + (k > 3 ? Math.PI : 0); o += H.line(cx + Math.cos(a) * r, cy + Math.sin(a) * r * .55, cx + Math.cos(a) * (r + 34), cy + Math.sin(a) * (r + 34) * .55, t + k * .02, .25, INK, 4); }
      return '<svg class="ov">' + o + '</svg>';
    }
    function wire(dd, t) { return '<path class="sp-flow" d="' + dd + '" fill="none" stroke="' + INK + '" stroke-width="3" stroke-dasharray="12 10" data-dash="12 10"' + A('draw', t, .35) + '/>'; }
    // 持续运动：虚线流动、星星慢转、窗口极轻的上下漂浮（每张错开相位）
    function flow(el, t) {
      var f = el.querySelectorAll('.sp-flow'); for (var i = 0; i < f.length; i++) f[i].style.strokeDashoffset = -t * 36;
      var s = el.querySelectorAll('.sp-star.turn'); for (var j = 0; j < s.length; j++) s[j].style.rotate = (t * 24) + 'deg';
      var w = el.querySelectorAll('.sp-float'); for (var k = 0; k < w.length; k++) w[k].style.translate = '0 ' + (t > 1.6 ? Math.sin((t - 1.6) * 1.3 + k * 1.9) * 4 * clamp((t - 1.6) / .8) : 0).toFixed(2) + 'px';
    }

    return {
      /* 开场：一张大的粉色“标题窗口”斜贴在白板上（重点词单独起一行，像贴上去的黄标签），
       * 右下角压一张图片窗口，星星和胶带收边；没有图时标题窗口加宽居中。 */
      hero: function (d) {
        var t = d.title || '', i = d.hl ? t.indexOf(d.hl) : -1;
        var l1 = i > 0 ? t.slice(0, i) : t, l2 = i > 0 ? t.slice(i) : '';
        var hasImg = !!d.img, WW = hasImg ? 1180 : 1400, sz = fit(len(l1) > len(l2) ? l1 : l2, hasImg ? 860 : WW - 150, 140, 72); // 有图时标题只占窗口左侧，图片窗口压在右下角不挡字
        return {
          sfx: pick([[.05, 'enter', .5], [.35, 'card', .5], hasImg ? [1.3, 'deal', .45] : [1.3, 'reveal', .45], [1.8, 'hit', .45]], [[.9, 'reveal', .45]]),
          build: function () {
            var title = '<div class="ttl" style="font-size:' + sz + 'px;line-height:1.12;white-space:nowrap">' + (l2 ? l1 + '<br>' + BrollCore.hlify(l2, d.hl) : BrollCore.hlify(l1, d.hl)) + '</div>';
            var body = '<div style="padding:52px 56px">' + title + (d.sub ? '<div class="sp-sub" style="margin-top:28px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:' + (hasImg ? 860 : 1260) + 'px">' + d.sub + '</div>' : '') + '</div>';
            return (d.kick ? '<div class="abs sp-kick"' + A('pop', .05, .4) + ' style="' + pos(90, 62, '--r:-2deg') + '">' + d.kick + '</div>' : '') +
              '<div class="sp-float">' + win(hasImg ? 90 : 210, 180, WW, 590, 'var(--c1)', '标题', '', body, .3, -1.5) + '</div>' +
              (hasImg ? '<div class="sp-float">' + win(1060, 440, 700, 440, 'var(--c2)', '画面', '', '<div class="sp-img" style="height:350px"><img class="sp-push" src="__BASE__' + d.img + '" alt=""></div>', 1.3, 3) + '</div>' : '') +
              star(hasImg ? 1220 : 1390, 112, 110, 'var(--c4)', 1.8, 'turn') + tape(hasImg ? 40 : 160, 730, 220, -12, 1.9);
          },
          update: function (t, el) { flow(el, t); var m = el.querySelector('.sp-push'); if (m) m.style.transform = 'scale(' + (1.08 - .05 * clamp((t - 1.3) / 4)) + ')'; }
        };
      },

      /* 清单：n 张“机器窗口”高低错落、各自倾斜地拍到白板上（每张一个颜色的标题栏），流动虚线从每张卡连到右边的计数面板，
       * 面板里数字计数、每一行随连线到达打勾；星星转、警示胶带收角。条目名太长时缩字号、最多两行。 */
      list: function (d) {
        var items = (d.items || []).slice(0, 5), n = Math.max(1, items.length), right = d.aside ? 1440 : 1500;
        var gap = n > 3 ? 26 : 46, cw = (right - 90 - gap * (n - 1)) / n, zig = n >= 4 ? 64 : n === 3 ? 44 : 56;
        var maxLen = items.reduce(function (a, it) { return Math.max(a, len(it.name)); }, 1), inner = cw - 44;
        var nameSz = Math.max(34, Math.min(n <= 3 ? 52 : n === 4 ? 42 : 38, Math.floor(inner / maxLen)));
        var lines = Math.min(2, Math.ceil(maxLen * nameSz / inner - .02));
        var imgH = Math.round(Math.min(cw * (n <= 2 ? .56 : .66), n <= 2 ? 330 : 260));
        var ch = Math.round(58 + 8 + 28 + imgH + 14 + nameSz * 1.1 * lines + 30), cy = Math.round(Math.max(270 + zig, 590 - ch / 2));
        if (cy + zig + ch > 870) cy = 870 - zig - ch;
        var must = [[.05, 'enter', .45]];
        items.forEach(function (it, i) { must.push([.55 + i * .2, 'card', .5]); });
        if (d.aside) must.push([2.6, 'count', .45]);
        return {
          sfx: pick(must, [[3.25, 'hit', .45], [1.95, 'draw', .4], [.38, 'type', .3]]),
          build: function () {
            var h = head(d, d.title, d.hl, .05), wires = '';
            items.forEach(function (it, i) {
              var x = 90 + i * (cw + gap), y = cy + (i % 2 ? zig : -zig) * (n > 1 ? 1 : 0), tag = plainTag(it.tag);
              var body = '<div class="sp-img" style="height:' + imgH + 'px">' + (it.img ? '<img src="__BASE__' + it.img + '" alt="">' : '') + '</div>' +
                '<div class="sp-name" style="font-size:' + nameSz + 'px;' + (lines > 1 ? 'white-space:normal;' : '') + '">' + (it.name || '') + '</div>';
              h += '<div class="sp-float">' + win(x, y, cw, ch, COL[i % 5], '#0' + (i + 1), tag, body, .5 + i * .2, ROT[i % 5]) + '</div>';
              if (d.aside) {
                var sx = x + cw / 2, sy = y + ch + 4, ty = 560 + (n > 1 ? i * 300 / (n - 1) : 150);
                wires += wire('M' + sx + ' ' + sy + ' C' + sx + ' ' + (sy + 60) + ' ' + (1500 - (n - i) * 30) + ' ' + (ty + 40) + ' 1560 ' + ty, 1.95 + i * .08) +
                  '<circle cx="1560" cy="' + ty + '" r="8" fill="' + INK + '"' + A('pop', 2.2 + i * .08, .3) + '/>';
              }
            });
            if (d.aside) {
              h = '<svg class="ov">' + wires + '</svg>' + h;
              var rows = items.map(function (it, i) { return '<div class="sp-row" data-on="' + (2.5 + i * .22) + '"><i class="sp-box"></i><span>' + (plainTag(it.tag) || it.name) + '</span></div>'; }).join('');
              h += win(1560, 420, 270, 450, 'var(--c4)', d.aside.label || '', '', '<div class="num sp-big" style="font-size:' + (String(d.aside.value).length > 3 ? 80 : 112) + 'px">' + H.count(d.aside.value, 2.6, .8) + '<small>' + (d.aside.suffix || '') + '</small></div>' + rows + '<div class="sp-haz"></div>', 2.3, 1.5, 'sp-chan');
            }
            h += star(1250, 96, 96, 'var(--c4)', 1.2, 'turn') + tape(50, 846, 210, -10, 3.25);
            return h;
          },
          update: function (t, el) {
            flow(el, t);
            var r = el.querySelectorAll('.sp-row'); for (var i = 0; i < r.length; i++) r[i].classList.toggle('on', t >= +r[i].dataset.on);
          }
        };
      },

      /* 聚焦：整屏翻成荧光绿。左边大“回放窗口”（图 + 时间轴，播放头在区间里走，手绘圈把区间圈出来），
       * 右边“检查清单”窗口逐行打勾（1–2 条时行更高、字更大，窗口和回放窗口垂直居中对齐），结论是一枚带放射线的黄色徽章。
       * 没有检查项时回放窗口加宽。 */
      focus: function (d) {
        var checks = (d.checks || []).slice(0, 4), nC = checks.length, R = d.range, imgH = R ? 372 : 470, WW = nC ? 1000 : 1360;
        var rowH = nC <= 2 ? 116 : 96, cSz = nC <= 2 ? 56 : 44, winH = 92 + nC * rowH, winY = Math.round(270 + (590 - winH) / 2) + 30;
        var must = [[.15, 'enter', .45], [.45, 'card', .5]];
        checks.forEach(function (c, i) { must.push([1.9 + i * .38, 'check', .5]); });
        if (d.stamp) must.push([3.35, 'stamp', .6]);
        return {
          sfx: pick(must, [[1.4, 'deal', .45], [1.1, 'draw', .35], [0, 'transition', .45]]),
          build: function () {
            var TW = WW - 84, body = '<div class="sp-img" style="height:' + imgH + 'px">' + BrollCore.media(d, H) + '</div>';
            if (R) {
              var L = TW * R.from / R.total, W = Math.max(30, TW * (R.to - R.from) / R.total);
              body += '<div class="sp-track"><div class="sp-range" style="left:' + L + 'px;width:' + W + 'px"' + A('wipe', 1.1, .35) + '></div><i class="sp-head" data-l="' + L + '" data-w="' + W + '"></i>' +
                '<span class="sp-tl" style="left:0">0s</span><span class="sp-tl" style="right:0">' + R.total + 's</span></div>';
            }
            var h = '<div class="sp-flip"></div>' + head(d, d.title, d.hl, .1) +
              '<div class="sp-float">' + win(90, 270, WW, 590, 'var(--c1)', '回放', R ? R.from + 's – ' + R.to + 's' : '', body, .4, -1.2) + '</div>';
            if (R) { var ex = 90 + 14 + L + W / 2 + 4, ey = 270 + 62 + imgH + 56; h += '<svg class="ov">' + H.path('M' + (ex - W / 2 - 40) + ' ' + (ey - 6) + ' C' + (ex - W / 2 - 40) + ' ' + (ey - 46) + ' ' + (ex + W / 2 + 46) + ' ' + (ey - 44) + ' ' + (ex + W / 2 + 46) + ' ' + ey + ' C' + (ex + W / 2 + 46) + ' ' + (ey + 40) + ' ' + (ex - W / 2 - 30) + ' ' + (ey + 44) + ' ' + (ex - W / 2 - 46) + ' ' + (ey - 4), 2.4, .5, INK, 5) + '</svg>'; }
            if (nC) {
              var rows = checks.map(function (c, i) { return '<div class="sp-crow" data-on="' + (1.9 + i * .38) + '" style="height:' + rowH + 'px;font-size:' + Math.min(cSz, Math.floor(520 / len(c))) + 'px"><i class="sp-box"><svg viewBox="0 0 40 40"><path d="M9 21l7 7 15-16" fill="none" stroke="' + INK + '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg></i><span>' + c + '</span></div>'; }).join('');
              h += '<svg class="ov">' + wire('M1090 ' + (winY - 40) + ' C1220 ' + (winY - 70) + ' 1330 ' + (winY - 60) + ' 1380 ' + (winY - 2), 1.3) + '</svg>' +
                '<div class="sp-float">' + win(1180, winY, 650, winH, 'var(--c2)', '检查', nC + ' 项', '<div style="padding:18px 26px">' + rows + '</div>', 1.4, 1.5) + '</div>';
            }
            if (d.stamp) h += '<div class="abs sp-badge"' + A('stamp', 3.35, .4) + ' style="' + pos(300, 786, '--r:-6deg') + '">' + d.stamp.text + (d.stamp.sub ? '<small>' + d.stamp.sub + '</small>' : '') + '</div>' + rays(475, 842, 200, 3.45);
            h += star(1300, 110, 90, 'var(--c4)', .9, 'turn');
            return h;
          },
          update: function (t, el) {
            flow(el, t);
            var hd = el.querySelector('.sp-head');
            if (hd) { var L = +hd.dataset.l, W = +hd.dataset.w, p = t < 1.2 ? 0 : ((t - 1.2) / 1.8) % 1; hd.style.transform = 'translateX(' + (L + W * p) + 'px)'; hd.style.opacity = t > 1.15 ? 1 : 0; }
            var r = el.querySelectorAll('.sp-crow'); for (var i = 0; i < r.length; i++) { var k = back((t - +r[i].dataset.on) / .3, 2.4); r[i].querySelector('svg').style.transform = 'scale(' + k + ')'; r[i].classList.toggle('on', t >= +r[i].dataset.on); }
          }
        };
      },

      /* 数字：粉色“计时器窗口”里一个超大数字 + 警示条进度（百分比按 0–100；其他数值按好读的满格值，1240 → 满格 2,000），
       * 右边蓝色图片窗口用虚线接上，注记是黄色斜贴纸，logo 是白色胶囊贴纸。没有图时计时器窗口加宽居中。 */
      metric: function (d) {
        var v = +d.value || 0, suf = d.suffix || '', isPct = suf.indexOf('%') >= 0, max = isPct ? 100 : niceMax(v), frac = clamp(v / max);
        var wide = !d.img, WW = wide ? 1160 : 800, WX = wide ? 380 : 90;
        var str = fmt(v), cm = (str.match(/,/g) || []).length, em = (str.length - cm) * .78 + cm * .36 + (suf ? .45 * len(suf) + .05 : 0);
        var nsz = Math.min(wide ? 340 : 300, Math.floor((WW - 160) / em));
        var must = [[.15, 'enter', .45], [.45, 'card', .5], [.7, 'count', .45], [1.95, 'hit', .55]];
        if (d.img) must.push([2.3, 'deal', .45]);
        if (d.note) must.push([3.0, 'stamp', .5]);
        return {
          sfx: pick(must, [[0, 'transition', .45], [2.15, 'draw', .35]]),
          build: function () {
            var body = '<div class="sp-timer"><div class="num" style="font-size:' + nsz + 'px">' + H.count(v, .7, 1.2) + '<small>' + suf + '</small></div></div>' +
              '<div class="sp-prog"><i data-p="' + (frac * 100) + '"></i></div><div class="sp-foot"><span class="sp-chip">0</span><span class="sp-chip">' + (isPct ? '100%' : '满格 ' + fmt(max) + (suf ? ' ' + suf : '')) + '</span></div>';
            var h = head({ kick: d.kick }, d.caption, d.hl, .1) +
              '<div class="sp-float">' + win(WX, 290, WW, 560, 'var(--c1)', '数据', '', body, .4, -1.5, 'sp-pink') + '</div>';
            if (d.img) h += '<svg class="ov">' + wire('M890 560 C960 560 960 640 1010 640', 2.15) + '</svg>' +
              '<div class="sp-float">' + win(1000, 430, 520, 380, 'var(--c2)', '画面', '', '<div class="sp-img" style="height:298px"><img src="__BASE__' + d.img + '" alt=""></div>', 2.25, 2) + '</div>';
            if (d.logo) h += '<div class="abs sp-logo"' + A('pop', 2.6, .4) + ' style="' + pos(wide ? 1380 : 1300, wide ? 236 : 380, '--r:4deg') + '"><img src="__BASE__' + d.logo + '" alt=""></div>';
            if (d.note) h += '<div class="abs sp-note"' + A('stamp', 3.0, .4) + ' style="' + pos(d.img ? 1180 : WX + WW - 260, d.img ? 770 : 800, '--r:-5deg') + '">' + d.note + '</div>';
            h += star(WX + WW - 70, 236, 100, 'var(--c4)', 1.9, 'turn') + tape(WX - 30, 800, 200, 14, 2.0);
            return h;
          },
          update: function (t, el) {
            flow(el, t);
            var b = el.querySelector('.sp-prog i'); if (b) b.style.width = (+b.dataset.p * BrollCore.EASE.cubic(clamp((t - .7) / 1.2))) + '%';
          }
        };
      }
    };
  });
})();
