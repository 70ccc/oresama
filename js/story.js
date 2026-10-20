'use strict';
// 進行：プロローグ → 第1章（開店準備） → 開店初日 → 毎日の営業ループ（朝・営業・閉店・月末・夜）
window.Game = (() => {
  const $ = E.$;
  const X = t => ['シャオ', t], H = t => ['肇', t];
  const Gm = {};
  const yen = K.yen;
  const waiters = [];
  const talkQueue = [];

  Gm.waitUntil = cond => new Promise(res => { waiters.push({ cond, res }); Gm.check(); });
  Gm.check = () => {
    K.checkMissions();
    for (let i = waiters.length - 1; i >= 0; i--) {
      if (waiters[i].cond()) { const w = waiters.splice(i, 1)[0]; w.res(); }
    }
    UI.renderMissions();
    UI.updateHud();
    // メニューの数字（推奨価格とずれている商品、売切の枠）が変わったら描き直す
    if (G.chapter >= 2) { const key = K.priceOff().length + '/' + Shelf.soldOutTotal(); if (key !== menuKey) { menuKey = key; UI.renderMenu(); } }
  };
  let menuKey = '';
  const idle = () => !Dlg.active && !G.openPanel && !G.place && !G.pick;
  // あとで流す会話（パネルを閉じたあとなど）
  Gm.queueTalk = lines => { talkQueue.push(lines); };
  const flushTalk = async () => { while (talkQueue.length) await Dlg.run(talkQueue.shift()); };

  // UIから呼ばれる
  Gm.itemStatus = k => Field.itemStatus(k);
  Gm.startPlace = k => Field.startPlace(k);
  Gm.startPick = () => Field.startPick();
  Gm.onMenu = id => {
    if (G.place || G.pick) Field.cancelPlace();
    if (G.pulse === id) G.pulse = null;
    if (id === 'place') UI.panelPlace();
    if (id === 'stock') UI.panelStock();
    if (id === 'display') Shelf.panel();
    if (id === 'price') UI.panelPrice();
    if (id === 'xiao') UI.panelXiao();
    if (id === 'data') UI.panelData();
    if (id === 'settings') UI.panelSettings();
    if (id === 'hire' && window.Panels) Panels.hire();
    if (id === 'loan' && window.Panels) Panels.loan();
    if (id === 'open') { G.flags.opened = true; UI.renderMenu(); Gm.check(); }
  };
  Gm.skipDay = () => { if (G.mode === 'day' && !Dlg.active && !G.openPanel && !G.flags.noSkip) { G.flags.skip = true; Gm.check(); } };
  Gm.charm = async () => { if (window.Events && Events.charm) await Events.charm(); };
  // 問屋さんと話す（交渉）：仲よくなると仕入れられる商品が増える
  Gm.negotiate = async () => {
    if (G.flags.talkedTonya === G.dayNo) return;
    if (G.flags.tonyaDay !== G.dayNo) UI.goTonya();
    G.flags.talkedTonya = G.dayNo;
    const n = G.flags.tonya || 0;
    const before = D.PRODUCTS.filter(p => K.available(p)).map(p => p.id);
    const lines = SCRIPT.TONYA[n] || K.pick(SCRIPT.TONYA_AGAIN);
    await Dlg.run([{ call: 'in', who: '問屋の営業', sprite: 'salary_f' }, ...lines, { call: 'out', who: '問屋の営業' }]);
    G.flags.tonya = n + 1;
    const now = D.PRODUCTS.filter(p => K.available(p) && !before.includes(p.id));
    if (now.length) E.toast(`仕入れられるようになった：${now.map(p => p.name).join('、')}`);
    Gm.check();
    UI.panelStock('cash');
  };

  // ================================================================ 第1章（開店準備）
  async function mission(id, opt = {}) {
    K.mStart(id);
    if (opt.onStart) opt.onStart();
    if (opt.start) await Dlg.run(opt.start);
    UI.renderMenu();
    await Gm.waitUntil(() => {
      if (talkQueue.length && idle()) { flushTalk().then(() => Gm.check()); return false; }
      return idle() && K.mDone(id);
    });
    if (opt.done) await Dlg.run(typeof opt.done === 'function' ? opt.done() : opt.done);
    if (G.date.d < 7) K.setDate({ ...G.date, d: G.date.d + 1 });
    Gm.check();
  }
  const startGenres = () => D.GENRES.filter(g => D.PRODUCTS.some(p => p.genre === g && K.available(p) && !p.unlock));
  const genresStocked = () => startGenres().filter(g => D.PRODUCTS.some(p => p.genre === g && K.stockOf(p.id) > 0)).length;
  const notShown = () => D.PRODUCTS.filter(p => K.stockOf(p.id) > 0 && Shelf.displayed(p.id) <= 0);
  const unsetCount = () => D.PRODUCTS.filter(p => K.stockOf(p.id) > 0 && G.prices[p.id] == null).length;
  K.def('1-02', { kind: 'メイン', title: 'レジを置く', hint: '下の「設置」→「レジ」→床をクリック。Rで向き、右クリックでやめる', check: () => Field.has('register') });
  K.def('1-03', { kind: 'メイン', title: '島棚を2つ置く', hint: '「設置」→「島棚」。入口とレジの前は空けておく', progress: () => `島棚 ${Field.count('shelf')} / 2`, check: () => Field.count('shelf') >= 2 });
  K.def('1-08', { kind: 'おねだり', title: () => G.flags.poster == null ? 'おれさまのポスターを貼れ' : G.flags.poster ? 'おれさまのポスターを貼れ（叶えた）' : 'おれさまのポスターを貼れ（断った）' });
  K.def('1-04', { kind: 'メイン', title: '冷蔵ケースを置く', hint: '「設置」→「冷蔵ケース」。いちばん奥の壁際にだけ置ける', check: () => Field.has('fridge') });
  K.def('1-05', { kind: 'メイン', title: '初回の仕入れ（4ジャンル）', hint: '「仕入れ」で、4つのジャンルから1つ以上ずつ。迷ったら「おまかせ」。予算は6万円',
    progress: () => `${genresStocked()} / ${startGenres().length}ジャンル　初回予算の残り ${yen(D.STOCK_BUDGET - G.stockSpent)}`, check: () => genresStocked() >= startGenres().length });
  K.def('1-12', { kind: 'メイン', title: '棚に商品を並べる', hint: '下の「陳列」で、棚の枠をクリックして商品を選ぶ。迷ったら「おまかせで並べる」',
    progress: () => `棚に出ていない商品：${notShown().length}品`, check: () => D.PRODUCTS.some(p => K.stockOf(p.id) > 0) && notShown().length === 0 });
  K.def('1-07', { kind: 'サブ', title: 'ガチャガチャを置く', hint: '「設置」→「ガチャガチャ」。1マスあれば置ける', check: () => Field.has('gacha') });
  K.def('1-06', { kind: 'メイン', title: '全商品に値段をつける', hint: '「価格」で値段をつける。迷ったら「未設定を推奨価格にする」', progress: () => `値段が未設定：${unsetCount()}品`, check: () => unsetCount() === 0 && genresStocked() > 0 });
  K.def('1-09', { kind: 'サブ', title: '開業届を出し直す（来年3/15まで）', progress: () => `勉強「開業届のこと」${'★'.repeat(G.study.kaigyo || 0)}${'☆'.repeat(3 - (G.study.kaigyo || 0))}　閉店後に家で` });
  K.def('1-10', { kind: 'サブ', title: () => `青色申告の申請を出す（${G.flags.kaigyoDate === '4/1' ? '5/31' : '6/7'}まで）`,
    progress: () => `勉強「青色申告のこと」${'★'.repeat(G.study.aoiro || 0)}${'☆'.repeat(3 - (G.study.aoiro || 0))}　閉店後に家で`,
    until: () => !G.forms.aoiro && G.dayNo > K.dayNoOf({ y: 2026, m: G.flags.kaigyoDate === '4/1' ? 5 : 6, d: G.flags.kaigyoDate === '4/1' ? 31 : 7 }),
    onFail: () => { G.flags.aoiroLate = true; } });
  K.def('1-11', { kind: 'メイン', title: '開店する', hint: '準備ができたら「開店」を押す。設置や値段はあとでも変えられる', check: () => G.flags.opened });
  K.def('bk', { kind: 'サブ', title: () => `${G.date.m}月の帳簿をつける（${G.date.m}/${K.daysInMonth()}まで）`,
    progress: () => `夜の行動「帳簿をつける」を月に1回。${G.flags.taxVisits ? 'つけないと、こんどは許してもらえない' : 'つけないまま月末になると、税務署の人が来る'}`,
    check: () => K.booksDone() });
  K.def('day1', { kind: 'メイン', title: '開店初日を20時まで営業する', progress: () => `${UI.clock(G.time)}　売上 ${yen(G.stats ? G.stats.sales : 0)}` });

  function priceTalk() {
    const dg = D.PRODUCTS.filter(p => p.genre === '駄菓子' && K.stockOf(p.id) > 0).sort((a, b) => a.price - b.price)[0];
    if (!dg) return SCRIPT.C1_06_DONE;
    const c = K.avgCost(dg.id), v = G.prices[dg.id];
    const d = v - c;
    if (d <= 0) return [H(`……${dg.name}、仕入れ値より安くしてるじゃん`), X('安いほうが売れるだろ！'), H('売れるたびに損するんだよ')];
    return [H(`${c}円で仕入れて${v}円で売る。儲けは${d}円`), X(`${d}円！？ ${d}円で何が買えるんだ！`), H('何も買えない'), X('人間界の商売、どうかしてるぞ！'), H('……それはそう')];
  }

  async function chapter1() {
    G.chapter = 1;
    G.mode = 'play';
    G.scene = 'store';
    K.setDate(D.START_DATE);
    G.month = K.newMonth();
    setupFounding();
    await Dlg.run(SCRIPT.C1_01);
    await mission('1-02', { onStart: () => { G.unlock.place = true; G.allowed.register = true; G.pulse = 'place'; }, start: SCRIPT.C1_02, done: SCRIPT.C1_02_DONE });
    await mission('1-03', { onStart: () => { G.allowed.shelf = true; G.allowed.plant = true; G.pulse = 'place'; }, start: SCRIPT.C1_03, done: SCRIPT.C1_03_DONE });
    K.mStart('1-08');
    await Dlg.run(SCRIPT.C1_08);
    if (G.flags.poster) { K.expense('equip', 5000); K.fx({ rep: 0.3, mood: 20 }); E.toast('ポスターを貼った　−¥5,000'); } else K.fx({ mood: -20 });
    K.mFinish('1-08');
    await mission('1-04', { onStart: () => { G.allowed.fridge = true; G.pulse = 'place'; }, start: SCRIPT.C1_04,
      done: () => [X('プリンは入れていいのか？'), H('だめ'), X('なんでだ！'), H('売り物じゃないからだよ')] });
    await mission('1-05', { onStart: () => { G.unlock.stock = true; G.pulse = 'stock'; }, start: SCRIPT.C1_05,
      done: () => K.stockOf('ks4') > 0
        ? [X('金色の箱、ちゃんと買ったな！'), H('……6個だけな。売れなかったら知らんぞ')]
        : [X('金色の箱がないぞ！'), H('買ってない。予算考えろ'), X('けち！ けちけちけち！')] });
    await mission('1-12', { onStart: () => { G.unlock.display = true; G.pulse = 'display'; }, start: SCRIPT.C1_12, done: SCRIPT.C1_12_DONE });
    await Dlg.run(SCRIPT.C1_07);
    if (G.flags.gacha === 'vendor' || G.flags.gacha === 'own') { G.allowed.gacha = true; K.mStart('1-07'); }
    Gm.check();
    await mission('1-06', { onStart: () => { G.unlock.price = true; G.pulse = 'price'; }, start: SCRIPT.C1_06, done: priceTalk });
    await Dlg.run(SCRIPT.C1_09);
    K.mStart('1-10');
    K.mStart('1-09');
    K.setDate({ y: 2026, m: 4, d: 7 });
    await Dlg.run(SCRIPT.C1_11_READY);
    G.unlock.open = true;
    G.pulse = 'open';
    UI.renderMenu();
    await mission('1-11');
    G.flags.opened = false;
    await openDay();
  }

  // 開業パックの分割払いと、帳簿のはじまり
  function setupFounding() {
    if (!G.loans.some(l => l.lender === 'pack')) G.loans.push(K.packLoan());
    G.flags.packLeft = { ...D.PACK.items };
    G.flags.booked = K.dayNoOf(D.OPEN_DATE) - 1;
    G.flags.u_books = true;
    G.flags.filedByXiao = true;
  }

  // ================================================================ 開店初日（4月8日）
  async function openDay() {
    K.setDate(D.OPEN_DATE);
    G.chapter = 2;
    G.unlock.open = false;
    Object.assign(G.gauges, { hp: 70, stress: 45, hunger: 55, mood: K.clamp(G.gauges.mood, 45, 80) });
    G.weather = '晴';
    Sim.resetDay();
    G.flags.noSkip = true;
    G.today = { enter: () => (G.flags.kidsCame ? 1 : 0) };
    UI.hint(null);
    await Dlg.run(SCRIPT.C1_11);
    G.mode = 'day';
    K.mStart('day1');
    UI.show('timebar', true);
    UI.renderTimebar();
    UI.renderMenu();
    // 初日の決まった流れ：11時半まで誰も来ない、15時に小学生
    Sim.beforeSpawn = () => {
      if (!G.flags.noOne && G.time >= 690) { G.flags.noOne = true; if (G.stats.entered === 0) { G.pendingTalk = SCRIPT.DAY_NOONE; return true; } }
      if (!G.flags.kidsCame && G.time >= 900) {
        G.flags.kidsCame = true;
        G.pendingTalk = SCRIPT.DAY_KIDS;
        Sim.spawn('kid', true, { forced: true, first: true });
        Sim.spawn('kid', true, { forced: true, offset: 14 });
        Sim.spawn('kid', true, { forced: true, offset: 28 });
        return true;
      }
      return false;
    };
    Sim.onRegister = c => {
      if (G.flags.firstTalk) return;
      G.flags.firstTalk = true;
      G.talkTarget = c;
      G.pendingTalk = kidTalk(c);
    };
    Sim.onPaid = (c, total) => {
      if (G.flags.afterSale) return;
      G.flags.afterSale = true;
      G.pendingTalk = afterSaleTalk(c, total);
    };
    G.unlock.display = true;
    Gm.check();
    await Gm.waitUntil(() => G.time >= G.settings.close && !Dlg.active);
    Sim.beforeSpawn = null; Sim.onRegister = null; Sim.onPaid = null;
    G.flags.noSkip = false;
    K.mFinish('day1');
    K.mStart('2-01');
    if (G.flags.afterSale) K.mFinish('2-01');
    await closeDay(true);
    K.mStart('bk');
    await Night.run();
    advanceDay();
    if (await autoDays()) return;
    await mainLoop();
  }
  function kidTalk(c) {
    const it = c.cart[0];
    const r = it.price / K.refPrice(it.p);
    const react = r <= 1.0 ? (it.qty >= 3 ? 'やっす！ 3つちょうだい！' : 'じゃあこれ！') : r <= 1.2 ? 'ふーん……じゃあ1個' : 'たっか！ ……でも1個だけ';
    const who = D.CUSTOMERS[c.type].label;
    return [[who, 'ここ新しいの？'], H('今日から'), [who, 'これいくら'], H(`${it.price}円`), [who, react],
      { guide: '客の頭の上の吹き出しを見よう。♪は満足、汗は「高い」、？は「欲しいものがない」' }];
  }
  function afterSaleTalk(c, total) {
    const it = c.cart[0];
    return [X(`${total}円……`), H('記念すべき最初の売上な'), X(`……でも${c.kid ? 'あいつら' : 'あの客'}、嬉しそうだったな`),
      H(`${it.price}円の${it.p.genre === '駄菓子' || it.p.genre === '菓子' ? '菓子' : 'もん'}でな`)];
  }

  // ================================================================ 毎日の営業
  const dailyFixed = () => Math.round(Object.values(D.COSTS).reduce((a, c) => a + c.amount, 0) / 26);
  async function morning(resume) {
    G.mode = 'morning';
    G.scene = 'store';
    G.speed = G.flags.lastSpeed || 1;
    UI.show('hud', true); UI.show('missions', true); UI.show('menu', true); UI.show('timebar', false);
    UI.updateHud();
    UI.renderMenu();
    if (!resume) {
      const got = K.receive();
      if (got.length) E.toast(`ネット卸の荷物が届いた（${got.length}品）。裏の在庫に入った`);
      const waste = K.expire();
      if (waste.length) E.toast(`賞味期限切れで捨てた：${waste.map(w => K.prod(w.id).name).join('、')}（−${yen(waste.reduce((s, w) => s + w.cost, 0))}）`, 'bad');
      Shelf.clamp();
      for (const id of Object.keys(G.clearance)) if (G.clearance[id] && K.stockOf(id) <= 0) { delete G.clearance[id]; delete G.target[id]; G.flags.clearedOnce = true; }
      if (G.autoLog.length) await autoSummary();
      marketNews();
      const wd = K.isPublicHoliday() ? 0 : K.wd();
      if (D.WEEKDAY_NOTE[wd].includes('：')) E.toast((K.isPublicHoliday() ? '祝日。' : '') + D.WEEKDAY_NOTE[wd]);
      await K.runEvents('morning');
      G.unlock.open = true;
      K.save();
    }
    Gm.check();
    await flushTalk();
  }
  // 前の遊ぶ日から動いた仕入れ値を知らせる（扱っている商品だけ）
  function marketNews() {
    const seen = G.flags.marketSeen == null ? -1 : G.flags.marketSeen;
    G.flags.marketSeen = G.dayNo;
    if (G.chapter < 2) return;
    const mv = G.marketLog.filter(x => x.day > seen && K.stockOf(x.id) + K.incoming(x.id) > 0);
    for (const t of [...new Set(mv.filter(x => x.news).map(x => x.news))]) E.toast('ニュース：' + t);
    const last = {};
    for (const x of mv) last[x.id] = x;
    const ids = Object.keys(last).filter(id => last[id].from !== last[id].to);
    const up = ids.filter(id => last[id].up).length;
    if (ids.length) E.toast(`仕入れ値が動いた（上がった${up}品・下がった${ids.length - up}品）。「価格」で客の反応を見よう`);
  }
  async function waitOpen() {
    G.flags.opened = false;
    G.unlock.open = true;
    UI.renderMenu();
    await Gm.waitUntil(() => {
      if (talkQueue.length && idle()) { flushTalk().then(() => Gm.check()); return false; }
      return idle() && G.flags.opened;
    });
    G.flags.opened = false;
  }
  async function runDay() {
    Sim.resetDay();
    if (G.flags.tonyaDay === G.dayNo) G.time = D.LATE_OPEN;   // 朝に問屋へ行った日は11時から
    G.today = window.Events && Events.today ? Events.today() : {};
    G.settings._close = G.settings.close;
    if (G.today.close) G.settings.close = G.today.close;
    G.mode = 'day';
    UI.renderMenu();
    UI.show('timebar', true);
    UI.renderTimebar();
    await K.runEvents('open');
    await Gm.waitUntil(() => {
      if (G.flags.skip && idle()) {
        G.flags.skip = false;
        G.flags.skipping = true;
        Sim.skipToClose().then(() => { G.flags.skipping = false; Gm.check(); });
        return false;
      }
      return G.time >= G.settings.close && !Dlg.active && !G.flags.skipping;
    });
    G.flags.lastSpeed = G.speed;
  }
  const restoreClose = () => { if (G.settings._close) { G.settings.close = G.settings._close; delete G.settings._close; } };
  function dayAccounting(auto = false) {
    const s = G.stats;
    const gross = s.sales + s.gachaRev - s.cogs;
    // 肇とシャオの1日の疲れ（自動の日は、肇がぼんやり回すぶん少しだけ軽い）
    const late = G.settings.close > 1200;
    const staff = Field.staffOn();
    const HP = D.HP_DAY;
    if (Field.hajimeRest()) K.fx({ hp: 15, stress: -10, hunger: 8 });
    else if (auto) K.fx({ hp: -(late ? HP.autoLate : HP.auto) * (staff ? 0.5 : 1), stress: 4, hunger: 6 });
    else K.fx({ hp: -(late ? HP.playLate : HP.play) * (staff ? 0.5 : 1), stress: 6 + (s.sales < dailyFixed() * 0.5 ? 4 : 0), hunger: 6 });
    // 評判：満足して帰った人が多いと上がる
    // 評判：買って帰る人が多いと上がる。上にいくほど上がりにくい
    if (s.entered > 5) {
      const up = (s.buyers / s.entered - 0.75) * 0.045;
      K.fx({ rep: (up > 0 ? up * (5.2 - G.rep) / 4 : up) - s.sweat * 0.002 - s.q * 0.0015 - s.miss * 0.0006 - s.drained * 0.002 });
    }
    if (G.gauges.stress > 85) K.fx({ rep: -0.012 });   // イライラして接客が雑になる
    G.month.days++;
    G.days.push({ dayNo: G.dayNo, m: G.date.m, d: G.date.d, sales: s.sales + s.gachaRev, cogs: s.cogs, cust: s.entered, buyers: s.buyers, sold: { ...s.sold }, miss: s.miss, auto });
    if (G.days.length > 120) G.days.shift();
    G.flags.lastDayProfit = gross - dailyFixed();
    if (staff) G.month.wage = (G.month.wage || 0) + G.staff.wage * G.staff.hours;
    return gross;
  }
  async function closeDay(first = false) {
    Sim.finishInside();
    G.mode = 'close';
    G.speed = 0;
    UI.show('timebar', false);
    const gross = dayAccounting();
    UI.updateHud();
    await dayResult(first, gross);
    await K.runEvents('close');
    restoreClose();
    Gm.check();
  }
  const missText = s => Object.entries(s.missed).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, n]) => `${K.prod(id).name}×${n}${s.missAt[id] != null ? `（${UI.clock(s.missAt[id])}〜）` : ''}`).join('　');
  async function dayResult(first, gross) {
    const s = G.stats;
    const fixed = dailyFixed();
    const row = UI.row;
    let html = '<div style="padding:10px 30px">';
    html += row('店の前を通った人', s.passers + '人', 'sub') + row('店に入った人', s.entered + '人') + row('買った人', `${s.buyers}人${s.buyers ? `（客単価 ${yen((s.sales) / s.buyers)}）` : ''}`);
    html += row('売上（レジのお金）', yen(s.sales + s.gachaRev), 'money');
    if (s.gacha) html += row('うちガチャ（店の取り分）', `${s.gacha}回　${yen(s.gachaRev)}`, '', true);
    html += row('家賃・光熱費など（1日あたり）', yen(fixed), 'sub');
    html += row('仕入れ値を引いた儲け（粗利）', yen(gross), gross >= fixed ? 'good' : 'bad');
    if (s.miss) html += row('売切で買えなかった', `${s.miss}回　${missText(s)}`, 'bad');
    if (s.sweat) html += row('高すぎて、怒って帰った', `${s.sweat}人`, 'bad');
    if (s.q > s.miss) html += row('欲しいものがなくて帰った', `${s.q - s.miss}人`, 'bad');
    if (s.grin) html += row('安すぎて、にやり（まとめ買い）', `${s.grin}個`, 'ask');
    if (s.stolen) html += row('万引き（気づかなかった）', `${s.stolen}個　−${yen(s.stolenYen)}`, 'bad');
    if (s.drained) html += row('ふらふらで帰った（シャオが吸いすぎ）', s.drained + '人', 'bad');
    if (s.noReg) html += row('レジに誰もいなくて帰った', s.noReg + '人', 'bad');
    if (s.impulse) html += row('レジ横のついで買い', s.impulse + '個', 'good');
    const out = Shelf.soldOutNames();
    if (out.length) html += row('いま売切の棚', out.join('　'), 'bad');
    html += row('生気（シャオが吸った分）', '♥' + Math.floor(G.seiki), 'ask');
    html += '</div>';
    await UI.panelResult(html, first ? '次へ' : '夜へ', `本日の結果　${K.fmt()}`);
    if (first) {
      const sales = s.sales + s.gachaRev;
      const money = gross < fixed
        ? [H(`家賃と電気代を1日に割ると${fixed.toLocaleString()}円。仕入れ値を引いた儲けは${Math.round(gross).toLocaleString()}円`), X('……足りないのか'), H('ぜんぜん足りない')]
        : [H('……家賃分は儲かった。初日にしては上出来だな')];
      await Dlg.run([X('腹が減った！'), H('……足が棒だ……'), ...money, X('おれさまが吸った分は？'), H('生気で家賃は払えないんだよ'),
        X('でもちょっと楽しかったな！ 明日はもっと吸うぞ！'), H('売るんだよ。吸うんじゃなくて')]);
    }
  }
  async function holiday() {
    G.mode = 'close';
    E.toast(K.isHoliday() ? '今日は定休日' : '今日は店を閉めた');
    K.fx({ hp: 20, stress: -15, mood: 5 });
    G.days.push({ dayNo: G.dayNo, m: G.date.m, d: G.date.d, sales: 0, cogs: 0, cust: 0, buyers: 0, sold: {}, closed: true });
    await K.runEvents('holiday');
  }

  // ================================================================ 月末
  function monthAccounting() {
    const m = G.month;
    const mo = G.date.m;
    for (const [k, c] of Object.entries(D.COSTS)) K.expense(k, k === 'utility' && [7, 8, 9].includes(mo) ? c.summer : c.amount);
    if (G.settings.close > 1200) K.expense('utility', D.LATE_UTILITY);
    if (G.flags.kai) K.expense('kai', D.KAI_FEE);
    if (G.flags.fridge === 'lease') K.expense('lease', D.LEASE_FEE);
    if (G.staff && G.month.wage) K.expense('wage', Math.round(G.month.wage));
    for (const l of G.loans) {
      const pmt = K.loanPayment(l);
      if (pmt.interest) K.expense('interest', pmt.interest);
      if (pmt.principal) { K.outflow('repay', pmt.principal); l.left -= pmt.principal; }
    }
    for (const [k, c] of Object.entries(D.PERSONAL)) {
      if (c.from && K.cmp(G.date, { ...c.from, d: 1 }) < 0) continue;
      let amt = c.amount;
      if (k === 'kokuho' && mo === 6 && G.date.y === 2026) amt *= 2;   // 6月は5月分もまとめて来る
      K.personal(k, amt);
    }
    m.cashEnd = G.money;
    G.ledger.push(JSON.parse(JSON.stringify(m)));
    return m;
  }
  // 帳簿を1回もつけないまま月末になると、税務署の人が来る（1回目はシャオの顔で許してもらえる）
  async function taxVisit() {
    const n = G.flags.taxVisits || 0;
    G.flags.taxVisits = n + 1;
    G.scene = 'store';
    G.mode = 'close';
    UI.show('menu', false); UI.show('timebar', false);
    UI.updateHud();
    await Dlg.run(n === 0 ? SCRIPT.TAX_VISIT_1(K.fmt()) : SCRIPT.TAX_VISIT_2(K.fmt(), n));
    if (n === 0) K.fx({ stress: 4 });
    else { K.fx({ stress: 25, mood: -10, hp: -6, rep: -0.1 }); G.flags.aoiroWarn = (G.flags.aoiroWarn || 0) + 1; }
    if (K.mActive('bk')) K.mFinish('bk', false);
    UI.updateHud();
  }
  async function monthEnd() {
    if (G.flags.u_books && G.chapter >= 2 && G.days.some(d => !d.closed && d.m === G.date.m) && !K.booksDone()) await taxVisit();
    const m = monthAccounting();
    const mo = m.m;
    const html = `<div class="twocol"><div>${UI.plHtml(m)}</div><div>${UI.cfHtml(m)}</div></div>`;
    await UI.panelResult(html, '次へ', `${mo}月の決算`, { cls: 'wide', id: 'month' });
    await K.runEvents('monthEnd');
    Gm.check();
  }

  function advanceDay() {
    const prevM = G.date.m;
    K.setDate(K.dateOf(G.dayNo + 1));
    if (G.date.m !== prevM) {
      G.month = K.newMonth();
      if (G.missions.bk) { delete G.missions.bk; K.mStart('bk'); }
    }
    if (G.chapter >= 2) K.marketTick();
    const rr = D.RAIN_RATE[G.date.m];
    const x = Math.random();
    G.weather = x < rr ? '雨' : x < rr + 0.3 ? '曇' : '晴';
    G.flags.xiaoAway = false;
    G.flags.xiaoQuit = false;
    for (const s of D.LAST_SALARY) if (K.cmp(G.date, s) === 0) { K.income('salary', s.amount); E.toast(`前の会社の最後の給料が入った　＋${yen(s.amount)}`); }
    if (G.xiao === 'register' && (G.gauges.mood < 20 || G.gauges.hunger > 90)) G.xiao = 'free';
  }

  // 試作版の終わり（4月末）
  async function protoEnd() {
    if (K.cmp(G.date, D.PROTO_END) < 0) return false;
    const m = G.ledger[G.ledger.length - 1];
    const row = UI.row;
    let html = '<div style="padding:16px 40px">';
    if (m) html += row('4月の売上', yen(m.sales + m.gacha), 'money') + row('4月の事業の損益', yen(K.profit(m)), K.profit(m) >= 0 ? 'good' : 'bad') + row('手元のお金', yen(G.money));
    html += row('見つけたコンボ', `${Object.keys(G.combos).length} / ${D.COMBOS.length}`) + row('仕入れられる商品', `${D.PRODUCTS.filter(p => K.available(p) && !p.unlock).length}品`);
    html += row('評判', '★'.repeat(Math.floor(G.rep)) + '☆'.repeat(5 - Math.floor(G.rep))) + row('生気', '♥' + Math.floor(G.seiki), 'ask');
    html += '</div><div style="text-align:center;padding:16px;font-size:30px">試作版は4月末まで。5月からは作り直し中</div>';
    await UI.panelResult(html, 'タイトルへ', '4月おわり');
    location.reload();
    return true;
  }
  // 自動で営業する日（火・木・土）：結果だけ出す。朝に1回だけ品出しされる
  async function autoDay() {
    G.mode = 'close';
    G.scene = 'store';
    K.receive();
    K.expire();
    Shelf.clamp();
    const entry = { d: { ...G.date }, closed: false };
    G.today = window.Events && Events.today ? Events.today() : {};
    if (K.isHoliday() || G.today.closed) {
      entry.closed = true;
      K.fx({ hp: 20, stress: -15, mood: 5 });
      G.days.push({ dayNo: G.dayNo, m: G.date.m, d: G.date.d, sales: 0, cogs: 0, cust: 0, buyers: 0, sold: {}, closed: true });
    } else {
      Shelf.fillAll();
      Sim.resetDay();
      const bak = G.settings.close;
      if (G.today.close) G.settings.close = G.today.close;
      G.flags.autoDay = true;
      await Sim.skipToClose();
      dayAccounting(true);
      G.flags.autoDay = false;
      G.settings.close = bak;
      const s = G.stats;
      Object.assign(entry, { sales: s.sales + s.gachaRev, cust: s.entered, miss: s.miss, missText: missText(s), drained: s.drained });
    }
    G.autoLog.push(entry);
  }
  function autoNight() {
    K.fx(D.NIGHT_BASE);
    if (G.xiao === 'register' && (G.gauges.mood < 20 || G.gauges.hunger > 90)) G.xiao = 'free';
  }
  async function autoDays() {
    while (!K.isPlayDay()) {
      await autoDay();
      if (K.isLastDay()) { await monthEnd(); if (await protoEnd()) return true; }
      autoNight();
      advanceDay();
      Gm.check();
    }
    return false;
  }
  async function autoSummary() {
    const rows = G.autoLog.map(e => `<tr><td>${K.fmt(e.d)}</td>${e.closed ? '<td colspan="3" class="sub">休み</td>' : `<td class="num">${yen(e.sales)}</td><td class="num">${e.cust}人</td><td class="${e.miss ? 'bad' : 'sub'}">${e.miss ? `${e.miss}回　${e.missText}` : 'なし'}</td>`}</tr>`).join('');
    const html = `<div class="xrow sub">この日は自動で営業した（品出しも自動）。裏の在庫がなくなると売切になるので、多めに仕入れておこう</div>
      <table><tr><th>日</th><th class="num">売上</th><th class="num">入った人</th><th>売切で買えなかった</th></tr>${rows}</table>`;
    G.autoLog = [];
    await UI.panelResult(html, '次へ', 'お店のようす（自動で営業した日）', { cls: 'wide' });
  }

  async function mainLoop(resume = false) {
    for (;;) {
      if (!K.isPlayDay()) { if (await autoDays()) return; }
      await morning(resume);
      if (G.flags.ended) return;
      if (G.money < 0 && window.Events && Events.broke) { const go = await Events.broke(); if (go) return; }
      resume = false;
      G.today = window.Events && Events.today ? Events.today() : {};
      if (K.isHoliday() || G.today.closed) await holiday();
      else {
        await waitOpen();
        await runDay();
        await closeDay();
      }
      if (K.isLastDay()) { await monthEnd(); if (await protoEnd()) return; }
      if (K.cmp(G.date, D.END_DATE) >= 0 && window.Events && Events.gate) { await Events.gate(); return; }
      await Night.run();
      advanceDay();
      if (await autoDays()) return;
    }
  }

  // ================================================================ 毎フレーム
  let last = performance.now();
  let hintKey = '', missionTimer = 0;
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (G.mode === 'day' && !G.flags.skipping) {
      Sim.tick(dt);
      missionTimer += dt;
      if (missionTimer > 0.3) { missionTimer = 0; UI.updateHud(); UI.renderMissions(); Gm.check(); }
    }
    Field.draw();
    if (E.touch) Field.placebar();
    const act = K.missionRows().find(m => m.state === 'active' && m.hint);
    const want = (!Dlg.active && !G.openPanel && act && G.mode === 'play') ? (G.place ? 'クリックで置く／Rで向きを変える／右クリックかEscでやめる' : act.hint)
      : (!Dlg.active && !G.openPanel && G.mode === 'morning' && G.chapter === 2 && G.dayNo < 12) ? '準備ができたら、下の「開店」' : '';
    if (want !== hintKey) { hintKey = want; UI.hint(want); }
    requestAnimationFrame(loop);
  }
  addEventListener('keydown', ev => {
    if (Dlg.active || G.mode !== 'day' || G.openPanel) return;
    if (ev.key === ' ') { ev.preventDefault(); G.speed = G.speed ? 0 : 1; UI.renderTimebar(); }
    if (['1', '2', '3'].includes(ev.key)) { G.speed = Number(ev.key); UI.renderTimebar(); }
  });

  // ================================================================ 台本からの呼び出し
  Dlg.onCall = async (name, st) => {
    if (name === 'showGauges') { UI.renderGauges(); UI.show('gauges', true); }
    if (name === 'hideGauges') UI.show('gauges', false);
    // 口座はふだんの資金と同じ左上に出す。そのあいだ、場所の表示はかくす
    if (name === 'showAccount') { $('caption').style.visibility = 'hidden'; await UI.account(3200000, 2800000); }
    if (name === 'hideAccount') { UI.show('account', false); $('caption').style.visibility = ''; }
    if (name === 'showAccountPack') { $('caption').style.visibility = 'hidden'; await UI.account(1467000, 987000); }
    if (name === 'showHud') { UI.updateHud(); UI.show('hud', true); }
    if (name === 'showMissions') { UI.show('missions', true); UI.renderMissions(); }
    if (name === 'showMenu') { UI.show('menu', true); UI.renderMenu(); }
    if (name === 'fumiIn') Gm.visitor('フミ', 'fumi');
    if (name === 'fumiOut') Gm.leave('フミ');
    if (name === 'in') Gm.visitor(st.who, st.sprite);
    if (name === 'out') Gm.leave(st.who);
  };
  Gm.visitor = (name, sprite, x = D.DOOR.x + 2, y = 204) => {
    G.visitors = (G.visitors || []).filter(v => v.name !== name);
    G.visitors.push({ name, sprite, x: x + (G.visitors.length ? 14 : 0), y });
  };
  Gm.leave = name => { G.visitors = (G.visitors || []).filter(v => v.name !== name); };
  Dlg.onSet = set => Object.assign(G.flags, set);
  Dlg.onFx = fx => { K.fx(fx); UI.renderGauges(); };

  // ================================================================ 開始
  async function prologue() {
    G.mode = 'story';
    for (const k of ['P01', 'P02', 'P03', 'P04', 'P05']) await Dlg.run(SCRIPT[k]);
    E.card(null);
    await chapter1();
  }
  async function resume() {
    if (!K.load()) { E.toast('セーブデータを読み込めなかった', 'bad'); return; }
    G.scene = 'store';
    G.mode = 'morning';
    G.customers = [];
    G.visitors = [];
    UI.show('hud', true); UI.show('missions', true); UI.show('menu', true);
    E.toast(`${K.fmt()}の朝から再開`);
    await mainLoop(true);
  }
  function hideTitle() { $('title').classList.add('hidden'); }
  // https で開いたときは、オフラインでも遊べるようにファイルを保存する（sw.js）
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => { /* 保存できなくても遊べる */ });
  Gm.init = async () => {
    try { await E.loadAll(); } catch (e) {
      $('loading').textContent = e.message + '（index.html と同じフォルダに assets があるか確認してね）';
      return;
    }
    const q = new URLSearchParams(location.search);
    // ブラウザは最初のクリックまで音を出せないので、クリックしてからタイトルを出す
    if (!q.get('start')) {
      $('loading').innerHTML = `<div style="text-align:center"><div class="blink">▶ ${E.touch ? 'タップ' : 'クリック'}してはじめる</div><div style="font-size:26px;margin-top:16px">BGMが鳴ります（右上の ♪ で音量）</div></div>`;
      $('loading').style.cursor = 'pointer';
      await new Promise(res => { const go = () => { removeEventListener('keydown', go); $('loading').removeEventListener('click', go); res(); }; $('loading').addEventListener('click', go); addEventListener('keydown', go); });
    }
    $('loading').classList.add('hidden');
    requestAnimationFrame(loop);
    const standalone = matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone;
    if (E.touch && !standalone && location.protocol.startsWith('http')) $('a2hs').classList.remove('hidden');
    const info = K.saveInfo();
    const cont = $('btn-continue');
    if (info) { cont.classList.remove('hidden'); cont.textContent = `つづきから（${info.date.m}月${info.date.d}日・${info.name}）`; }
    cont.addEventListener('click', ev => { ev.stopPropagation(); hideTitle(); resume(); });
    $('btn-prologue').addEventListener('click', ev => { ev.stopPropagation(); hideTitle(); prologue(); });
    $('btn-ch1').addEventListener('click', ev => { ev.stopPropagation(); hideTitle(); chapter1(); });
    if (q.get('start') === 'ch1') { hideTitle(); chapter1(); }
    if (q.get('start') === 'prologue') { hideTitle(); prologue(); }
    if (q.get('start') === 'continue' && info) { hideTitle(); resume(); }
    if (q.get('start') === 'quick') Gm._quick();
  };
  // ================================================================ 動作確認用：画面を出さずに日を進める（数字の調整に使う）
  Gm._auto = async (days, policy = {}) => {
    G.flags.noEvents = true;
    const log = [];
    for (let i = 0; i < days; i++) {
      K.receive(); K.expire();
      if (policy.restock !== false) {
        const o = K.restockOrder();
        if (Object.keys(o).length) K.order(o, policy.net ? 'net' : 'cash');
      }
      if (policy.before) policy.before(i);
      if (policy.arrange) policy.arrange(i);
      Shelf.clamp();
      if (K.isHoliday()) { K.fx({ hp: 20, stress: -15 }); G.days.push({ dayNo: G.dayNo, m: G.date.m, d: G.date.d, sales: 0, cogs: 0, cust: 0, buyers: 0, sold: {}, closed: true }); }
      else {
        Sim.resetDay();
        G.today = Events.today ? Events.today() : {};
        const bak = G.settings.close;
        if (G.today.close) G.settings.close = G.today.close;
        G.mode = 'close';
        Shelf.fillAll();
        const play = K.isPlayDay();
        // 遊ぶ日は、お昼すぎにもう一度品出しする（画面で遊ぶときのかわり）
        if (play && policy.midFill !== false) { await Sim.skipToClose(900); Shelf.fillAll(); }
        G.flags.autoDay = !play;
        await Sim.skipToClose();
        G.flags.autoDay = false;
        dayAccounting(!play);
        G.settings.close = bak;
        if (policy.books !== false && G.date.d >= 20) { G.flags.booked = G.dayNo; G.flags.booksMonth = K.monthKey(); }
      }
      if (policy.prices !== false) for (const p of D.PRODUCTS) if (G.prices[p.id] != null) G.prices[p.id] = policy.topPrice ? Gm.topPrice(p) : K.refPrice(p);
      if (K.isLastDay()) { const m = monthAccounting(); log.push({ m: m.m, sales: m.sales + m.gacha, gross: K.gross(m), profit: K.profit(m), cash: m.cashEnd, cust: m.cust, rep: G.rep, conv: m.buyers / Math.max(1, m.cust), hp: G.gauges.hp, stress: G.gauges.stress }); }
      // 夜：体力が少なければ寝る、空腹ならエッチ、それ以外は話す
      // 夜：おすすめと同じ順で選ぶ
      const g = G.gauges, F = D.NIGHT_FX;
      if (K.isPlayDay() || policy.everyNight) {
        if (g.hp < 35) K.fx(F.sleep);
        else if (g.hunger > 70 || (g.mood < 35 && g.stress > 60 && g.hp >= 45) || (g.stress > 75 && g.hp >= 60)) K.fx(F.sex);
        else if (g.mood < 35) K.fx(F.outing);
        else if (g.stress > 75) K.fx(F.smoke);
        else K.fx(F.talk);
      }
      K.fx(D.NIGHT_BASE);
      if (policy.xiao && g.mood >= 25 && g.hunger <= 85) G.xiao = 'register';
      advanceDay();
    }
    G.flags.noEvents = false;
    return log;
  };
  // にっこりのままで、いちばん高い値段（動作確認と自動プレイ用）
  Gm.topPrice = p => {
    const step = v => (v < 30 ? 1 : v < 100 ? 5 : v < 300 ? 10 : v < 1000 ? 50 : 100);
    let v = K.refPrice(p);
    while (K.face(p, v + step(v)) === 'smile') v += step(v);
    return v;
  };
  // 動作確認用：第1章を飛ばして、ふつうの店で開店初日から
  Gm._quick = async () => {
    $('title').classList.add('hidden');
    G.chapter = 1;
    K.setDate(D.START_DATE);
    G.month = K.newMonth();
    G.items = [{ id: 1, type: 'register', c: 8, r: 2, flip: false }, { id: 2, type: 'shelf', c: 1, r: 2 }, { id: 3, type: 'shelf', c: 1, r: 4 },
      { id: 4, type: 'fridge', c: 10, r: 0 }, { id: 5, type: 'gacha', c: 7, r: 3 }];
    G.nextId = 6;
    K.expense('equip', 5000);
    Object.assign(G.flags, { poster: true, fridge: 'lease', gacha: 'vendor' });
    Object.assign(G.unlock, { place: true, stock: true, price: true, open: false });
    Object.assign(G.allowed, { register: true, shelf: true, plant: true, fridge: true, gacha: true });
    setupFounding();
    G.flags.packLeft = {};
    const order = {};
    for (const pr of D.PRODUCTS.filter(p => K.available(p) && !p.unlock)) order[pr.id] = pr.pop === 3 ? 2 : 1;
    K.order(order, 'cash');
    for (const pr of D.PRODUCTS) G.prices[pr.id] = K.refPrice(pr);
    Shelf.autoAssign();
    G.unlock.display = true;
    K.mStart('1-10'); K.mStart('1-09');
    UI.show('hud', true); UI.show('missions', true); UI.show('menu', true);
    await openDay();
  };
  Gm._debug = { mainLoop, advanceDay, monthEnd, closeDay, chapter1, openDay };
  return Gm;
})();

Game.init();
