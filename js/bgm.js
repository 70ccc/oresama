'use strict';
// BGM：場面に合わせて曲を切り替える。曲は assets/bgm/ に置く（ファイルがなければ鳴らないだけ）
// 曲の作り方とプロンプトは docs/06_BGM.md
window.BGM = (() => {
  const B = {};
  const $ = id => document.getElementById(id);

  // 曲の一覧。file は assets/bgm/ の中の名前（拡張子なし。mp3 → wav の順に探す）
  // loop: [始まり秒, 終わり秒] を入れると、その区間をくり返す（入れなければ曲の最初から最後まで）
  // restart: true の曲は、毎回頭から鳴らす（それ以外は、前に止めたところから続ける）
  B.TRACKS = {
    title: { file: 'title', name: 'タイトル', restart: true },
    store: { file: 'store', name: '店の営業' },
    night: { file: 'night', name: '家の夜', loop: [0, 143.4] },          // 終わりの3秒がフェードアウトなので手前でつなぐ
    love: { file: 'love', name: '暗転（エッチ）', restart: true },
    study: { file: 'study', name: '勉強・書類' },
    trouble: { file: 'trouble', name: 'トラブル・月末決算', restart: true },
    matsuri: { file: 'matsuri', name: '夏祭り' },
    xmas: { file: 'xmas', name: '12月・年末商戦' },
    emo: { file: 'emo', name: 'しんみり', restart: true },
    ending: { file: 'ending', name: '関門・エンディング', restart: true, loop: [0, 179.4] },
  };
  const EXTS = ['mp3', 'wav'];
  const LEVELS = [0, 0.18, 0.35, 0.6];   // 切・小・中・大
  const LABELS = ['切', '小', '中', '大'];
  const FADE = 0.8;    // 曲を切り替えるときのフェード（秒）
  const XF = 1.5;      // ループのつなぎ目のクロスフェード（秒）

  let level = 2;
  try { const v = localStorage.getItem('keiei_bgm_level'); if (v != null) level = Math.max(0, Math.min(3, Number(v))); } catch (e) { /* 保存できなくても動く */ }
  let unlocked = false;
  let current = null;      // いま鳴らしている曲の名前
  const vol = () => LEVELS[level];

  // ---------------------------------------------------------------- 再生の部品
  // 再生機は2台だけ（A/B）。曲の切り替えとループのつなぎ目は、2台でクロスフェードする
  // iPhone は audio の音量をページから変えられず、最初のタップで鳴らした再生機しか後から鳴らせないので、
  // https で開いたときは Web Audio の音量（GainNode）を使い、最初のタップで2台とも鳴らせる状態にしておく
  // Web Audio の音は iPhone のマナーモードで消える。iOS 17 からは「音楽アプリと同じ扱い」にできるので、
  // それより古い iPhone では Web Audio を使わず、audio だけで鳴らす（音量は変えられないが、マナーモードでも鳴る）
  const AC = window.AudioContext || window.webkitAudioContext;
  const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const useWA = !!AC && location.protocol.startsWith('http') && (!IOS || 'audioSession' in navigator);
  let ctx = null;
  const info = {};         // 曲の名前 → { ext, ok, missing, pos }
  const trackInfo = name => (info[name] = info[name] || { ext: 0, ok: false, missing: false, pos: null });
  const url = name => `assets/bgm/${B.TRACKS[name].file}.${EXTS[trackInfo(name).ext]}`;
  const loopStart = name => (B.TRACKS[name] && B.TRACKS[name].loop ? B.TRACKS[name].loop[0] : 0);
  const loopEnd = (name, el) => (B.TRACKS[name] && B.TRACKS[name].loop ? B.TRACKS[name].loop[1] : el.duration);
  const mkDeck = () => {
    const d = { el: new Audio(), gain: null, track: null, v: 0, target: 0, seekTo: null, src: '', primed: false, priming: false };
    d.el.preload = 'auto';
    d.el.addEventListener('loadedmetadata', () => { if (d.seekTo != null) { try { d.el.currentTime = d.seekTo; } catch (e) { /* 無視 */ } d.seekTo = null; } });
    d.el.addEventListener('canplay', () => { if (d.track) { trackInfo(d.track).ok = true; refreshButton(); } });
    d.el.addEventListener('error', () => {
      if (!d.track || !d.src) return;
      const t = trackInfo(d.track);
      if (t.ok) return;
      if (t.ext + 1 < EXTS.length) { t.ext++; load(d, d.track, d.seekTo); if (d.target > 0) start(d); }
      else { t.missing = true; d.target = 0; refreshButton(); }
    });
    return d;
  };
  const decks = [mkDeck(), mkDeck()];
  let cur = 0;   // いま主に鳴らしている再生機
  // audio だけで鳴らしているときは、音量0を「消音」にもする（iPhone は volume を無視するが muted は効く）
  const mute = d => { d.el.muted = !d.gain && d.v <= 0.001; };
  const setV = (d, v) => { d.v = Math.max(0, Math.min(1, v)); if (d.gain) d.gain.gain.value = d.v; else d.el.volume = d.v; mute(d); };
  // Web Audio につなぐのは、音が本当に出せる状態（running）になってから。つないだあとに止まったままだと無音になるため
  const attach = d => {
    if (!useWA || !ctx || ctx.state !== 'running' || d.gain) return;
    try {
      const src = ctx.createMediaElementSource(d.el);
      d.gain = ctx.createGain();
      d.gain.gain.value = d.v;
      src.connect(d.gain).connect(ctx.destination);
      d.el.volume = 1;
      mute(d);
    } catch (e) { d.gain = null; }
  };
  const load = (d, name, at) => {
    d.track = name;
    const u = url(name);
    if (d.src !== u) { d.src = u; d.seekTo = at; d.el.src = u; }
    else if (at != null) { try { d.el.currentTime = at; } catch (e) { d.seekTo = at; } }
  };
  const start = d => {
    if (!unlocked || vol() <= 0 || !d.track || trackInfo(d.track).missing) return;
    const pr = d.el.play();
    if (pr && pr.then) pr.then(() => { d.primed = true; }, () => { /* まだ鳴らせない。次のタップでもう一度 */ unlocked = false; });
  };

  // ---------------------------------------------------------------- 切り替え
  B.play = name => {
    if (name === current) return;
    const old = decks[cur];
    if (current && old.track === current) {
      if (!B.TRACKS[current].restart) trackInfo(current).pos = old.el.currentTime;
      old.target = 0;
    }
    current = name;
    if (!name || !B.TRACKS[name]) { refreshButton(); return; }
    const t = B.TRACKS[name];
    const ti = trackInfo(name);
    const at = t.restart ? loopStart(name) : (ti.pos != null ? ti.pos : loopStart(name));
    // 同じ曲がもう片方でフェードアウト中なら、それを戻す
    let n = 1 - cur;
    if (old.track === name && old.target === 0 && old.v > 0.01 && !t.restart) n = cur;
    const d = decks[n];
    if (d.track !== name || t.restart || d.el.ended) load(d, name, at);
    d.target = 1;
    cur = n;
    start(d);
    refreshButton();
  };
  B.current = () => current;
  B._players = () => info;
  B._decks = () => decks;

  // 50msごと：音量をフェードさせる、ループのつなぎ目を処理する
  setInterval(() => {
    const step = 0.05 / FADE;
    for (const d of decks) {
      const goal = d.target * vol();
      if (Math.abs(d.v - goal) > 0.001) setV(d, goal > d.v ? Math.min(goal, d.v + step * Math.max(vol(), 0.05)) : Math.max(goal, d.v - step * Math.max(vol(), 0.05)));
      if (goal === 0 && d.v <= 0.001 && !d.el.paused && !d.priming) d.el.pause();
    }
    const d = decks[cur];
    if (!current || d.track !== current || trackInfo(current).missing) return;
    if (unlocked && vol() > 0 && d.el.paused && d.target > 0 && d.el.readyState >= 2) start(d);
    const end = loopEnd(current, d.el);
    if (!isFinite(end) || end <= XF * 2) return;
    const o = decks[1 - cur];
    if (d.el.currentTime >= end - XF && !d.xf) {
      if (o.v <= 0.001 && o.target === 0) {
        // つなぎ目：もう1台で頭から鳴らしながら、いまの再生を消す
        d.xf = true;
        load(o, current, loopStart(current));
        setV(o, 0);
        o.target = 1;
        d.target = 0;
        cur = 1 - cur;
        start(o);
        setTimeout(() => { d.xf = false; }, XF * 1000 + 200);
      } else if (d.el.currentTime >= end - 0.05) {
        try { d.el.currentTime = loopStart(current); } catch (e) { /* 無視 */ }   // もう1台がふさがっているときは、そのまま頭に戻す
      }
    }
  }, 50);

  // ---------------------------------------------------------------- どの曲を鳴らすか
  B.decide = () => {
    if (!window.G || !window.Dlg) return null;
    if (Dlg.bgm !== undefined && Dlg.bgm !== null) return Dlg.bgm;             // 台本の中で指定した曲
    if ($('dark').style.display === 'block') return 'love';                       // 暗転（エッチ）
    if (!$('title').classList.contains('hidden')) return 'title';
    if (G.bgm) return G.bgm;                                                       // イベントで指定した曲
    const pan = G.openPanel;
    if (pan === 'form' || pan === 'study' || pan === 'lesson') return 'study';
    if (pan === 'month') return 'trouble';
    if (G.scene === 'room') return 'night';
    if (G.today && G.today.bgm && ['morning', 'day', 'close'].includes(G.mode)) return G.today.bgm;
    if (G.date && G.date.m === 12 && G.chapter >= 5) return 'xmas';
    return 'store';
  };
  // まだ作っていない曲は、場面のふだんの曲で代わりに鳴らす
  let wanted = null;
  const fallback = n => (n === 'night' ? 'store' : n === 'store' ? 'title' : n === 'title' ? null : (window.G && G.scene === 'room' ? 'night' : 'store'));
  setInterval(() => {
    let n = B.decide();
    if (n === undefined) return;
    wanted = n;
    for (let i = 0; i < 4 && n && info[n] && info[n].missing; i++) n = fallback(n);
    B.play(n);
  }, 250);

  // ---------------------------------------------------------------- タップで音を出せるようにする（ブラウザの決まり）
  // スマホで「音を出していい」と認められるのは、指を離したとき（touchend・click）。指を置いた瞬間（pointerdown）ではだめ
  // 一度で鳴らせなかったときのために、タップのたびに足りないところだけやり直す
  const setSession = () => { try { if ('audioSession' in navigator) navigator.audioSession.type = 'playback'; } catch (e) { /* 無視 */ } };
  setSession();
  const route = () => { for (const d of decks) attach(d); };
  const unlock = () => {
    unlocked = true;
    setSession();
    if (useWA) {
      try {
        if (!ctx) { ctx = new AC(); ctx.addEventListener('statechange', route); }
        if (ctx.state !== 'running') { const p = ctx.resume(); if (p && p.then) p.then(route, () => { /* 次のタップで */ }); }
        route();
      } catch (e) { /* Web Audio が使えなくても、audio だけで鳴らす */ }
    }
    // 2台とも、タップの中で一度鳴らしておく（iPhone はこうしないと、あとから鳴らせない）
    for (const d of decks) {
      const main = d === decks[cur] && d.target > 0;
      if (d.primed) { if (main && d.el.paused) start(d); continue; }
      if (main) { start(d); continue; }
      if (!d.src && current) load(d, current, loopStart(current));
      if (!d.src) continue;
      d.el.muted = true;
      d.priming = true;
      const pr = d.el.play();
      if (pr && pr.then) pr.then(() => { d.priming = false; d.primed = true; if (d.target === 0) d.el.pause(); mute(d); }, () => { d.priming = false; mute(d); });
      else d.priming = false;
    }
  };
  for (const t of ['touchend', 'pointerup', 'click', 'mousedown', 'keydown']) addEventListener(t, unlock, true);
  // アプリを裏に回したら止める、戻ったら続ける
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { for (const d of decks) d.el.pause(); if (ctx && ctx.state === 'running') ctx.suspend(); }
    else { if (ctx && ctx.state === 'suspended') ctx.resume(); const d = decks[cur]; if (current && d.target > 0) start(d); }
  });

  // ---------------------------------------------------------------- 音量ボタン（右上）
  function refreshButton() {
    const b = $('bgm-btn');
    if (!b) return;
    b.textContent = `♪ ${LABELS[level]}`;
    const miss = wanted && info[wanted] && info[wanted].missing;
    const p = current && info[current];
    b.classList.toggle('missing', !current || !!(p && p.missing));
    b.title = miss ? `BGM：assets/bgm/${B.TRACKS[wanted].file}.mp3 がまだないので、${current && !(p && p.missing) ? `「${B.TRACKS[current].name}」で代わりに鳴らしている` : '鳴っていない'}（クリックで音量）`
      : `BGM：${current ? B.TRACKS[current].name : 'なし'}（クリックで音量）`;
  }
  B.setLevel = n => {
    level = n;
    try { localStorage.setItem('keiei_bgm_level', String(level)); } catch (e) { /* 無視 */ }
    if (vol() > 0) start(decks[cur]);
    refreshButton();
  };
  addEventListener('DOMContentLoaded', refreshButton);
  setTimeout(() => {
    const b = $('bgm-btn');
    if (!b) return;
    b.addEventListener('click', ev => { ev.stopPropagation(); unlock(); B.setLevel((level + 1) % LEVELS.length); });
    refreshButton();
  }, 0);

  // ---------------------------------------------------------------- 台本に曲の指定をつける（台詞の正本 docs/04 は変えない）
  const tag = (name, keys) => {
    for (const k of keys) { const s = window.SCRIPT && SCRIPT[k]; if (Array.isArray(s) && !(s[0] && 'bgm' in s[0])) s.unshift({ bgm: name }); }
  };
  tag('trouble', ['P03', 'C2_SHOPLIFT', 'C3_CLAIM', 'C3_TAX', 'C4_LOAN', 'C4_FRIDGE', 'C4_BLACK_BANKRUPT', 'C4_SHARK', 'C5_DISCOUNT', 'C5_TAX_LATE', 'C5_GATE_INTRO']);
  tag('emo', ['SUKI', 'C4_FAINT', 'C5_XMAS_NIGHT', 'C5_XMAS_NIGHT_NG', 'C5_NEWYEAR', 'C5_YEAREND_NIGHT', 'C5_GATE_FAIL']);
  tag('matsuri', ['C4_FESTIVAL', 'C4_FESTIVAL_NOKAI', 'C4_RINGO']);
  tag('xmas', ['C5_XMAS_SEASON', 'C5_XMAS_ASK']);
  tag('ending', ['C5_GATE_PASS']);
  return B;
})();
