'use strict';
// 画面の拡大、画像の読み込み、入力、スプライト描画、会話エンジン
window.E = (() => {
  const E = {};
  const $ = id => document.getElementById(id);
  E.$ = $;
  E.stage = $('stage');
  E.canvas = $('field');
  E.ctx = E.canvas.getContext('2d');
  E.img = {};
  E.mouse = { sx: 0, sy: 0, fx: 0, fy: 0 };
  E.keys = {};
  E.scale = 1;
  E.offX = 0;
  E.offY = 0;

  // ---------------------------------------------------------------- 拡大
  // スマホ：指で操作するときは touch。画面が小さいと、窓や文字を --ui 倍に大きくする（文字が14pxくらいになるように）
  E.touch = matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches;
  document.documentElement.classList.toggle('touch', E.touch);
  const inset = name => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;
  E.ui = 1;
  E.resize = () => {
    const l = inset('--sal'), r = inset('--sar'), t = inset('--sat'), b = inset('--sab');
    const W = innerWidth - l - r, H = innerHeight - t - b;
    const s = Math.min(W / 1920, H / 1080);
    E.scale = s;
    E.offX = l + (W - 1920 * s) / 2;
    E.offY = t + (H - 1080 * s) / 2;
    E.stage.style.transform = `translate(${E.offX}px, ${E.offY}px) scale(${s})`;
    E.ui = Math.round(K_clamp(14 / (28 * s), 1, 1.5) * 100) / 100;
    E.stage.style.setProperty('--ui', E.ui);
    document.documentElement.classList.toggle('small', E.ui > 1.05);
    if (window.UI && UI.layout) UI.layout();
  };
  const K_clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  addEventListener('resize', E.resize);
  addEventListener('orientationchange', () => setTimeout(E.resize, 300));
  E.resize();
  // ピンチで拡大しない（iPhone）
  document.addEventListener('gesturestart', ev => ev.preventDefault());
  document.addEventListener('dblclick', ev => ev.preventDefault());
  E.toStage = (cx, cy) => ({ x: (cx - E.offX) / E.scale, y: (cy - E.offY) / E.scale });
  // 指で操作するときは、説明の「クリック」「キー」を指の言い方にする
  const TOUCH_WORDS = [
    ['クリックかEnterで会話を進める。Lキーで前の会話を読み返せる。Ctrlを押している間はスキップ', 'タップで会話を進める。会話窓の上の「ログ」で前の会話を読み返せる。「早送り」でスキップ'],
    ['Rキーで向きを変える。右クリックでやめる', '1回目のタップで置く場所を見て、同じ場所をもう一度タップで置く。右下の「向きを変える」「やめる」'],
    ['Rで向き、右クリックでやめる', 'もう一度タップで置く'],
    ['クリックで置く／Rで向きを変える／右クリックかEscでやめる', '置きたい床をタップ、もう一度タップで置く'],
    ['クリック', 'タップ'],
  ];
  E.words = t => {
    if (!E.touch || typeof t !== 'string') return t;
    for (const [a, b] of TOUCH_WORDS) t = t.split(a).join(b);
    return t;
  };
  const setMouse = ev => {
    const p = E.toStage(ev.clientX, ev.clientY);
    E.mouse.sx = p.x; E.mouse.sy = p.y;
    E.mouse.fx = p.x / 4; E.mouse.fy = p.y / 4;
  };
  addEventListener('mousemove', setMouse);
  addEventListener('pointerdown', setMouse, true);   // 指でタップしたところ
  addEventListener('keydown', ev => { E.keys[ev.key] = true; });
  addEventListener('keyup', ev => { E.keys[ev.key] = false; });
  addEventListener('blur', () => { E.keys = {}; const b = $('dlg-skip'); if (b) b.classList.remove('on'); });

  // ---------------------------------------------------------------- 画像
  E.loadImage = src => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('画像を読み込めません: ' + src));
    im.src = src;
  });
  E.loadAll = async () => {
    const list = { sprites: 'assets/sprites.png', store: 'assets/bg_store.png', room: 'assets/bg_room.png' };
    for (const [k, v] of Object.entries(list)) E.img[k] = await E.loadImage(v);
    if (document.fonts && document.fonts.load) {
      try { await document.fonts.load('32px DotGothic16'); } catch (e) { /* フォントが無くても続ける */ }
    }
  };

  // ---------------------------------------------------------------- 描画
  // 設置物：足元の左上（px）を渡す
  E.drawItem = (name, fx, fy, opt = {}) => {
    const a = window.ATLAS[name];
    if (!a) return;
    const ctx = E.ctx;
    ctx.save();
    if (opt.alpha != null) ctx.globalAlpha = opt.alpha;
    const dx = Math.round(fx + a.ax), dy = Math.round(fy + a.ay);
    if (opt.flip) {
      ctx.translate(dx + a.w, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(E.img.sprites, a.x, a.y, a.w, a.h, 0, 0, a.w, a.h);
    } else {
      ctx.drawImage(E.img.sprites, a.x, a.y, a.w, a.h, dx, dy, a.w, a.h);
    }
    ctx.restore();
  };
  // キャラ：足元の中央を渡す
  E.drawChar = (name, x, y, opt = {}) => {
    const a = window.ATLAS[name];
    if (!a) return;
    const ctx = E.ctx;
    ctx.save();
    if (opt.alpha != null) ctx.globalAlpha = opt.alpha;
    const dx = Math.round(x - a.ax), dy = Math.round(y - a.ay - (opt.bob || 0));
    if (opt.flip) {
      ctx.translate(dx + a.w, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(E.img.sprites, a.x, a.y, a.w, a.h, 0, 0, a.w, a.h);
    } else {
      ctx.drawImage(E.img.sprites, a.x, a.y, a.w, a.h, dx, dy, a.w, a.h);
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------- 演出
  E.hearts = n => {
    const fx = $('fx');
    for (let i = 0; i < n; i++) {
      const h = document.createElement('div');
      h.className = 'heart';
      h.textContent = '♥';
      h.style.left = (200 + Math.random() * 1520) + 'px';
      h.style.top = (500 + Math.random() * 400) + 'px';
      h.style.animationDelay = (Math.random() * 0.8) + 's';
      h.style.fontSize = (40 + Math.random() * 50) + 'px';
      fx.appendChild(h);
      setTimeout(() => h.remove(), 3400);
    }
  };
  E.se = text => {
    const el = $('se');
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  };
  let capTimer = null;
  E.caption = text => {
    const el = $('caption');
    el.textContent = text;
    el.style.display = 'block';
    clearTimeout(capTimer);
    capTimer = setTimeout(() => { el.style.display = 'none'; }, 3500);
  };
  E.card = (text, sub) => {
    const el = $('card');
    if (text == null) { el.style.display = 'none'; return; }
    $('card-text').textContent = text;
    $('card-sub').textContent = sub || '';
    el.style.display = 'flex';
  };
  E.dark = on => { $('dark').style.display = on ? 'block' : 'none'; };
  E.toast = (text, cls) => {
    const d = document.createElement('div');
    d.textContent = E.words(text);
    if (cls) d.className = cls;
    $('toast').appendChild(d);
    setTimeout(() => d.remove(), 2700);
  };
  E.sleep = ms => new Promise(r => setTimeout(r, ms));

  return E;
})();

// ================================================================ 会話エンジン
// 立ち絵モード：プロローグや家の場面。立ち絵を左右に出す
// ミニキャラモード：店の中。立ち絵は出さず、ミニキャラの頭に吹き出し、会話窓に顔アイコン
window.Dlg = (() => {
  const $ = E.$;
  const D = {
    active: false, waiting: null, typing: false, full: '', shown: 0, choosing: false, bgm: null,
    present: new Set(), log: [], onCall: null, lastSkip: 0, speaker: null,
  };
  const elDialog = $('dialog'), elName = $('nametag'), elText = $('dtext'), elNext = $('dnext'), elFace = $('face');
  const pH = $('p-hajime'), pX = $('p-xiao');
  // 顔アイコン：立ち絵の顔のあたりを3倍で切り出す（x, y, 幅, 高さは立ち絵の原寸のドット）
  const FACE = {
    '肇': { src: 'assets/hajime_base.png', w: 181, h: 231, x: 58, y: 30, flip: false },
    'シャオ': { src: 'assets/xiao_base.png', w: 158, h: 231, x: 62, y: 50, flip: true },
  };
  D.mini = () => G.scene === 'store' && G.mode !== 'story' && G.mode !== 'title';

  function setFace(name) {
    const f = D.mini() && FACE[name];
    elDialog.classList.toggle('withface', !!f);
    if (!f) return;
    elFace.style.backgroundImage = `url(${f.src})`;
    elFace.style.backgroundSize = `${f.w * 3}px ${f.h * 3}px`;
    elFace.style.backgroundPosition = `${-f.x * 3}px ${-f.y * 3}px`;
    elFace.style.transform = f.flip ? 'scaleX(-1)' : '';
  }

  function portraits(speaker) {
    if (D.mini()) {
      D.hidePortraits();
      E.stage.classList.remove('talking');
      return;
    }
    const hidden = $('dark').style.display === 'block' || $('card').style.display === 'flex';
    if (speaker === '肇') D.present.add('肇');
    if (speaker === 'シャオ') D.present.add('シャオ');
    const showH = D.present.has('肇') && (!hidden || speaker === '肇');
    const showX = D.present.has('シャオ') && (!hidden || speaker === 'シャオ');
    pH.style.display = showH ? 'block' : 'none';
    pX.style.display = showX ? 'block' : 'none';
    pH.classList.toggle('dim', speaker !== '肇');
    pX.classList.toggle('dim', speaker !== 'シャオ');
    E.stage.classList.toggle('talking', showH || showX);
  }
  D.hidePortraits = () => { pH.style.display = 'none'; pX.style.display = 'none'; };

  let typeTimer = null;
  function type(text) {
    D.full = text; D.shown = 0; D.typing = true;
    elText.textContent = '';
    elNext.style.visibility = 'hidden';
    clearInterval(typeTimer);
    typeTimer = setInterval(() => {
      D.shown += 2;
      elText.textContent = D.full.slice(0, D.shown);
      if (D.shown >= D.full.length) finishType();
    }, 30);
  }
  function finishType() {
    clearInterval(typeTimer);
    D.typing = false;
    elText.textContent = D.full;
    elNext.style.visibility = 'visible';
  }
  D.waitAdvance = () => new Promise(res => { D.waiting = res; });
  D.advance = () => {
    if (D.choosing) return;
    if (D.typing) { finishType(); return; }
    if (D.waiting) { const r = D.waiting; D.waiting = null; r(); }
  };
  async function waitOrTime(ms) {
    D.typing = false;
    await Promise.race([D.waitAdvance(), E.sleep(E.keys.Control ? 120 : ms)]);
    D.waiting = null;
  }

  async function line(name, text) {
    $('guide').classList.add('hidden');
    elDialog.classList.remove('hidden');
    elName.textContent = name;
    elName.className = name === 'シャオ' ? '' : name === '肇' ? 'hajime' : 'other';
    D.speaker = name;
    setFace(name);
    portraits(name);
    D.log.push({ name, text });
    type(text);
    await D.waitAdvance();
  }

  // ガイドは会話窓と同じ場所に出す（立ち絵の顔や店の中にかぶらないように）
  async function guide(text) {
    const g = $('guide');
    $('guide-text').textContent = E.words(text);
    elDialog.classList.add('hidden');
    pH.classList.add('dim'); pX.classList.add('dim');
    E.stage.classList.remove('talking');
    D.speaker = null;
    g.classList.remove('hidden');
    D.log.push({ name: 'ガイド', text });
    D.typing = false;
    await D.waitAdvance();
    g.classList.add('hidden');
  }

  function choice(options) {
    return new Promise(res => {
      D.choosing = true;
      const box = $('choices');
      box.innerHTML = '';
      let sel = Math.max(0, options.findIndex(o => o.rec));
      const btns = options.map((o, i) => {
        const b = document.createElement('button');
        b.textContent = o.t;
        if (o.rec) {
          const r = document.createElement('span');
          r.className = 'rec';
          r.textContent = 'おすすめ';
          b.appendChild(r);
        }
        b.addEventListener('click', ev => { ev.stopPropagation(); done(i); });
        b.addEventListener('mouseenter', () => { sel = i; mark(); });
        box.appendChild(b);
        return b;
      });
      const rec = options.find(o => o.rec && o.why);
      if (rec) {
        const n = document.createElement('div');
        n.className = 'recnote';
        n.innerHTML = `<b>おすすめ：${rec.recLabel || rec.t.replace(/（.*）/, '')}</b><br>${rec.why}`;
        box.appendChild(n);
      }
      function mark() { btns.forEach((b, i) => b.classList.toggle('sel', i === sel)); }
      function key(ev) {
        if (ev.key === 'ArrowDown') { sel = (sel + 1) % btns.length; mark(); }
        if (ev.key === 'ArrowUp') { sel = (sel - 1 + btns.length) % btns.length; mark(); }
        if (ev.key === 'Enter') { ev.preventDefault(); done(sel); }
      }
      function done(i) {
        removeEventListener('keydown', key);
        box.classList.add('hidden');
        D.choosing = false;
        D.log.push({ name: '選択', text: options[i].t });
        res(i);
      }
      mark();
      addEventListener('keydown', key);
      box.classList.remove('hidden');
    });
  }

  function nameInput(def) {
    return new Promise(res => {
      D.choosing = true;
      const p = $('panel');
      p.innerHTML = `<div class="tb"><span>■ 店の名前</span></div>
        <div class="pbody" style="text-align:center;padding:30px">
          <input class="nameinput" id="name-in" maxlength="10" value="${def}">
          <div class="sub" style="margin-top:12px;font-size:24px">10文字まで</div>
        </div>
        <div class="pfoot"><span></span><button class="pbtn on" id="name-ok">これにする</button></div>`;
      p.classList.remove('hidden');
      const inp = $('name-in');
      setTimeout(() => { inp.focus(); inp.select(); }, 50);
      const ok = () => {
        const v = inp.value.trim() || def;
        p.classList.add('hidden');
        D.choosing = false;
        res(v);
      };
      $('name-ok').addEventListener('click', ev => { ev.stopPropagation(); ok(); });
      inp.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') ok(); });
    });
  }

  async function exec(st) {
    if (Array.isArray(st)) return line(st[0], st[1]);
    if ('bgm' in st) { D.bgm = st.bgm; return; }   // この会話の間だけ鳴らす曲（js/bgm.js）
    if (st.scene) {
      // 場面転換：黒い画面に日時と場所を出してから、場面に入る
      elDialog.classList.add('hidden');
      D.hidePortraits();
      E.stage.classList.remove('talking');
      if (st.bg) G.scene = st.bg;
      E.card(st.scene, st.where);
      await waitOrTime(st.hold || 1700);
      if (!st.stay) E.card(null);
      if (st.where && !st.stay) E.caption(st.where);
      return;
    }
    if (st.bg) { G.scene = st.bg; return; }
    if ('card' in st) { E.card(st.card); return; }
    if (st.caption) { E.caption(st.caption); return; }
    if (st.se) { E.se(st.se); await E.sleep(E.keys.Control ? 50 : 450); return; }
    if ('dark' in st) { E.dark(st.dark); if (st.dark) D.hidePortraits(); return; }
    if (st.hearts) { E.hearts(st.hearts); return; }
    if (st.wait) { await E.sleep(E.keys.Control ? 50 : st.wait); return; }
    if (st.guide) return guide(st.guide);
    if (st.call) { if (D.onCall) await D.onCall(st.call, st); return; }
    if (st.choice) {
      const i = await choice(st.choice);
      const o = st.choice[i];
      if (o.set && D.onSet) D.onSet(o.set);
      if (o.fx && D.onFx) D.onFx(o.fx);
      for (const s of o.steps) await exec(s);
      return;
    }
    if (st.nameInput) {
      const def = G.storeName;
      const v = await nameInput(def);
      G.storeName = v;
      const branch = v === def ? st.same : st.changed;
      for (const s of branch) await exec(s);
      return;
    }
  }

  D.run = async (steps, opt = {}) => {
    D.active = true;
    const prevBgm = D.bgm;
    if (!opt.keepPresence) D.present = new Set();
    try {
      for (const st of steps) await exec(st);
    } finally {
      elDialog.classList.add('hidden');
      elDialog.classList.remove('withface');
      $('guide').classList.add('hidden');
      D.hidePortraits();
      E.stage.classList.remove('talking');
      D.speaker = null;
      D.active = false;
      D.bgm = prevBgm;
    }
  };

  // 入力
  E.stage.addEventListener('click', ev => {
    if (!D.active) return;
    if (ev.target.closest('#panel, #choices, #title, #menu, #missions, #timebar, #log, #dlg-btns, #bgm-btn, #placebar')) return;
    D.advance();
  });
  // 指で操作するとき：会話窓の上の「ログ」「早送り」
  $('dlg-log').addEventListener('click', ev => { ev.stopPropagation(); toggleLog(); });
  $('dlg-skip').addEventListener('click', ev => {
    ev.stopPropagation();
    E.keys.Control = !E.keys.Control;
    ev.currentTarget.classList.toggle('on', !!E.keys.Control);
  });
  $('log').addEventListener('click', ev => { if (E.touch) { ev.stopPropagation(); toggleLog(); } });
  addEventListener('keydown', ev => {
    if (ev.key === 'l' || ev.key === 'L') { toggleLog(); return; }
    if (!D.active || !$('log').classList.contains('hidden')) return;
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); D.advance(); }
  });
  D.toggleLog = () => toggleLog();
  function toggleLog() {
    const l = $('log');
    if (l.classList.contains('hidden')) {
      $('log-body').innerHTML = D.log.slice(-200).map(x => `<div class="ln"><b>${x.name}</b>${x.text}</div>`).join('');
      l.classList.remove('hidden');
      $('log-body').scrollTop = 1e9;
    } else l.classList.add('hidden');
  }
  // Ctrl を押している間はスキップ
  setInterval(() => {
    if (!D.active || !E.keys.Control || D.choosing) return;
    if (D.typing) finishType();
    else if (D.waiting) D.advance();
  }, 70);

  return D;
})();
