'use strict';
// 陳列：棚の枠に商品を並べる、品出し、相性コンボ、カタログ
// 在庫（G.inv）のうち、棚の枠に並んでいる分だけが店に出る。残りは裏の在庫
// 同じ商品は、店の中で1枠にだけ並べられる（商品が増えても枠が足りるように）
window.Shelf = (() => {
  const Sh = {};
  const yen = K.yen;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const TYPES = ['shelf', 'fridge', 'rejiyoko'];

  // ================================================================ 枠
  Sh.list = () => {
    const out = [{ key: 'wall', type: 'wallshelf', label: '壁の棚', n: D.SLOTS.wallshelf, c: D.WALLSHELF.c, r: D.WALLSHELF.r, w: D.WALLSHELF.w, h: D.WALLSHELF.h }];
    let si = 0;
    for (const it of G.items) {
      if (!TYPES.includes(it.type)) continue;
      const d = D.ITEMS[it.type];
      const label = it.type === 'shelf' ? `島棚${++si}` : it.type === 'fridge' ? '冷蔵ケース' : 'レジ横';
      out.push({ key: 'i' + it.id, type: it.type, label, n: D.SLOTS[it.type], c: it.c, r: it.r, w: d.w, h: d.h, item: it });
    }
    return out;
  };
  Sh.ensure = () => {
    const keys = new Set();
    for (const f of Sh.list()) {
      keys.add(f.key);
      const a = G.slots[f.key] = G.slots[f.key] || [];
      while (a.length < f.n) a.push({ id: null, q: 0 });
      if (a.length > f.n) a.length = f.n;
    }
    for (const k of Object.keys(G.slots)) if (!keys.has(k)) delete G.slots[k];
    // 同じ商品が2つの枠にあったら、あとのほうを空ける
    const seen = new Set();
    for (const f of Sh.list()) for (const x of G.slots[f.key]) {
      if (!x.id) continue;
      if (seen.has(x.id)) { x.id = null; x.q = 0; } else seen.add(x.id);
    }
  };
  const all = () => { Sh.ensure(); return Object.values(G.slots).flat(); };
  Sh.fixture = key => Sh.list().find(f => f.key === key);
  Sh.displayed = id => all().reduce((s, x) => s + (x.id === id ? x.q : 0), 0);
  Sh.facings = id => all().filter(x => x.id === id).length;
  Sh.carried = id => all().some(x => x.id === id);
  // その商品が並んでいる枠（なければ null）
  Sh.where = id => {
    for (const f of Sh.list()) { const i = (G.slots[f.key] || []).findIndex(x => x.id === id); if (i >= 0) return { key: f.key, i, f }; }
    return null;
  };
  Sh.backroom = id => Math.max(0, K.stockOf(id) - Sh.displayed(id));
  Sh.face = id => K.prod(id).face || 10;
  Sh.canHold = (type, p) => (type === 'fridge' ? p.genre === 'ドリンク' : type === 'rejiyoko' ? !!p.rejiyoko : p.genre !== 'ドリンク');
  Sh.soldOut = key => (G.slots[key] || []).filter(s => s.id && s.q <= 0).length;
  Sh.soldOutTotal = () => all().filter(s => s.id && s.q <= 0).length;
  Sh.soldOutNames = () => [...new Set(all().filter(s => s.id && s.q <= 0).map(s => K.prod(s.id).name))];

  // 品出し：裏の在庫から枠を満たす。動かした数を返す
  Sh.fill = key => {
    Sh.ensure();
    const a = G.slots[key];
    if (!a) return 0;
    let moved = 0;
    for (const s of a) {
      if (!s.id) continue;
      const need = Sh.face(s.id) - s.q;
      if (need <= 0) continue;
      const n = Math.min(need, Sh.backroom(s.id));
      s.q += n;
      moved += n;
    }
    return moved;
  };
  Sh.fillAll = () => Sh.list().reduce((t, f) => t + Sh.fill(f.key), 0);
  // 売れた分を棚から減らす
  Sh.take = (id, n) => {
    for (const s of all()) {
      if (n <= 0) break;
      if (s.id !== id || s.q <= 0) continue;
      const k = Math.min(n, s.q);
      s.q -= k;
      n -= k;
    }
  };
  // 在庫より多く並んでいたら減らす（期限切れで捨てたときなど）
  Sh.clamp = () => {
    for (const p of D.PRODUCTS) {
      let over = Sh.displayed(p.id) - K.stockOf(p.id);
      if (over <= 0) continue;
      for (const s of all().reverse()) {
        if (over <= 0) break;
        if (s.id !== p.id) continue;
        const k = Math.min(over, s.q);
        s.q -= k;
        over -= k;
      }
    }
  };
  // 枠に商品を並べる。ほかの枠に並んでいる商品なら、そこから移す（移した先にあった商品は、元の枠と入れかえる）
  Sh.assign = (key, i, id) => {
    Sh.ensure();
    const s = G.slots[key][i];
    let q = 0;
    if (id) {
      const w = Sh.where(id);
      if (w && !(w.key === key && w.i === i)) {
        const o = G.slots[w.key][w.i];
        q = o.q;
        const fo = Sh.fixture(w.key);
        if (s.id && fo && Sh.canHold(fo.type, K.prod(s.id))) { o.id = s.id; o.q = Math.min(Sh.face(s.id), s.q); }
        else { o.id = null; o.q = 0; }
      } else if (w) q = s.q;
    }
    s.id = id;
    s.q = id ? Math.min(Sh.face(id), q) : 0;
    if (id) { const n = Math.min(Sh.face(id) - s.q, Sh.backroom(id)); s.q += n; if (G.mode === 'day' && n > 0) busy(); }
  };
  // おまかせで並べる：在庫のある商品を、空いている枠に人気順で
  Sh.autoAssign = () => {
    Sh.ensure();
    const fx = Sh.list();
    const prods = D.PRODUCTS.filter(p => K.stockOf(p.id) > 0).sort((a, b) => b.pop - a.pop);
    for (const p of prods) {
      if (Sh.carried(p.id)) continue;
      const f = fx.find(f => Sh.canHold(f.type, p) && G.slots[f.key].some(s => !s.id));
      if (!f) continue;
      const i = G.slots[f.key].findIndex(s => !s.id);
      Sh.assign(f.key, i, p.id);
    }
    Sh.fillAll();
  };

  // 営業中の品出しは、肇が少し疲れて、しばらくレジが遅くなる
  const busy = () => {
    if (!G.flags.u_netmin) K.fx({ hp: -1 });
    G.flags.busyUntil = G.time + 8;
  };
  Sh.doFill = key => {
    const moved = Sh.fill(key);
    if (moved > 0 && G.mode === 'day') busy();
    Sh.checkDiscover();
    if (window.Game) Game.check();
    return moved;
  };
  // 店の中の棚をクリックしたとき
  Sh.quick = key => {
    const f = Sh.fixture(key);
    if (!f) return;
    if (G.mode !== 'day') { Sh.panel(key); return; }
    const outBefore = Sh.soldOut(key);
    const moved = Sh.doFill(key);
    if (moved > 0) E.toast(`${f.label}に品出しした（${moved}個）`);
    else if (outBefore) {
      const names = [...new Set(G.slots[key].filter(s => s.id && s.q <= 0).map(s => K.prod(s.id).name))];
      E.toast(`裏にも在庫がない：${names.join('、')}`, 'bad');
    } else Sh.panel(key);
  };

  // ================================================================ 相性コンボ
  Sh.active = () => {
    const out = [];
    for (const f of Sh.list()) {
      const have = new Set((G.slots[f.key] || []).filter(s => s.id && s.q > 0).map(s => s.id));
      for (const c of D.COMBOS) if (c.items.every(id => have.has(id)) && !out.some(o => o.c.id === c.id)) out.push({ c, key: f.key });
    }
    return out;
  };
  Sh.fx = () => {
    const enter = {}, weight = {};
    for (const { c } of Sh.active()) {
      for (const [k, v] of Object.entries(c.fx)) enter[k] = (enter[k] || 0) + v;
      for (const id of c.items) weight[id] = (weight[id] || 1) * 1.5;
    }
    return { enter, weight };
  };
  Sh.enterBonus = (type, fx = Sh.fx()) => {
    let b = fx.enter[type] || 0;
    if (G.weather === '雨' && D.CUSTOMERS[type].adult) b += fx.enter.rain || 0;
    return b;
  };
  Sh.checkDiscover = () => {
    const found = [];
    for (const { c } of Sh.active()) if (!G.combos[c.id]) { G.combos[c.id] = G.dayNo; found.push(c); }
    if (!found.length) return;
    for (const c of found) E.toast(`コンボ発見！「${c.name}」　${c.desc}`);
    if (G.flags.autoDay) return;
    const first = Object.keys(G.combos).length === found.length;
    const lines = first ? SCRIPT.COMBO_FIRST(found[0]) : SCRIPT.COMBO_FOUND(found[0]);
    if (G.mode === 'day') G.pendingTalk = lines;
    else if (window.Game) Game.queueTalk(lines);
  };

  // ================================================================ 陳列のパネル
  let sel = null;   // { key, i }
  const cellHtml = (f, i, s) => {
    const p = s.id && K.prod(s.id);
    const isSel = sel && sel.key === f.key && sel.i === i;
    if (!p) return `<div class="dcell empty ${isSel ? 'sel' : ''}" data-k="${f.key}" data-i="${i}"><div class="dname sub">（空き）</div></div>`;
    const face = Sh.face(s.id);
    const out = s.q <= 0;
    return `<div class="dcell ${isSel ? 'sel' : ''} ${out ? 'out' : ''}" data-k="${f.key}" data-i="${i}">
      <div class="dname" title="${esc(p.name)}"><i class="dcol" style="background:${p.col}"></i>${esc(p.name)}</div>
      <div class="dbar"><i style="width:${Math.round(s.q / face * 100)}%"></i></div>
      <div class="dnum">${out ? '<span class="bad">売切</span>' : `${s.q}/${face}`}<span class="sub"> 裏${Sh.backroom(s.id)}</span></div></div>`;
  };
  const combosOn = key => Sh.active().filter(a => a.key === key).map(a => a.c.name);
  function displayHtml() {
    let h = '<div class="dgrid">';
    for (const f of Sh.list()) {
      const out = Sh.soldOut(f.key);
      const cols = f.type === 'fridge' ? 4 : f.type === 'rejiyoko' ? 2 : 3;
      const cs = combosOn(f.key);
      h += `<div class="dcard ${f.type}"><div class="dhead"><b>${f.label}</b>${out ? `<span class="bad">　売切${out}枠</span>` : ''}
        <span class="sub">　${f.type === 'fridge' ? 'ドリンク' : f.type === 'rejiyoko' ? 'ガム・チョコバー・電池' : 'ドリンク以外'}</span>
        <button class="mini" data-fill="${f.key}">品出し</button></div>
        <div class="dcells" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${G.slots[f.key].map((s, i) => cellHtml(f, i, s)).join('')}</div>
        ${cs.length ? `<div class="dcombo">コンボ：${cs.map(esc).join('、')}</div>` : ''}</div>`;
    }
    h += '</div>';
    if (sel) {
      const f = Sh.fixture(sel.key);
      const s = f && G.slots[sel.key][sel.i];
      if (f && s) {
        const cand = D.PRODUCTS.filter(p => Sh.canHold(f.type, p) && K.available(p) && (K.stockOf(p.id) > 0 || K.incoming(p.id) > 0 || Sh.carried(p.id)));
        const at = p => { const w = Sh.where(p.id); return w && !(w.key === sel.key && w.i === sel.i) ? w.f.label : null; };
        h += `<div class="dpick"><div><b>${f.label}の${sel.i + 1}枠目</b>　<span class="sub">並べる商品を選ぶ。同じ商品は店の中で1枠だけ（ほかの枠にある商品を選ぶと、入れかわる）</span></div><div class="dpbtns">` +
          cand.map(p => `<button class="pbtn ${s.id === p.id ? 'on' : ''} ${at(p) ? 'moved' : ''}" data-pick="${p.id}"><i class="dcol" style="background:${p.col}"></i>${esc(p.name)}<span class="sub">　${at(p) ? (s.id ? `${at(p)}と入れかえ` : `${at(p)}から移す`) : `在庫${K.stockOf(p.id)}${K.incoming(p.id) ? `＋${K.incoming(p.id)}` : ''}`}</span></button>`).join('') +
          (cand.length ? '' : '<span class="sub">この枠に置ける商品が、まだない</span>') +
          `${s.id ? '<button class="pbtn" data-pick="">外す</button>' : ''}</div></div>`;
      }
    }
    return h;
  }
  function comboHtml() {
    const n = Object.keys(G.combos).length;
    let h = `<div class="xrow sub">同じ棚（設置物）に、決まった組み合わせの商品が全部並んでいるとコンボになる。同じ商品は店に1枠だけなので、どの棚に何を集めるかがだいじ。売切になるとコンボも切れる。見つけた数：${n} / ${D.COMBOS.length}</div><div class="clist">`;
    for (const c of D.COMBOS) {
      const got = G.combos[c.id] != null;
      const on = Sh.active().some(a => a.c.id === c.id);
      h += `<div class="citem ${got ? 'got' : ''}"><div class="cname">${got ? esc(c.name) : '？？？'}${on ? '<span class="tag good">発動中</span>' : ''}<span class="sub">　${c.where}・${c.items.length}つ</span></div>
        <div class="chint">${got ? c.items.map(id => esc(K.prod(id).name)).join(' ＋ ') + `　<span class="good">${c.desc}</span>` : `ヒント：${esc(c.hint)}`}</div></div>`;
    }
    return h + '</div>';
  }
  Sh.panel = (focusKey, tab = 'display') => {
    Sh.ensure();
    if (focusKey && (!sel || sel.key !== focusKey)) {
      const a = G.slots[focusKey] || [];
      const i = a.findIndex(s => !s.id || s.q <= 0);
      sel = { key: focusKey, i: Math.max(0, i) };
    }
    const tabs = `<div class="shoptab"><button class="pbtn ${tab === 'display' ? 'on' : ''}" data-tab="display">陳列</button><button class="pbtn ${tab === 'combo' ? 'on' : ''}" data-tab="combo">コンボ帳</button>
      <span class="sub">　${G.mode === 'day' ? '営業中の品出しは、肇の体力を少し使う（そのあいだ会計が遅くなる）' : '枠をクリックして商品を選ぶ。並べた分だけが店に出る'}</span></div>`;
    const body = tabs + (tab === 'combo' ? comboHtml() : displayHtml());
    const foot = `<span class="sub">${tab === 'display' ? `売切：${Sh.soldOutTotal()}枠` : ''}</span><span>
      ${tab === 'display' && G.chapter <= 1 ? '<button class="pbtn" id="d-auto">おまかせで並べる</button>' : ''}
      ${tab === 'display' && G.flags.u_matome ? '<button class="pbtn" id="d-all">全部品出し</button>' : ''}
      <button class="pbtn" id="d-close">閉じる</button></span>`;
    const p = UI.open('display', '陳列', body, foot, { cls: 'wide' });
    const keep = () => p.querySelector('.pbody').scrollTop;
    const redraw = (t = tab) => { const sc = keep(); Sh.panel(null, t); document.querySelector('#panel .pbody').scrollTop = sc; };
    UI.bind(p, 'button[data-tab]', b => Sh.panel(null, b.dataset.tab));
    UI.bind(p, '.dcell', b => { sel = { key: b.dataset.k, i: Number(b.dataset.i) }; redraw(); });
    UI.bind(p, 'button[data-fill]', b => {
      const f = Sh.fixture(b.dataset.fill);
      const moved = Sh.doFill(b.dataset.fill);
      E.toast(moved ? `${f.label}に品出しした（${moved}個）` : Sh.soldOut(b.dataset.fill) ? '裏にも在庫がない' : 'もう満杯', moved ? null : 'bad');
      redraw();
    });
    UI.bind(p, 'button[data-pick]', b => {
      if (!sel) return;
      Sh.assign(sel.key, sel.i, b.dataset.pick || null);
      const a = G.slots[sel.key];
      const nx = a.findIndex((s, i) => i > sel.i && !s.id);
      if (b.dataset.pick && nx >= 0) sel.i = nx;
      Sh.checkDiscover();
      Game.check();
      redraw();
    });
    UI.bind(p, '#d-auto', () => { Sh.autoAssign(); Sh.checkDiscover(); Game.check(); redraw(); E.toast('おまかせで並べた'); });
    UI.bind(p, '#d-all', () => { const m = Sh.list().reduce((t, f) => t + Sh.fill(f.key), 0); if (m && G.mode === 'day') busy(); Sh.checkDiscover(); Game.check(); E.toast(m ? `全部の棚に品出しした（${m}個）` : '品出しするものがない'); redraw(); });
    UI.bind(p, '#d-close', () => { sel = null; UI.closePanel(); });
  };

  // ================================================================ カタログ（仕入れのパネルのタブ）
  Sh.catalogHtml = () => {
    let h = '<div class="xrow sub">仕入れられる商品と、まだ仕入れられない商品の条件。問屋さんと仲良くなる、シャオと出かける、などで増えていく</div><table><tr><th>商品</th><th>人気</th><th class="num">1個（問屋）</th><th class="num">推奨価格</th><th>仕入れ</th></tr>';
    for (const g of D.GENRES) {
      const list = D.PRODUCTS.filter(p => p.genre === g);
      h += `<tr><td colspan="5" class="genre">${g}</td></tr>`;
      for (const p of list) {
        const ok = K.available(p);
        h += `<tr class="${ok ? '' : 'clr'}"><td>${esc(p.name)}</td><td class="pop">${ok ? '★'.repeat(p.pop) + `<span class="sub">${'☆'.repeat(3 - p.pop)}</span>` : ''}</td>
          <td class="num">${ok ? yen(K.costOf(p, 'cash')) : ''}</td><td class="num">${ok ? yen(K.refPrice(p)) : ''}</td><td>${ok ? '<span class="good">仕入れられる</span>' : `<span class="sub">${esc(K.needText(p))}</span>`}</td></tr>`;
      }
    }
    return h + '</table>';
  };
  return Sh;
})();
