/* 昭和海报 showa-poster — 版式语言：特摄标题卡。
 * 每个场景先硬切一张“满屏单字卡”（奶白/黑反色 + 色差），再切到正片构图：
 * 慢转红色放射线、竖排标题 + 直角框线、倾斜红色横幅、方框印章（2×2 判子）。
 * 黑页 / 奶白页交替；所有字都是明朝体 900。
 * 单字卡的字：data.glyph（1–2 字）优先；否则从 hl 里挑“实词”（去掉数量词前缀和虚词，四字词取后半的中心词）。 */
(function () {
  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function expo(x) { return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); }
  function ease3(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  var KANJI = ['壱', '弐', '参', '肆', '伍', '陸'];
  var STOP = /[的了是在就把被和与及再也都很最更只又还让给对从到怎么什吗呢吧啊呀去来这那个]/;
  var CHECK = '<svg viewBox="0 0 24 24"><path d="M4.5 12.5l5 5L19.5 6.5" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="square"/></svg>';

  // 选单字卡的字
  function glyph(d) {
    if (d.glyph) return String(d.glyph).replace(/\s/g, '').slice(0, 2);
    var raw = String(d.hl || d.title || d.caption || d.kick || ''), s = raw.replace(/[^0-9一-鿿]/g, '');
    if (!s) return raw.replace(/[\s.,!?·]/g, '').slice(0, 2) || '新';
    var t = s.replace(/^[0-9一二三四五六七八九十百千万两几]+[次个项条步种件段张秒分句字年天位款招点层]?/, '');
    if (!t) return s.length <= 2 ? s : s.slice(-1);
    var best = null;
    for (var i = 0; i + 2 <= t.length; i += 2) {
      var c = t.substr(i, 2);
      if (!STOP.test(c)) { best = c; if (t.length !== 4) break; }
    }
    if (!best) for (var j = 0; j < t.length; j++) if (!STOP.test(t[j])) { best = t[j]; break; }
    return best || t.slice(0, 1);
  }
  // 声音：排序、相邻 ≥0.15s、最多 7 个（丢增益最小的，第一个不丢）
  function fin(sfx) {
    sfx.sort(function (a, b) { return a[0] - b[0]; });
    while (sfx.length > 7) { var m = 1; for (var i = 2; i < sfx.length; i++) if (sfx[i][2] <= sfx[m][2]) m = i; sfx.splice(m, 1); }
    for (var k = 1; k < sfx.length; k++) if (sfx[k][0] - sfx[k - 1][0] < .15) sfx[k][0] = +(sfx[k - 1][0] + .15).toFixed(2);
    return sfx;
  }

  BrollCore.template('showa-poster', function (H) {
    var A = H.A, box = H.box, pos = H.pos, hlify = BrollCore.hlify, media = BrollCore.media;
    function rays(cx, cy, strong) {
      return '<div class="sp-rays' + (strong ? ' strong' : '') + '" style="left:' + cx + 'px;top:' + cy + 'px"></div><div class="sp-core" style="left:' + cx + 'px;top:' + cy + 'px"></div>';
    }
    // 开场单字卡：t < end 时整屏盖住，之后硬切掉
    function card(ch, end, ink) {
      return '<div class="sp-card' + (ink ? ' ink' : '') + '" data-end="' + end + '"><div class="sp-big" style="font-size:' + (ch.length > 1 ? 500 : 600) + 'px">' + ch + '</div></div>';
    }
    // 判子：4 个字排成 2×2，2–3 个字竖排，其余横排
    function seal(text, t, x, y, size, rot, sub, lt) {
      var s = String(text), c = s.split(''), inner;
      if (c.length === 4) inner = '<div class="sp-seal-g"><span>' + c[2] + '</span><span>' + c[0] + '</span><span>' + c[3] + '</span><span>' + c[1] + '</span></div>';
      else inner = '<div class="sp-seal-in' + (c.length === 2 || c.length === 3 ? ' v' : '') + '">' + s + '</div>';
      return '<div class="abs sp-seal' + (lt ? ' lt' : '') + '"' + A('stamp', t, .35) + ' style="' + pos(x, y, 'font-size:' + size + 'px;--r:' + rot + 'deg') + '">' + inner + (sub ? '<small>' + sub + '</small>' : '') + '</div>';
    }
    // 补位用的巨型描边字（内容少时填空）
    function ghost(ch, t, x, y, size, vertical) {
      return '<div class="abs sp-ghost' + (vertical ? ' v' : '') + '"' + A('wipe' + (vertical ? 'Y' : ''), t, .5) + ' style="' + pos(x, y, 'font-size:' + size + 'px') + '">' + ch + '</div>';
    }
    function common(t, el) {
      var r = el.querySelectorAll('.sp-rays');
      for (var i = 0; i < r.length; i++) r[i].style.transform = 'rotate(' + (t * 5) + 'deg)';
      var c = el.querySelector('.sp-card');
      if (c) {
        var end = +c.dataset.end;
        c.style.display = t < end ? '' : 'none';
        var b = c.firstChild, p = clamp(t / .4), k = 3 + (1 - expo(p)) * 16;
        b.style.transform = 'scale(' + (1.22 - .22 * expo(p) + t * .03) + ')';
        b.style.textShadow = (-k) + 'px 0 rgba(0,200,230,.8),' + k + 'px 0 rgba(230,0,56,.8)';
      }
      var fl = el.querySelectorAll('[data-flash]');
      for (var j = 0; j < fl.length; j++) { var t0 = +fl[j].dataset.flash; fl[j].style.opacity = t < t0 ? 0 : clamp(1 - (t - t0) / .16); }
      var g = el.querySelectorAll('.sp-ghost');
      for (var q = 0; q < g.length; q++) g[q].style.translate = '0 ' + (Math.sin(t * .9 + q) * 6).toFixed(1) + 'px';
    }
    var END = .72;

    return {
      /* hero：单字卡 → 放射线上的大标题 → 红幅斜着压进来、标题跟着倾斜落到红幅上 → 竖排判子 */
      hero: function (d) {
        var g = glyph(d), ti = String(d.title || ''), tsize = Math.max(72, Math.min(150, Math.floor(1440 / ((ti.length || 1) * 1.06))));
        return {
          sfx: fin([[0, 'hit', .5], [END, 'transition', .4], [1.0, 'enter', .45], [1.9, 'slide', .45], [2.5, 'stamp', .55], [2.9, 'type', .3]]),
          build: function () {
            return rays(960, 560, true) + card(g, END) +
              (d.img ? '<div class="ph sp-ph dark sp-himg"' + A('wipe', 2.2, .4) + ' style="' + box(90, 150, 500, 282, '--r:0deg') + '"><div class="sp-push">' + media(d, H) + '</div><i class="sp-flash" data-flash="2.2"></i></div>' : '') +
              '<div class="sp-ban" style="' + box(-160, 440, 2240, 210) + '">' +
                '<div class="sp-bar"' + A('bar', 1.9, .35) + '></div>' +
                '<div class="sp-ban-ttl"' + A('slam', 1.0, .4) + ' style="transform-origin:50% 50%;font-size:' + tsize + 'px">' + hlify(ti, d.hl) + '</div>' +
                '<div class="sp-ban-sub"' + A('wipe', 2.9, .5) + '>' + (d.kick || '') + '</div>' +
                '<div class="sp-ban-rule"' + A('bar', 3.0, .5) + '></div>' +
              '</div>' +
              seal(g, 2.5, 1360, 150, 84, 0) +
              (d.sub ? '<div class="abs sp-foot"' + A('fade', 3.2, .4) + ' style="' + pos(830, 840, 'width:1000px;text-align:right') + '">' + d.sub + '</div>' : '');
          },
          update: function (t, el) {
            common(t, el);
            var b = el.querySelector('.sp-ban'), p = ease3(clamp((t - 1.9) / .35));
            b.style.transform = 'rotate(' + (-7 * p) + 'deg) translateY(' + (1 - p) * -10 + 'px) scale(' + (1 + .012 * clamp((t - 2.3) / 4)) + ')';
            b.classList.toggle('on', t >= 1.95);
            var m = el.querySelector('.sp-himg .sp-push'); if (m) m.style.transform = 'scale(' + (1.1 - .08 * expo(clamp((t - 2.2) / 2.6))) + ')';
          }
        };
      },

      /* list：竖排标题 + 直角框线，条目是一列竖幅海报，按阶梯错落（左高右低），一张一张白闪硬切上来；时长做成竖判子；没有 aside 时右下补一枚巨型描边字 */
      list: function (d) {
        var items = (d.items || []).slice(0, 5), n = items.length || 1, gap = 22, X0 = 360, W = 1490 - X0, g = glyph(d);
        var w = Math.floor((W - (n - 1) * gap) / n), step = n > 1 ? Math.min(48, Math.floor(150 / (n - 1))) : 0;
        var sfx = [[0, 'hit', .5], [END, 'transition', .4], [.95, 'draw', .35]];
        items.forEach(function (it, i) { sfx.push([1.6 + i * .32, i ? 'card' : 'shot', i ? .4 : .45]); });
        var tA = 1.6 + n * .32 + .35;
        if (d.aside) sfx.push([tA, 'stamp', .5]);
        return {
          sfx: fin(sfx),
          build: function () {
            var maxLen = 1; items.forEach(function (it) { maxLen = Math.max(maxLen, String(it.name || '').length); });
            var nameSize = Math.max(36, Math.min(64, Math.floor((w - 150) / 1.1), Math.floor(260 / maxLen)));
            var footH = Math.ceil(nameSize * maxLen * 1.07) + 44;
            var ti = String(d.title || '').replace(/[，。,.!！?？、]+$/, ''), hl = d.hl,
                cols = hl && ti.indexOf(hl) >= 0 ? [ti.slice(0, ti.indexOf(hl)).replace(/[，。,、\s]+$/, ''), '<span class="hl">' + hl + '</span>', ti.slice(ti.indexOf(hl) + hl.length)] : [ti];
            cols = cols.filter(function (c) { return c; });
            var longest = 1; cols.forEach(function (c) { longest = Math.max(longest, c.replace(/<[^>]+>/g, '').length); });
            var vsize = Math.max(64, Math.min(110, Math.floor(700 / longest), Math.floor(236 / cols.length)));
            var vcols = cols.map(function (c) { return '<span class="sp-col">' + c + '</span>'; }).join('');
            var html = rays(1000, 560) + card(g, END) +
              '<div class="abs sp-kick"' + A('fade', END, .3) + ' style="' + pos(90, 108) + '">' + (d.kick || '') + '</div>' +
              '<div class="abs sp-vt"' + A('slam', END, .45) + ' style="' + box(70, 150, 250, 720, 'font-size:' + vsize + 'px') + '">' + vcols + '</div>' +
              '<svg class="ov">' + H.line(330, 140, 330, 885, .95, .45, 'var(--fg)', 2) + H.line(70, 885, 1490, 885, 1.1, .6, 'var(--fg)', 2) + '</svg>';
            items.forEach(function (it, i) {
              var x = X0 + i * (w + gap), t0 = 1.6 + i * .32, top = 150 + i * step, ph = 865 - top, ih = Math.max(160, ph - 44 - footH);
              html += '<div class="abs sp-panel" data-i="' + i + '"' + A('flicker', t0, .3) + ' style="' + box(x, top, w, ph) + '">' +
                '<div class="sp-pimg" style="height:' + ih + 'px">' + (it.img ? '<img src="__BASE__' + it.img + '" alt="">' : '') + '<i class="sp-flash" data-flash="' + t0 + '"></i></div>' +
                '<div class="sp-ptag" style="top:' + ih + 'px">' + (it.tag || '') + '</div>' +
                '<div class="sp-pfoot" style="top:' + (ih + 44) + 'px"><span class="sp-pnum" style="font-size:' + Math.min(92, Math.floor(w * .36)) + 'px">' + KANJI[i] + '</span><span class="sp-pname" style="font-size:' + nameSize + 'px">' + (it.name || '') + '</span></div></div>';
            });
            if (d.aside) html += '<div class="abs sp-aside"' + A('stamp', tA, .35) + ' style="' + box(1560, 470, 270, 395, '--r:0deg') + '">' +
              '<div class="sp-aside-l">' + (d.aside.label || '') + '</div><div class="sp-aside-v">' + H.count(d.aside.value || 0, tA, .6) + '<small>' + (d.aside.suffix || '') + '</small></div></div>';
            else html += ghost(g, tA - .3, 1590, 470, g.length > 1 ? 190 : 260, true);
            return html;
          },
          update: function (t, el) {
            common(t, el);
            var ps = el.querySelectorAll('.sp-panel');
            for (var i = 0; i < ps.length; i++) { var t0 = 1.6 + i * .32 + .4; ps[i].style.translate = '0 ' + (t > t0 ? Math.sin((t - t0) * 1.1 + i * .9) * 4 : 0).toFixed(1) + 'px'; }
          }
        };
      },

      /* focus：奶白页（反色）。黑框画面 + 红色错位底块，下方胶片刻度尺标出重拍区间；右侧红方块逐条打勾，最后 2×2 判子扣下；勾少时右下补一枚巨型描边字 */
      focus: function (d) {
        var checks = (d.checks || []).slice(0, 4), g = glyph(d), sfx = [[0, 'hit', .5], [END, 'transition', .4], [1.05, 'shot', .45]];
        if (d.range) sfx.push([1.6, 'draw', .35]);
        checks.forEach(function (c, i) { sfx.push([2.0 + i * .38, 'check', .42]); });
        var tS = 2.0 + checks.length * .38 + .2;
        if (d.stamp) sfx.push([tS, 'stamp', .6]);
        return {
          sfx: fin(sfx),
          build: function () {
            var ti = String(d.title || ''), ts = Math.max(64, Math.min(96, Math.floor(1380 / (ti.length || 1))));
            var html = '<div class="sp-paper"></div>' + card(g, END, true) +
              '<div class="abs sp-kick ink"' + A('fade', .85, .3) + ' style="' + pos(90, 70) + '">' + (d.kick || '') + '<i></i></div>' +
              '<div class="abs ttl sp-ttl ink"' + A('slam', .85, .4) + ' style="' + pos(90, 112, 'font-size:' + ts + 'px;max-width:1400px;white-space:nowrap') + '">' + hlify(ti, d.hl) + '</div>' +
              '<div class="abs sp-shadow"' + A('wipe', 1.05, .35) + ' style="' + box(112, 282, 1000, 562) + '"></div>' +
              '<div class="ph sp-ph"' + A('wipe', 1.05, .35) + ' style="' + box(90, 262, 1000, 562) + '"><div class="sp-push">' + media(d, H) + '</div><i class="sp-flash" data-flash="1.05"></i></div>';
            if (d.range && d.range.total) {
              var R = d.range, L = 1000 * R.from / R.total, Wd = Math.max(8, 1000 * (R.to - R.from) / R.total), ticks = '';
              for (var s = 0; s <= Math.floor(R.total); s++) ticks += '<i style="left:' + (1000 * s / R.total) + 'px;height:' + (s % 5 ? 8 : 16) + 'px"></i>';
              html += '<div class="abs sp-ruler"' + A('wipe', 1.5, .5) + ' style="' + box(90, 852, 1000, 18) + '">' + ticks + '</div>' +
                '<div class="abs"' + A('bar', 1.6, .5) + ' style="' + box(90 + L, 852, Wd, 18, 'background:var(--accent)') + '"></div>' +
                '<div class="abs sp-rlab"' + A('fade', 1.9, .3) + ' style="' + pos(90 + L, 874, 'transform:translateX(-100%);padding-right:10px') + '">' + R.from + 's</div>';
            }
            checks.forEach(function (c, i) {
              var t = 2.0 + i * .38, y = 290 + i * 96, maxW = y < 400 ? 260 : 560, fs = Math.max(34, Math.min(50, Math.floor(maxW / (String(c).length || 1))));
              html += '<div class="abs sp-check"' + A('flicker', t, .25) + ' style="' + pos(1170, y) + '"><b>' + CHECK + '</b><span style="font-size:' + fs + 'px">' + c + '</span></div>';
            });
            if (d.stamp) html += seal(d.stamp.text || '', tS, 1240, 300 + Math.max(checks.length, 2) * 96 + 20, 80, -6, d.stamp.sub, true);
            else if (checks.length <= 2) html += ghost(g, 2.0 + checks.length * .38 + .1, 1180, checks.length ? 300 + checks.length * 96 + 30 : 290, g.length > 1 ? 250 : 340, false);
            return html;
          },
          update: function (t, el) {
            common(t, el);
            var p = el.querySelector('.sp-push'); if (p) p.style.transform = 'scale(' + (1.12 - .1 * expo(clamp((t - 1.05) / 2.6)) - .01 * clamp((t - 3.6) / 6)) + ')';
          }
        };
      },

      /* metric：黑页满屏放射线，巨型明朝数字带色差砸下；结论压在倾斜红幅上；右侧小幅画面 + 竖排朱红批注；判子盖在红幅右上角 */
      metric: function (d) {
        var g = glyph(d), sfx = [[0, 'hit', .5], [END, 'transition', .4], [.9, 'count', .45], [2.0, 'slide', .45], [2.9, 'stamp', .55]];
        if (d.img) sfx.push([2.4, 'reveal', .4]);
        if (d.note) sfx.push([3.3, 'mark', .4]);
        return {
          sfx: fin(sfx),
          build: function () {
            var cap = String(d.caption || ''), hl = d.hl, val = +d.value || 0, dec = (String(d.value).split('.')[1] || '').length;
            var vs = dec ? val.toFixed(dec) : Math.round(val).toLocaleString('en-US'), suf = String(d.suffix || '');
            var em = vs.replace(/[,.]/g, '').length * .62 + (vs.match(/[,.]/g) || []).length * .3 + suf.length * .4 + .05;
            var ns = Math.max(260, Math.min(500, Math.floor((d.img ? 960 : 1400) / em)));
            var cs = Math.max(64, Math.min(84, Math.floor(1500 / (cap.length || 1))));
            cap = hl && cap.indexOf(hl) >= 0 ? cap.replace(hl, '<span class="hl">' + hl + '</span>') : cap;
            return rays(700, 420, true) + card(g, END) +
              '<div class="abs sp-kick"' + A('fade', .85, .3) + ' style="' + pos(90, 108) + '">' + (d.kick || '') + '</div>' +
              '<div class="abs num sp-num"' + A('slam', .85, .45) + ' style="' + pos(70, 140, 'font-size:' + ns + 'px;transform-origin:left center') + '">' + H.count(val, .9, 1.1, '', '', dec) + '<span class="sp-suf">' + suf + '</span></div>' +
              (d.img ? '<div class="ph sp-ph dark"' + A('wipe', 2.4, .35) + ' style="' + box(1050, 150, 440, 248, '--r:0deg') + '"><img src="__BASE__' + d.img + '" alt=""><i class="sp-flash" data-flash="2.4"></i></div>' : '') +
              '<div class="sp-ban m" style="' + box(-160, 640, 2240, 150) + '">' +
                '<div class="sp-bar"' + A('bar', 2.0, .35) + '></div>' +
                '<div class="sp-ban-ttl" style="font-size:' + cs + 'px"><span' + A('wipe', 2.15, .45) + ' style="display:inline-block">' + cap + '</span></div>' +
              '</div>' +
              seal(g, 2.9, 1560, 450, 72, 0) +
              (d.note ? '<div class="abs sp-note"' + A('wipeY', 3.3, .5) + ' style="' + pos(1745, 420) + '">' + d.note + '</div>' : '') +
              (d.logo ? '<div class="abs"' + A('fade', 3.4, .4) + ' style="' + box(1610, 900, 195, 48) + '"><img src="__BASE__' + d.logo + '" alt="" style="width:100%;height:100%;display:block"></div>' : '');
          },
          update: function (t, el) {
            common(t, el);
            var n = el.querySelector('.sp-num'), p = clamp((t - .85) / .5), k = 2 + (1 - expo(p)) * 18;
            if (n) { n.style.textShadow = (-k) + 'px 0 rgba(0,200,230,.65),' + k + 'px 0 rgba(230,0,56,.7)'; n.style.translate = (t > 1.4 ? (t - 1.4) * 4 : 0).toFixed(1) + 'px 0'; }
            var b = el.querySelector('.sp-ban'); b.style.transform = 'rotate(-5deg)'; b.classList.add('on');
          }
        };
      }
    };
  });
})();
