/* 默认版式（没有自己 layouts.js 的主题用它；也是写新模板时的参照实现）
 *
 * 内容约定（场景里 use + data，所有模板都要能吃下这四种）：
 *   hero   {kick, title, hl, sub, img}                       开场 / 大标题页
 *   list   {kick, title, hl, items:[{name, img, tag}], aside:{label, value, suffix}}   2–5 个并列条目
 *   focus  {kick, title, hl, img | clip:{name, off, in}, range:{from, to, total}, checks:[…], stamp:{text, sub}}  聚焦一个画面 + 结论
 *   metric {kick, value, suffix, caption, hl, img, note, logo}   一个大数字结论
 * title 里出现 hl 的那段会包上 <span class="hl">。所有坐标按 1920×1080；避开头像圆（x1523–1858 y55–395）和字幕行（x410–1510 y905–965）。
 * 每个版式在 ~3.6 秒内完成主要动作，sfx 用语义事件。 */
(function () {
  function hlify(title, hl) { return hl && title.indexOf(hl) >= 0 ? title.replace(hl, '<span class="hl">' + hl + '</span>') : title; }
  function media(d, H) {
    if (d.clip) return H.clip(d.clip.name, d.clip.off || 0, d.clip.in || 0);
    return '<img src="__BASE__' + d.img + '" alt="">';
  }
  BrollCore.hlify = hlify;
  BrollCore.media = media;

  BrollCore.template('__default', function (H) {
    var A = H.A, box = H.box, pos = H.pos;
    function head(d, t, size) {
      return '<div class="abs"' + A('fade', t) + ' style="' + pos(90, 116) + '"><div class="kick">' + (d.kick || '') + '</div></div>' +
        '<div class="abs ttl"' + A('@title', t + .1, .7) + ' style="' + pos(90, 156, 'font-size:' + (size || 84) + 'px;max-width:1380px') + '">' + hlify(d.title || '', d.hl) + '</div>';
    }
    return {
      hero: function (d) {
        return {
          sfx: [[.1, 'enter', .5], [.5, 'reveal', .45]],
          build: function () {
            return '<div class="abs"' + A('fade', .05) + ' style="' + pos(90, 300) + '"><div class="kick">' + (d.kick || '') + '</div></div>' +
              '<div class="abs ttl"' + A('@title', .3, .8) + ' style="' + pos(90, 350, 'font-size:150px;max-width:1400px') + '">' + hlify(d.title || '', d.hl) + '</div>' +
              (d.sub ? '<div class="abs body muted"' + A('@text', 1) + ' style="' + pos(96, 700, 'font-size:36px') + '">' + d.sub + '</div>' : '');
          }
        };
      },
      list: function (d) {
        var items = d.items || [], n = items.length, w = Math.min(470, Math.floor((1440 - (n - 1) * 40) / n));
        var sfx = [[.15, 'enter', .5], [.55, 'type', .35], [1.6, 'draw', .4]];
        items.forEach(function (it, i) { sfx.push([2.4 + i * .2, 'card', i ? .45 : .5]); });
        if (d.aside) sfx.push([3.9, 'count', .4]);
        return {
          sfx: sfx,
          build: function () {
            var html = head(d, .4, 92) + '<svg class="ov"><line x1="90" y1="318" x2="1500" y2="318" stroke="var(--accent)" stroke-width="3"' + A('@line', 1.5, .7) + '/></svg>';
            items.forEach(function (it, i) {
              var x = 90 + i * (w + 40), rot = [-2, 1.5, -1, 2, -1.5][i % 5];
              html += '<div class="card"' + A('@card', 2.3 + i * .2) + ' style="' + box(x, 360, w, 430, 'padding:0;--r:' + rot + 'deg') + '">' +
                '<div style="height:300px;overflow:hidden"><img src="__BASE__' + it.img + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block"></div>' +
                '<div style="padding:20px 26px;display:flex;gap:16px;align-items:baseline"><span class="num" style="font-size:54px">0' + (i + 1) + '</span><span class="ttl" style="font-size:40px">' + it.name + '</span></div></div>';
            });
            if (d.aside) html += '<div class="abs mono muted"' + A('fade', 3.2) + ' style="' + pos(1610, 520, 'font-size:22px;line-height:1.6') + '">' + d.aside.label + '<br><span class="num" style="font-size:72px;color:var(--fg)">' + H.count(d.aside.value, 3.3, .8) + '</span><span style="font-size:28px"> ' + (d.aside.suffix || '') + '</span></div>';
            return html;
          }
        };
      },
      focus: function (d) {
        var checks = d.checks || [], sfx = [[0, 'transition', .45], [.5, 'slide', .4]];
        checks.forEach(function (c, i) { sfx.push([1.3 + i * .6, 'check', .5]); });
        if (d.stamp) sfx.push([3.4, 'stamp', .6]);
        return {
          sfx: sfx,
          build: function () {
            var html = '<div class="abs"' + A('fade', .1) + ' style="' + pos(90, 116) + '"><div class="kick">' + (d.kick || '') + '</div></div>' +
              '<div class="abs ttl"' + A('@title', .2) + ' style="' + pos(90, 156, 'font-size:84px') + '">' + hlify(d.title || '', d.hl) + '</div>' +
              '<div class="ph"' + A('@photo', .45, .7) + ' style="' + box(90, 330, 960, 540) + '">' + media(d, H) + '</div>';
            if (d.range) {
              var L = 960 * d.range.from / d.range.total, W = 960 * (d.range.to - d.range.from) / d.range.total;
              html += '<div class="abs" style="' + box(90, 880, 960, 10, 'background:var(--line)') + '"></div>' +
                '<div class="abs"' + A('bar', .9, .8) + ' style="' + box(90 + L, 880, W, 10, 'background:var(--accent)') + '"></div>';
            }
            checks.forEach(function (c, i) {
              var t = 1.3 + i * .6, y = 380 + i * 90;
              html += '<div class="abs"' + A('@item', t, .4) + ' style="' + pos(1180, y, 'display:flex;gap:18px;align-items:center') + '">' +
                '<svg width="44" height="44" viewBox="0 0 44 44"><circle cx="22" cy="22" r="20" fill="none" stroke="var(--accent)" stroke-width="3"/>' +
                '<path d="M12 23l7 7 13-15" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"' + A('draw', t + .1, .35) + '/></svg>' +
                '<span class="ttl" style="font-size:46px">' + c + '</span></div>';
            });
            if (d.stamp) html += H.stamp(d.stamp.text, 3.4, 1250, 700, 64, -8, d.stamp.sub);
            return html;
          }
        };
      },
      metric: function (d) {
        return {
          sfx: [[0, 'transition', .45], [.5, 'reveal', .5], [1.6, 'key', .5], [2.6, 'mark', .4]],
          build: function () {
            return '<div class="abs"' + A('up', .1) + ' style="' + pos(90, 120) + '"><div class="kick">' + (d.kick || '') + '</div></div>' +
              '<div class="abs num"' + A('@number', .4) + ' style="' + pos(80, 190, 'font-size:420px;letter-spacing:-.04em') + '">' + H.count(d.value, .45, 1.1) + '<span style="font-size:.4em">' + (d.suffix || '') + '</span></div>' +
              '<div class="abs ttl"' + A('@title', 1.5) + ' style="' + pos(100, 700, 'font-size:64px') + '">' + (d.caption || '').replace(d.hl, '<span class="mark">' + d.hl + '</span>') + '</div>' +
              (d.img ? '<div class="ph"' + A('@photo', .9) + ' style="' + box(1130, 420, 640, 360, '--r:2deg') + '"><img src="__BASE__' + d.img + '" alt=""></div>' : '') +
              (d.note ? H.hand(d.note, 2.6, 1460, 800, 72, -6) : '') +
              (d.logo ? '<div class="abs"' + A('fade', 1.6) + ' style="' + box(1590, 860, 195, 48) + '"><img src="__BASE__' + d.logo + '" alt="" style="width:100%;height:100%;display:block"></div>' : '');
          }
        };
      }
    };
  });
})();
