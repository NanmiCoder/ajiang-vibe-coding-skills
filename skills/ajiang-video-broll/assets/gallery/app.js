(function () {
  'use strict';
  var ORDER = Object.keys(THEMES);
  var BASE = 'assets/';
  var Q = new URLSearchParams(location.search), H0 = (location.hash || '').slice(1) || Q.get('id') || '', START = THEMES[H0] ? H0 : ORDER[0];
  var cur = { id: START, variant: defVariant(THEMES[START]) }, T = Q.get('t') ? +Q.get('t') : 3.6, playing = false, player = null, audioIdx = {};
  
  var $ = function (id) { return document.getElementById(id); };
  var ANIM_LABEL = { fade: '淡入', up: '上浮', mask: '遮罩升起', pop: '弹出', slam: '砸入', stamp: '盖章', drop: '落下', lift: '托起', spin: '旋入', wipe: '横向擦出', wipeY: '纵向擦出', bar: '色条伸出', draw: '描线', type: '打字', count: '数字滚动', flicker: '上电闪烁', rgb: '色差收拢' };
  var EV_LABEL = { enter: '元素出现', type: '打字', draw: '描线', card: '卡片落位', deal: '连发卡片', count: '数字滚动', transition: '换页', slide: '滑入', check: '打勾', stamp: '盖章', reveal: '揭示', key: '关键结论', mark: '批注', warn: '问题/告警', hit: '重点砸入', scan: '扫描', shot: '截图' };
  var TR_LABEL = { fade: '交叉淡化', wipe: '横向擦除', flash: '白闪硬切', push: '整屏推走', rise: '上移模糊 + 下方进入' };
  var EASE_LABEL = { cubic: 'easeOut 三次方（柔和落定）', expo: 'expo-out（快进慢停）', quart: 'quart-out（干脆）', back: 'back（带回弹）', linear: '线性' };

  function defVariant(th) { for (var k in th.variants) if (th.variants[k].default) return k; return Object.keys(th.variants)[0]; }
  function varsOf(id, v) { var th = THEMES[id], o = {}, k; for (k in th.vars) o[k] = th.vars[k]; var vv = (th.variants[v] || {}).vars || {}; for (k in vv) o[k] = vv[k]; return o; }
  function makeStage(host, id, v) {
    host.innerHTML = '';
    var st = document.createElement('div'); st.className = 'stage'; st.dataset.skin = id;
    st.setAttribute('style', BrollCore.themeVars(THEMES[id], v));
    host.appendChild(st);
    var safe = document.createElement('div'); safe.className = 'safe';
    safe.innerHTML = '<div class="avc" style="left:1523px;top:55px;width:335px;height:335px">头像</div><div class="sub" style="top:900px">整体的完成度相当可以了</div>';
    st.appendChild(safe);
    function fit() { st.style.transform = 'scale(' + host.clientWidth / 1920 + ')'; }
    fit(); if (window.ResizeObserver) new ResizeObserver(fit).observe(host);
    return st;
  }
  function engine(st, id, seg) {
    var inner = document.createElement('div'); inner.style.cssText = 'position:absolute;inset:0';
    st.insertBefore(inner, st.firstChild);
    return BrollCore.create(inner, seg, { base: BASE, mode: 'preview', fps: 30, theme: THEMES[id] });
  }

  /* ── 主播放器 ── */
  function mountPlayer() {
    var st = makeStage($('vp'), cur.id, cur.variant);
    player = engine(st, cur.id, DEMO);
    $('vp').classList.toggle('show-safe', $('safe').checked);
    st.classList.toggle('show-safe', $('safe').checked);
    var a = $('demoAudio'), src = BASE + 'audio/' + cur.id + '/demo.mp3';
    if (a.getAttribute('src') !== src) { a.setAttribute('src', src); }
    render();
  }
  function render() {
    if (player) player.render(T);
    $('fill').style.width = (T / DEMO.dur * 100) + '%';
    $('scrub').value = Math.round(T / DEMO.dur * 1000);
    $('time').textContent = T.toFixed(1) + ' / ' + DEMO.dur.toFixed(1) + 's';
  }
  function setPlaying(p) {
    playing = p; if (player && player.setPlaying) player.setPlaying(p);
    $('playIcon').innerHTML = p ? '<path d="M3 2h4v12H3zM9 2h4v12H9z"/>' : '<path d="M4 2l10 6-10 6z"/>';
    $('play').setAttribute('aria-label', p ? '暂停' : '播放（带声音）');
    var a = $('demoAudio');
    if (p) { if (T >= DEMO.dur - .05) T = 0; try { a.currentTime = T; } catch (e) {} a.play().catch(function () {}); last = performance.now(); }
    else a.pause();
  }
  var last = performance.now();
  function loop(now) {
    if (playing) {
      var a = $('demoAudio');
      if (!a.paused && a.currentTime > 0 && !a.ended) T = a.currentTime; else T += (now - last) / 1000;
      if (T >= DEMO.dur) { T = DEMO.dur; setPlaying(false); }
      render();
    }
    last = now; requestAnimationFrame(loop);
  }

  /* ── 说明栏 ── */
  var GROUP_BADGE = { chosen: '<span class="badge ok">主选</span>', kept: '<span class="badge ok">主题库</span>', candidate: '<span class="badge new">新候选</span>', legacy: '<span class="badge">旧预设</span>' };
  function renderInfo() {
    var th = THEMES[cur.id], g = th.group || 'candidate';
    var src = th.source ? '<dt>参考</dt><dd><a href="' + th.source.url + '" target="_blank" rel="noopener">' + th.source.title + '</a></dd>' : '';
    $('info').innerHTML =
      '<div class="k">' + th.en + '</div>' +
      '<div class="nm"><b>' + th.name + '</b>' + (GROUP_BADGE[g] || '') + '</div>' +
      '<p>' + th.concept + '</p>' +
      '<dl><dt>适合</dt><dd>' + th.fits + '</dd><dt>来历</dt><dd>' + th.status + '</dd>' + src + '<dt>变体</dt><dd>' + th.variants[cur.variant].name + '</dd></dl>' +
      '<button class="pick" id="pickBtn">对这套提修改意见</button>';
    $('pickBtn').addEventListener('click', function () { $('fbTheme').value = cur.id; $('fbNote').value = notes[cur.id] || ''; $('fbNote').focus(); document.querySelector('.choice').scrollIntoView({ behavior: 'smooth' }); });
  }
  function renderVariants() {
    var th = THEMES[cur.id];
    $('variants').innerHTML = Object.keys(th.variants).map(function (k) {
      var v = varsOf(cur.id, k);
      return '<button data-v="' + k + '" aria-pressed="' + (k === cur.variant) + '"><i style="background:linear-gradient(135deg,' + v['--bg'] + ' 50%,' + v['--accent'] + ' 50%)"></i>' + th.variants[k].name + '</button>';
    }).join('');
    $('variants').querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { cur.variant = b.dataset.v; refresh(false); }); });
  }

  /* ── 缩略图：已定 / 候选 / 旧预设 三组 ── */
  var thumbsBuilt = false, THUMBS = [];
  function rethumb() { THUMBS.forEach(function (e) { e.render(3.9); }); }
  function renderThumbs() {
    if (!thumbsBuilt) {
      var groups = [['chosen', '主选'], ['kept', '主题库'], ['candidate', '候选'], ['legacy', '旧预设']];
      $('thumbs').innerHTML = groups.map(function (g) {
        var ids = ORDER.filter(function (id) { return (THEMES[id].group || 'candidate') === g[0]; });
        if (!ids.length) return '';
        return '<div class="tgroup"><div class="k">' + g[1] + ' · ' + ids.length + '</div><div class="tgrid">' + ids.map(function (id) {
          return '<button class="th" data-id="' + id + '"><div class="mini"></div><span><b>' + THEMES[id].name + '</b><small class="star"></small></span><small>' + THEMES[id].en + '</small></button>';
        }).join('') + '</div></div>';
      }).join('');
      $('thumbs').querySelectorAll('.th').forEach(function (b) {
        var id = b.dataset.id, st = makeStage(b.querySelector('.mini'), id, defVariant(THEMES[id]));
        var te = engine(st, id, DEMO); te.render(3.9); THUMBS.push(te);
        b.addEventListener('click', function () { cur.id = id; cur.variant = defVariant(THEMES[id]); setPlaying(false); refresh(true); window.scrollTo({ top: 0, behavior: 'smooth' }); });
      });
      thumbsBuilt = true;
    }
    $('thumbs').querySelectorAll('.th').forEach(function (b) {
      var id = b.dataset.id;
      b.setAttribute('aria-pressed', id === cur.id);
      
      b.querySelector('.star').textContent = THEMES[id].group === 'chosen' ? '主选' : notes[id] ? '有意见' : '';
    });
  }

  /* ── 配色 / 字体 ── */
  function renderSwatches() {
    var v = varsOf(cur.id, cur.variant), names = { '--bg': '底色', '--fg': '文字', '--muted': '次要', '--accent': '强调', '--accent2': '辅助', '--card': '卡片', '--ok': '通过' };
    $('swatches').innerHTML = Object.keys(names).map(function (k) { return '<div><i style="background:' + v[k] + '"></i>' + names[k] + '<code>' + v[k] + '</code></div>'; }).join('');
    var f = THEMES[cur.id].fonts, roles = { '--title': ['标题', '片段重拍'], '--sans': ['正文', '提示词写什么，画面就是什么'], '--mono': ['标签', 'SHEET A · 20.1s'], '--hand': ['批注', '相当可以了！'], '--num': ['数字', '88% 25s'] };
    $('fonts').innerHTML = Object.keys(roles).map(function (k) {
      var it = f[k]; return '<div><code>' + roles[k][0] + '</code><span style="font-family:\'' + it.family + '\',' + it.fallback + ';font-weight:' + it.weights[it.weights.length - 1] + (it.italic && k === '--hand' ? ';font-style:italic' : '') + '">' + roles[k][1] + '</span></div><div><code></code><code>' + it.family + ' ' + it.weights.join('/') + '</code></div>';
    }).join('');
  }

  /* ── 动效 ── */
  var spec = null, specT = 0, specRun = false, specType = null;
  function specSeg(type) {
    var H = BrollCore.H, A = H.A, html;
    if (type === 'draw') html = '<svg class="ov">' + H.path('M300 640 C 600 300, 900 900, 1200 480 S 1600 520, 1640 420', .15, 1.1, null, 8) + '</svg>';
    else if (type === 'type') html = '<div class="abs ttl" style="left:220px;top:420px;font-size:120px">' + H.type('只重拍最后 5 秒', .15, .9) + '</div>';
    else if (type === 'count') html = '<div class="abs num" style="left:520px;top:250px;font-size:520px">' + H.count(88, .15, 1.1) + '<span style="font-size:.4em">%</span></div>';
    else if (type === 'stamp') html = H.stamp('符合设定', .15, 640, 400, 120, -8, 'PROMPT ✓');
    else if (type === 'mask') html = '<div class="abs ttl" style="left:220px;top:380px;font-size:170px"><span class="mask"><span' + A('mask', .15) + '>片段重拍</span></span></div>';
    else if (type === 'bar') html = '<div class="abs" style="left:220px;top:520px;width:1480px;height:40px;background:var(--line)"></div><div class="abs"' + A('bar', .15, .8) + ' style="left:220px;top:520px;width:1180px;height:40px;background:var(--accent)"></div>';
    else if (type === 'rgb' || type === 'flicker' || type === 'slam') html = '<div class="abs ttl"' + A(type, .15) + ' style="left:220px;top:380px;font-size:180px;transform-origin:left center">完成度 88%</div>';
    else html = '<div class="card"' + A(type, .15) + ' style="left:560px;top:250px;width:800px;height:560px;padding:0;--r:-2deg"><img src="__BASE__st/c04_24.jpg" alt="" style="width:100%;height:76%;object-fit:cover;display:block"><div style="padding:18px 26px" class="ttl"><span style="font-size:52px">片段重拍</span></div></div>';
    return { key: 'spec', label: ANIM_LABEL[type] || type, dur: 2, scenes: [{ name: type, from: 0, to: 2, build: function () { return html; } }] };
  }
  function playSpec(type) {
    specType = type;
    var st = makeStage($('spec'), cur.id, cur.variant);
    spec = engine(st, cur.id, specSeg(type)); specT = 0; spec.render(0);
    $('anims').querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.a === type); });
    if (!specRun) { specRun = true; var t0 = performance.now(); (function step(now) { specT = Math.min(1.8, (now - t0) / 1000); spec.render(specT); if (specT < 1.8) requestAnimationFrame(step); else specRun = false; })(t0); }
  }
  function renderMotion() {
    var m = THEMES[cur.id].motion;
    $('motionSum').textContent = m.summary;
    var all = ['up', 'mask', 'pop', 'slam', 'stamp', 'drop', 'lift', 'spin', 'wipe', 'bar', 'draw', 'type', 'count', 'flicker', 'rgb'];
    var sig = m.signature.slice(), rest = all.filter(function (a) { return sig.indexOf(a) < 0; });
    $('anims').innerHTML = sig.concat(rest).map(function (a) { return '<button data-a="' + a + '" class="' + (sig.indexOf(a) >= 0 ? 'sig' : '') + '">' + (ANIM_LABEL[a] || a) + '</button>'; }).join('');
    $('anims').querySelectorAll('button').forEach(function (b) { b.addEventListener('click', function () { playSpec(b.dataset.a); }); });
    var P = m.params;
    $('motionTbl').innerHTML =
      '<tr><td>缓动</td><td>' + (EASE_LABEL[m.ease] || m.ease) + '</td></tr>' +
      '<tr><td>默认时长</td><td><code>' + m.dur + 's</code>，同组元素间隔 <code>' + m.stagger + 's</code></td></tr>' +
      '<tr><td>换页</td><td>' + (TR_LABEL[m.transition.type] || m.transition.type) + ' <code>' + m.transition.dur + 's</code></td></tr>' +
      '<tr><td>上浮 / 砸入</td><td><code>' + P.up.dist + 'px · blur ' + P.up.blur + '</code> / <code>×' + P.slam.from + ' → 1</code></td></tr>' +
      '<tr><td>弹出 / 盖章</td><td><code>' + P.pop.from + ' → 1，回弹 ' + P.pop.overshoot + '</code> / <code>×' + P.stamp.from + '，' + P.stamp.rot + '°</code></td></tr>' +
      '<tr><td>加粗的按钮</td><td>这套主题的招牌动效</td></tr>';
    playSpec(specType && all.indexOf(specType) >= 0 ? specType : sig[0]);
  }

  /* ── 声音 ── */
  function renderSound() {
    var th = THEMES[cur.id], s = th.sound, idx = audioIdx[cur.id];
    $('soundSum').textContent = s.summary;
    $('bgmInfo').textContent = s.bgm.style + ' · ' + s.bgm.key + ' · ' + s.bgm.bpm + ' BPM · ' + s.bgm.progression.join(' – ');
    $('bgmBtn').disabled = !idx;
    var evs = ['enter', 'type', 'draw', 'card', 'count', 'transition', 'slide', 'check', 'stamp', 'reveal', 'key', 'mark', 'warn', 'hit', 'scan', 'shot'];
    $('sfx').innerHTML = evs.map(function (e) {
      var syn = s.sfx[e], has = idx && idx.sfx && idx.sfx[e];
      return '<button data-e="' + e + '"' + (has ? '' : ' disabled') + '><b>' + (EV_LABEL[e] || e) + '</b><small>' + syn + '</small></button>';
    }).join('');
    $('sfx').querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { playOne(BASE + 'audio/' + cur.id + '/' + audioIdx[cur.id].sfx[b.dataset.e], b); });
    });
  }
  function playOne(src, btn) {
    setPlaying(false);
    var a = $('oneShot'); a.pause(); a.setAttribute('src', src); a.currentTime = 0; a.play().catch(function () {});
    document.querySelectorAll('.sfx button.on').forEach(function (x) { x.classList.remove('on'); });
    if (btn) btn.classList.add('on');
  }
  $('bgmBtn').addEventListener('click', function () {
    var a = $('oneShot');
    if (!a.paused && /bgm\.mp3$/.test(a.getAttribute('src') || '')) { a.pause(); $('bgmBtn').textContent = '听配乐 16 秒'; return; }
    playOne(BASE + 'audio/' + cur.id + '/' + (audioIdx[cur.id].bgm || 'bgm.mp3')); $('bgmBtn').textContent = '停止配乐';
  });
  $('oneShot').addEventListener('ended', function () { $('bgmBtn').textContent = '听配乐 16 秒'; });
  function loadAudioIndex(id) {
    if (audioIdx[id] !== undefined) return Promise.resolve();
    return fetch(BASE + 'audio/' + id + '/index.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { audioIdx[id] = j; }).catch(function () { audioIdx[id] = null; });
  }

  /* ── 修改意见：按模板存到 db 的 feedback/<id>，Claude 能读 ── */
  var dbCol = null, notes = {};
  function fillFb() {
    $('fbTheme').innerHTML = ORDER.map(function (id) { return '<option value="' + id + '"' + (id === cur.id ? ' selected' : '') + '>' + THEMES[id].name + (notes[id] ? '（有意见）' : '') + '</option>'; }).join('');
    $('fbNote').value = notes[$('fbTheme').value] || '';
    var ids = ORDER.filter(function (id) { return notes[id]; });
    $('summary').innerHTML = ids.length ? '已记下意见：' + ids.map(function (id) { return '<b>' + THEMES[id].name + '</b>'; }).join('、') : '主题库 10 套已定。哪套还想改，在这里写下来保存，Claude 下次读得到。';
  }
  $('fbTheme').addEventListener('change', function () { $('fbNote').value = notes[$('fbTheme').value] || ''; });
  $('save').addEventListener('click', function () {
    var id = $('fbTheme').value, note = $('fbNote').value.trim();
    if (!dbCol) { $('saveStatus').textContent = '这个页面现在连不上存储（可能没登录）。把意见直接告诉 Claude 也一样。'; return; }
    $('save').disabled = true; $('saveStatus').textContent = '保存中…';
    dbCol.doc(id).set({ note: note, savedAt: new Date().toISOString() })
      .then(function () { notes[id] = note; fillFb(); $('saveStatus').textContent = '已保存「' + THEMES[id].name + '」的意见。'; })
      .catch(function (e) { $('saveStatus').textContent = '没保存上（' + (e && e.code || '未知原因') + '）。把意见直接告诉 Claude 也一样。'; })
      .then(function () { $('save').disabled = false; });
  });
  function syncChoice() { fillFb(); }
  function initDb() {
    // 修改意见存在 claude.ai Artifact 的 db 里；本地打开（serve.py）没有存储，整块隐藏
    var box = document.querySelector('.choice');
    if (!window.claude || !window.claude.use) { if (box) box.hidden = true; return; }
    window.claude.use('db').then(function (db) {
      if (!db) { if (box) box.hidden = true; return; }
      dbCol = db.collection('feedback');
      return dbCol.get().then(function (qs) { (qs.docs || []).forEach(function (d) { var v = d.data(); if (v && v.note) notes[d.id] = v.note; }); fillFb(); });
    }).catch(function () {});
  }

  /* ── 汇总 ── */
  function refresh(full) {
    mountPlayer(); renderVariants(); renderInfo(); renderSwatches(); renderThumbs();
    if (full) { renderMotion(); } else if (specType) playSpec(specType);
    loadAudioIndex(cur.id).then(renderSound);
  }
  $('play').addEventListener('click', function () { setPlaying(!playing); });
  $('scrub').addEventListener('input', function (e) { T = +e.target.value / 1000 * DEMO.dur; try { $('demoAudio').currentTime = T; } catch (x) {} render(); });
  $('safe').addEventListener('change', function (e) { document.querySelectorAll('#vp .stage').forEach(function (s) { s.classList.toggle('show-safe', e.target.checked); }); });
  DEMO.scenes.forEach(function (sc) { if (!sc.from) return; var m = document.createElement('i'); m.className = 'tick'; m.style.left = (sc.from / DEMO.dur * 100) + '%'; $('track').appendChild(m); });
  refresh(true); syncChoice();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { render(); rethumb(); setTimeout(function () { render(); rethumb(); }, 400); });
  requestAnimationFrame(loop);
  initDb();
})();
