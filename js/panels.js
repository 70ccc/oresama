'use strict';
// 第4章からのパネル：採用、借入
window.Panels = (() => {
  const P = {};
  const yen = K.yen;
  const minWage = () => { let w = 0; for (const m of D.MIN_WAGE) if (K.cmp(G.date, m.from) >= 0) w = m.wage; return w; };
  P.minWage = minWage;

  // ================================================================ 採用
  P.hire = () => {
    if (G.staff) return P.shift();
    let body = '<div class="xrow sub">時給×働いた時間が、月末に「アルバイト代」として出ていく。働く日は14時〜20時の6時間。東京の最低賃金は今、時給' + yen(minWage()) + '</div><div class="nacts">';
    for (const a of D.APPLICANTS) {
      const w = Math.max(a.wage, minWage());
      body += `<button class="nact" data-a="${a.id}"><div class="nname">${a.name}</div><div class="nfx">時給 ${yen(w)}　${'★'.repeat(a.skill)}${'☆'.repeat(3 - a.skill)}</div><div class="ndesc">${a.desc}</div></button>`;
    }
    body += '</div>';
    const p = UI.open('hire', '採用', body, '<span class="sub">雇う人を選ぶ</span><button class="pbtn" id="h-close">閉じる</button>', { cls: 'wide' });
    UI.bind(p, 'button[data-a]', b => {
      const a = D.APPLICANTS.find(x => x.id === b.dataset.a);
      G.staff = { id: a.id, name: a.name, wage: Math.max(a.wage, minWage()), hours: 6, skill: a.skill, sprite: a.sprite,
        days: [false, false, false, false, false, true, true], rest: [false, false, false, false, false, false, false], since: G.dayNo };
      E.toast(`${a.name}を雇った`);
      K.expense('other', 3000);   // 労災保険などの手続き
      if (K.mActive('4-04')) K.mFinish('4-04');
      K.mStart('4-10');
      Game.queueTalk(SCRIPT.C4_HIRED);
      P.shift();
    });
    UI.bind(p, '#h-close', () => UI.closePanel());
  };
  P.shift = () => {
    const s = G.staff;
    const days = s.days.filter(Boolean).length;
    const month = Math.round(s.wage * s.hours * days * 4.3);
    let body = `<div class="xrow">${s.name}　時給 ${yen(s.wage)}　1日${s.hours}時間　<span class="sub">ひと月の見込み</span> <span class="money">${yen(month)}</span></div>
      <div class="xrow sub">働く曜日を選ぶ。「肇が休む」をつけた日は、店をアルバイトにまかせて肇は休む（体力が戻る）</div>
      <table style="margin:0 24px;width:calc(100% - 48px)"><tr><th></th>${[1, 2, 3, 4, 5, 6, 0].map(d => `<th class="num">${D.WEEK[d]}</th>`).join('')}</tr>
      <tr><td>働く日</td>${[1, 2, 3, 4, 5, 6, 0].map(d => `<td class="num"><button class="mini ${s.days[d] ? 'onmini' : ''}" data-day="${d}">${s.days[d] ? '◯' : '－'}</button></td>`).join('')}</tr>
      <tr><td>肇が休む</td>${[1, 2, 3, 4, 5, 6, 0].map(d => `<td class="num">${s.days[d] ? `<button class="mini ${s.rest[d] ? 'onmini' : ''}" data-rest="${d}">${s.rest[d] ? '休' : '－'}</button>` : ''}</td>`).join('')}</tr></table>`;
    const p = UI.open('hire', 'シフト', body, '<span class="sub">月8.8万円未満なら、扶養控除等申告書を出してもらえば源泉所得税はかからない</span><button class="pbtn" id="h-close">閉じる</button>', { cls: 'wide' });
    UI.bind(p, 'button[data-day]', b => { const d = Number(b.dataset.day); s.days[d] = !s.days[d]; if (!s.days[d]) s.rest[d] = false; P.shift(); Game.check(); });
    UI.bind(p, 'button[data-rest]', b => { const d = Number(b.dataset.rest); s.rest[d] = !s.rest[d]; P.shift(); Game.check(); });
    UI.bind(p, '#h-close', () => UI.closePanel());
  };

  // ================================================================ 借入
  P.loan = () => {
    const app = G.loanApp;
    let body = '<div class="nacts">';
    for (const [k, l] of Object.entries(D.LENDERS)) {
      const used = G.loans.some(x => x.lender === k) || (G.flags.rejected || {})[k];
      const needPlan = k !== 'loan' && !G.forms.keikaku;
      const busy = app && !app.done;
      const dis = used || busy || needPlan;
      let note = '';
      if (G.loans.some(x => x.lender === k)) note = '借りている';
      else if ((G.flags.rejected || {})[k]) note = '断られた';
      else if (app && app.lender === k && !app.done) note = `審査中（${app.decide - G.dayNo}日後に結果）`;
      else if (needPlan) note = '創業計画書が要る';
      body += `<button class="nact" data-l="${k}" ${dis ? 'disabled' : ''}><div class="nname">${l.name}</div>
        <div class="nfx">${K.man(l.amount)}まで　年${(l.rate * 100).toFixed(1)}%　${l.years}年${l.grace ? `（据置${l.grace}か月）` : ''}</div><div class="ndesc">${l.desc}</div>${note ? `<div class="ndesc ask">${note}</div>` : ''}</button>`;
    }
    body += '</div>';
    if (G.loans.length) {
      body += '<table style="margin:10px 24px;width:calc(100% - 48px)"><tr><th>借り先</th><th class="num">借りた額</th><th class="num">残り</th><th class="num">金利</th><th class="num">今月の返済</th></tr>' +
        G.loans.map(l => { const pm = K.loanPayment(l); return `<tr><td>${l.name}</td><td class="num">${yen(l.amount)}</td><td class="num">${yen(l.left)}</td><td class="num">${(l.rate * 100).toFixed(1)}%</td><td class="num">${yen(pm.total)}<span class="sub">（元金${yen(pm.principal)}・利息${yen(pm.interest)}）</span></td></tr>`; }).join('') + '</table>';
    }
    const p = UI.open('loan', '借入', body, `<span class="sub">個人事業の借金は、肇本人の借金。店が潰れても残る</span><button class="pbtn" id="l-close">閉じる</button>`, { cls: 'wide' });
    UI.bind(p, 'button[data-l]', b => { UI.closePanel(); Events.applyLoan(b.dataset.l); });
    UI.bind(p, '#l-close', () => UI.closePanel());
  };
  return P;
})();
