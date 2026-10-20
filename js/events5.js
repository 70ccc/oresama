'use strict';
// 第5章 年末商戦と確定申告（10月〜2年目3月）、確定申告の書類、関門
window.Events5 = (() => {
  const E5 = {};
  const X = t => ['シャオ', t], H = t => ['肇', t];
  const S = SCRIPT;
  const yen = K.yen;
  const on = (y, m, d) => G.date.y === y && G.date.m === m && G.date.d === d;
  const afterDate = (m, d, y = 2026) => K.cmp(G.date, { y, m, d }) >= 0;
  const soldTotal = id => G.days.reduce((s, d) => s + ((d.sold || {})[id] || 0), 0);
  // 前の会社の2026年の給料（1月〜5月、有給消化を含む）と、引かれていた税金・社会保険料
  const SALARY = { income: 1633000, withheld: 34800, shaho: 236000 };

  // ================================================================ ミッション
  K.def('5-01', { kind: 'サブ', title: 'ハロウィン詰め合わせを40個売る（10月）', progress: () => `${G.date.m === 10 ? (G.month.sold.hw1 || 0) : 0} / 40個`,
    check: () => G.date.m === 10 && (G.month.sold.hw1 || 0) >= 40, until: () => G.date.m === 11, onDone: () => K.fx({ rep: 0.1 }) });
  K.def('5-02', { kind: 'サブ', title: 'オリジナル商品を作って売る', progress: () => G.flags.goods ? `売れた数 ${soldTotal('og1')}` : '',
    check: () => soldTotal('og1') > 0, onDone: () => Game.queueTalk(S.C5_GOODS_SOLD) });
  K.def('5-03', { kind: 'トラブル', title: '近くにディスカウント店が出店' });
  K.def('5-04', { kind: 'メイン', title: '年末商戦（12月の売上100万円）', progress: () => `12月の売上 ${yen(G.date.m === 12 ? G.month.sales + G.month.gacha : 0)}` });
  K.def('5-05', { kind: 'おねだり', title: () => G.flags.xmas == null ? 'クリスマスは夜景の見えるところに連れていけ' : `クリスマスは夜景の見えるところに連れていけ（${G.flags.xmas ? '叶えた' : '断った'}）` });
  K.def('5-06', { kind: 'メイン', title: '融資の返済を始める' });
  K.def('5-07', { kind: 'メイン', title: '確定申告をする（3/15まで）',
    progress: () => G.flags.taxPro ? '税理士に頼んだ' : `勉強「確定申告のこと」${'★'.repeat(G.study.kakutei || 0)}${'☆'.repeat(3 - (G.study.kakutei || 0))}　2/16から書ける` });
  K.def('5-08', { kind: '関係', title: '年度末の夜' });
  K.def('5-09', { kind: 'メイン', title: '創業期の関門（3月31日）', progress: () => gateText() });

  // ================================================================ 関門
  const gateChecks = () => {
    const last3 = G.ledger.slice(-3);
    const black = last3.filter(m => K.profit(m) > 0).length;
    return [
      { label: 'アルバイトを1人以上雇っている', ok: !!G.staff },
      { label: `直近3か月のうち2か月、事業が黒字（いま${black}か月）`, ok: black >= 2 },
      { label: `評判が★3以上（いま★${Math.floor(G.rep)}）`, ok: G.rep >= 3 },
      { label: `手元のお金が3か月分の支払い以上（${yen(G.money)} / ${yen(K.monthlyBurn() * 3)}）`, ok: G.money >= K.monthlyBurn() * 3 },
    ];
  };
  const gateText = () => {
    const c = gateChecks();
    const black = G.ledger.slice(-3).filter(m => K.profit(m) > 0).length;
    return `バイト${c[0].ok ? '○' : '×'}　黒字${black}/3か月　評判★${Math.floor(G.rep)}　資金${c[3].ok ? '○' : '×'}`;
  };

  // ================================================================ イベント
  K.ev('morning', 'c5_start', () => afterDate(10, 1), async () => {
    G.chapter = 5;
    G.flags.u_halloween = true;
    await Dlg.run(S.C5_START);
    K.mStart('5-01'); K.mStart('5-09');
  });
  K.ev('morning', 'c5_goods', () => afterDate(10, 12), async () => {
    await Dlg.run(S.C5_GOODS);
    if (G.flags.goods) {
      K.expense('goods', 80000);
      G.seiki = Math.max(0, G.seiki - 40);
      G.flags.u_goods = true;
      K.mStart('5-02');
      E.toast('「おれさまアクスタ」が仕入れられるようになった（シャオグッズ）');
    }
  });
  K.ev('morning', 'c5_discount', () => afterDate(11, 2), async () => {
    K.mStart('5-03');
    await Dlg.run(S.C5_DISCOUNT);
    G.flags.discount = true;
    if (G.flags.discountMode === 'cheap') {
      for (const p of D.PRODUCTS) if (['駄菓子', '菓子', 'ドリンク', '日用品'].includes(p.genre) && !p.gift) {
        const v = Math.max(Math.ceil(K.avgCost(p.id) * 1.05), Math.round(p.price * 0.9 / 5) * 5);
        G.prices[p.id] = Math.max(5, v);
      }
      E.toast('主な商品を1割下げた');
    }
    if (G.flags.discountMode === 'unique') K.fx({ rep: 0.2 });
    K.mFinish('5-03');
  });
  K.ev('morning', 'c5_xmas_season', () => afterDate(12, 1), async () => {
    G.flags.u_xmas = true;
    await Dlg.run(S.C5_XMAS_SEASON);
    K.mStart('5-04');
  });
  K.ev('morning', 'c5_xmas', () => on(2026, 12, 24), async () => {
    K.mStart('5-05');
    await Dlg.run(S.C5_XMAS_ASK);
    if (G.flags.xmas) G.flags.xmasClose = G.dayNo;
  });
  K.ev('night', 'c5_xmas_night', () => on(2026, 12, 24), async () => {
    if (G.flags.xmas) { await Dlg.run(S.C5_XMAS_NIGHT); K.personal('xmas', 6000); K.fx({ mood: 30, rel: 3, stress: -15 }); }
    else { await Dlg.run(S.C5_XMAS_NIGHT_NG); K.personal('xmas', 3000); K.fx({ mood: -5, rel: 1 }); }
    K.mFinish('5-05');
  });
  K.ev('morning', 'c5_repay', () => G.loans.some(l => l.lender !== 'loan' && l.lender !== 'pack' && K.loanPayment(l).principal > 0), async () => {
    K.mStart('5-06');
    await Dlg.run([H('……据置、今月で終わりだ'), X('すえおき？'), H('来月から、借りたお金そのものを返し始める。毎月'), X('毎月！？'), H('だから言ったろ。借りたお金は、返すお金なんだよ')]);
    K.mFinish('5-06');
  });
  K.ev('monthEnd', 'c5_dec', () => G.date.m === 12 && G.date.y === 2026, async () => {
    const m = G.ledger[G.ledger.length - 1];
    G.flags.endInv2026 = K.stockValue();
    K.mFinish('5-04', m.sales + m.gacha >= 1000000);
    await Dlg.run(S.C5_STOCKTAKE);
  });
  K.ev('morning', 'c5_newyear', () => afterDate(1, 1, 2027), async () => {
    await Dlg.run(S.C5_NEWYEAR);
    G.scene = 'store';
  });
  K.ev('morning', 'c5_tax_intro', () => afterDate(1, 13, 2027), async () => {
    G.flags.u_study_kakutei = true;
    await Dlg.run(S.C5_TAX_INTRO);
    K.mStart('5-07');
    if (G.flags.taxPro) { K.expense('tax', 100000); }
  });
  K.ev('morning', 'c5_tax_pro', () => G.flags.taxPro && afterDate(2, 20, 2027), async () => {
    await Dlg.run(S.C5_TAX_PRO_DONE);
    await showTax(E5.computeTax({ etax: true, cogs: true, salary: true, shaho: true, carry: true }));
    K.mFinish('5-07');
  });
  K.ev('morning', 'c5_tax_late', () => afterDate(3, 16, 2027) && !G.flags.taxDone && !G.flags.taxPro, async () => {
    G.flags.taxLate = true;
    await Dlg.run(S.C5_TAX_LATE);
    K.mFinish('5-07', false);
  });
  K.ev('morning', 'c5_refund', () => G.flags.refundDue > 0 && afterDate(3, 25, 2027), async () => {
    await Dlg.run(S.C5_REFUND);
    K.income('refund', G.flags.refundDue);
    E.toast(`税金の還付　＋${yen(G.flags.refundDue)}`);
    G.flags.refundDue = 0;
  });
  K.ev('night', 'c5_yearend', () => afterDate(3, 28, 2027), async () => {
    K.mStart('5-08');
    await Dlg.run(S.C5_YEAREND_NIGHT);
    K.fx({ mood: 20, rel: 3 });
    K.mFinish('5-08');
  });

  // 第5章の日ごとの条件
  E5.today = () => {
    const t = {};
    if (G.flags.xmasClose === G.dayNo) t.close = 1080;
    if (G.flags.discountMode === 'unique') t.enter = type => (D.CUSTOMERS[type].adult ? 1.1 : 1);
    return t;
  };

  // ================================================================ 確定申告の計算（令和8年分）
  const year2026 = () => G.ledger.filter(m => m.y === 2026);
  E5.numbers = () => {
    const ls = year2026();
    const sum = f => ls.reduce((s, m) => s + f(m), 0);
    const sales = sum(m => m.sales + m.gacha);
    const purchases = sum(m => m.stockBuy);
    const endInv = Math.round(G.flags.endInv2026 != null ? G.flags.endInv2026 : K.stockValue());
    const cogs = purchases - endInv;
    const exp = sum(m => Object.values(m.exp).reduce((a, b) => a + b, 0));
    const biz = sales - cogs - exp;
    const pens = sum(m => (m.pers.nenkin || 0) + (m.pers.kokuho || 0));
    const aoiroOK = !!G.forms.aoiro && !G.flags.aoiroLate;
    return { sales, purchases, endInv, cogs, exp, biz, pens, aoiroOK, double: G.flags.boki === 'double' };
  };
  // 青色申告特別控除：期限内の青色で、もうけがあるときだけ。もうけより大きくは引けない
  E5.blueCap = (n, etax = true) => (!n.aoiroOK || n.biz <= 0) ? 0 : n.double ? (etax ? 650000 : 550000) : 100000;
  E5.blueKind = n => (!n.aoiroOK || n.biz <= 0) ? 'zero' : n.double ? 'full' : 'ten';
  E5.computeTax = opt => {
    const n = E5.numbers();
    const cogs = opt.cogs ? n.cogs : n.purchases;
    let biz = n.sales - cogs - n.exp;
    const blueDed = Math.min(Math.max(0, biz), E5.blueCap(n, opt.etax));
    biz -= blueDed;
    const salaryIncome = opt.salary ? Math.max(0, SALARY.income - 740000) : 0;
    const total = salaryIncome + biz;   // 損益通算
    const shaho = opt.shaho ? SALARY.shaho + n.pens : 0;
    const basic = 1040000;
    const taxable = Math.max(0, Math.floor((total - shaho - basic) / 1000) * 1000);
    const rate = taxable <= 1949000 ? [0.05, 0] : taxable <= 3299000 ? [0.10, 97500] : taxable <= 6949000 ? [0.20, 427500] : [0.23, 636000];
    const tax = Math.floor((taxable * rate[0] - rate[1]) * 1.021 / 100) * 100;
    const withheld = opt.salary ? SALARY.withheld : 0;
    const carry = total < 0 && n.aoiroOK && opt.carry ? -total : 0;
    return { ...n, cogsUsed: cogs, blueDed, salaryIncome, total, shaho, basic, taxable, tax, refund: withheld - tax, carry };
  };
  const showTax = async r => {
    const row = UI.row;
    let html = '<div style="padding:10px 30px">';
    html += row('事業の売上（4月〜12月）', yen(r.sales)) + row('売上原価（仕入れ−年末の在庫）', '−' + yen(r.cogsUsed)) + row('経費', '−' + yen(r.exp));
    html += row('青色申告特別控除', '−' + yen(r.blueDed)) + row('事業所得', yen(r.total - r.salaryIncome), r.total - r.salaryIncome >= 0 ? 'good' : 'bad');
    html += row('給与所得（前の会社）', yen(r.salaryIncome)) + row('合計（赤字は給与と相殺）', yen(r.total));
    html += row('社会保険料控除', '−' + yen(r.shaho)) + row('基礎控除', '−' + yen(r.basic));
    html += row('課税される所得', yen(r.taxable)) + row('所得税（復興特別所得税こみ）', yen(r.tax));
    html += `<div class="result-row total"><span>${r.refund >= 0 ? '戻ってくる税金（還付）' : '払う税金'}</span><span class="${r.refund >= 0 ? 'good' : 'bad'}">${yen(Math.abs(r.refund))}</span></div>`;
    if (r.carry) html += row('来年以降に繰り越せる赤字（青色申告）', yen(r.carry), 'good');
    html += '</div>';
    await UI.panelResult(html, '次へ', '確定申告（令和8年分）', { cls: 'wide' });
    G.flags.taxDone = true;
    G.flags.taxResult = { tax: r.tax, refund: r.refund, carry: r.carry };
    if (r.refund > 0) G.flags.refundDue = r.refund;
    else if (r.refund < 0) K.personal('tax', -r.refund);
  };

  // 確定申告書の書類ミニゲーム
  FORMS.kakutei = {
    title: '確定申告書（青色申告決算書つき）', short: '確定申告', topic: 'kakutei',
    deadline: '2027年3月15日', when: () => afterDate(2, 16, 2027) && G.flags.taxPro === false && !G.flags.taxDone,
    fields: [
      { id: 'how', label: '出しかた', type: 'choice', note: 'e-Taxで出すと、青色申告特別控除が65万円まで使える（紙だと55万円まで）', memo: 'e-Tax',
        options: [{ v: 'etax', t: 'e-Tax（スマホとマイナンバーカード）', ok: true, rec: true }, { v: 'paper', t: '紙に書いて税務署へ', ok: true, say: H('……紙だと55万円か') }] },
      { id: 'sales', label: '事業の売上（4月〜12月）', type: 'fixed', value: () => yen(E5.numbers().sales), note: '帳簿の売上を全部足したもの' },
      { id: 'cogs', label: '売上原価', type: 'choice', note: '1年で売れた商品の仕入れ値。年初の在庫（0円）＋仕入れ−年末の在庫', memo: '年末に残った在庫は引く',
        options: [
          { v: 'ok', t: '', dyn: () => { const n = E5.numbers(); return `仕入れ${yen(n.purchases)}−年末の在庫${yen(n.endInv)}＝${yen(n.cogs)}`; }, ok: true },
          { v: 'ng', t: '', dyn: () => `仕入れた${yen(E5.numbers().purchases)}をそのまま原価にする`, ok: false, why: '年末に残った在庫は、まだ売れていない。来年の原価になる' },
        ] },
      { id: 'exp', label: '経費', type: 'fixed', value: () => yen(E5.numbers().exp), note: '家賃、光熱費、通信費、アルバイト代、利息、備品など。シャオの課金や生活費は入らない' },
      { id: 'blue', label: '青色申告特別控除', type: 'choice', note: 'もうけ（事業所得）から引ける。期限内に青色申告の承認を受けていて、もうけがあるときだけ。もうけより大きくは引けない',
        memo: '赤字なら0円。もうけがあれば、複式なら65万円まで、簡易なら10万円まで',
        options: [
          { v: 'full', t: '65万円まで（複式簿記。紙で出すなら55万円まで）', okf: () => E5.blueKind(E5.numbers()) === 'full', why: '' },
          { v: 'ten', t: '10万円まで（簡易簿記）', okf: () => E5.blueKind(E5.numbers()) === 'ten', why: '' },
          { v: 'zero', t: '0円（赤字だった／青色の承認がない）', okf: () => E5.blueKind(E5.numbers()) === 'zero', why: '' },
        ],
        why: () => { const n = E5.numbers(); return !n.aoiroOK ? '青色申告の承認を受けていない（期限内に申請していない）ので、特別控除は使えない' : n.biz <= 0 ? `事業は${yen(n.biz)}の赤字。もうけがないので、引けるのは0円` : n.double ? `もうけは${yen(n.biz)}。複式簿記で出しているので65万円まで引ける` : `もうけは${yen(n.biz)}。簡易簿記なので10万円まで`; } },
      { id: 'salary', label: '給与所得', type: 'choice', note: '会社を辞めた年は年末調整されていないので、前の会社の源泉徴収票の分も合わせて申告する', memo: '源泉徴収票の分を入れる',
        options: [
          { v: 'yes', t: `前の会社の給料 ${yen(SALARY.income)} を入れる（源泉徴収票）`, ok: true },
          { v: 'no', t: '入れない（店の分だけ申告する）', ok: false, why: '1年の所得は全部合わせる。入れないと、引かれすぎた税金も戻ってこない' },
        ] },
      { id: 'shaho', label: '社会保険料控除', type: 'choice', note: '1年に払った社会保険料は、所得から引ける', memo: '会社の分＋国民年金＋国保',
        options: [
          { v: 'yes', t: '', dyn: () => `前の会社の社会保険料＋国民年金＋国保　${yen(SALARY.shaho + E5.numbers().pens)}`, ok: true },
          { v: 'no', t: '入れない', ok: false, why: '払った国民年金と国保は、社会保険料控除で引ける' },
        ] },
      { id: 'basic', label: '基礎控除', type: 'fixed', value: () => '104万円（令和8年分・合計所得489万円以下）', note: '令和8年分から上がった。給料だけの人だと「年収178万円の壁」と言われているもの' },
      { id: 'carry', label: '赤字の繰越', type: 'choice', note: '青色申告で、給料と合わせても赤字が残るなら、翌年から3年間繰り越せる（純損失の繰越控除）', memo: '合わせても赤字が残るなら繰り越す',
        options: [
          { v: 'yes', t: '翌年以降に繰り越す', okf: () => carryable() },
          { v: 'no', t: '繰り越さない', okf: () => !carryable() },
        ],
        why: () => { const r = E5.computeTax({ etax: true, cogs: true, salary: true, shaho: true, carry: true }); return !r.aoiroOK ? '繰り越せるのは青色申告だけ' : r.total < 0 ? `給料と合わせても${yen(-r.total)}の赤字が残る。青色なので繰り越せる` : '給料と合わせると赤字は残らない。繰り越すものがない'; } },
    ],
    send: '見直して送る（e-Tax）',
    get intro() {
      const base = [H('確定申告。……1年分の答え合わせだ'), X('はじめ、顔がこわいぞ'), H('こわいんだよ')];
      if ((G.flags.booksCount || 0) >= 6 || G.flags.taxIntroSeen) return base;
      G.flags.taxIntroSeen = true;
      K.fx({ stress: 20, hp: -10 });
      return [...base, H('……帳簿、ほとんどつけてない'), X('夜はおれさまとの時間だったからな！'), H('……レシートの箱、全部ひっくり返すぞ'), X('おれさまも手伝う！ ……これはなんだ'), H('おまえのプリンのレシート。経費じゃない'),
        { guide: '帳簿をあまりつけていなかったので、レシートを集め直すのに一晩かかった（ストレス↑　体力↓）。夜に「帳簿をつける」をしておくと、ここが楽になる' }];
    },
    after: S.C5_TAX_SELF_DONE,
    onDone: () => { if (K.mActive('5-07')) K.mFinish('5-07'); },
    finale: async ans => { await showTax(E5.computeTax({ etax: ans.how === 'etax', cogs: true, salary: true, shaho: true, carry: true })); },
  };
  const carryable = () => { const r = E5.computeTax({ etax: true, cogs: true, salary: true, shaho: true, carry: true }); return r.total < 0 && r.aoiroOK; };

  // ================================================================ 関門（3月31日）
  E5.gate = async () => {
    K.mStart('5-09');
    await Dlg.run(S.C5_GATE_INTRO);
    const cs = gateChecks();
    const pass = cs.every(c => c.ok);
    let html = '<div style="padding:16px 40px;font-size:32px">' + cs.map(c => `<div class="result-row"><span>${c.label}</span><span class="${c.ok ? 'good' : 'bad'}">${c.ok ? '✓' : '×'}</span></div>`).join('') + '</div>';
    html += `<div style="text-align:center;font-size:44px;padding:20px" class="${pass ? 'good' : 'bad'}">${pass ? '創業期の関門を越えた' : 'あと少し届かなかった'}</div>`;
    await UI.panelResult(html, '次へ', '創業期の関門', { cls: 'wide' });
    K.mFinish('5-09', pass);
    await Dlg.run(pass ? S.C5_GATE_PASS : S.C5_GATE_FAIL);
    G.bgm = 'ending';
    const total = G.ledger.reduce((s, m) => s + m.sales + m.gacha, 0);
    let sum = '<div style="padding:16px 40px">';
    sum += UI.row('1年間の売上', yen(total), 'money') + UI.row('手元のお金', yen(G.money)) + UI.row('借入の残り', yen(K.debt()), 'bad');
    sum += UI.row('評判', '★'.repeat(Math.floor(G.rep)) + '☆'.repeat(5 - Math.floor(G.rep))) + UI.row('集めた生気', '♥' + Math.floor(G.seiki), 'ask');
    sum += UI.row('二人の関係', G.flags.relStage || '居候', 'ask') + UI.row('称号', G.titles.length ? G.titles.join('、') : 'なし');
    if (G.flags.taxResult) sum += UI.row('確定申告', G.flags.taxResult.refund >= 0 ? `還付 ${yen(G.flags.taxResult.refund)}` : `納税 ${yen(-G.flags.taxResult.refund)}`);
    sum += `</div><div style="text-align:center;padding:16px;font-size:30px">${pass ? '多店舗期（2号店と法人成り）へ　——　試作版はここまで' : '2年目も創業期を続ける　——　試作版はここまで'}</div>`;
    await UI.panelResult(sum, 'タイトルへ', '創業期　おわり', { cls: 'wide' });
    K.clearSave();
    location.reload();
  };
  return E5;
})();
// 第4章までの Events から呼べるように
Events.gate = () => Events5.gate();
