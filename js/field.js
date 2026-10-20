'use strict';
// 店のマス目：設置の判定、置く操作、客の通り道、描画
window.Field = (() => {
  const F = {};
  const T = D.TILE;
  F.count = type => G.items.filter(i => i.type === type).length;
  F.has = type => F.count(type) > 0;
  F.tileCenter = (c, r) => ({ x: D.FX + c * T + 8, y: D.FY + r * T + 12 });
  F.isEntrance = (c, r) => D.ENTRANCE.some(([ec, er]) => ec === c && er === r);
  F.reg = () => G.items.find(i => i.type === 'register');

  // ================================================================ マス目
  F.occupancy = exclude => {
    const g = [];
    for (let r = 0; r < D.ROWS; r++) g.push(new Array(D.COLS).fill(false));
    const mark = (c, r, w, h) => {
      for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (g[y] && x >= 0 && x < D.COLS) g[y][x] = true;
    };
    const ws = D.WALLSHELF;
    mark(ws.c, ws.r, ws.w, ws.h);
    for (const it of G.items) if (it !== exclude) mark(it.c, it.r, D.ITEMS[it.type].w, D.ITEMS[it.type].h);
    return g;
  };
  F.bfs = (grid, starts) => {
    const dist = grid.map(row => row.map(() => -1));
    const prev = grid.map(row => row.map(() => null));
    const q = [];
    for (const [c, r] of starts) if (grid[r] && !grid[r][c]) { dist[r][c] = 0; q.push([c, r]); }
    while (q.length) {
      const [c, r] = q.shift();
      for (const [dc, dr] of [[0, -1], [1, 0], [-1, 0], [0, 1]]) {
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= D.COLS || nr >= D.ROWS) continue;
        if (grid[nr][nc] || dist[nr][nc] >= 0) continue;
        dist[nr][nc] = dist[r][c] + 1;
        prev[nr][nc] = [c, r];
        q.push([nc, nr]);
      }
    }
    return { dist, prev };
  };
  F.accessTiles = (grid, it) => {
    const w = it.w, h = it.h, out = [];
    for (let x = it.c; x < it.c + w; x++) { out.push([x, it.r + h, 0]); out.push([x, it.r - 1, 2]); }
    for (let y = it.r; y < it.r + h; y++) { out.push([it.c - 1, y, 1]); out.push([it.c + w, y, 1]); }
    return out.filter(([c, r]) => c >= 0 && r >= 0 && c < D.COLS && r < D.ROWS && !grid[r][c]);
  };
  F.fixtures = (items = G.items) => {
    const list = items.map(i => ({ c: i.c, r: i.r, w: D.ITEMS[i.type].w, h: D.ITEMS[i.type].h, type: i.type, item: i }));
    list.push({ ...D.WALLSHELF, type: 'wallshelf' });
    return list;
  };
  const NO_ACCESS = new Set(['plant', 'register', 'pop', 'rejiyoko', 'lamp', 'plush', 'aroma', 'bell']);

  F.validate = (type, c0, r0, exclude) => {
    const it = D.ITEMS[type];
    if (c0 < 0 || r0 < 0 || c0 + it.w > D.COLS || r0 + it.h > D.ROWS) return { ok: false, why: '床からはみ出している' };
    if (it.wall && r0 !== 0) return { ok: false, why: '壁際（いちばん奥の列）にしか置けない' };
    const grid = F.occupancy(exclude);
    for (let y = r0; y < r0 + it.h; y++) for (let x = c0; x < c0 + it.w; x++) {
      if (grid[y][x]) return { ok: false, why: 'ほかの物と重なっている' };
      if (F.isEntrance(x, y)) return { ok: false, why: '入口をふさいでいる', door: true };
    }
    if (type === 'register') {
      if (r0 < 1 || r0 > 3) return { ok: false, why: 'レジの前と後ろに1マスずつ空きが要る' };
      if (grid[r0 - 1][c0 + 1] || grid[r0 + 1][c0 + 1]) return { ok: false, why: 'レジの前と後ろに1マスずつ空きが要る' };
    }
    if (type === 'rejiyoko') {
      const reg = G.items.find(i => i.type === 'register' && i !== exclude);
      if (!reg) return { ok: false, why: '先にレジを置く' };
      if (r0 !== reg.r || (c0 !== reg.c - 1 && c0 !== reg.c + 3)) return { ok: false, why: 'レジのすぐ左か右にだけ置ける' };
    }
    for (let y = r0; y < r0 + it.h; y++) for (let x = c0; x < c0 + it.w; x++) grid[y][x] = true;
    const { dist } = F.bfs(grid, D.ENTRANCE);
    const items = G.items.filter(i => i !== exclude).concat([{ type, c: c0, r: r0 }]);
    const reg = items.find(i => i.type === 'register');
    if (reg) {
      const fc = reg.c + 1, fr = reg.r + 1;
      if (fr >= D.ROWS || grid[fr][fc] || dist[fr][fc] < 0) return { ok: false, why: '客がレジの前まで行けなくなる' };
      if (reg.r - 1 < 0 || grid[reg.r - 1][fc]) return { ok: false, why: 'レジの後ろに店員が立てなくなる' };
    }
    for (const f of F.fixtures(items)) {
      if (NO_ACCESS.has(f.type)) continue;
      const acc = F.accessTiles(grid, f).filter(([c, r]) => dist[r][c] >= 0);
      if (!acc.length) return { ok: false, why: '通れなくなる棚ができる' };
    }
    return { ok: true, why: 'ここに置ける' };
  };

  const packLeft = type => (G.flags.packLeft || {})[type] || 0;
  F.placeCost = type => {
    if (packLeft(type) > 0) return 0;   // シャオが申し込んだ開業パックに入っている
    if (type === 'fridge') return G.flags.fridge === 'lease' ? 0 : 120000;
    if (type === 'gacha') return G.flags.gacha === 'own' ? 30000 : 0;
    return D.ITEMS[type].cost;
  };
  F.itemStatus = k => {
    const cost = F.placeCost(k);
    let priceText = cost ? K.yen(cost) : '0円';
    let note = '';
    if (k === 'fridge' && G.flags.fridge === 'lease') { priceText = 'リース'; note = '毎月5,000円'; }
    if (packLeft(k) > 0) { priceText = 'パック'; note = `開業パックに入っている（あと${packLeft(k)}つ）`; }
    if (k === 'gacha' && G.flags.gacha === 'vendor') note = '業者の台。売上の25%が店の取り分';
    if (k === 'gacha' && G.flags.gacha === 'own') note = '自前の台。粗利40%';
    const max = { register: 1, fridge: 1, gacha: K.gachaMax() }[k] || D.ITEMS[k].max;
    if (D.ITEMS[k].heart && !K.hasHeart(k)) return { ok: false, priceText, lockText: '♥で解放', note: '「シャオ」→「魔界の通販」で解放する' };
    if (!G.allowed[k]) return { ok: false, priceText, lockText: 'まだ', note };
    if (max && F.count(k) >= max) return { ok: false, priceText, lockText: max === 1 ? '設置済み' : `${max}つまで`, note };
    if (cost > G.money) return { ok: false, priceText, lockText: 'お金が足りない', note };
    return { ok: true, priceText, note };
  };

  // ================================================================ 置く操作
  const mouseTile = () => ({ c: Math.floor((E.mouse.fx - D.FX) / T), r: Math.floor((E.mouse.fy - D.FY) / T) });
  F.placeCandidate = () => {
    const p = G.place;
    const it = D.ITEMS[p.type];
    const m = mouseTile();
    const c0 = m.c - Math.floor((it.w - 1) / 2);
    const r0 = it.wall ? 0 : m.r;
    return { c0, r0, v: F.validate(p.type, c0, r0, p.moving) };
  };
  F.startPlace = type => {
    G.place = { type, flip: false, moving: null, armed: null };
    G.pulse = null;
    // 指で置くときは、床のまんなかに置く場所の目安を出しておく
    if (E.touch) { E.mouse.fx = D.FX + (D.COLS / 2) * T; E.mouse.fy = D.FY + 2.5 * T; }
    UI.renderMenu();
  };
  F.startPick = () => { G.pick = true; UI.renderMenu(); };
  F.cancelPlace = () => {
    if (G.place && G.place.moving) G.items.push(G.place.moving);
    G.place = null; G.pick = false;
    UI.tip(null);
    UI.renderMenu();
    Game.check();
  };
  F.clickField = async () => {
    if (G.pick) {
      const m = mouseTile();
      const it = G.items.find(i => m.c >= i.c && m.c < i.c + D.ITEMS[i.type].w && m.r >= i.r && m.r < i.r + D.ITEMS[i.type].h);
      if (!it) { E.toast('動かす物をクリックしてね'); return; }
      G.items = G.items.filter(i => i !== it);
      G.pick = false;
      G.place = { type: it.type, flip: it.flip, moving: it, armed: null };
      return;
    }
    if (!G.place) {
      // 棚をクリック：営業中は品出し、朝は陳列
      if (!G.unlock.display || !['play', 'morning', 'day'].includes(G.mode) || G.openPanel) return;
      const f = F.fixtureAt();
      if (f) Shelf.quick(f.key);
      return;
    }
    const { c0, r0, v } = F.placeCandidate();
    if (E.touch && !(G.place.armed && G.place.armed.c === c0 && G.place.armed.r === r0)) {
      G.place.armed = { c: c0, r: r0 };
      if (!v.ok) E.toast(v.why, 'bad');
      return;
    }
    if (!v.ok) {
      if (v.door && G.place.type === 'register' && !G.flags.doorTalk) {
        G.flags.doorTalk = true;
        await Dlg.run(SCRIPT.C1_02_DOOR);
      } else E.toast(v.why, 'bad');
      return;
    }
    const p = G.place;
    if (p.moving) {
      Object.assign(p.moving, { c: c0, r: r0, flip: p.flip });
      G.items.push(p.moving);
      E.toast(`${D.ITEMS[p.type].name}を動かした`);
    } else {
      const cost = F.placeCost(p.type);
      if (cost) K.expense('equip', cost);
      else if (packLeft(p.type) > 0) G.flags.packLeft[p.type]--;
      G.items.push({ id: G.nextId++, type: p.type, c: c0, r: r0, flip: p.flip });
      if (p.type === 'plant') K.fx({ rep: 0.15 });
      E.toast(`${D.ITEMS[p.type].name}を置いた${cost ? '　−' + K.yen(cost) : ''}`);
    }
    G.place = null;
    UI.tip(null);
    UI.renderMenu();
    Game.check();
  };
  E.stage.addEventListener('click', ev => {
    if (Dlg.active || G.mode === 'title') return;
    if (ev.target.closest('#panel, #menu, #missions, #timebar, #hud, #choices, #log, #hint, #placebar, #bgm-btn')) return;
    F.clickField();
  });
  E.stage.addEventListener('contextmenu', ev => {
    ev.preventDefault();
    if (G.place || G.pick) F.cancelPlace();
  });
  addEventListener('keydown', ev => {
    if (Dlg.active) return;
    if ((ev.key === 'r' || ev.key === 'R') && G.place) G.place.flip = !G.place.flip;
    if (ev.key === 'Escape') {
      if (G.place || G.pick) F.cancelPlace();
      else if (G.openPanel && !['result', 'form', 'night', 'study', 'lesson', 'month'].includes(G.openPanel)) UI.closePanel();
    }
  });

  // 設置中のボタン（指で操作するとき）
  F.placebar = () => {
    const on = !!(G.place || G.pick) && !Dlg.active && !G.openPanel;
    const bar = E.$('placebar');
    if (bar.classList.contains('on') !== on) bar.classList.toggle('on', on);
    if (on) {
      const txt = G.pick ? '動かす物をタップ' : G.place.armed ? (F.placeCandidate().v.ok ? 'もう一度同じ場所をタップで置く' : F.placeCandidate().v.why) : '置きたい床をタップ。もう一度タップで置く';
      const el = E.$('placebar-text');
      if (el.textContent !== txt) el.textContent = txt;
      E.$('pb-flip').classList.toggle('hidden', !G.place);
    }
  };
  E.$('pb-flip').addEventListener('click', ev => { ev.stopPropagation(); if (G.place) G.place.flip = !G.place.flip; });
  E.$('pb-cancel').addEventListener('click', ev => { ev.stopPropagation(); if (G.place || G.pick) F.cancelPlace(); });

  // 棚の上（絵の高さも含める）にマウスがあるか
  const ABOVE = { wallshelf: 34, fridge: 42, shelf: 14, rejiyoko: 4 };
  F.fixtureAt = () => {
    const mx = E.mouse.fx, my = E.mouse.fy;
    for (const f of Shelf.list()) {
      const ox = D.FX + f.c * T, oy = D.FY + f.r * T;
      if (mx >= ox && mx < ox + f.w * T && my >= oy - ABOVE[f.type] && my < oy + f.h * T) return f;
    }
    return null;
  };

  // ================================================================ 人の立ち位置
  F.staffOn = () => !!(G.staff && G.staff.days[K.wd()] && (G.mode === 'day' || G.mode === 'close'));
  F.hajimeRest = () => !!(F.staffOn() && G.staff.rest[K.wd()]);
  F.charPositions = () => {
    const grid = F.occupancy(null);
    const reg = F.reg();
    const used = new Set();
    const free = (c, r) => grid[r] && !grid[r][c] && !used.has(`${c},${r}`) && !F.isEntrance(c, r) && !(reg && c === reg.c + 1 && r === reg.r + 1);
    const take = (list, fallback) => {
      const t = list.find(([c, r]) => free(c, r));
      if (!t) return fallback;
      used.add(t.join());
      return F.tileCenter(t[0], t[1]);
    };
    const out = {};
    const roam = [[10, 1], [11, 2], [9, 1], [11, 1], [1, 3], [0, 2], [1, 1], [8, 1], [11, 3], [0, 3]];
    if (reg) {
      const behind = { x: D.FX + (reg.c + 1) * T + 8, y: D.FY + reg.r * T - 1 };
      used.add(`${reg.c + 1},${reg.r - 1}`);
      if (F.staffOn()) {
        out.staff = behind;
        out.hj = F.hajimeRest() ? null : take([[8, 1], [11, 2], [1, 2], [0, 3], [10, 3]], { x: 330, y: 150 });
      } else out.hj = behind;
      if (G.xiao === 'register') {
        const side = [[reg.c, reg.r - 1], [reg.c + 2, reg.r - 1]].find(([c, r]) => r >= 0 && free(c, r));
        if (side) { used.add(side.join()); out.xi = { x: D.FX + side[0] * T + 8, y: D.FY + reg.r * T - 1 }; }
      }
    } else {
      out.hj = take([[9, 2], [8, 2], [9, 3], [10, 3], [7, 2]], { x: 300, y: 150 });
    }
    if (!out.xi) out.xi = take(roam, { x: 330, y: 150 });
    return out;
  };

  // ================================================================ 描画
  const posterX = () => {
    const fr = G.items.find(i => i.type === 'fridge');
    const slots = [252, 304, 150];
    for (const x of slots) {
      if (!fr) return x;
      const fx = D.FX + fr.c * T;
      if (x + 22 <= fx || x >= fx + 32) return x;
    }
    return slots[0];
  };
  const nonDrinkStock = () => D.PRODUCTS.filter(p => p.genre !== 'ドリンク').reduce((s, p) => s + K.stockOf(p.id), 0);
  const drinkStock = () => D.PRODUCTS.filter(p => p.genre === 'ドリンク').reduce((s, p) => s + K.stockOf(p.id), 0);
  // 枠ごとの商品を描く（色は商品ごと。数が減ると少なく見える）。売切の枠には赤い×
  const GEO = {
    shelf: i => ({ x: 3 + (i % 3) * 14, y: i < 3 ? 1 : 11, per: 3, w: 3, step: 4, hs: [6, 5, 7] }),
    wallshelf: i => ({ x: 3 + (i % 3) * 20, y: [-20, -6, 8][Math.floor(i / 3)], per: 4, w: 3, step: 4, hs: [8, 6, 9, 7] }),
    fridge: i => ({ x: 4 + (i % 2) * 14, y: -30 + Math.floor(i / 2) * 10 + 7, per: 3, w: 3, step: 4, hs: [7, 7, 7] }),
    rejiyoko: i => ({ x: 3, y: i === 0 ? 6 : 13, per: 4, w: 2, step: 3, hs: [4, 4, 4, 4] }),
  };
  const drawGoods = (key, type, ox, oy) => {
    const a = G.slots[key];
    if (!a) return;
    const ctx = E.ctx;
    a.forEach((s, i) => {
      if (!s.id) return;
      const g = GEO[type](i);
      const p = K.prod(s.id);
      const n = s.q > 0 ? Math.max(1, Math.ceil(g.per * s.q / (p.face || 10))) : 0;
      for (let k = 0; k < n; k++) {
        const h = g.hs[k % g.hs.length];
        const x = ox + g.x + k * g.step, y = oy + g.y - h;
        ctx.fillStyle = p.col;
        ctx.fillRect(x, y, g.w, h);
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.fillRect(x, y, 1, 1);
      }
      if (s.q <= 0) {
        // 売切：赤い×
        const cx = ox + g.x + Math.floor((g.per * g.step) / 2) - 2, cy = oy + g.y - 6;
        ctx.fillStyle = '#ff3b5c';
        for (let d = 0; d < 5; d++) { ctx.fillRect(cx + d, cy + d, 1, 1); ctx.fillRect(cx + 4 - d, cy + d, 1, 1); }
      }
    });
  };
  const alertMark = (cx, y) => {
    const ctx = E.ctx;
    const x = Math.round(cx) - 4;
    ctx.fillStyle = '#18213e';
    ctx.fillRect(x - 1, y - 1, 9, 11);
    ctx.fillStyle = '#ff3b5c';
    ctx.fillRect(x, y, 7, 9);
    ctx.fillRect(x + 2, y + 9, 3, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 3, y + 1, 1, 5);
    ctx.fillRect(x + 3, y + 7, 1, 1);
  };
  F.draw = () => {
    const ctx = E.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 480, 270);
    if (G.scene === 'room') { ctx.drawImage(E.img.room, 0, 0); return; }
    ctx.drawImage(E.img.store, 0, 0);
    if (G.mode === 'title') return;
    const now = performance.now();
    const nd = nonDrinkStock() > 0;
    const showGoods = G.chapter >= 1;
    if (showGoods) { E.drawItem('wallshelf_empty', D.FX + D.WALLSHELF.c * T, D.FY + D.WALLSHELF.r * T); drawGoods('wall', 'wallshelf', D.FX + D.WALLSHELF.c * T, D.FY + D.WALLSHELF.r * T); }
    else if (nd) E.drawItem('wallshelf_full', D.FX + D.WALLSHELF.c * T, D.FY + D.WALLSHELF.r * T);
    if (G.flags.poster) E.drawItem('poster', posterX(), 46);
    if (G.flags.deco) E.drawItem('deco_' + G.flags.deco, 150, 44);
    const open = ['day', 'close', 'end'].includes(G.mode) || G.flags.aboardAlways;
    if (open) E.drawItem('aboard', 262, 192);
    const list = [];
    const fridgeBroken = G.flags.fridgeBroken;
    for (const it of G.items) {
      const d = D.ITEMS[it.type];
      let spr = it.type;
      const slotted = ['shelf', 'fridge', 'rejiyoko'].includes(it.type);
      if (it.type === 'shelf') spr = 'shelf_empty';
      if (it.type === 'fridge') spr = 'fridge_empty';
      if (it.type === 'rejiyoko') spr = 'rejiyoko_empty';
      const ox = D.FX + it.c * T, oy = D.FY + it.r * T;
      list.push({ y: D.FY + (it.r + d.h) * T, f: () => {
        E.drawItem(spr, ox, oy, { flip: it.flip });
        if (slotted && !(it.type === 'fridge' && fridgeBroken)) drawGoods('i' + it.id, it.type, ox, oy);
      } });
    }
    // 売切の印（棚の上の赤い「！」）
    if (['day', 'morning', 'play'].includes(G.mode) && Math.floor(now / 450) % 2 === 0) {
      for (const f of Shelf.list()) if (Shelf.soldOut(f.key)) list.push({ y: 999, f: () => alertMark(D.FX + f.c * T + f.w * T / 2, D.FY + f.r * T - ABOVE[f.type] - 2) });
    }
    const pos = F.charPositions();
    const talk = Dlg.active && Dlg.mini() ? Dlg.speaker : null;
    const tb = Math.floor(now / 160) % 2;
    const talkMark = (x, y, h) => E.drawChar('bubble_talk', x, y - h - 2 - tb);
    const hjSpr = 'hajime';
    if (pos.hj) list.push({ y: pos.hj.y, f: () => {
      E.drawChar(hjSpr, pos.hj.x, pos.hj.y, { bob: talk === '肇' ? tb : 0 });
      if (talk === '肇') talkMark(pos.hj.x, pos.hj.y, 26);
      else if (G.mode === 'day' && G.gauges.hp < 20 && Math.floor(now / 900) % 3 === 0) E.drawChar('bubble_sweat', pos.hj.x, pos.hj.y - 27);
    } });
    if (!G.flags.xiaoAway) list.push({ y: pos.xi.y, f: () => {
      E.drawChar('xiao', pos.xi.x, pos.xi.y, { bob: talk === 'シャオ' ? tb : Math.floor(now / 600) % 2 });
      if (talk === 'シャオ') talkMark(pos.xi.x, pos.xi.y, 24);
      else if (G.xiaoHeart > now) E.drawChar('bubble_heart', pos.xi.x, pos.xi.y - 25 - (Math.floor(now / 200) % 2));
    } });
    if (pos.staff) list.push({ y: pos.staff.y, f: () => {
      const spr = window.ATLAS.kohai && G.staff.sprite === 'kohai' ? 'kohai' : (G.staff.sprite || 'student_f');
      E.drawChar(spr, pos.staff.x, pos.staff.y, { bob: talk === G.staff.name ? tb : 0 });
      if (talk === G.staff.name) talkMark(pos.staff.x, pos.staff.y, 24);
    } });
    for (const v of G.visitors || []) {
      list.push({ y: v.y, f: () => {
        E.drawChar(v.sprite, v.x, v.y, { bob: talk === v.name ? tb : 0 });
        if (talk === v.name) talkMark(v.x, v.y, window.ATLAS[v.sprite] ? window.ATLAS[v.sprite].h : 24);
      } });
    }
    for (const c of G.customers) {
      if (c.hidden) continue;
      const back = (c.moving && c.dy < -0.2) || ['browse', 'pay', 'gacha'].includes(c.state);
      const spr = `${c.base}_${back ? 'b' : 'f'}`;
      const bob = c.moving ? Math.floor(now / 140) % 2 : 0;
      list.push({ y: c.y, f: () => {
        E.drawChar(spr, c.x, c.y, { bob });
        const h = window.ATLAS[spr] ? window.ATLAS[spr].h : 24;
        if (talk && G.talkTarget === c && talk !== '肇' && talk !== 'シャオ') talkMark(c.x, c.y, h);
        else if (c.bubble && c.bubble.until > now) E.drawChar(c.bubble.name, c.x, c.y - h - 1);
      } });
    }
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.f();
    // 設置中の表示
    if (G.place || G.pick) {
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = '#ffffff';
      for (let r = 0; r <= D.ROWS; r++) { ctx.beginPath(); ctx.moveTo(D.FX, D.FY + r * T + 0.5); ctx.lineTo(D.FX + D.COLS * T, D.FY + r * T + 0.5); ctx.stroke(); }
      for (let c = 0; c <= D.COLS; c++) { ctx.beginPath(); ctx.moveTo(D.FX + c * T + 0.5, D.FY); ctx.lineTo(D.FX + c * T + 0.5, D.FY + D.ROWS * T); ctx.stroke(); }
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#ff7ad0';
      for (const [c, r] of D.ENTRANCE) ctx.fillRect(D.FX + c * T + 4, D.FY + r * T + 4, 8, 8);
      ctx.restore();
    }
    if (G.place) {
      const { c0, r0, v } = F.placeCandidate();
      const it = D.ITEMS[G.place.type];
      const spr = { shelf: 'shelf_full', fridge: 'fridge_full' }[G.place.type] || G.place.type;
      E.drawItem(spr, D.FX + c0 * T, D.FY + r0 * T, { flip: G.place.flip, alpha: 0.65 });
      ctx.save();
      ctx.fillStyle = v.ok ? 'rgba(143,230,184,.35)' : 'rgba(255,111,143,.45)';
      ctx.fillRect(D.FX + c0 * T, D.FY + r0 * T, it.w * T, it.h * T);
      ctx.strokeStyle = v.ok ? '#8fe6b8' : '#ff6f8f';
      ctx.strokeRect(D.FX + c0 * T + 0.5, D.FY + r0 * T + 0.5, it.w * T - 1, it.h * T - 1);
      ctx.restore();
      UI.tip(v.why, v.ok);
    } else if (G.pick) UI.tip('動かす物をクリック（右クリックでやめる）', true);
    else if (!E.touch && G.unlock.display && ['play', 'morning', 'day'].includes(G.mode) && !G.openPanel && !Dlg.active) {
      const f = F.fixtureAt();
      if (f) {
        const out = Shelf.soldOut(f.key);
        UI.tip(`${f.label}${out ? `　売切${out}枠` : ''}　${G.mode === 'day' ? 'クリックで品出し' : 'クリックで陳列'}`, !out);
        hovering = true;
      } else if (hovering) { UI.tip(null); hovering = false; }
    } else if (hovering) { UI.tip(null); hovering = false; }
  };
  let hovering = false;
  return F;
})();
