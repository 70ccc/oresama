'use strict';
// 共通の道具：状態、日付、在庫、お金と帳簿、ミッション、イベント、セーブ
window.G = {
  v: 4,
  mode: 'title',        // title / story / play（開店準備） / morning / day / close / night / end
  scene: 'store',       // room / store
  storeName: 'おれさま商店',
  money: D.START_MONEY, rep: 1.2, seiki: 0, rel: 0,
  date: { ...D.START_DATE }, dayNo: 0, time: 600, speed: 1, weather: '晴',
  items: [], inv: {}, prices: {}, target: {}, deliveries: [], clearance: {},
  slots: {}, combos: {}, autoLog: [],   // 陳列の枠、見つけたコンボ、自動で営業した日の記録
  market: {}, marketLog: [],            // 仕入れ値の相場（商品ごとの倍率）と、動いた記録
  spells: {},                           // かけているおまじない（id → 切れる日）
  stockSpent: 0, nextId: 1,
  unlock: { place: false, stock: false, price: false, open: false },
  allowed: {}, pulse: null, openPanel: null, place: null, pick: false,
  flags: {}, done: {}, missions: {}, study: {}, forms: {},
  gauges: { hp: 35, stress: 85, hunger: 75, mood: 50 },
  settings: { close: 1200, holiday: null },
  xiao: 'free', staff: null, loans: [], chapter: 0,
  month: null, ledger: [], days: [], titles: [],
  customers: [], stats: null, spawnAcc: 0,
};

window.K = (() => {
  const K = {};
  K.rand = (a, b) => a + Math.random() * (b - a);
  K.pick = arr => arr[Math.floor(Math.random() * arr.length)];
  K.wpick = (arr, w = p => p.pop || 1) => {
    const tot = arr.reduce((s, p) => s + w(p), 0);
    let x = Math.random() * tot;
    for (const p of arr) { x -= w(p); if (x <= 0) return p; }
    return arr[arr.length - 1];
  };
  K.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  K.yen = n => (n < 0 ? '−¥' : '¥') + Math.abs(Math.round(n)).toLocaleString('ja-JP');
  K.man = n => `${(Math.round(n / 1000) / 10).toLocaleString('ja-JP')}万円`;

  // ================================================================ 日付
  const BASE = Date.UTC(2026, 3, 1);
  K.dayNoOf = d => Math.round((Date.UTC(d.y, d.m - 1, d.d) - BASE) / 86400000);
  K.dateOf = n => { const t = new Date(BASE + n * 86400000); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; };
  K.wd = (d = G.date) => new Date(Date.UTC(d.y, d.m - 1, d.d)).getUTCDay();
  K.fmt = (d = G.date) => `${d.m}月${d.d}日（${D.WEEK[K.wd(d)]}）`;
  K.yearLabel = (d = G.date) => `${d.y - 2025}年目`;
  K.cmp = (a, b) => K.dayNoOf(a) - K.dayNoOf(b);
  K.isLastDay = (d = G.date) => K.dateOf(K.dayNoOf(d) + 1).m !== d.m;
  K.daysInMonth = (d = G.date) => new Date(Date.UTC(d.y, d.m, 0)).getUTCDate();
  K.on = (m, d) => G.date.m === m && G.date.d === d;
  K.after = (y, m, d) => K.cmp(G.date, { y, m, d }) >= 0;
  K.setDate = d => { G.date = { ...d }; G.dayNo = K.dayNoOf(d); };
  K.isHoliday = () => G.settings.holiday != null && K.wd() === G.settings.holiday;
  K.iso = (d = G.date) => `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  K.isPublicHoliday = (d = G.date) => D.HOLIDAYS.includes(K.iso(d));
  // 遊ぶ日（月・水・金・日）。ほかの日は自動で営業して結果だけ出す
  K.isPlayDay = (d = G.date) => D.PLAY_DAYS.includes(K.wd(d));

  // ================================================================ 在庫（仕入れた日ごとに分けて持つ。古いものから売る）
  K.prod = id => D.PRODUCTS.find(p => p.id === id);
  K.stockOf = id => (G.inv[id] || []).reduce((s, b) => s + b.q, 0);
  K.stockValue = () => Object.values(G.inv).flat().reduce((s, b) => s + b.q * b.c, 0);
  K.addStock = (id, q, cost) => {
    (G.inv[id] = G.inv[id] || []).push({ q, c: cost, d: G.dayNo });
  };
  K.avgCost = id => {
    const b = G.inv[id] || [];
    const q = b.reduce((s, x) => s + x.q, 0);
    return q ? Math.round(b.reduce((s, x) => s + x.q * x.c, 0) / q) : Math.round(K.prod(id).cost * K.mkt(id) * (G.flags.charmUntil > G.dayNo ? 0.9 : 1));
  };
  // 売れた分を古い順に出す。原価と、いちばん古かったものの日数を返す
  K.takeStock = (id, q) => {
    const b = G.inv[id] || [];
    let left = q, cogs = 0, oldest = 0;
    while (left > 0 && b.length) {
      const x = b[0];
      const n = Math.min(left, x.q);
      cogs += n * x.c;
      oldest = Math.max(oldest, G.dayNo - x.d);
      x.q -= n; left -= n;
      if (x.q <= 0) b.shift();
    }
    return { cogs, oldest, got: q - left };
  };
  K.life = id => D.SHELF_LIFE[K.prod(id).genre];
  K.daysLeft = id => {
    const b = G.inv[id] || [], life = K.life(id);
    if (!b.length || !life) return null;
    return life - (G.dayNo - b[0].d);
  };
  // 期限切れを捨てる
  K.expire = () => {
    const out = [];
    for (const [id, b] of Object.entries(G.inv)) {
      const life = K.life(id);
      if (!life) continue;
      while (b.length && G.dayNo - b[0].d > life) {
        const x = b.shift();
        out.push({ id, q: x.q, cost: x.q * x.c });
        G.month.waste += x.q * x.c;
      }
    }
    return out;
  };
  // 季節もの：季節が過ぎたら半額で見切る
  // 仕入れられるか：季節もの・グッズは解放フラグ、ほかは条件（問屋との交渉、シャオとのお出かけ、おねだり）
  K.available = p => {
    if (p.unlock) return !!G.flags['u_' + p.unlock];
    const n = p.need;
    if (!n) return true;
    if (n.tonya) return (G.flags.tonya || 0) >= n.tonya;
    if (n.outing) return (G.flags.outings || 0) >= n.outing;
    if (n.flag) return !!G.flags[n.flag];
    return true;
  };
  K.needText = p => {
    if (p.unlock) return { summer: '7月から（夏の商品）', halloween: '10月だけ（ハロウィン）', xmas: '12月だけ（クリスマス）', goods: 'オリジナル商品を作る（秋）' }[p.unlock] || '？';
    const n = p.need;
    if (!n) return '最初から';
    if (n.tonya) return `問屋さんと交渉する（${n.tonya}回目）`;
    if (n.outing) return `シャオと雑貨屋めぐり（${n.outing}回目）`;
    if (n.flag === 'u_gold') return 'シャオのおねだり';
    return '？';
  };
  K.inSeason = p => !p.months || p.months.includes(G.date.m);

  // ================================================================ 仕入れ値の相場
  // 毎日いくつかの商品の仕入れ値が動く。推奨価格も同じだけ動くので、値段をこまめに見直す
  K.mkt = id => (G.market && G.market[id]) || 1;
  K.roundPrice = v => (v < 30 ? Math.round(v) : v < 100 ? Math.round(v / 5) * 5 : v < 1000 ? Math.round(v / 10) * 10 : Math.round(v / 50) * 50);
  K.refPrice = p => K.roundPrice(p.price * K.mkt(p.id));
  K.marketTick = () => {
    const M = D.MARKET;
    const pool = D.PRODUCTS.filter(p => K.available(p) && K.inSeason(p));
    if (!pool.length) return;
    const move = (p, up, news) => {
      const f0 = K.mkt(p.id), before = K.refPrice(p), c0 = K.costOf(p, 'cash');
      const k = 1 + (up ? 1 : -1) * K.rand(M.step[0], M.step[1]);
      G.market[p.id] = Math.round(K.clamp(f0 * k, M.min, M.max) * 1000) / 1000;
      const after = K.refPrice(p), c1 = K.costOf(p, 'cash');
      if (after !== before || c1 !== c0) G.marketLog.push({ day: G.dayNo, id: p.id, from: before, to: after, up, news: news || null });
      if (G.marketLog.length > 80) G.marketLog.splice(0, G.marketLog.length - 80);
    };
    // ニュース：同じジャンルの商品がまとめて動く
    if (Math.random() < M.newsRate) {
      const n = K.pick(D.MARKET_NEWS);
      const hit = pool.filter(p => (n.ids ? n.ids.includes(p.id) : p.genre === n.genre));
      if (hit.length) { for (const p of hit) move(p, n.up, n.text); return; }
    }
    // ふだん：いくつかの商品が、上か下に動く（高くなりすぎたものは下がりやすい）
    const cnt = K.pick(M.moves);
    const picked = pool.slice().sort(() => Math.random() - 0.5).slice(0, cnt);
    for (const p of picked) move(p, Math.random() < 0.5 - (K.mkt(p.id) - 1) * 1.6);
  };
  // ================================================================ 値段への客の反応
  // 推奨価格（相場）から、にっこりの幅が決まる。下は0.85倍、上は商品ごと（tol）。給料日のあと・雨の日の傘・おまじないで広がる
  K.refFor = p => K.refPrice(p) * (G.flags.discount && ['駄菓子', 'ドリンク', '日用品', '菓子'].includes(p.genre) && !p.gift ? 0.9 : 1);
  K.tol = p => {
    let t = p.tol != null ? p.tol : (D.PRICE_TOL[p.genre] != null ? D.PRICE_TOL[p.genre] : 0.15);
    if (G.date.d >= 25 && G.date.d <= 27) t += 0.05;          // 給料日のあと
    if (p.rain && G.weather === '雨') t += 0.5;                 // 急な雨の傘は高くても売れる
    t += K.spellSum('tol');
    return t;
  };
  K.band = p => { const r = K.refFor(p); return { lo: r * D.PRICE_LOW, hi: r * (1 + K.tol(p)), ref: r }; };
  // grin：安すぎてにやり（よく売れるけど儲けそこね）、smile：にっこり、mad：高すぎて怒る
  K.face = (p, v = K.priceOf(p.id)) => {
    if (v == null) return null;
    const b = K.band(p);
    return v < b.lo - 1e-9 ? 'grin' : v > b.hi + 1e-9 ? 'mad' : 'smile';
  };
  K.buyProb = (p, v = K.priceOf(p.id)) => {
    const f = K.face(p, v);
    if (f === 'grin') return D.PRICE_BUY.grin;
    if (f === 'smile') return D.PRICE_BUY.smile;
    const over = v / K.band(p).hi - 1;
    for (const [lim, pr] of D.PRICE_BUY.mad) if (over <= lim) return pr;
    return 0;
  };
  K.FACE_NAME = { smile: 'にっこり', grin: 'にやり（安すぎ）', mad: '怒り（高すぎ）' };
  // にっこりではない値段で並んでいる商品
  K.priceOff = () => D.PRODUCTS.filter(p => G.prices[p.id] != null && K.stockOf(p.id) > 0 && !G.clearance[p.id] && K.face(p) !== 'smile');

  // ================================================================ ♥（生気）のおまじないと、魔界の通販
  K.nextPlay = n => { let k = n + 1; while (!K.isPlayDay(K.dateOf(k))) k++; return k; };
  K.spellOn = id => G.spells && G.spells[id] != null && G.dayNo < G.spells[id];
  K.spellSum = key => (D.SPELLS || []).filter(s => s[key] && K.spellOn(s.id)).reduce((a, s) => a + s[key], 0);
  K.spellEnter = type => {
    let b = 0;
    for (const s of D.SPELLS) {
      if (!s.enter || !K.spellOn(s.id)) continue;
      b += s.enter[type] || 0;
      if (s.enter.adult && D.CUSTOMERS[type].adult) b += s.enter.adult;
    }
    return b;
  };
  K.castSpell = id => {
    const s = D.SPELLS.find(x => x.id === id);
    if (!s || K.spellOn(id) || G.seiki < s.cost) return false;
    G.seiki -= s.cost;
    G.spells[id] = K.nextPlay(G.dayNo);
    G.flags.spellCount = (G.flags.spellCount || 0) + 1;
    return true;
  };
  K.hasHeart = id => !!G.flags['h_' + id];
  K.buyHeart = id => {
    const h = D.HEART_SHOP.find(x => x.id === id);
    if (!h || K.hasHeart(id) || G.seiki < h.cost || (h.need && !K.hasHeart(h.need))) return false;
    G.seiki -= h.cost;
    G.flags['h_' + id] = true;
    if (D.ITEMS[id]) G.allowed[id] = true;
    return true;
  };
  K.gachaMax = () => (K.hasHeart('gacha3') ? 3 : K.hasHeart('gacha2') ? 2 : 1);
  // 置物の効き目（入りやすさ）
  K.decoEnter = type => {
    let b = 0;
    for (const it of G.items) {
      const e = D.ITEMS[it.type] && D.ITEMS[it.type].enter;
      if (!e) continue;
      b += e[type] || 0;
      if (e.adult && D.CUSTOMERS[type].adult) b += e.adult;
    }
    return b;
  };
  K.noTheft = () => G.items.some(i => i.type === 'bell') || K.spellOn('watch');
  K.priceOf = id => {
    const v = G.prices[id];
    if (v == null) return null;
    return G.clearance[id] ? Math.max(5, Math.round(v / 2 / 5) * 5) : v;
  };

  // ================================================================ お金と帳簿
  K.newMonth = () => ({
    y: G.date.y, m: G.date.m, cashStart: G.money,
    sales: 0, gacha: 0, cogs: 0, waste: 0, stolen: 0, cust: 0, buyers: 0, days: 0,
    exp: {}, pers: {}, flowIn: {}, flowOut: {}, stockBuy: 0, sold: {},
  });
  const add = (o, k, v) => { o[k] = (o[k] || 0) + v; };
  // 事業の経費（損益に入り、お金も出ていく）
  K.expense = (key, amount) => { G.money -= amount; add(G.month.exp, key, amount); };
  // 事業と関係ないお金（生活費など。損益には入らない）
  K.personal = (key, amount) => { G.money -= amount; add(G.month.pers, key, amount); };
  K.income = (key, amount) => { G.money += amount; add(G.month.flowIn, key, amount); };
  K.outflow = (key, amount) => { G.money -= amount; add(G.month.flowOut, key, amount); };
  K.buyStock = amount => { G.money -= amount; G.month.stockBuy += amount; };
  K.profit = (m = G.month) => m.sales + m.gacha - m.cogs - m.waste - (m.stolen || 0) - Object.values(m.exp).reduce((a, b) => a + b, 0);
  K.gross = (m = G.month) => m.sales + m.gacha - m.cogs;
  // 1か月にかかる支払いの見込み（警告に使う）
  K.monthlyBurn = () => {
    let s = Object.values(D.COSTS).reduce((a, c) => a + c.amount, 0) + Object.values(D.PERSONAL).reduce((a, c) => a + c.amount, 0);
    if (G.flags.kai) s += D.KAI_FEE;
    if (G.flags.fridge === 'lease') s += D.LEASE_FEE;
    if (G.staff) s += G.staff.wage * G.staff.hours * G.staff.days.filter(Boolean).length * 4.3;
    s += K.repayDue();
    return Math.round(s);
  };
  K.repayDue = () => G.loans.reduce((s, l) => s + K.loanPayment(l).total, 0);
  K.loanPayment = l => {
    if (l.left <= 0) return { principal: 0, interest: 0, total: 0 };
    if (l.annuity) {   // 元利均等（開業パックの分割払い）
      const r = l.rate / 12;
      const pay = Math.round(l.amount * r / (1 - Math.pow(1 + r, -l.months)));
      const interest = Math.round(l.left * r);
      const principal = Math.min(l.left, pay - interest);
      return { principal, interest, total: principal + interest };
    }
    const interest = Math.round(l.left * l.rate / 12);
    const elapsed = G.dayNo >= l.start ? Math.floor((G.dayNo - l.start) / 30.4) : 0;
    const principal = elapsed >= l.grace ? Math.min(l.left, Math.round(l.amount / (l.years * 12 - l.grace))) : 0;
    return { principal, interest, total: principal + interest };
  };
  K.debt = () => G.loans.reduce((s, l) => s + l.left, 0);
  K.danger = () => G.money < K.monthlyBurn() * 2;   // 手元が2か月分の支払いを切ったら警告

  // 仕入れの注文：現金問屋はすぐ届く。ネット卸は1割安く、2日後の朝に届く（開店前は開店に間に合う）
  K.costOf = (p, shop) => Math.round(p.cost * K.mkt(p.id) * (shop === 'net' ? D.NET_DISCOUNT : 1) * (G.flags.charmUntil > G.dayNo ? 0.9 : 1) * (G.flags.charmBad > G.dayNo ? 1.05 : 1));
  K.incoming = id => G.deliveries.reduce((s, d) => s + d.items.filter(x => x.id === id).reduce((a, x) => a + x.q, 0), 0);
  K.order = (order, shop) => {
    const refill = K.restockOrder();   // 補充と同じ数なら、目標の在庫は変えない
    let total = 0;
    const items = [];
    for (const [id, n] of Object.entries(order)) {
      if (!n) continue;
      const p = K.prod(id);
      const c = K.costOf(p, shop);
      total += n * p.unit * c;
      items.push({ id, q: n * p.unit, c });
    }
    if (!items.length) return 0;
    if (order.ks4) G.flags.goldBought = G.dayNo;
    K.buyStock(total);
    G.stockSpent += total;
    const now = shop !== 'net' || G.chapter <= 1;
    if (now) for (const x of items) K.addStock(x.id, x.q, x.c);
    else G.deliveries.push({ arrive: G.dayNo + D.NET_DAYS, items });
    for (const x of items) if (!refill[x.id] || order[x.id] > refill[x.id]) G.target[x.id] = Math.max(G.target[x.id] || 0, K.stockOf(x.id) + K.incoming(x.id));
    return total;
  };
  // 届いた荷物を棚に入れる
  K.receive = () => {
    const got = [];
    G.deliveries = G.deliveries.filter(d => {
      if (d.arrive > G.dayNo) return true;
      for (const x of d.items) { K.addStock(x.id, x.q, x.c); got.push(x); }
      return false;
    });
    return got;
  };
  // 補充：売れた分を目標の数まで戻す注文をつくる
  K.restockOrder = () => {
    const order = {};
    for (const p of D.PRODUCTS) {
      const t = G.target[p.id] || 0;
      if (!t || G.clearance[p.id] || !K.available(p) || !K.inSeason(p)) continue;
      const need = t - K.stockOf(p.id) - K.incoming(p.id);
      if (need >= p.unit * 0.3) order[p.id] = Math.max(1, Math.round(need / p.unit));
    }
    return order;
  };

  // 帳簿：月に1回はつける（つけないと確定申告ができない）。つけた日（G.flags.booked）からあとの営業日がたまっている分
  K.booked = () => (G.flags.booked == null ? -1 : G.flags.booked);
  K.pendingBooks = () => G.days.filter(d => !d.closed && d.dayNo > K.booked()).length;
  K.monthKey = (d = G.date) => `${d.y}-${d.m}`;
  K.booksDone = () => G.flags.booksMonth === K.monthKey();
  K.packLoan = () => ({ lender: 'pack', name: D.PACK.name, amount: D.PACK.amount, left: D.PACK.amount, rate: D.PACK.rate, months: D.PACK.months, annuity: true, start: 0, grace: 0, years: 3 });

  // ================================================================ ゲージ
  K.fx = fx => {
    for (const [k, v] of Object.entries(fx)) {
      if (k in G.gauges) G.gauges[k] = K.clamp(G.gauges[k] + v, 0, 100);
      if (k === 'rel') G.rel += v;
      if (k === 'rep') G.rep = K.clamp(G.rep + v, 1, 5);
      if (k === 'seiki') G.seiki = Math.max(0, G.seiki + v);
    }
  };

  // ================================================================ ミッション
  // 定義は K.MS[id] = { ch, kind, title, check, progress, until, onDone, onFail }
  K.MS = {};
  K.def = (id, o) => { K.MS[id] = { id, ...o }; };
  K.mStart = (id, data = {}) => {
    if (G.missions[id]) return;
    G.missions[id] = { s: 'active', t: G.dayNo, ...data };
    if (window.UI) UI.renderMissions();
  };
  K.mState = id => G.missions[id] && G.missions[id].s;
  K.mActive = id => K.mState(id) === 'active';
  K.mDone = id => K.mState(id) === 'done';
  K.mFinish = (id, ok = true) => {
    const m = G.missions[id];
    if (!m || m.s !== 'active') return;
    m.s = ok ? 'done' : 'failed';
    m.at = G.dayNo;
    const def = K.MS[id];
    const title = K.title(id);
    if (window.E) E.toast(ok ? `ミッション達成：${title}` : `ミッション失敗：${title}`, ok ? null : 'bad');
    if (ok && def && def.onDone) def.onDone();
    if (!ok && def && def.onFail) def.onFail();
    if (window.UI) UI.renderMissions();
  };
  K.title = id => { const d = K.MS[id]; if (!d) return id; return typeof d.title === 'function' ? d.title() : d.title; };
  // 自動で判定できるミッションを見る（期限切れも）
  K.checkMissions = () => {
    for (const [id, m] of Object.entries(G.missions)) {
      if (m.s !== 'active') continue;
      const d = K.MS[id];
      if (!d) continue;
      if (d.check && d.check()) K.mFinish(id, true);
      else if (d.until && d.until() ) K.mFinish(id, false);
    }
  };
  const ORDER = { 'メイン': 0, 'トラブル': 1, 'おねだり': 2, 'サブ': 3, '関係': 4, '実績': 5 };
  K.missionRows = () => {
    const rows = [];
    for (const [id, m] of Object.entries(G.missions)) {
      const d = K.MS[id];
      if (!d) continue;
      // 終わったものは、その日のうちだけ（メインと実績は出さない）
      const show = m.s === 'active' || (m.at === G.dayNo && d.kind !== 'メイン' && d.kind !== '実績');
      if (show) rows.push({ id, kind: d.kind, title: K.title(id), state: m.s, progress: d.progress ? d.progress() : '', hint: d.hint });
    }
    rows.sort((a, b) => (a.state !== 'active') - (b.state !== 'active') || ORDER[a.kind] - ORDER[b.kind]);
    return rows;
  };

  // ================================================================ イベント
  // K.ev(phase, id, cond, run)：phase は morning / day / close / night / monthEnd
  K.EV = [];
  K.ev = (phase, id, cond, run, opt = {}) => K.EV.push({ phase, id, cond, run, ...opt });
  K.runEvents = async phase => {
    for (const e of K.EV) {
      if (e.phase !== phase || G.done[e.id]) continue;
      let ok = false;
      try { ok = e.cond(); } catch (err) { console.error(e.id, err); }
      if (!ok) continue;
      G.done[e.id] = true;
      await e.run();
      if (e.repeat) delete G.done[e.id];
    }
  };
  // 営業中のイベント（会話が終わってから続ける）
  K.dayEvent = () => {
    if (G.flags.noEvents || G.flags.autoDay) return null;
    for (const e of K.EV) {
      if (e.phase !== 'day' || G.done[e.id]) continue;
      let ok = false;
      try { ok = e.cond(); } catch (err) { console.error(e.id, err); }
      if (ok) { G.done[e.id] = true; return e; }
    }
    return null;
  };

  // ================================================================ セーブ
  const KEY = 'keiei_save_v4';
  const SAVE_KEYS = ['v', 'storeName', 'money', 'rep', 'seiki', 'rel', 'date', 'dayNo', 'weather', 'items', 'inv', 'prices', 'target',
    'deliveries', 'clearance', 'stockSpent', 'nextId', 'unlock', 'allowed', 'flags', 'done', 'missions', 'study', 'forms', 'gauges',
    'settings', 'xiao', 'staff', 'loans', 'chapter', 'month', 'ledger', 'days', 'titles', 'slots', 'combos', 'autoLog', 'market', 'marketLog', 'spells'];
  K.save = () => {
    try {
      const o = {};
      for (const k of SAVE_KEYS) o[k] = G[k];
      localStorage.setItem(KEY, JSON.stringify(o));
      return true;
    } catch (e) { return false; }
  };
  K.saveInfo = () => {
    try {
      const s = localStorage.getItem(KEY);
      if (!s) return null;
      const o = JSON.parse(s);
      return { date: o.date, money: o.money, name: o.storeName };
    } catch (e) { return null; }
  };
  K.load = () => {
    try {
      const o = JSON.parse(localStorage.getItem(KEY));
      if (!o || o.v !== G.v) return false;
      for (const k of SAVE_KEYS) if (k in o) G[k] = o[k];
      return true;
    } catch (e) { return false; }
  };
  K.clearSave = () => { try { localStorage.removeItem(KEY); } catch (e) { /* なにもしない */ } };
  // バックアップ用に書き出す
  K.exportSave = () => {
    const o = {};
    for (const k of SAVE_KEYS) o[k] = G[k];
    return JSON.stringify(o);
  };
  return K;
})();
