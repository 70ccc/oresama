'use strict';
// 営業のシミュレーション：通行人、入店、買い物、会計。画面で見せる版と、結果だけ出す版
window.Sim = (() => {
  const S = {};
  const T = D.TILE;
  const { rand, pick, wpick } = K;
  const LANE_R = 211, LANE_L = 217;
  const VIS = [0, 1, 2, 4];             // 速さごとの見た目の動き
  const CLOCK = [0, 5, 10, 20];         // 速さごとの時計の進み（分／秒）
  const IN_SPEED = 30;

  S.newStats = () => ({ passers: 0, entered: 0, buyers: 0, sales: 0, gacha: 0, gachaRev: 0, cogs: 0, sweat: 0, q: 0,
    sold: {}, adults: 0, kids: 0, impulse: 0, old: 0, maxOld: 0, miss: 0, missed: {}, missAt: {}, drained: 0, noReg: 0,
    grin: 0, smile: 0, stolen: 0, stolenYen: 0 });

  // ================================================================ 通行量と入店
  S.band = t => D.TRAFFIC.find(s => t >= s.from && t < s.to) || D.TRAFFIC[D.TRAFFIC.length - 1];
  S.rate = t => {
    let r = S.band(t).rate;
    const wd = K.isPublicHoliday() ? 0 : K.wd();
    r *= D.WEEKDAY_TRAFFIC[wd];
    if (wd === 5 && t >= 1050) r *= 1.35;            // 花金
    if (wd === 3 && t >= 1020 && t < 1140) r *= 1.2;  // ノー残業デー
    r *= D.MONTH_TRAFFIC[G.date.m];
    if (G.weather === '雨') r *= 0.7;
    if (G.weather === '曇') r *= 0.95;
    r *= 0.8 + 0.1 * G.rep;
    // 開店してしばらくは、新しい店を見に来る人がいる（3週間でなくなる）
    const since = G.dayNo - K.dayNoOf(D.OPEN_DATE);
    if (since > 0 && since < 21) r *= 1 + 0.25 * (1 - since / 21);
    if (G.flags.discount) r *= 0.9;
    if (G.today && G.today.traffic) r *= G.today.traffic(t);
    return r;
  };
  S.mix = t => {
    const m = { ...S.band(t).mix };
    const wd = K.isPublicHoliday() ? 0 : K.wd();
    if (wd === 3 && t >= 1020 && t < 1140) m.salary = (m.salary || 0) + 3;   // ノー残業デー
    if (wd === 5 && t >= 1050) { m.salary = (m.salary || 0) + 2; m.student = (m.student || 0) + 1; }
    if ((wd === 0 || wd === 6 || (G.date.m === 8 && wd !== 0)) && t < 900) m.kid = (m.kid || 0) + 2;   // 休みの日と夏休みは子どもが昼にもいる
    if (wd === 0 || wd === 6) { m.salary = (m.salary || 0) * 0.4; m.student = (m.student || 0) + 1; }
    return m;
  };
  const weighted = mix => {
    const tot = Object.values(mix).reduce((a, b) => a + b, 0);
    let x = Math.random() * tot;
    for (const [k, v] of Object.entries(mix)) { x -= v; if (x <= 0) return k; }
    return Object.keys(mix)[0];
  };
  const xiaoReg = () => G.xiao === 'register' && !G.flags.xiaoAway;
  S.enterProb = type => {
    const ct = D.CUSTOMERS[type];
    let p = ct.enter * (0.75 + 0.15 * G.rep);
    if (ct.adult && xiaoReg()) p *= 1.5;
    if (Field.count('pop')) p *= 1 + 0.04 * Field.count('pop');
    p *= 1 + Shelf.enterBonus(type) + K.spellEnter(type) + K.decoEnter(type);   // 相性コンボ、おまじない、置物
    if (G.today && G.today.enter) p *= G.today.enter(type);
    return Math.min(0.95, p);
  };

  // ================================================================ 客をつくる
  const makeCustomer = (type, opt = {}) => {
    const ct = D.CUSTOMERS[type];
    let budget = Math.round(rand(ct.budget[0], ct.budget[1]));
    if (ct.adult && xiaoReg()) budget = Math.round(budget * 1.25);
    if (ct.adult && G.date.d >= 25 && G.date.d <= 27) budget = Math.round(budget * 1.15);   // 給料日のあと
    budget = Math.round(budget * (1 + K.spellSum('budget')));                                // 財布のひもをゆるめるおまじない
    const wants = ct.genres.slice();
    const m = G.date.m, d = G.date.d;
    if (ct.adult && m === 12 && Math.random() < 0.18) { wants.unshift('gift'); budget += 2000; }
    if (!ct.adult && m === 1 && d <= 15) budget = Math.round(budget * 1.6);                                   // お年玉
    if (type !== 'elder' && m === 2 && d <= 14 && Math.random() < 0.12) { wants.unshift('gift'); budget += 800; }   // バレンタイン
    if (ct.adult && m === 3 && d <= 14 && Math.random() < 0.08) { wants.unshift('gift'); budget += 800; }       // ホワイトデー
    if (G.weather === '雨' && ct.adult && Math.random() < 0.2) wants.unshift('rain');
    return { type, kid: !ct.adult, budget, wants, cart: [], first: !!opt.first, forced: !!opt.forced };
  };
  S.spawn = (type, fromLeft, opt = {}) => {
    const x = fromLeft ? -12 - (opt.offset || 0) : 492 + (opt.offset || 0);
    const lane = (fromLeft ? LANE_R : LANE_L) + Math.round(rand(-1, 1));
    const c = Object.assign(makeCustomer(type, opt), {
      base: pick(D.CUSTOMERS[type].sprites), x, y: lane, lane, state: 'walk',
      path: [{ x: D.DOOR.x, y: lane }, { x: fromLeft ? 500 : -20, y: lane }], speed: rand(55, 70),
      bubble: null, timer: 0,
    });
    // 入るかどうかは最初に決める。入らない人の半分は描かない（画面がうるさくならないように）
    c.willEnter = opt.forced || Math.random() < S.enterProb(type);
    G.stats.passers++;
    if (!c.willEnter && !opt.forced && Math.random() < 0.5) return null;
    G.customers.push(c);
    return c;
  };

  // ================================================================ 通り道
  const pathTo = goal => {
    const grid = Field.occupancy(null);
    const { dist, prev } = Field.bfs(grid, D.ENTRANCE);
    const [gc, gr] = goal;
    if (dist[gr][gc] < 0) return null;
    const tiles = [];
    let cur = [gc, gr];
    while (cur) { tiles.unshift(cur); cur = prev[cur[1]][cur[0]]; }
    return tiles.map(([tc, tr]) => Field.tileCenter(tc, tr));
  };
  const bestAccess = f => {
    const grid = Field.occupancy(null);
    const { dist } = Field.bfs(grid, D.ENTRANCE);
    const acc = Field.accessTiles(grid, f).filter(([c, r]) => dist[r][c] >= 0);
    acc.sort((a, b) => a[2] - b[2] || dist[a[1]][a[0]] - dist[b[1]][b[0]]);
    return acc.length ? [acc[0][0], acc[0][1]] : null;
  };
  const pathFromHere = (c, goal) => {
    const grid = Field.occupancy(null);
    let tc = Math.floor((c.x - D.FX) / T), tr = Math.floor((c.y - 4 - D.FY) / T);
    tc = K.clamp(tc, 0, D.COLS - 1); tr = K.clamp(tr, 0, D.ROWS - 1);
    const { prev, dist } = Field.bfs(grid, [[tc, tr]]);
    if (dist[goal[1]] === undefined || dist[goal[1]][goal[0]] < 0) return null;
    const tiles = [];
    let cur = goal, guard = 0;
    while (cur && guard++ < 80) { tiles.unshift(cur); cur = prev[cur[1]][cur[0]]; }
    return tiles.map(([x, y]) => Field.tileCenter(x, y));
  };
  const exitPath = c => {
    if (c.y < 190) {
      const grid = Field.occupancy(null);
      const { prev } = Field.bfs(grid, D.ENTRANCE);
      let tc = K.clamp(Math.floor((c.x - D.FX) / T), 0, D.COLS - 1), tr = K.clamp(Math.floor((c.y - 4 - D.FY) / T), 0, D.ROWS - 1);
      let cur = [tc, tr];
      const back = [];
      let guard = 0;
      while (cur && guard++ < 80) { back.push(Field.tileCenter(cur[0], cur[1])); cur = prev[cur[1]][cur[0]]; }
      const right = Math.random() < 0.5;
      const lane = right ? LANE_R : LANE_L;
      return [...back, { x: D.DOOR.x, y: 194 }, { x: D.DOOR.x, y: lane }, { x: right ? 500 : -20, y: lane }];
    }
    return [{ x: c.x > D.DOOR.x ? 500 : -20, y: c.lane }];
  };
  const chooseTarget = c => {
    const fx = Field.fixtures();
    const gachas = fx.filter(f => f.type === 'gacha');
    const ct = D.CUSTOMERS[c.type];
    if (gachas.length && !c.playedGacha && c.budget >= D.GACHA_PRICE && Math.random() < gachaProb(ct)) return { f: pick(gachas), kind: 'gacha' };
    if (c.wants[0] === 'ドリンク') { const fr = fx.find(f => f.type === 'fridge'); if (fr) return { f: fr, kind: 'shop' }; }
    const shelves = fx.filter(f => f.type === 'shelf' || f.type === 'wallshelf');
    return { f: pick(shelves), kind: 'shop' };
  };

  // ガチャガチャの台が多いほど、回す人が増える（1台増えるごとに1.5倍まで）
  const gachaProb = ct => Math.min(0.95, ct.gacha * (1 + 0.5 * (Field.count('gacha') - 1)));
  // ================================================================ 入店・ガチャ・買い物
  // 万引き（4月中旬から）：小学生と学生が、気づかれないうちに1〜2個持っていく。魔除けの鈴か、見張りのおまじないで防げる
  const theft = c => {
    if (!G.flags.theftOn || K.noTheft() || (c.type !== 'kid' && c.type !== 'student') || Math.random() >= D.THEFT_RATE) return;
    const list = D.PRODUCTS.filter(p => c.wants.includes(p.genre) && p.genre !== 'ドリンク' && Shelf.displayed(p.id) > 0);
    if (!list.length) return;
    const p = pick(list);
    const r = K.takeStock(p.id, Math.min(Math.random() < 0.5 ? 1 : 2, Shelf.displayed(p.id)));
    if (!r.got) return;
    Shelf.take(p.id, r.got);
    G.month.stolen = (G.month.stolen || 0) + r.cogs;
    G.stats.stolen += r.got;
    G.stats.stolenYen += r.cogs;
  };
  const onEnter = c => {
    G.stats.entered++;
    G.month.cust++;
    theft(c);
    if (c.kid) { G.stats.kids++; return; }
    G.stats.adults++;
    // 生気：大人からだけ吸う。レジに立っているとよく吸える
    const reg = xiaoReg();
    const ct = D.CUSTOMERS[c.type];
    // お腹が空きすぎていると、吸いすぎて客がふらふらで帰る
    if (reg && G.gauges.hunger > 75 && Math.random() < 0.3) {
      c.drained = true;
      G.stats.drained++;
      G.seiki += 3;
      K.fx({ hunger: -6 });
      G.xiaoHeart = performance.now() + 1500;
      return;
    }
    const amt = (reg ? 2 : 1) * (ct.tired ? 1.3 : 1);
    G.seiki += amt;
    K.fx({ hunger: -(reg ? 0.7 : 0.25) * (ct.tired ? 1.3 : 1), mood: ct.young ? 0.6 : ct.tired ? -0.2 : 0.2 });
    G.xiaoHeart = performance.now() + 1500;
  };
  const playGacha = c => {
    c.playedGacha = true;
    const plays = c.kid ? 1 : Math.random() < 0.5 ? 1 : 2;
    const rev = D.GACHA_PRICE * plays;
    const own = G.flags.gacha === 'own';
    const share = own ? rev : rev * D.GACHA_VENDOR_SHARE;
    G.money += share;
    G.month.gacha += share;
    G.stats.gacha += plays;
    G.stats.gachaRev += share;
    if (own) { const cg = rev * (1 - D.GACHA_OWN_MARGIN); G.stats.cogs += cg; G.month.cogs += cg; }
    c.budget -= rev;
  };
  // 値段への反応：推奨価格（その日の相場）との比で決まる
  const refPrice = p => {
    let r = K.refPrice(p);
    if (G.flags.discount && ['駄菓子', 'ドリンク', '日用品', '菓子'].includes(p.genre) && !p.gift) r *= 0.9;
    return r;
  };
  // 値段への反応：にっこり（ちょうどいい）、にやり（安すぎ。よく買うけど儲けそこね）、怒り（高すぎ）
  const priceOk = p => {
    const v = K.priceOf(p.id);
    if (v == null) return { ok: false, why: 'sweat', face: 'mad' };
    const face = G.clearance[p.id] ? 'grin' : K.face(p, v);
    let prob = G.clearance[p.id] ? 1 : K.buyProb(p, v);
    const pops = Field.count('pop');
    if (pops) prob = Math.min(1, prob * (1 + 0.06 * pops));
    return { ok: Math.random() < prob, why: face === 'mad' ? 'sweat' : 'pass', face };
  };
  void refPrice;
  // 棚に並べている（枠がある）商品だけが買える。並んでいる数が0なら売切
  const offered = p => Shelf.carried(p.id) && K.priceOf(p.id) != null && !(p.genre === 'ドリンク' && (!Field.has('fridge') || G.flags.fridgeBroken));
  const sellable = p => offered(p) && Shelf.displayed(p.id) > 0;
  const takeInto = (c, p, qty) => {
    const v = K.priceOf(p.id);
    const r = K.takeStock(p.id, Math.min(qty, Shelf.displayed(p.id)));
    if (!r.got) return 0;
    Shelf.take(p.id, r.got);
    c.cart.push({ p, qty: r.got, price: v, cogs: r.cogs, old: r.oldest });
    return v * r.got;
  };
  S.decidePurchase = c => {
    let money = c.budget, sweat = false, found = false, missed = false;
    const fx = Shelf.fx();
    const weight = p => (p.pop || 1) * (1 + 0.35 * (Shelf.facings(p.id) - 1)) * (fx.weight[p.id] || 1);
    for (const g of c.wants) {
      let list;
      if (g === 'gift') list = D.PRODUCTS.filter(p => p.gift && offered(p));
      else if (g === 'rain') list = D.PRODUCTS.filter(p => p.rain && offered(p));
      else list = D.PRODUCTS.filter(p => p.genre === g && offered(p));
      if (!list.length) continue;
      found = true;
      const tries = c.kid ? 3 : 2;
      for (let i = 0; i < tries; i++) {
        const avail = list.filter(sellable);
        const p = c.first && i === 0 && g === '駄菓子' && avail.length ? avail.slice().sort((a, b) => a.price - b.price)[0] : wpick(list, weight);
        if (!sellable(p)) {
          // 欲しかった商品が売切
          if (!missed) G.stats.miss++;
          missed = true;
          G.stats.missed[p.id] = (G.stats.missed[p.id] || 0) + 1;
          if (G.stats.missAt[p.id] == null) G.stats.missAt[p.id] = Math.floor(G.time);
          continue;
        }
        const v = K.priceOf(p.id);
        if (v > money) continue;
        const res = priceOk(p);
        if (!res.ok) { if (res.why === 'sweat') sweat = true; continue; }
        let qty = 1;
        if (c.kid && v <= 30) qty = Math.max(1, Math.min(3, Math.floor(money / v)));
        if (c.first && v <= 30) qty = 3;
        if (res.face === 'grin' && !c.first) qty += 1;   // 安すぎると、ついでにもう1個（買いだめ）
        qty = Math.max(1, Math.min(qty, Shelf.displayed(p.id), Math.floor(money / v)));
        const got = takeInto(c, p, qty);
        money -= got;
        if (res.face === 'grin') { c.grin = true; G.stats.grin += Math.round(got / v); } else G.stats.smile += Math.round(got / v);
        if (c.first) break;
        if (g === 'gift' || g === 'rain') break;
      }
      if (c.first && c.cart.length) break;
    }
    if (c.cart.length) return 'buy';
    if (missed) { G.stats.q++; return 'q'; }
    if (sweat) { G.stats.sweat++; return 'sweat'; }
    if (!found) G.stats.q++;
    return found ? 'sweat' : 'q';
  };
  // 会計：レジ横があれば、ついで買い
  const pay = c => {
    if (Field.has('rejiyoko') && c.budget > 40 && Math.random() < 0.3) {
      const reji = G.items.find(i => i.type === 'rejiyoko');
      const ids = reji ? (G.slots['i' + reji.id] || []).filter(s => s.id && s.q > 0).map(s => s.id) : [];
      const list = D.PRODUCTS.filter(p => ids.includes(p.id) && K.priceOf(p.id) != null);
      if (list.length) {
        const p = wpick(list);
        const spent = c.cart.reduce((s, x) => s + x.price * x.qty, 0);
        if (K.priceOf(p.id) <= c.budget - spent) { takeInto(c, p, 1); G.stats.impulse++; }
      }
    }
    const total = c.cart.reduce((s, x) => s + x.price * x.qty, 0);
    const cogs = c.cart.reduce((s, x) => s + x.cogs, 0);
    G.money += total;
    G.month.sales += total;
    G.month.cogs += cogs;
    G.month.buyers++;
    G.stats.sales += total;
    G.stats.cogs += cogs;
    G.stats.buyers++;
    for (const x of c.cart) {
      G.stats.sold[x.p.id] = (G.stats.sold[x.p.id] || 0) + x.qty;
      G.month.sold[x.p.id] = (G.month.sold[x.p.id] || 0) + x.qty;
      const life = K.life(x.p.id);
      if (life && x.old > life * 0.85) { G.stats.old++; G.stats.maxOld = Math.max(G.stats.maxOld, x.old / life); }
    }
    return total;
  };

  // ================================================================ 画面で動かす
  const bubble = (c, name) => { c.bubble = { name, until: performance.now() + 1800 }; };
  const enterVisual = c => {
    c.state = 'enter';
    onEnter(c);
    if (c.drained) { c.state = 'leave'; c.path = exitPath(c); bubble(c, 'bubble_heart'); return; }
    c.target = chooseTarget(c);
    const acc = bestAccess(c.target.f);
    const inside = acc ? pathTo(acc) : null;
    if (!inside) { c.state = 'leave'; c.path = exitPath(c); return; }
    c.path = [{ x: D.DOOR.x, y: 194 }, ...inside];
  };
  const hajimeAway = () => G.flags.awayUntil > G.time;
  const unmanned = () => hajimeAway() && !xiaoReg() && !Field.staffOn();
  S.unmanned = unmanned;
  const payTime = () => (Field.staffOn() ? 0.9 : 1.2) * (G.gauges.hp < 15 ? 1.7 : G.gauges.hp < 30 ? 1.3 : 1) * (G.flags.busyUntil > G.time ? 1.8 : 1) * (hajimeAway() ? 1.6 : 1);
  S.update = (c, dt) => {
    if (c.path && c.path.length && !['browse', 'pay', 'gacha'].includes(c.state)) {
      const tgt = c.path[0];
      const dx = tgt.x - c.x, dy = tgt.y - c.y;
      const d = Math.hypot(dx, dy);
      const sp = (c.state === 'walk' || c.y > 196 ? c.speed : IN_SPEED) * dt;
      c.moving = true;
      c.dy = dy;
      if (d <= sp) { c.x = tgt.x; c.y = tgt.y; c.path.shift(); } else { c.x += dx / d * sp; c.y += dy / d * sp; }
    } else c.moving = false;
    if (c.state === 'walk') {
      if (!c.decided && c.path.length === 1) { c.decided = true; if (c.willEnter) enterVisual(c); }
      if (!c.path.length) c.dead = true;
      return;
    }
    if (c.state === 'enter' && !c.path.length) {
      if (c.target.kind === 'gacha') { c.state = 'gacha'; c.timer = 1.6; } else { c.state = 'browse'; c.timer = rand(1.5, 3.5); }
      return;
    }
    if (c.state === 'gacha') {
      c.timer -= dt;
      if (c.timer <= 0) {
        playGacha(c);
        bubble(c, 'bubble_note');
        if (c.budget > 30) {
          c.target = { f: pick(Field.fixtures().filter(f => f.type === 'shelf' || f.type === 'wallshelf')), kind: 'shop' };
          const acc = bestAccess(c.target.f);
          const path = acc ? pathFromHere(c, acc) : null;
          if (path) { c.state = 'enter'; c.path = path; return; }
        }
        c.state = 'leave'; c.path = exitPath(c);
      }
      return;
    }
    if (c.state === 'browse') {
      c.timer -= dt;
      if (c.timer <= 0) {
        if (unmanned()) { G.stats.noReg++; bubble(c, 'bubble_q'); c.state = 'leave'; c.path = exitPath(c); return; }
        const r = S.decidePurchase(c);
        if (r === 'buy') {
          const reg = Field.reg();
          const front = [reg.c + 1, reg.r + 1];
          c.path = pathFromHere(c, front) || [Field.tileCenter(front[0], front[1])];
          c.state = 'toRegister';
        } else {
          bubble(c, r === 'sweat' ? 'bubble_mad' : 'bubble_q');
          c.state = 'leave';
          c.path = exitPath(c);
        }
      }
      return;
    }
    if (c.state === 'toRegister' && !c.path.length) {
      c.state = 'pay';
      c.timer = payTime();
      if (S.onRegister) S.onRegister(c);
      return;
    }
    if (c.state === 'pay') {
      c.timer -= dt;
      if (c.timer <= 0) {
        const total = pay(c);
        bubble(c, xiaoReg() && !c.kid && Math.random() < 0.25 ? 'bubble_heart' : c.grin ? 'bubble_grin' : 'bubble_smile');
        if (S.onPaid) S.onPaid(c, total);
        c.state = 'leave';
        c.path = exitPath(c);
      }
      return;
    }
    if (c.state === 'leave' && !c.path.length) c.dead = true;
  };

  // ================================================================ 結果だけ出す（画面に出さない）
  const headlessCustomer = type => {
    const c = makeCustomer(type);
    onEnter(c);
    if (c.drained) return;
    if (unmanned()) { G.stats.noReg++; return; }
    const ct = D.CUSTOMERS[c.type];
    if (Field.has('gacha') && c.budget >= D.GACHA_PRICE && Math.random() < gachaProb(ct)) playGacha(c);
    if (c.budget > 30 || !Field.has('gacha')) {
      const r = S.decidePurchase(c);
      if (r === 'buy') pay(c);
    }
  };
  // 閉店時に店に残っている客：会計まで来ていた人だけ払う
  S.finishInside = () => {
    for (const c of G.customers) {
      if (c.cart && c.cart.length && ['toRegister', 'pay'].includes(c.state)) pay(c);
      else if (c.cart && c.cart.length) for (const x of c.cart) K.addStock(x.p.id, x.qty, Math.round(x.cogs / x.qty));
    }
    G.customers = [];
  };

  // ================================================================ 時間を進める
  // Xiao の機嫌：レジに立っていると少しずつ飽きる
  let lastHour = 0;
  const xiaoTick = () => {
    const h = Math.floor(G.time / 30);
    if (h === lastHour) return;
    lastHour = h;
    if (!xiaoReg() && !G.flags.xiaoAway) K.fx({ mood: 0.4, hunger: 0.3 });   // 好きにさせると機嫌は戻るが、お腹は空く
    if (xiaoReg()) {
      K.fx({ mood: G.gauges.hunger < 60 ? -0.3 : -0.5 });
      if (G.gauges.mood < 18 || G.gauges.hunger > 92) {
        G.xiao = 'free';
        G.flags.xiaoQuit = true;
        E.toast('シャオがレジから逃げた（機嫌が悪い）', 'bad');
      }
    }
  };
  S.spawnStep = dt => {
    if (G.time >= G.settings.close - 15) return;
    G.spawnAcc += S.rate(G.time) * dt;
    while (G.spawnAcc >= 1) {
      G.spawnAcc -= 1;
      S.spawn(weighted(S.mix(G.time)), Math.random() < 0.5);
    }
  };
  // 画面版の1コマ
  S.tick = async dtReal => {
    if (Dlg.active || G.openPanel) return;
    if (G.pendingTalk) { const t = G.pendingTalk; G.pendingTalk = null; await Dlg.run(t); G.talkTarget = null; return; }
    const ev = K.dayEvent();
    if (ev) { await ev.run(); return; }
    const dt = dtReal * CLOCK[G.speed];
    if (dt <= 0) return;
    G.time = Math.min(G.settings.close, G.time + dt);
    xiaoTick();
    if (S.beforeSpawn && S.beforeSpawn()) return;
    if (G.time < G.settings.close) S.spawnStep(dt);
    const vdt = dtReal * VIS[G.speed];
    for (const c of G.customers) S.update(c, vdt);
    G.customers = G.customers.filter(c => !c.dead);
  };
  // 閉店まで一気に進める
  S.skipToClose = async (until = G.settings.close) => {
    G.customers.forEach(c => { if (c.state === 'walk') c.dead = true; });
    S.finishInside();
    while (G.time < Math.min(until, G.settings.close)) {
      const ev = K.dayEvent();
      if (ev) { await ev.run(); continue; }
      G.time = Math.min(G.settings.close, G.time + 1);
      xiaoTick();
      // 自動の日は、品出しも自動（裏の在庫があるかぎり）
      if (G.flags.autoDay && G.time % 20 === 0) Shelf.fillAll();
      if (G.time >= G.settings.close - 15) continue;
      G.spawnAcc += S.rate(G.time);
      while (G.spawnAcc >= 1) {
        G.spawnAcc -= 1;
        const type = weighted(S.mix(G.time));
        G.stats.passers++;
        if (Math.random() < S.enterProb(type)) headlessCustomer(type);
      }
    }
  };
  S.resetDay = () => {
    G.customers = [];
    G.stats = S.newStats();
    G.spawnAcc = 0;
    G.time = 600;
    lastHour = 0;
  };
  return S;
})();
