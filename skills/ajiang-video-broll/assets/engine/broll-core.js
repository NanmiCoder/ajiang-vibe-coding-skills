/* broll-core.js — 预览页和 Remotion 共用的逐帧引擎（主题无关）
 *
 * 场景用字符串 HTML 写，元素用 data-a / data-t / data-d 声明动画；render(t) 是 t 的纯函数，
 * 所以预览页里看到的就是成片。主题只通过三样东西影响画面：
 *   1. CSS 变量 + 组件样式（themes/<id>/theme.css，变体是一组变量覆盖）
 *   2. motion（theme.json 里的 ease / dur / params / transition）
 *   3. chrome（舞台底纹和页眉的 HTML）
 * 声音只在场景里写“语义事件”（sfx:[[t,'stamp',.5]]），由主题的 sound.sfx 映射成具体音色。
 *
 * 用法：
 *   var b = BrollCore.create(stageEl, seg, {base:'assets/', mode:'preview'|'remotion', fps:30,
 *                                          theme: THEME, clips:{name:{frames:331}}});
 *   b.render(t);           // 秒
 *   BrollCore.timeline(seg) // [[绝对秒, 事件, 增益, 场景名], …]，给音频脚本用
 */
(function (root) {
  'use strict';
  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  var EASE = {
    cubic: function (x) { return 1 - Math.pow(1 - x, 3); },
    quart: function (x) { return 1 - Math.pow(1 - x, 4); },
    quint: function (x) { return 1 - Math.pow(1 - x, 5); },
    expo: function (x) { return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); },
    back: function (x) { var c = 1.4, c3 = c + 1; return 1 + c3 * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
    linear: function (x) { return x; }
  };
  function easeIO(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function backK(x, c) { var c3 = c + 1; return 1 + c3 * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }

  var DEFAULT_MOTION = {
    ease: 'cubic', dur: .6, stagger: .13,
    params: { up: { dist: 36, blur: 8 }, slam: { from: 1.25, blur: 10 }, pop: { from: .5, overshoot: 1.70158 },
              stamp: { from: 1.8, rot: -14 }, drop: { dist: 160 }, lift: { dist: 60 } },
    transition: { type: 'fade', dur: .3 }
  };
  function merge(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in (b || {})) o[k] = (typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k]) ? merge(a[k], b[k]) : b[k]; return o; }

  // 元素自带的旋转写在 --r 里（例如 style="--r:-6deg"），所有动画都把它拼在最后，不会被覆盖。
  function rot(n) { var r = n.style.getPropertyValue('--r'); return r ? ' rotate(' + r.trim() + ')' : ''; }

  // 语义角色：场景写 data-a="@title"，由主题的 motion.roles 决定具体动效（换主题时招牌动效跟着换）
  var DEFAULT_ROLES = { title: 'up', text: 'up', card: 'drop', photo: 'wipe', number: 'slam', item: 'pop', note: 'pop', stamp: 'stamp', line: 'draw', logo: 'fade' };
  function makeApply(M) {
    var E = EASE[M.ease] || EASE.cubic, P = M.params, R = M.roles || {};
    return function apply(el, t) {
      var nodes = el.querySelectorAll('[data-a]');
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i], a = n.dataset.a;
        if (a.charAt(0) === '@') a = R[a.slice(1)] || DEFAULT_ROLES[a.slice(1)] || 'up';
        var t0 = +n.dataset.t || 0, d = +(n.dataset.d || M.dur),
            p = clamp((t - t0) / d), e = E(p), s = n.style;
        switch (a) {
          case 'fade': s.opacity = e; break;
          case 'up': s.opacity = e; s.transform = 'translateY(' + (1 - e) * P.up.dist + 'px)' + rot(n);
            s.filter = p < 1 && P.up.blur ? 'blur(' + (1 - e) * P.up.blur + 'px)' : ''; break;
          case 'mask': // 遮罩升起：自身裁切，不需要父级 overflow
            s.opacity = p > 0 ? 1 : 0; s.clipPath = p < 1 ? 'inset(0 0 ' + (1 - e) * 100 + '% 0)' : ''; s.transform = 'translateY(' + (1 - e) * 40 + '%)' + rot(n); break;
          case 'pop': s.opacity = clamp(p * 2); s.transform = 'scale(' + (p < 1 ? P.pop.from + (1 - P.pop.from) * backK(p, P.pop.overshoot) : 1) + ')' + rot(n);
            s.transformBox = 'fill-box'; s.transformOrigin = 'center'; break;
          case 'slam': s.opacity = clamp(p * 1.6); s.transform = 'scale(' + (P.slam.from - (P.slam.from - 1) * e) + ')' + rot(n);
            if (!s.transformOrigin) s.transformOrigin = 'left center';
            s.filter = p < 1 && P.slam.blur ? 'blur(' + (1 - e) * P.slam.blur + 'px)' : ''; break;
          case 'stamp': { var r0 = P.stamp.rot, rEnd = parseFloat(n.style.getPropertyValue('--r')) || 0;
            s.opacity = clamp(p * 2); s.transform = 'scale(' + (P.stamp.from - (P.stamp.from - 1) * E(p)) + ') rotate(' + (rEnd + r0 * (1 - e)) + 'deg)'; break; }
          case 'drop': s.opacity = clamp(p * 2); s.transform = 'translateY(' + (1 - backK(p, 1.70158)) * -P.drop.dist + 'px)' + rot(n); break;
          case 'lift': { var b = backK(p, 1.70158); s.opacity = clamp(p * 2);
            s.transform = 'translateY(' + (1 - b) * P.lift.dist + 'px) scale(' + (.8 + .2 * b) + ')' + rot(n); s.transformOrigin = 'center'; break; }
          case 'spin': { var b2 = backK(p, 2); s.opacity = clamp(p * 2); s.transform = 'scale(' + (.2 + .8 * b2) + ') rotate(' + ((1 - b2) * -90) + 'deg)' + rot(n); s.transformOrigin = 'center'; break; }
          case 'wipe': s.clipPath = 'inset(0 ' + (1 - easeIO(p)) * 100 + '% 0 0)'; break;
          case 'wipeY': s.clipPath = 'inset(' + (1 - easeIO(p)) * 100 + '% 0 0 0)'; break;
          case 'bar': s.transform = 'scaleX(' + e + ')'; s.transformOrigin = 'left center'; break;
          case 'draw': if (n.dataset.dash) s.opacity = e; else s.strokeDashoffset = (+n.dataset.len) * (1 - easeIO(p)); break;
          case 'type': { var full = n.dataset.text || ''; n.textContent = full.slice(0, Math.round(full.length * p)) + (p > 0 && p < 1 ? '▍' : ''); break; }
          case 'flicker': // 上电闪两下再稳住（按 t 确定，不用随机）
            s.opacity = p <= 0 ? 0 : p < .18 ? 1 : p < .3 ? .15 : p < .42 ? 1 : p < .5 ? .35 : 1; break;
          case 'rgb': // 色差错位收拢：用 text-shadow，结束后清零
            s.opacity = clamp(p * 3); { var k = (1 - e) * 10; s.textShadow = p < 1 ? (-k) + 'px 0 rgba(255,40,80,.75),' + k + 'px 0 rgba(0,200,255,.75)' : ''; } break;
          case 'focus': // 由虚到实：模糊 + 轻微缩放落定
            s.opacity = e; s.filter = p < 1 ? 'blur(' + (1 - e) * (P.up.blur || 12) + 'px)' : ''; s.transform = 'scale(' + (1.03 - .03 * e) + ')' + rot(n); break;
          case 'strike': // 一道强调色横线从左划过文字（旧说法被划掉）
            s.backgroundImage = 'linear-gradient(var(--accent),var(--accent))'; s.backgroundRepeat = 'no-repeat';
            s.backgroundPosition = '0 58%'; s.backgroundSize = (easeIO(p) * 100) + '% .12em'; break;
          case 'misreg': // 孔版套印：两色版从错开 12px 收拢到 3px（保留 3px）
            { var m = 3 + (1 - e) * 12; s.opacity = clamp(p * 3);
              s.textShadow = m + 'px ' + (m * .6) + 'px 0 color-mix(in srgb,var(--accent) 75%,transparent),' + (-m * .5) + 'px ' + (-m * .4) + 'px 0 color-mix(in srgb,var(--accent2) 80%,transparent)';
              s.transform = 'translate(' + (1 - e) * -8 + 'px,0)' + rot(n); } break;
          case 'trail': // 残影拖尾：从左冲进来，5 层残影随落定收拢
            { var dx = (1 - e) * 260, sh = []; for (var q = 1; q <= 5; q++) sh.push((-q * (8 + dx * .18)) + 'px 0 0 color-mix(in srgb,var(--accent) ' + (60 - q * 11) + '%,transparent)');
              s.opacity = clamp(p * 2.5); s.transform = 'translateX(' + (-dx) + 'px)' + rot(n); s.textShadow = p < 1 ? sh.join(',') : ''; } break;
        }
      }
      var cs = el.querySelectorAll('[data-count]');
      for (var j = 0; j < cs.length; j++) {
        var c = cs[j], pc = clamp((t - (+c.dataset.t || 0)) / (+c.dataset.d || 1)), v = +c.dataset.count * EASE.cubic(pc);
        var dec = +(c.dataset.dec || 0);
        c.textContent = (c.dataset.pre || '') + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US')) + (c.dataset.suf || '');
      }
    };
  }

  function sceneAlpha(sc, i, seg, T, tr) {
    var t = T - sc.from, D = tr.dur;
    var inA = sc.from === 0 ? 1 : clamp(t / D), outA = i === seg.scenes.length - 1 ? 1 : clamp((sc.to + D - T) / D);
    return { inA: inA, outA: outA };
  }
  function applyTransition(el, a, tr) {
    var k = Math.min(a.inA, a.outA), s = el.style;
    s.opacity = k; s.transform = ''; s.filter = ''; s.clipPath = '';
    if (tr.type === 'wipe' && a.inA < 1) { s.opacity = 1; s.clipPath = 'inset(0 ' + (1 - easeIO(a.inA)) * 100 + '% 0 0)'; }
    else if (tr.type === 'push') { if (a.inA < 1) { s.opacity = 1; s.transform = 'translateX(' + (1 - easeIO(a.inA)) * 100 + '%)'; } else if (a.outA < 1) { s.opacity = 1; s.transform = 'translateX(' + -(1 - easeIO(a.outA)) * 100 + '%)'; } }
    else if (tr.type === 'rise') { if (a.outA < 1) { s.transform = 'translateY(' + -(1 - a.outA) * 60 + 'px)'; s.filter = 'blur(' + (1 - a.outA) * 10 + 'px)'; } else if (a.inA < 1) s.transform = 'translateY(' + (1 - EASE.expo(a.inA)) * 50 + 'px)'; }
    else if (tr.type === 'flash') { s.opacity = a.inA < 1 ? (a.inA < .35 ? 0 : 1) : (a.outA < .5 ? 0 : 1); }
    else if (tr.type === 'cut') { s.opacity = a.inA < 1 ? (a.inA < .5 ? 0 : 1) : (a.outA < .5 ? 0 : 1); }
    else if (tr.type === 'invert') { s.opacity = a.inA < 1 ? (a.inA < .25 ? 0 : 1) : (a.outA < .5 ? 0 : 1); if (a.inA < 1 && a.inA >= .25 && a.inA < .6) s.filter = 'invert(1)'; }
    else if (tr.type === 'iris') { if (a.inA < 1) { s.opacity = 1; s.clipPath = 'circle(' + (easeIO(a.inA) * 80) + '% at 50% 55%)'; } }
    else if (tr.type === 'zoom') { if (a.inA < 1) s.transform = 'scale(' + (1.12 - .12 * EASE.expo(a.inA)) + ')'; else if (a.outA < 1) s.transform = 'scale(' + (.92 + .08 * a.outA) + ')'; }
    else if (tr.type === 'blur') { if (a.inA < 1) s.filter = 'blur(' + (1 - a.inA) * 16 + 'px)'; else if (a.outA < 1) s.transform = 'translateX(' + -(1 - a.outA) * 80 + 'px)'; }
  }

  /* ── 模板：版式和内容分离 ──
   * 场景可以只写内容：{name, from, to, use:'list', data:{…}}。
   * 每套模板在 themes/<id>/layouts.js 里 BrollCore.template('<id>', function (H, ctx) { return {hero, list, focus, metric, …}; })，
   * 每个版式函数 (data, sc) → {build: () => html, sfx?: [[t, 事件, 增益]], update?: (t, el) => void}。
   * 同一份内容换模板 = 换整套构图和动效编排，不只是换颜色。没有实现的版式回落到 __default。 */
  var TEMPLATES = {};
  function template(id, factory) { TEMPLATES[id] = factory; }
  function layoutsFor(theme) {
    var ctx = { theme: theme || {}, id: (theme || {}).id }, out = {}, k;
    var base = TEMPLATES.__default ? TEMPLATES.__default(H, ctx) : {};
    for (k in base) out[k] = base[k];
    var own = theme && TEMPLATES[theme.id] ? TEMPLATES[theme.id](H, ctx) : {};
    for (k in own) out[k] = own[k];
    return out;
  }
  function expand(seg, theme) {
    var L = layoutsFor(theme), copy = {}, k;
    for (k in seg) copy[k] = seg[k];
    copy.scenes = seg.scenes.map(function (sc) {
      if (!sc.use) return sc;
      var fn = L[sc.use];
      if (!fn) throw new Error('模板 ' + ((theme || {}).id || '?') + ' 没有版式 ' + sc.use);
      var r = fn(sc.data || {}, sc), o = {};
      for (k in sc) o[k] = sc[k];
      o.build = r.build; o.update = r.update || sc.update;
      o.sfx = (r.sfx || []).concat(sc.sfx || []);
      return o;
    });
    return copy;
  }

  function create(host, seg, opts) {
    opts = opts || {};
    var theme = opts.theme || {}, M = merge(DEFAULT_MOTION, theme.motion || {}), tr = M.transition;
    seg = expand(seg, theme);
    var apply = makeApply(M), base = opts.base || 'assets/', mode = opts.mode || 'preview', fps = opts.fps || 30;
    var clips = opts.clips || {}, built = [], layer, chromeEl, playing = false;

    function mount() {
      host.innerHTML = '';
      chromeEl = document.createElement('div'); chromeEl.className = 'chrome';
      chromeEl.innerHTML = (theme.chrome || '').replace(/__BASE__/g, base);
      host.appendChild(chromeEl);
      var lab = chromeEl.querySelector('[data-chrome-label]'); if (lab && seg.label) lab.textContent = seg.label;
      layer = document.createElement('div'); layer.className = 'scenes'; host.appendChild(layer);
      built = seg.scenes.map(function (sc) {
        var el = document.createElement('div'); el.className = 'scene'; el.style.display = 'none';
        el.innerHTML = sc.build().replace(/__BASE__/g, base);
        layer.appendChild(el);
        el.querySelectorAll('[data-a="draw"],path[data-a^="@"],line[data-a^="@"],polyline[data-a^="@"]').forEach(function (p) {
          var len = p.getTotalLength ? p.getTotalLength() : 1000; p.dataset.len = len;
          p.style.strokeDasharray = p.dataset.dash || len;
        });
        el.querySelectorAll('.clip').forEach(function (c) { mountClip(c); });
        return el;
      });
    }
    function mountClip(c) {
      var name = c.dataset.clip, m;
      if (mode === 'remotion') { m = document.createElement('img'); m.className = 'clip-media'; m.alt = ''; }
      else { m = document.createElement('video'); m.className = 'clip-media'; m.muted = true; m.playsInline = true; m.preload = 'auto'; m.src = base + 'clips/' + name + '.mp4'; }
      c.appendChild(m);
    }
    function syncClips(el, t) {
      el.querySelectorAll('.clip').forEach(function (c) {
        var m = c.firstChild, vt = t - (+c.dataset.off || 0), inp = +c.dataset.in || 0;
        if (mode === 'remotion') {
          var info = clips[c.dataset.clip] || { frames: 1 }, f = Math.floor((Math.max(0, vt) + inp) * fps + 1e-6);
          f = Math.min(info.frames - 1, Math.max(0, f));
          var src = base + 'frames/' + c.dataset.clip + '/' + String(f + 1).padStart(4, '0') + '.jpg';
          if (m.getAttribute('src') !== src) m.setAttribute('src', src);
        } else {
          if (!m.duration) return;
          var want = Math.max(0, Math.min(m.duration - .05, inp + Math.max(0, vt)));
          if (Math.abs(m.currentTime - want) > .25) m.currentTime = want;
          if (playing && vt >= 0 && inp + vt < m.duration - .05) { if (m.paused) m.play().catch(function () {}); } else if (!m.paused) m.pause();
        }
      });
    }
    function render(T) {
      var tc = chromeEl && chromeEl.querySelector('[data-chrome-tc]');
      if (tc) { var fr = Math.floor(T * fps), ss = Math.floor(fr / fps); tc.textContent = '00:' + String(Math.floor(ss / 60)).padStart(2, '0') + ':' + String(ss % 60).padStart(2, '0') + ':' + String(fr % fps).padStart(2, '0'); }
      var pg = chromeEl && chromeEl.querySelector('.prog'); if (pg) pg.style.transform = 'scaleX(' + clamp(T / seg.dur) + ')';
      var idx = chromeEl && chromeEl.querySelector('[data-chrome-index]');
      seg.scenes.forEach(function (sc, i) {
        var el = built[i], on = T >= sc.from - .001 && T < sc.to + tr.dur;
        if (i === seg.scenes.length - 1) on = T >= sc.from - .001;
        if (!on) { if (el.style.display !== 'none') { el.style.display = 'none'; el.querySelectorAll('video').forEach(function (v) { v.pause(); }); } return; }
        el.style.display = '';
        if (idx && T >= sc.from && T < sc.to) idx.textContent = String(i + 1).padStart(2, '0');
        var t = T - sc.from;
        applyTransition(el, sceneAlpha(sc, i, seg, T, tr), tr);
        apply(el, t);
        if (sc.update) sc.update(t, el);
        syncClips(el, t);
      });
    }
    // Remotion 用：等当前可见的 img 解码完
    function ready() {
      var imgs = [].slice.call(host.querySelectorAll('img')).filter(function (i) { return i.offsetParent !== null && i.getAttribute('src'); });
      return Promise.all(imgs.map(function (i) { return i.decode ? i.decode().catch(function () {}) : null; }));
    }
    mount();
    return { render: render, ready: ready, mount: mount, setPlaying: function (p) { playing = p; }, motion: M };
  }

  /* 把场景的字幕锚点换成秒（段内）。data 是 segments.json 里这一段（cues 的 at/end 是段内帧号）。
   *   from: 数字秒        或 cue:'字幕原文'（这句开口时；lead:-0.2 提前 0.2 秒）
   *   to:   数字秒        或 until:'字幕原文'（这句开口时结束）；都没写 = 下一场景开始 / 段尾
   * 返回同一个 seg（原地补上 from/to/dur/cues/label）。 */
  function resolve(seg, data, fps) {
    fps = fps || 30;
    var cues = (data && data.cues) || [];
    function find(needle, nth) {
      var n = String(needle).replace(/\s/g, ''), hits = cues.filter(function (c) { return c.text.replace(/\s/g, '').indexOf(n) >= 0; });
      var h = hits[nth || 0];
      if (!h) throw new Error((data && data.key) + ' 里找不到字幕「' + needle + '」');
      return h;
    }
    seg.dur = data ? data.frames / fps : seg.dur;
    if (!seg.label && data) seg.label = data.title;
    seg.cues = cues.map(function (c) { return [c.at / fps, c.text]; });
    seg.scenes.forEach(function (sc) {
      if (sc.cue != null) sc.from = Math.max(0, find(sc.cue, sc.nth).at / fps + (sc.lead || 0));
      if (sc.from == null) throw new Error('场景 ' + sc.name + ' 没有 from 也没有 cue');
    });
    if (seg.scenes.length) seg.scenes[0].from = 0; // 第 0 帧就是完整画面：第一个场景总从 0 开始
    seg.scenes.forEach(function (sc, i) {
      if (sc.until != null) sc.to = find(sc.until, sc.untilNth).at / fps + (sc.lead || 0);
      else if (sc.to == null) sc.to = i < seg.scenes.length - 1 ? seg.scenes[i + 1].from : seg.dur;
      sc.from = +(+sc.from).toFixed(3); sc.to = +(+sc.to).toFixed(3);
    });
    return seg;
  }

  // 把各场景里写的语义音效展开成绝对时间表
  function timeline(seg, theme) {
    if (theme) seg = expand(seg, theme);
    var out = [];
    seg.scenes.forEach(function (sc) { (sc.sfx || []).forEach(function (e) { out.push([+(sc.from + e[0]).toFixed(3), e[1], e[2] == null ? .5 : e[2], sc.name]); }); });
    return out.sort(function (a, b) { return a[0] - b[0]; });
  }

  // 主题变量 → CSS 文本（变体覆盖默认）
  function themeVars(theme, variant) {
    var v = merge(theme.vars || {}, ((theme.variants || {})[variant] || {}).vars || {}), css = '';
    for (var k in v) css += k + ':' + v[k] + ';';
    for (var f in (theme.fonts || {})) css += f + ':"' + theme.fonts[f].family + '",' + theme.fonts[f].fallback + ';';
    return css;
  }

  /* 写场景用的小工具（全部按 1920×1080 设计坐标） */
  var H = {
    A: function (type, t, d) { return ' data-a="' + type + '" data-t="' + t + '"' + (d ? ' data-d="' + d + '"' : ''); },
    box: function (x, y, w, h, extra) { return 'left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;' + (extra || ''); },
    pos: function (x, y, extra) { return 'left:' + x + 'px;top:' + y + 'px;' + (extra || ''); },
    title: function (kick, text, t, size, x, y) {
      return '<div class="abs"' + H.A('up', t) + ' style="' + H.pos(x || 90, y || 116) + '"><div class="kick">' + kick + '</div><div class="ttl" style="font-size:' + (size || 68) + 'px;margin-top:10px">' + text + '</div></div>';
    },
    line: function (x1, y1, x2, y2, t, d, color, w, dash) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (color || 'var(--accent)') + '" stroke-width="' + (w || 2) + '"' + (dash ? ' data-dash="' + dash + '"' : '') + H.A('draw', t, d || .6) + '/>'; },
    path: function (dd, t, d, color, w, fill, dash) { return '<path d="' + dd + '" fill="' + (fill || 'none') + '" stroke="' + (color || 'var(--accent)') + '" stroke-width="' + (w || 2) + '" stroke-linecap="round" stroke-linejoin="round"' + (dash ? ' data-dash="' + dash + '"' : '') + H.A('draw', t, d || .8) + '/>'; },
    // off = 场景内第几秒开始播；inp = 从素材第几秒开始
    clip: function (name, off, inp) { return '<div class="clip" data-clip="' + name + '" data-off="' + (off || 0) + '" data-in="' + (inp || 0) + '"></div>'; },
    stamp: function (text, t, x, y, size, rot, sub) {
      return '<div class="abs stamp"' + H.A('stamp', t, .4) + ' style="' + H.pos(x, y, 'font-size:' + (size || 56) + 'px;--r:' + (rot == null ? -8 : rot) + 'deg') + '">' + text + (sub ? '<small>' + sub + '</small>' : '') + '</div>';
    },
    hand: function (text, t, x, y, size, rot) { return '<div class="hand abs"' + H.A('pop', t, .4) + ' style="' + H.pos(x, y, 'font-size:' + (size || 64) + 'px;--r:' + (rot == null ? -5 : rot) + 'deg;white-space:nowrap') + '">' + text + '</div>'; },
    chip: function (text, on) { return '<span class="chip' + (on ? ' on' : '') + '">' + text + '</span>'; },
    count: function (n, t, d, pre, suf, dec) { return '<span data-count="' + n + '" data-t="' + t + '" data-d="' + (d || 1) + '"' + (pre ? ' data-pre="' + pre + '"' : '') + (suf ? ' data-suf="' + suf + '"' : '') + (dec ? ' data-dec="' + dec + '"' : '') + '>0</span>'; },
    type: function (text, t, d) { return '<span' + H.A('type', t, d || Math.max(.4, text.length * .05)) + ' data-text="' + text.replace(/"/g, '&quot;') + '"></span>'; }
  };

  root.BrollCore = { create: create, resolve: resolve, timeline: timeline, expand: expand, template: template, templates: TEMPLATES, themeVars: themeVars, H: H, EASE: EASE };
})(typeof window !== 'undefined' ? window : globalThis);
