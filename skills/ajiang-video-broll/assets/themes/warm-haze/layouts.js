/* 暖雾 warm-haze — 参考 prompt-motion #103（Tented image gen product video）
 * 版式语言：镜头在一张超大的产品界面上缓慢漫游。先是一句居中大标题（关键词变绿），随后标题滑到左上角，
 * 巨大的白色界面面板（对话框 + 预览文档）从下方由虚变实地抬起、被画面边缘裁切；图片先是灰色骨架闪光再显影；
 * 每一镜底部中间一颗深色药丸字幕，关键词是绿色。整个场景一直在做极慢的推镜。 */
BrollCore.template('warm-haze', function (H) {
  var A = H.A, box = H.box, pos = H.pos;
  function cl(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function ez(x) { x = cl(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function eo(x) { x = cl(x); return 1 - Math.pow(1 - x, 3); }
  function q(el, s) { el._q = el._q || {}; return el._q[s] || (el._q[s] = [].slice.call(el.querySelectorAll(s))); }
  function hl(t, h) { return BrollCore.hlify(t || '', h); }

  // 标题：先在画面中央放大（scale k），t0→t1 滑到左上角最终位置
  function headline(d, size) {
    return '<div class="abs wh-head" style="' + pos(120, 92, 'font-size:' + (size || 64) + 'px;max-width:1360px') + '">' +
      '<div class="ttl"' + A('focus', .1, .9) + '>' + hl(d.title, d.hl) + '</div></div>';
  }
  function glide(el, t, t0, t1, k, cy) {
    var h = q(el, '.wh-head')[0]; if (!h) return;
    if (!h._w) { h._w = h.offsetWidth || 900; h._h = h.offsetHeight || 80; }
    var p = ez((t - t0) / (t1 - t0)), s = k + (1 - k) * p;
    var x0 = 960 - h._w * k / 2 - 120, y0 = (cy || 470) - h._h * k / 2 - 92;
    h.style.transformOrigin = '0 0';
    h.style.transform = 'translate(' + x0 * (1 - p) + 'px,' + y0 * (1 - p) + 'px) scale(' + s + ')';
  }
  function cam(el, t, s1, ox, oy) { // 极慢推镜
    var c = q(el, '.wh-cam')[0]; if (!c) return;
    var p = ez(t / 6);
    c.style.transformOrigin = (ox || 960) + 'px ' + (oy || 540) + 'px';
    c.style.transform = 'scale(' + (1 + (s1 || .035) * p) + ')';
  }
  function shimmer(el, t) { q(el, '.wh-skel').forEach(function (s) { s.style.backgroundPosition = (-600 + (t * 700) % 1400) + 'px 0'; }); }
  function pill(html, t) { return '<div class="abs wh-pillrow"' + A('up', t, .6) + ' style="' + box(0, 832, 1920, 60) + '"><span class="wh-pill">' + html + '</span></div>'; }
  var LOGO = '<svg width="30" height="26" viewBox="0 0 30 26"><path d="M15 1L29 25H1z" fill="var(--accent)"/><path d="M15 9l7 12H8z" fill="var(--card)"/></svg>';

  return {
    hero: function (d) {
      return {
        sfx: [[.1, 'enter', .5], [.9, 'reveal', .45], [1.6, 'slide', .35]].concat(d.img ? [[2.0, 'card', .35]] : []),
        build: function () {
          return '<div class="wh-cam abs" style="inset:0">' +
            (d.img ? '<div class="wh-panel abs"' + A('@card', 1.5, 1) + ' style="' + box(-40, 590, 520, 300, 'padding:14px') + '"><div class="wh-img" style="height:100%"><img src="__BASE__' + d.img + '" alt=""></div></div>' +
              '<div class="wh-panel abs"' + A('@card', 1.7, 1) + ' style="' + box(1500, 640, 520, 420, '') + '"><i class="wh-bar" style="width:60%"></i><i class="wh-bar" style="width:80%"></i><i class="wh-bar" style="width:45%"></i></div>' : '') +
            (d.kick ? '<div class="abs wh-kick"' + A('fade', .05, .8) + ' style="' + box(0, 300, 1920, 40) + '">' + d.kick + '</div>' : '') +
            '<div class="abs" style="' + box(160, 350, 1600, 300, 'display:flex;justify-content:center;align-items:center') + '"><div class="ttl wh-big"' + A('focus', .2, 1) + ' style="font-size:' + Math.max(84, Math.min(118, Math.floor(1480 / Math.max(1, (d.title || '').length)))) + 'px;text-align:center;max-width:1500px;text-wrap:balance">' + hl(d.title, d.hl) + '</div></div>' +
            (d.sub ? pill(d.sub, 1.1) : '') + '</div>';
        },
        update: function (t, el) { cam(el, t, .04, 960, 470); }
      };
    },

    list: function (d) {
      var items = (d.items || []).slice(0, 5), n = items.length || 1;
      var typed = items.map(function (it) { return it.name; }).join(' · ');
      var sfx = [[.15, 'enter', .45], [1.5, 'type', .35], [2.35, 'key', .45]];
      // 条目显影节奏：多条目时压缩间隔，保证 3.6s 前全部显影
      var ST = n > 3 ? .2 : .3, TI = function (i) { return 2.3 + i * ST; };
      items.forEach(function (it, i) { if (i < (d.aside ? 2 : 3)) sfx.push([+(TI(i) + .2).toFixed(2), 'reveal', .4]); });
      if (d.aside) sfx.push([3.1, 'count', .4]);
      var PY = 196, PH = 616, rowH = (PH - 40) / n, th = Math.min(150, rowH - 26), tw = th * 16 / 9;
      return {
        sfx: sfx,
        build: function () {
          var h = '<div class="wh-cam abs" style="inset:0">' + headline(d, 64);
          // 左：对话面板（品牌行 + 气泡骨架 + 输入框打字）
          h += '<div class="wh-panel abs"' + A('@card', 1.0, 1) + ' style="' + box(120, PY, 560, PH) + '">' +
            '<div class="wh-brand">' + LOGO + '<span>' + (d.kick || '') + '</span></div>' +
            '<i class="wh-bar" style="width:78%;margin-top:26px"></i><i class="wh-bar" style="width:64%"></i><i class="wh-bar" style="width:40%"></i>' +
            '<div class="wh-input"><div class="wh-typed" style="font-size:' + (typed.length > 40 ? 26 : 34) + 'px">' + H.type(typed, 1.5, .8) + '</div>' +
            '<span class="wh-plus">+</span><span class="wh-send"><svg width="22" height="22" viewBox="0 0 22 22"><path d="M11 17V5M5 10l6-6 6 6" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span></div></div>';
          // 右：预览文档，每行一个条目（骨架闪光 → 图片显影）
          h += '<div class="wh-panel abs"' + A('@card', 1.2, 1) + ' style="' + box(730, PY, 770, PH, 'padding:20px 30px') + '">';
          items.forEach(function (it, i) {
            var t = TI(i), y = 20 + i * rowH;
            h += '<div class="abs" style="' + box(30, y, 710, rowH, 'display:flex;align-items:center;gap:28px' + (i ? ';border-top:1px solid var(--line)' : '')) + '">' +
              '<div style="position:relative;width:' + tw + 'px;height:' + th + 'px;flex:none"><div class="wh-skel abs" style="inset:0"></div>' +
              '<div class="wh-img abs"' + A('focus', t, .5) + ' style="inset:0"><img src="__BASE__' + it.img + '" alt=""></div></div>' +
              '<div' + A('up', t + .1, .6) + '><div class="ttl" style="font-size:' + Math.max(34, Math.min(46, rowH * .3)) + 'px;line-height:1.15">' + it.name + '</div>' +
              (it.tag ? '<div class="wh-tag">' + it.tag + '</div>' : '') + '</div></div>';
          });
          h += '</div>';
          var last = items[n - 1];
          if (last) h += '<div class="wh-panel abs"' + A('@card', 1.45, 1) + ' style="' + box(1545, 418, 560, 470, 'padding:22px') + '">' +
            '<div style="position:relative;height:250px"><div class="wh-skel abs" style="inset:0"></div><div class="wh-img abs"' + A('focus', 3.25, .7) + ' style="inset:0"><img src="__BASE__' + last.img + '" alt=""></div></div>' +
            '<i class="wh-bar" style="width:60%;margin-top:26px;height:20px"></i><i class="wh-bar" style="width:52%"></i><i class="wh-bar" style="width:40%"></i></div>';
          h += '</div>';
          if (d.aside) h += pill(d.aside.label + ' <b>' + H.count(d.aside.value, 3.1, .5) + (d.aside.suffix || '') + '</b>', 2.95);
          return h;
        },
        update: function (t, el) {
          glide(el, t, .95, 1.75, 1.6);
          cam(el, t, .03, 1100, 520);
          shimmer(el, t);
          var s = q(el, '.wh-send')[0];
          if (s) { var on = t > 2.35; s.style.background = on ? 'var(--accent)' : 'color-mix(in srgb,var(--accent) 35%,var(--card))'; s.style.transform = 'scale(' + (on ? 1 + .25 * Math.max(0, 1 - (t - 2.35) * 4) : 1) + ')'; }
        }
      };
    },

    focus: function (d) {
      var checks = (d.checks || []).slice(0, 4), cx = checks.length ? 570 : 400;
      var sfx = [[0, 'transition', .4], [1.05, 'slide', .35], [1.7, 'reveal', .45]];
      checks.forEach(function (c, i) { if (i < 3) sfx.push([2.1 + i * .3, 'check', .4]); });
      if (d.stamp) sfx.push([Math.max(3.3, 2.1 + checks.length * .3 + .15), 'stamp', .5]);
      return {
        sfx: sfx,
        build: function () {
          var h = '<div class="wh-cam abs" style="inset:0">' + headline(d, 64);
          checks.forEach(function (c, i) {
            var t = 2.1 + i * .3;
            h += '<div class="wh-chk abs"' + A('@item', t, .6) + ' style="' + box(120, 210 + i * 112, 400, 90) + '">' +
              '<svg width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="var(--accent)"/><path d="M11 21l6 6 12-13" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"' + A('draw', t + .15, .4) + '/></svg><span>' + c + '</span></div>';
          });
          // 检查项下方剩余空间放一块界面面板（品牌行 + 骨架），左栏不空
          var fy = 210 + checks.length * 112, fh = 860 - fy;
          if (checks.length && fh >= 180) h += '<div class="wh-panel abs"' + A('@card', 1.4, 1) + ' style="' + box(120, fy, 400, fh, 'padding:26px 28px') + '"><div class="wh-brand">' + LOGO + '<span style="font-size:22px;color:var(--muted)">' + checks.length + ' 项检查</span></div>' +
            '<i class="wh-bar" style="width:82%;margin-top:26px"></i><i class="wh-bar" style="width:60%"></i>' + (fh > 320 ? '<div class="wh-skel" style="height:' + Math.min(220, fh - 230) + 'px;margin-top:22px"></div><i class="wh-bar" style="width:70%;margin-top:22px"></i><i class="wh-bar" style="width:44%"></i>' : '') + '</div>';
          if (checks.length) h += '<div class="wh-panel abs"' + A('@card', 1.3, 1) + ' style="' + box(1545, 430, 520, 420) + '"><div class="wh-brand">' + LOGO + '</div><i class="wh-bar" style="width:70%;margin-top:24px"></i><i class="wh-bar" style="width:84%"></i><i class="wh-bar" style="width:52%"></i><i class="wh-bar" style="width:66%;margin-top:40px"></i><i class="wh-bar" style="width:38%"></i></div>';
          var W = 920, IH = Math.round((W - 36) * 9 / 16);
          h += '<div class="wh-panel abs"' + A('@card', 1.0, 1) + ' style="' + box(cx, 196, W, IH + (d.range ? 104 : 36), 'padding:18px') + '">' +
            '<div style="position:relative;height:' + IH + 'px"><div class="wh-skel abs" style="inset:0;border-radius:12px"></div>' +
            '<div class="wh-img abs"' + A('focus', 1.7, 1) + ' style="inset:0">' + BrollCore.media(d, H) + '</div></div>';
          if (d.range) {
            var L = (W - 36) * d.range.from / d.range.total, RW = (W - 36) * (d.range.to - d.range.from) / d.range.total;
            h += '<div style="position:relative;height:68px"><div class="abs" style="' + box(0, 26, W - 36, 8, 'border-radius:4px;background:var(--line)') + '"></div>' +
              '<div class="abs"' + A('bar', 2.2, .8) + ' style="' + box(L, 26, RW, 8, 'border-radius:4px;background:var(--accent)') + '"></div>' +
              '<div class="abs wh-tc"' + A('fade', 2.4) + ' style="' + pos(Math.max(0, L - 10), 42, 'transform:translateX(-100%)') + '">' + d.range.from + 's</div>' +
              '<div class="abs wh-tc"' + A('fade', 2.6) + ' style="' + pos(Math.min(W - 120, L + RW + 10), 42, 'color:var(--accent)') + '">' + d.range.to + 's</div></div>';
          }
          h += '</div></div>';
          if (d.stamp) h += pill('<svg width="26" height="26" viewBox="0 0 26 26" style="vertical-align:-4px;margin-right:12px"><circle cx="13" cy="13" r="13" fill="var(--accent)"/><path d="M7 13.5l4 4 8-9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg><b>' + d.stamp.text + '</b>' + (d.stamp.sub ? '<small>' + d.stamp.sub + '</small>' : ''), Math.max(3.25, 2.1 + checks.length * .3 + .1));
          return h;
        },
        update: function (t, el) { glide(el, t, .9, 1.65, 1.6); cam(el, t, .04, cx + 460, 460); shimmer(el, t); }
      };
    },

    metric: function (d) {
      var cap = (d.caption || '').replace(d.hl, '<span class="hl">' + d.hl + '</span>');
      var dy = (!d.logo && !d.note) ? 60 : 0;
      // 数字宽度估算：限在 900px 内（两侧面板从 x1480 开始），四位数带千分位时自动缩字号
      var vs = Math.round(+d.value || 0).toLocaleString('en-US'), suf = d.suffix || '', wu = 0;
      for (var k = 0; k < vs.length; k++) wu += /[0-9]/.test(vs[k]) ? .6 : .28;
      for (var k2 = 0; k2 < suf.length; k2++) wu += .42 * (/[\u3000-\u9fff]/.test(suf[k2]) ? 1 : .8);
      var nfs = Math.min(340, Math.floor(900 / Math.max(wu, 1)));
      var sfx = [[0, 'transition', .4], [.4, 'count', .45], [1.55, 'reveal', .4], [2.1, 'slide', .3]];
      if (d.note) sfx.push([2.8, 'key', .45]);
      return {
        sfx: sfx,
        build: function () {
          var h = '<div class="wh-cam abs" style="inset:0">';
          // 两侧界面面板被画面裁切（装饰层，y≥470 不进头像区）；有图时右侧面板里是图，没图是骨架
          h += '<div class="wh-panel abs"' + A('@card', 2.0, 1) + ' style="' + box(1480, 470 + dy, 560, 360, 'padding:16px') + '">' +
            (d.img ? '<div class="wh-img" style="height:100%"><img src="__BASE__' + d.img + '" alt=""></div>' : '<div class="wh-skel" style="height:200px"></div><i class="wh-bar" style="width:62%;margin-top:22px"></i><i class="wh-bar" style="width:44%"></i>') + '</div>' +
            '<div class="wh-panel abs"' + A('@card', 2.2, 1) + ' style="' + box(-160, 520 + dy, 440, 520) + '"><i class="wh-bar" style="width:70%;margin-top:40px"></i><i class="wh-bar" style="width:90%"></i><i class="wh-bar" style="width:55%"></i></div>';
          if (d.logo) h += '<div class="abs"' + A('focus', 1.4, .8) + ' style="' + box(860, 110, 200, 50) + '"><img class="logo-ink" src="__BASE__' + d.logo + '" alt="" style="width:100%;height:100%;display:block"></div>';
          if (d.kick) h += '<div class="abs wh-kick"' + A('fade', .1, .8) + ' style="' + box(0, (d.logo ? 186 : 150) + dy, 1920, 40) + '">' + d.kick + '</div>';
          h += '<div class="abs" style="' + box(0, 220 + dy, 1920, 330, 'display:flex;justify-content:center') + '"><div class="num wh-num"' + A('focus', .3, .9) + ' style="font-size:' + nfs + 'px;margin-top:' + Math.round((340 - nfs) * .5) + 'px">' + H.count(d.value, .35, 1.3) + '<span class="wh-suf">' + (d.suffix || '') + '</span></div></div>';
          h += '<div class="abs" style="' + box(300, 600 + dy, 1320, 180, 'display:flex;justify-content:center') + '"><div class="ttl"' + A('focus', 1.5, .9) + ' style="font-size:' + Math.max(52, Math.min(68, Math.floor(1100 / Math.max(1, (d.caption || '').length)))) + 'px;text-align:center;text-wrap:balance">' + cap + '</div></div>';
          h += '</div>';
          if (d.note) h += pill(d.note, 2.75);
          return h;
        },
        update: function (t, el) { cam(el, t, .05, 960, 420); }
      };
    }
  };
});
