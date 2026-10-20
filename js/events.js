'use strict';
// 第2章以降のミッションとイベント
window.Events = (() => {
  const EV = {};
  const X = t => ['シャオ', t], H = t => ['肇', t], F = t => ['フミ', t];
  const yen = K.yen;
  const S = SCRIPT;
  const on = (y, m, d) => G.date.y === y && G.date.m === m && G.date.d === d;
  const afterDate = (m, d, y = 2026) => K.cmp(G.date, { y, m, d }) >= 0;
  const dayFixed = () => Math.round(Object.values(D.COSTS).reduce((a, c) => a + c.amount, 0) / 26);
  const daysSales = (from, to = G.dayNo) => G.days.filter(d => d.dayNo >= from && d.dayNo <= to);

  // ================================================================ 第2章のミッション
  K.def('2-01', { kind: 'メイン', title: '最初の客に売る', check: () => G.flags.afterSale });
  K.def('2-02', { kind: 'メイン', title: 'シャオをレジに立たせる', hint: '下の「シャオ」→「レジに立たせる」', check: () => G.xiao === 'register',
    onDone: () => { G.flags.regTalk = true; } });
  K.def('2-03', { kind: 'サブ', title: '1日の売上1万円を3日（4月中）',
    progress: () => `${daysSales(K.dayNoOf({ y: 2026, m: 4, d: 8 })).filter(d => d.sales >= 10000 && d.m === 4).length} / 3日`,
    check: () => G.days.filter(d => d.m === 4 && d.sales >= 10000).length >= 3,
    until: () => G.date.m === 5, onDone: () => K.fx({ rep: 0.1 }) });
  K.def('2-04', { kind: 'おねだり', title: '金色の箱のチョコを仕入れろ（3日以内）',
    check: () => G.flags.goldBought >= (G.missions['2-04'] || {}).t,
    until: () => G.dayNo > (G.missions['2-04'] || {}).t + 3,
    onDone: () => { K.fx({ mood: 20 }); Game.queueTalk(S.C2_GOLD_OK); },
    onFail: () => { K.fx({ mood: -20 }); Game.queueTalk(S.C2_GOLD_NG); } });
  K.def('2-07', { kind: '関係', title: '夜にシャオと3回話す（4月中）', progress: () => `${G.flags.talkApril || 0} / 3回`, until: () => G.date.m === 5 });
  // このペースだと月末にいくらになるか（開いた日の平均 × 4月に開ける日数）
  const aprilPace = () => {
    const open = G.days.filter(d => !d.closed && d.m === 4).length;
    if (open < 2 || G.date.m !== 4) return '';
    const total = K.daysInMonth() - K.dayNoOf(D.OPEN_DATE) + K.dayNoOf({ y: 2026, m: 4, d: 1 });
    return `　このペースだと月末 約${yen(Math.round(K.gross() / open * total / 1000) * 1000)}`;
  };
  // 遊ぶ日の朝：このペースだと目標に届かないときに知らせる
  K.ev('morning', 'c2_pace', () => K.mActive('2-08') && G.date.m === 4 && G.days.filter(d => !d.closed && d.m === 4).length >= 4, async () => {
    const open = G.days.filter(d => !d.closed && d.m === 4).length;
    const total = K.daysInMonth() - K.dayNoOf(D.OPEN_DATE) + K.dayNoOf({ y: 2026, m: 4, d: 1 });
    const pace = K.gross() / open * total;
    if (pace < D.APRIL_GROSS) E.toast(`このペースだと4月の粗利は約${K.man(pace)}（目標${K.man(D.APRIL_GROSS)}）。値段・おまじない・品切れ・シャオの機嫌を見直そう`, 'bad');
  }, { repeat: true });
  K.def('2-08', { kind: 'メイン', title: () => `開店してからの家賃と光熱費を粗利でまかなう（4月の粗利${K.man(D.APRIL_GROSS)}）`, progress: () => `4月の粗利 ${yen(G.date.m === 4 ? K.gross() : 0)} / ${yen(D.APRIL_GROSS)}${aprilPace()}` });
  K.def('2-09', { kind: '実績', title: 'はじめての黒字の日' });
  K.def('2-10', { kind: 'サブ', title: '相性コンボを1つ見つける', hint: '下の「陳列」→「コンボ帳」でヒントを見る', progress: () => `見つけたコンボ ${Object.keys(G.combos).length}`, check: () => Object.keys(G.combos).length >= 1 });
  K.def('2-11', { kind: 'サブ', title: '問屋さんと交渉する', hint: '朝に「仕入れ」→「現金問屋」→「問屋さんと話す」', check: () => (G.flags.tonya || 0) >= 1 });
  K.def('2-13', { kind: 'サブ', title: 'シャオにおまじないをかけてもらう', hint: '朝に「シャオ」→「おまじない」。♥を使う', check: () => (G.flags.spellCount || 0) >= 1 });
  K.def('2-12', { kind: 'サブ', title: 'シャオと雑貨屋めぐりに行く', hint: '夜の行動「シャオと出かける」', check: () => (G.flags.outings || 0) >= 1 });

  // ================================================================ 第2章のイベント
  // 開店2日目の朝
  K.ev('morning', 'c2_morning1', () => afterDate(4, 9), async () => {
    await Dlg.run(S.C2_MORNING1);
    K.mStart('2-03'); K.mStart('2-07'); K.mStart('2-08'); K.mStart('2-10'); K.mStart('2-11');
  });
  // 看板息子
  K.ev('morning', 'c2_xiaoreg', () => afterDate(4, 12), async () => {
    G.unlock.xiao = true;
    G.pulse = 'xiao';
    await Dlg.run(S.C2_XIAO_REG);
    K.mStart('2-02');
    K.mStart('2-12');
    UI.renderMenu();
  });
  // 扱っている商品の推奨価格が、はじめて相場で動いた
  K.ev('morning', 'c2_market', () => G.chapter >= 2 && K.priceOff().length > 0, async () => {
    const p = K.priceOff()[0];
    await Dlg.run(S.C2_MARKET(p.name, G.prices[p.id], K.refPrice(p)));
  });
  // 棚が初めて売切になった
  K.ev('day', 't_restock', () => Shelf.soldOutTotal() > 0, async () => { await Dlg.run(S.T_RESTOCK); });
  K.ev('day', 'c2_regtalk', () => G.flags.regTalk && G.time > 640, async () => { await Dlg.run(S.C2_XIAO_REG_DONE); });
  K.ev('day', 'c2_salary', () => K.mDone('2-02') && G.time > 1090 && G.stats.adults >= 4, async () => { await Dlg.run(S.C2_SALARY_TASTE); });
  // おねだり：金色の箱
  K.ev('morning', 'c2_gold', () => afterDate(4, 13) && K.stockOf('ks4') === 0, async () => {
    await Dlg.run(S.C2_GOLD);
    G.flags.u_gold = true;
    E.toast('「金色の箱のチョコ」が仕入れられるようになった');
    K.mStart('2-04');
  });
  // 万引き
  K.ev('day', 'c2_shoplift', () => afterDate(4, 16) && K.wd() !== 0 && G.time >= 950 && G.time < 1080 && G.stats.kids >= 2, async () => {
    const kid = G.customers.find(c => c.kid && c.state !== 'walk');
    G.talkTarget = kid || null;
    await Dlg.run(S.C2_SHOPLIFT);
    G.talkTarget = null;
    const r = G.flags.shoplift;
    if (r === 'scold') K.fx({ rep: 0.05 });
    if (r === 'parent') K.fx({ rep: 0.1 });
    if (r === 'ignore') { K.fx({ rep: -0.1 }); G.flags.theft = true; }
    K.expense('theft', 20);
  });
  K.ev('morning', 'c2_shoplift_next', () => G.done.c2_shoplift, async () => {
    Game.visitor('フミ', 'fumi');
    await Dlg.run(S.C2_SHOPLIFT_NEXT);
    Game.leave('フミ');
    G.flags.theftOn = true;   // これからは、気づかないうちに万引きされることがある
  });
  // ♥がたまった：おまじないと魔界の通販（シャオがレジに立った日の夜から）
  K.ev('night', 'c2_heart', () => G.unlock.xiao && G.seiki >= 40, async () => {
    await Dlg.run(S.C2_HEART);
    G.unlock.spells = true;
    K.mStart('2-13');
  });
  // 在庫が減ってきた
  K.ev('morning', 'c2_lowstock', () => G.dayNo > K.dayNoOf({ y: 2026, m: 4, d: 10 }) &&
    D.PRODUCTS.some(p => Shelf.carried(p.id) && Shelf.backroom(p.id) === 0 && K.incoming(p.id) === 0), async () => {
    await Dlg.run(S.C2_LOW_STOCK);
  });
  // はじめての黒字の日
  K.ev('close', 'c2_black', () => G.flags.lastDayProfit > 0, async () => {
    K.mStart('2-09'); K.mFinish('2-09');
    G.titles.push('はじめての黒字の日');
    await Dlg.run(S.C2_BLACK_DAY);
  });
  // 4月の月末決算
  K.ev('monthEnd', 'c2_monthend', () => G.date.m === 4 && G.date.y === 2026, async () => {
    const m = G.ledger[G.ledger.length - 1];
    await Dlg.run(S.C2_MONTH_END);
    if (m.flowIn.salary) await Dlg.run(S.C2_MONTH_SALARY);
    const ok = K.gross(m) >= D.APRIL_GROSS;
    K.mFinish('2-08', ok);
    await Dlg.run(ok ? S.C2_RENT_OK : S.C2_RENT_NG);
    await Dlg.run([{ scene: '第2章　開店と初月　おわり', where: '次は第3章「軌道に乗せる」', hold: 2200 }]);
  });

  // ================================================================ 第3章 軌道に乗せる（5月〜6月）
  const UNIT_TARGET = 420;
  const openDays = n => G.days.filter(d => !d.closed && d.buyers > 0).slice(-n);
  const unitAvg = n => { const ds = openDays(n); const b = ds.reduce((s, d) => s + d.buyers, 0); return b ? ds.reduce((s, d) => s + d.sales, 0) / b : 0; };
  K.def('3-01', { kind: 'メイン', title: '売れ筋を見て仕入れを変える',
    progress: () => `帳簿で売れ筋を見る${G.flags.sawData ? '✓' : ''}　売れない物を見切る${Object.values(G.clearance).some(Boolean) || G.flags.clearedOnce ? '✓' : ''}　売れ筋を仕入れる${G.flags.boughtTop ? '✓' : ''}`,
    check: () => G.flags.sawData && (Object.values(G.clearance).some(Boolean) || G.flags.clearedOnce) && G.flags.boughtTop,
    onDone: () => Game.queueTalk(S.C3_DATA_DONE) });
  K.def('3-02', { kind: 'サブ', title: '閉店時間を決める（20時か21時）', check: () => G.flags.setClose });
  K.def('3-03', { kind: 'サブ', title: '定休日を決める（作らなくてもいい）', check: () => G.flags.setHoliday });
  K.def('3-04', { kind: 'メイン', title: `客単価${UNIT_TARGET}円を6日続ける`, progress: () => `直近6日の客単価 ${yen(unitAvg(6))}`,
    check: () => openDays(6).length >= 6 && openDays(6).every(d => d.sales / d.buyers >= UNIT_TARGET * 0.85) && unitAvg(6) >= UNIT_TARGET,
    onDone: () => K.fx({ rep: 0.15 }) });
  K.def('3-05', { kind: 'おねだり', title: () => G.flags.gachaAsk ? `ソシャゲに課金させろ（${G.flags.gachaAsk === 'yes' ? '叶えた' : '断った'}）` : 'ソシャゲに課金させろ' });
  K.def('3-06', { kind: 'サブ', title: '魅了営業で仕入れ値を下げる', check: () => G.flags.charmCount > 0 });
  K.def('3-07', { kind: 'トラブル', title: 'クレーム（賞味期限切れ）' });
  K.def('3-08', { kind: 'サブ', title: () => G.flags.kai == null ? '商店街の会に入る？' : G.flags.kai ? '商店街の会に入った' : '商店街の会に入らなかった' });
  K.def('3-09', { kind: 'サブ', title: '夜に帳簿をつける（3回）', progress: () => G.flags.u_books ? `${G.flags.booksCount || 0} / 3回` : '先に「勉強する」で「帳簿のつけ方」を★1に',
    check: () => (G.flags.booksCount || 0) >= 3 });
  K.def('3-10', { kind: 'メイン', title: '事業の赤字を前の月より減らす（5月・6月）',
    progress: () => `5月${G.flags.improveMay == null ? '…' : G.flags.improveMay ? '✓' : '×'}　6月${G.flags.improveJune == null ? '…' : G.flags.improveJune ? '✓' : '×'}` });
  K.def('3-11', { kind: 'トラブル', title: '住民税と国保の通知' });
  K.def('3-12', { kind: '関係', title: '定休日にシャオと出かける' });

  K.ev('morning', 'c3_start', () => afterDate(5, 1), async () => {
    G.chapter = 3;
    G.unlock.data = true;
    G.flags.u_clearance = true;
    G.flags.u_study_boki = true;
    G.pulse = 'data';
    await Dlg.run(S.C3_START);
    K.mStart('3-01'); K.mStart('3-09'); K.mStart('3-10');
    UI.renderMenu();
  });
  K.ev('morning', 'c3_settings', () => afterDate(5, 4), async () => {
    G.unlock.settings = true;
    await Dlg.run(S.C3_SETTINGS);
    K.mStart('3-02'); K.mStart('3-03');
    UI.renderMenu();
  });
  K.ev('morning', 'c3_unit', () => afterDate(5, 7), async () => {
    G.allowed.pop = true; G.allowed.rejiyoko = true;
    await Dlg.run(S.C3_UNIT);
    K.mStart('3-04');
  });
  K.ev('morning', 'c3_kai', () => afterDate(5, 13), async () => {
    K.mStart('3-08');
    await Dlg.run(S.C3_KAI);
    K.mFinish('3-08');
  });
  K.ev('night', 'c3_gacha', () => afterDate(5, 20), async () => {
    K.mStart('3-05');
    await Dlg.run(S.C3_GACHA_ASK);
    if (G.flags.gachaAsk === 'yes') { K.personal('gacha', 30000); K.fx({ mood: 25, rel: 1 }); } else K.fx({ mood: -20 });
    K.mFinish('3-05');
  });
  K.ev('morning', 'c3_charm', () => afterDate(5, 26), async () => {
    G.flags.u_charm = true;
    await Dlg.run(S.C3_CHARM);
    K.mStart('3-06');
  });
  EV.charm = async () => {
    if (G.seiki < 30) { E.toast('♥が足りない（30要る）', 'bad'); return; }
    await Dlg.run(S.C3_CHARM_USE);
    G.seiki -= 30;
    G.flags.charmUntil = G.dayNo + 30;
    G.flags.charmExposed = Math.random() < 0.3 + 0.15 * (G.flags.charmCount || 0);
    G.flags.charmCount = (G.flags.charmCount || 0) + 1;
    G.flags.charmPending = true;
    E.toast('1か月のあいだ、仕入れ値が1割引き');
    Game.check();
  };
  K.ev('morning', 'c3_charm_end', () => G.flags.charmPending && G.dayNo >= G.flags.charmUntil, async () => {
    G.flags.charmPending = false;
    if (G.flags.charmExposed) { await Dlg.run(S.C3_CHARM_END_NG); G.flags.charmBad = G.dayNo + 60; K.fx({ rep: -0.1 }); }
    else await Dlg.run(S.C3_CHARM_END_OK);
  }, { repeat: true });
  K.ev('morning', 'c3_tax', () => afterDate(6, 10), async () => {
    K.mStart('3-11');
    await Dlg.run(S.C3_TAX);
    K.mFinish('3-11');
  });
  K.ev('day', 'c3_claim', () => afterDate(6, 12) && G.time >= 1000 && G.time < 1150 && G.stats.adults >= 2, async () => {
    K.mStart('3-07');
    G.talkTarget = G.customers.find(c => c.type === 'woman' && c.state !== 'walk') || null;
    await Dlg.run(S.C3_CLAIM);
    G.talkTarget = null;
    const r = G.flags.claim;
    if (r === 'refund') { K.expense('refund', 50); K.fx({ rep: 0.03 }); }
    if (r === 'swap') { K.expense('refund', 250); K.fx({ rep: 0.08 }); }
    if (r === 'xiao') { K.fx({ seiki: -10, rep: Math.random() < 0.5 ? 0.05 : -0.1 }); }
    K.mFinish('3-07');
  });
  K.ev('holiday', 'c3_holiday', () => afterDate(5, 1) && K.isHoliday(), async () => {
    K.mStart('3-12');
    G.scene = 'store';
    await Dlg.run(S.C3_HOLIDAY);
    K.personal('date', 1500);
    K.fx({ mood: 20, rel: 2, stress: -10 });
    K.mFinish('3-12');
  });
  const prevProfit = () => { const l = G.ledger; return l.length >= 2 ? K.profit(l[l.length - 2]) : 0; };
  K.ev('monthEnd', 'c3_may', () => G.date.m === 5 && G.date.y === 2026, async () => {
    const m = G.ledger[G.ledger.length - 1];
    G.flags.improveMay = K.profit(m) > prevProfit();
    await Dlg.run(G.flags.improveMay ? S.C3_MONTH_MAY : S.C3_MONTH_MAY_NG);
  });
  K.ev('monthEnd', 'c3_june', () => G.date.m === 6 && G.date.y === 2026, async () => {
    const m = G.ledger[G.ledger.length - 1];
    G.flags.improveJune = K.profit(m) > prevProfit();
    K.mFinish('3-10', G.flags.improveMay && G.flags.improveJune);
    await Dlg.run(S.C3_END);
  });

  // ================================================================ 第4章 資金の谷（7月〜9月）
  K.def('4-01', { kind: 'メイン', title: '資金の谷を越える（融資を受ける）', progress: () => G.loanApp && !G.loanApp.done ? `${D.LENDERS[G.loanApp.lender].name}：審査中` : '下の「借入」',
    check: () => G.loans.length > 0 });
  K.def('4-02', { kind: 'サブ', title: '創業計画書を書く', progress: () => `勉強「融資のこと」${'★'.repeat(G.study.yushi || 0)}${'☆'.repeat(3 - (G.study.yushi || 0))}　夜に家で` });
  K.def('4-03', { kind: 'メイン', title: '夏祭りの2日間を乗り切る', progress: () => `2日間の売上 ${yen(G.flags.festSales || 0)}` });
  K.def('4-04', { kind: 'メイン', title: '初めてのアルバイトを雇う', hint: '下の「採用」', check: () => !!G.staff });
  K.def('4-05', { kind: 'サブ', title: 'シフトを組んで肇の休みを作る（週1日）', check: () => G.staff && G.staff.rest.some(Boolean) });
  K.def('4-06', { kind: 'トラブル', title: '猛暑で冷蔵ケースが故障' });
  K.def('4-07', { kind: 'トラブル', title: '肇が倒れる' });
  K.def('4-08', { kind: 'おねだり', title: () => G.flags.ringo == null ? '夏祭りでりんご飴を買え' : `夏祭りでりんご飴を買え（${G.flags.ringo ? '叶えた' : '断った'}）` });
  K.def('4-09', { kind: '実績', title: '黒字倒産しかけた' });
  K.def('4-10', { kind: 'サブ', title: '給与支払事務所の開設届を出す（1か月以内）', progress: () => '夜に家で', check: () => !!G.forms.kaisetsu,
    until: () => G.staff && G.dayNo > G.staff.since + 30 && !G.forms.kaisetsu });

  K.ev('morning', 'c4_start', () => afterDate(7, 1), async () => {
    G.chapter = 4;
    G.flags.u_summer = true;
    await Dlg.run(S.C4_START);
    await Dlg.run(S.C4_SUMMER);
  });
  K.ev('morning', 'c4_loan', () => afterDate(7, 3) || (G.chapter >= 3 && K.danger() && G.money < 500000), async () => {
    G.flags.u_loan = true;
    G.unlock.loan = true;
    G.flags.u_study_yushi = true;
    G.pulse = 'loan';
    await Dlg.run(S.C4_LOAN);
    K.mStart('4-01'); K.mStart('4-02');
    UI.renderMenu();
  });
  EV.applyLoan = async k => {
    const l = D.LENDERS[k];
    if (k === 'loan') {
      G.loans.push({ lender: k, name: l.name, amount: l.amount, left: l.amount, rate: l.rate, years: l.years, grace: 0, start: G.dayNo });
      K.income('loan', l.amount);
      G.flags.usedLoan = true;
      if (!G.titles.includes('隣で借りた')) G.titles.push('隣で借りた');
      E.toast(`${l.name}で${K.man(l.amount)}借りた`, 'bad');
      await Dlg.run(S.C4_SHARK);
      Game.check();
      return;
    }
    const wait = k === 'shinkin' && G.flags.kai ? 30 : l.wait;
    G.loanApp = { lender: k, applied: G.dayNo, interview: G.dayNo + 6, decide: G.dayNo + wait, done: false };
    E.toast(`${l.name}に申し込んだ。${wait}日くらいで結果が出る`);
    await Dlg.run(S.C4_LOAN_APPLY);
    Game.check();
  };
  K.ev('morning', 'c4_interview', () => G.loanApp && !G.loanApp.done && !G.loanApp.met && G.dayNo >= G.loanApp.interview, async () => {
    G.loanApp.met = true;
    await Dlg.run(S.C4_INTERVIEW);
    const charm = G.flags.interview === 'charm';
    let score = (G.flags.planRealistic ? 1.2 : 0) + ((G.study.yushi || 0) >= 3 ? 0.4 : 0) + (G.rep >= 2 ? 0.3 : 0) + ((G.flags.booksCount || 0) >= 3 ? 0.3 : 0);
    G.loanApp.exposed = charm && Math.random() < 0.35;
    if (charm) score += 1.5;
    G.loanApp.ok = !G.loanApp.exposed && score >= 1.2;
    G.loanApp.amount = score >= 1.8 ? D.LENDERS[G.loanApp.lender].amount : D.LENDERS[G.loanApp.lender].amount * 0.6;
    if (charm) G.seiki = Math.max(0, G.seiki - 20);
  }, { repeat: true });
  K.ev('morning', 'c4_decide', () => G.loanApp && !G.loanApp.done && G.loanApp.met && G.dayNo >= G.loanApp.decide, async () => {
    const a = G.loanApp, l = D.LENDERS[a.lender];
    a.done = true;
    if (a.ok) {
      if (l.fee) K.expense('guarantee', l.fee);
      G.loans.push({ lender: a.lender, name: l.name, amount: a.amount, left: a.amount, rate: l.rate, years: l.years, grace: l.grace, start: G.dayNo });
      K.income('loan', a.amount);
      E.toast(`${l.name}から${K.man(a.amount)}振り込まれた`);
      await Dlg.run(S.C4_LOAN_OK);
    } else {
      G.flags.rejected = { ...(G.flags.rejected || {}), [a.lender]: true };
      await Dlg.run(a.exposed ? S.C4_LOAN_EXPOSED : S.C4_LOAN_NG);
      if (a.exposed) K.fx({ rep: -0.2 });
    }
    Game.check();
  }, { repeat: true });
  // 夏祭り（7月25日・26日）
  const festDay = () => G.date.y === 2026 && G.date.m === 7 && (G.date.d === 25 || G.date.d === 26);
  K.ev('morning', 'c4_fest', () => on(2026, 7, 25), async () => {
    K.mStart('4-03');
    G.settings._closeBak = G.settings.close;
    await Dlg.run(G.flags.kai ? S.C4_FESTIVAL : S.C4_FESTIVAL_NOKAI);
  });
  K.ev('close', 'c4_fest_close', () => festDay(), async () => {
    G.flags.festSales = (G.flags.festSales || 0) + G.stats.sales + G.stats.gachaRev;
    K.fx({ hp: -15 });
    if (G.date.d === 26) K.mFinish('4-03');
  }, { repeat: true });
  K.ev('night', 'c4_ringo', () => on(2026, 7, 25), async () => {
    K.mStart('4-08');
    await Dlg.run(S.C4_RINGO);
    if (G.flags.ringo) { K.personal('ringo', 500); K.fx({ mood: 15, rel: 1 }); } else K.fx({ mood: -10 });
    K.mFinish('4-08');
  });
  // アルバイト
  K.ev('morning', 'c4_kohai', () => afterDate(8, 1), async () => {
    G.unlock.hire = true;
    G.pulse = 'hire';
    await Dlg.run(S.C4_KOHAI);
    K.mStart('4-04'); K.mStart('4-05');
    UI.renderMenu();
  });
  K.ev('morning', 'c4_kaisetsu', () => G.staff && G.dayNo > G.staff.since, async () => { K.mStart('4-10'); });
  K.ev('day', 'c4_jealous', () => G.staff && G.dayNo >= G.staff.since + 3 && Field.staffOn() && G.time > 900, async () => {
    Game.visitor('後輩', G.staff.sprite === 'kohai' ? 'kohai' : G.staff.sprite, D.FX + 9 * 16 + 8, D.FY + 3 * 16 + 12);
    await Dlg.run(G.staff.id === 'kohai' ? S.C4_KOHAI_JEALOUS : [X('……あいつ、はじめに馴れ馴れしいぞ'), H('仕事してるだけだよ'), X('ふん')]);
    Game.leave('後輩');
  });
  // 冷蔵ケースの故障
  K.ev('morning', 'c4_fridge', () => afterDate(8, 12) && Field.has('fridge'), async () => {
    K.mStart('4-06');
    await Dlg.run(S.C4_FRIDGE);
    if (G.flags.fridge === 'lease') { await Dlg.run(S.C4_FRIDGE_LEASE); G.flags.fridgeBrokenUntil = G.dayNo + 1; }
    else {
      await Dlg.run(S.C4_FRIDGE_BUY);
      if (G.flags.fridgeFix === 'new') { K.expense('repair', 150000); G.flags.fridgeBrokenUntil = G.dayNo + 1; }
      else { K.expense('repair', 45000); G.flags.fridgeBrokenUntil = G.dayNo + 2; }
    }
    K.mFinish('4-06');
  });
  // 肇が倒れる
  K.ev('morning', 'c4_faint', () => G.chapter >= 2 && (G.gauges.hp <= 3 || afterDate(9, 14)), async () => {
    K.mStart('4-07');
    await Dlg.run(S.C4_FAINT);
    G.flags.relStage = '同居人';
    G.flags.u_share = true;
    G.flags.closedToday = G.dayNo;
    Object.assign(G.gauges, { hp: 75, stress: Math.max(10, G.gauges.stress - 30), hunger: Math.min(100, G.gauges.hunger + 30) });
    G.seiki = Math.max(0, G.seiki - 40);
    K.fx({ rel: 3 });
    K.mFinish('4-07');
  });
  K.ev('morning', 'c4_minwage', () => afterDate(9, 25) && G.staff && G.staff.wage < 1280, async () => {
    if (G.staff.id === 'kohai') await Dlg.run(S.C4_MINWAGE);
    else await Dlg.run([H('10月から最低賃金が1,280円か……'), X('なんだそれ'), H('アルバイトの時給、上げないといけない')]);
  });
  K.ev('morning', 'c4_minwage_apply', () => afterDate(10, 1) && G.staff && G.staff.wage < 1280, async () => {
    G.staff.wage = 1280;
    E.toast('最低賃金が上がった。アルバイトの時給を1,280円にした');
  });
  K.ev('monthEnd', 'c4_blackbankrupt', () => { const m = G.ledger[G.ledger.length - 1]; return K.profit(m) > 0 && m.cashEnd < 100000; }, async () => {
    K.mStart('4-09'); K.mFinish('4-09');
    G.titles.push('黒字倒産しかけた');
    await Dlg.run(S.C4_BLACK_BANKRUPT);
  });
  K.ev('monthEnd', 'c4_end', () => G.date.m === 9 && G.date.y === 2026, async () => {
    if (!K.mDone('4-01') && K.mActive('4-01')) K.mFinish('4-01', G.loans.length > 0);
    await Dlg.run(S.C4_END);
  });

  // ================================================================ その日の特別な条件（祭りなど）
  EV.today = () => {
    const t = {};
    if (G.flags.closedToday === G.dayNo) t.closed = true;
    if (G.flags.fridgeBrokenUntil > G.dayNo) G.flags.fridgeBroken = true; else G.flags.fridgeBroken = false;
    if (festDay()) {
      const kai = G.flags.kai;
      t.traffic = time => time >= 1020 ? (kai ? 2.6 : 1.5) : (kai ? 1.5 : 1.2);
      t.enter = () => kai ? 1.25 : 1;
      t.close = 1260;
      t.bgm = 'matsuri';
    }
    if (window.Events5 && Events5.today) Object.assign(t, Events5.today(t));
    return t;
  };

  // ================================================================ お金が尽きた
  EV.broke = async () => {
    if (!G.flags.usedLoan) {
      await Dlg.run([H('……手元のお金が、マイナスになった'), X('マイナスってなんだ'), H('払えないってこと'), X('隣で借りればいいだろ！ すぐ貸してくれるって書いてある！'), H('……それしかないのか')]);
      G.flags.usedLoan = true;
      const l = D.LENDERS.loan;
      G.loans.push({ lender: 'loan', name: l.name, amount: l.amount, left: l.amount, rate: l.rate, years: l.years, grace: 0, start: G.dayNo });
      K.income('loan', l.amount);
      G.titles.push('隣で借りた');
      E.toast(`隣の「ローン」で${K.man(l.amount)}借りた（年18%）`, 'bad');
      return false;
    }
    await Dlg.run([H('……もう、どこも貸してくれない'), X('はじめ……'), H('ごめん。店、閉めることになる'), { scene: '倒産', where: '手元のお金が尽きた。個人事業の借金は、肇が背負う', hold: 4000 }]);
    G.flags.ended = true;
    K.clearSave();
    await UI.panelResult('<div style="padding:30px;text-align:center;font-size:36px">ゲームオーバー<div class="sub" style="font-size:26px;margin-top:16px">タイトルに戻る</div></div>', 'タイトルへ', '倒産');
    location.reload();
    return true;
  };
  return EV;
})();
