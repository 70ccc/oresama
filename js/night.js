'use strict';
// 夜：家での行動を1つ選ぶ。勉強と書類もここ
window.Night = (() => {
  const N = {};
  const X = t => ['シャオ', t], H = t => ['肇', t];
  const yen = K.yen;
  const relName = () => G.flags.relStage || '居候';
  // 効き目を数字で見せる（例：体力+36 機嫌−5）。体力・機嫌は増えるほどよく、ストレス・空腹は減るほどいい
  const NAMES = { hp: '体力', stress: 'ストレス', hunger: '空腹', mood: '機嫌' };
  const fxText = (fx, extra = '') => Object.entries(fx).filter(([k]) => NAMES[k]).map(([k, v]) => {
    const good = (k === 'stress' || k === 'hunger') ? v < 0 : v > 0;
    return `<span class="${good ? 'up' : 'dn'}">${NAMES[k]}${v > 0 ? '+' : '−'}${Math.abs(v)}</span>`;
  }).join(' ') + (extra ? ` ${extra}` : '');
  const booksFx = () => ({ ...D.NIGHT_FX.books, stress: D.NIGHT_FX.books.stress + Math.floor(K.pendingBooks() / 4) });
  const monthLeft = () => K.daysInMonth() - G.date.d;

  // ================================================================ 行動の一覧
  const studyTopics = () => Object.keys(SCRIPT.STUDY).filter(k => G.flags['u_study_' + k] || ['kaigyo', 'aoiro', 'shiire'].includes(k));
  const formsReady = () => Object.keys(FORMS).filter(k => FORMS[k].fields && !G.forms[k] && (!FORMS[k].topic || (G.study[FORMS[k].topic] || 0) >= 3) && (!FORMS[k].when || FORMS[k].when()));
  const formsPending = () => Object.keys(FORMS).filter(k => FORMS[k].fields && !G.forms[k] && (!FORMS[k].when || FORMS[k].when()));
  N.actions = () => {
    const g = G.gauges;
    const F = D.NIGHT_FX;
    const list = [
      { id: 'talk', name: '話す', desc: 'シャオの機嫌が上がる。関係が少し進む', fx: fxText(F.talk, '関係↑') },
      { id: 'sex', name: 'エッチする', desc: 'シャオがお腹いっぱいになって、ごきげんになる。肇のストレスも抜けるが、体力を使う', fx: fxText(F.sex, '関係↑') },
      { id: 'sleep', name: '早く寝る', desc: '肇の体力がしっかり戻る。シャオは少し退屈する', fx: fxText(F.sleep) },
      { id: 'smoke', name: 'ベランダで一服', desc: '肇のストレスが下がる', fx: fxText(F.smoke) },
      { id: 'outing', name: 'シャオと出かける', desc: `近所の雑貨屋をシャオとめぐる。機嫌が大きく上がる。新しい商品が見つかることも（デート代3,000円）`, fx: fxText(F.outing, '関係↑') },
      { id: 'study', name: '勉強する', desc: '書類や仕入れの勉強。★3になると書類が書ける。シャオはほったらかしで退屈する', fx: fxText(F.study), sub: studyTopics().map(k => `${SCRIPT.STUDY[k].name} ${'★'.repeat(G.study[k] || 0)}${'☆'.repeat(3 - (G.study[k] || 0))}`).join('　') },
    ];
    const ready = formsReady(), fpend = formsPending();
    if (fpend.length) list.push({ id: 'form', name: '書類を書く', desc: ready.length ? `書ける書類：${ready.map(k => FORMS[k].short).join('、')}` : '勉強が★3になったら書ける', fx: fxText(F.form), disabled: !ready.length });
    const pend = K.pendingBooks();
    const bdone = K.booksDone();
    if (G.flags.u_books) list.push({ id: 'books', name: '帳簿をつける', desc: `${bdone ? `${G.date.m}月の帳簿は1回つけてある。` : `<span class="bad">${G.date.m}月の帳簿はまだ。</span>`}月に1回はつけないと確定申告ができない（つけないまま月末になると、税務署の人が来る）。${pend ? `いま${pend}日分たまっている` : ''}`, fx: fxText(booksFx()), disabled: !pend });
    if (G.flags.u_share) list.push({ id: 'share', name: '生気のおすそわけ', desc: 'シャオが自分の生気を分けてくれる。肇の体力が大きく戻る（♥15）', fx: fxText(F.share, '♥−15'), disabled: G.seiki < 15 });
    // おすすめ
    let rec = null, why = '';
    const aoiroLeft = !G.forms.aoiro ? K.dayNoOf({ y: 2026, m: G.flags.kaigyoDate === '4/1' ? 5 : 6, d: G.flags.kaigyoDate === '4/1' ? 31 : 7 }) - G.dayNo : 999;
    const booksLate = G.flags.u_books && !bdone && pend > 0 && monthLeft() <= 2;
    const booksSoon = G.flags.u_books && !bdone && pend > 0 && (monthLeft() <= 7 || pend >= 14);
    if (g.hp < 35) { rec = G.flags.u_share && G.seiki >= 15 && g.hp < 15 ? 'share' : 'sleep'; why = '肇の体力が少ない。30を切ると会計が遅くなる'; }
    else if (booksLate) { rec = 'books'; why = `${G.date.m}月の帳簿がまだ。月末まであと${monthLeft()}日。つけないと税務署の人が来る`; }
    else if (aoiroLeft < 999 && ready.includes('aoiro')) { rec = 'form'; why = `青色申告の申請が書ける。期限まであと${aoiroLeft}日`; }
    else if (aoiroLeft < 40 && (G.study.aoiro || 0) < 3) { rec = 'study'; why = `青色申告の申請の期限まであと${aoiroLeft}日。勉強して★3にすると書ける`; }
    else if (g.hunger > 70) { rec = 'sex'; why = 'シャオのお腹が空いている。このままだと機嫌が下がる'; }
    else if (g.mood < 35 && g.stress > 60 && g.hp >= 45) { rec = 'sex'; why = 'シャオの機嫌が悪くて、肇のストレスもたまっている。両方いっぺんに戻る（体力は使う）'; }
    else if (g.mood < (G.unlock.xiao ? 45 : 35) && g.hp >= 40 && G.money > 30000) { rec = 'outing'; why = 'シャオの機嫌が下がっている。30を切るとレジに立ってくれない。出かけると大きく戻る'; }
    else if (g.mood < (G.unlock.xiao ? 45 : 35)) { rec = 'talk'; why = 'シャオの機嫌が下がっている。30を切るとレジに立ってくれない'; }
    else if (g.stress > 75) { rec = g.hp >= 60 ? 'sex' : 'smoke'; why = g.hp >= 60 ? '肇のストレスがたまっている。体力に余裕があるうちに' : '肇のストレスがたまっている。85を超えると接客が雑になって評判が下がる'; }
    else if (ready.includes('kakutei')) { rec = 'form'; why = `確定申告が書ける。期限まであと${K.dayNoOf({ y: 2027, m: 3, d: 15 }) - G.dayNo}日`; }
    else if (K.mActive('5-07') && !G.flags.taxPro && (G.study.kakutei || 0) < 3) { rec = 'study'; why = `確定申告の期限（3/15）まであと${K.dayNoOf({ y: 2027, m: 3, d: 15 }) - G.dayNo}日。勉強して★3にすると書ける（2/16から）`; }
    else if (ready.length) { rec = 'form'; why = '書ける書類がある'; }
    else if (booksSoon) { rec = 'books'; why = `${G.date.m}月の帳簿がまだ。月に1回はつけないと、確定申告ができない（月末まであと${monthLeft()}日）`; }
    else if (studyTopics().some(k => (G.study[k] || 0) < 3)) { rec = 'study'; why = '余裕のあるうちに勉強しておくと、あとが楽'; }
    else { rec = 'talk'; why = 'たまには話す'; }
    for (const a of list) if (a.id === rec && !a.disabled) { a.rec = true; a.why = why; }
    return list;
  };

  // ================================================================ 夜のパネル
  const gaugeHtml = () => {
    const g = G.gauges;
    const bar = (lbl, v, pink, inv) => `<div class="gauge ${pink ? 'pink' : ''}"><span class="lbl">${lbl}</span><span class="bar"><i style="width:${K.clamp(v, 0, 100)}%" class="${(inv ? v > 70 : v < 30) ? 'warn' : ''}"></i></span><span class="gv">${Math.round(v)}</span></div>`;
    return `<div class="ngauges"><div>${bar('肇 体力', g.hp)}${bar('肇 ストレス', g.stress, false, true)}</div><div>${bar('シャオ 空腹', g.hunger, true, true)}${bar('シャオ 機嫌', g.mood, true)}</div></div>
      <div class="sub" style="padding:0 24px 8px">二人の関係：<span class="ask">${relName()}</span>　♥${Math.floor(G.seiki)}</div>`;
  };
  N.choose = () => new Promise(res => {
    const list = N.actions();
    const recA = list.find(a => a.rec);
    let body = gaugeHtml() + `<div class="sub" style="padding:0 24px 6px">どの行動のあとも、眠ると ${fxText(D.NIGHT_BASE).replace(/class="(up|dn)"/g, '')}</div><div class="nacts">`;
    for (const a of list) {
      body += `<button class="nact ${a.rec ? 'isrec' : ''}" data-a="${a.id}" ${a.disabled ? 'disabled' : ''}>
        <div class="nname">${a.name}${a.rec ? '<span class="rec">おすすめ</span>' : ''}</div><div class="nfx">${a.fx}</div><div class="ndesc">${a.desc}</div>${a.sub ? `<div class="ndesc ask">${a.sub}</div>` : ''}</button>`;
    }
    body += '</div>';
    if (recA) body += `<div class="recnote" style="margin:4px 24px 0"><b>おすすめ：${recA.name}</b>　${recA.why}</div>`;
    const p = UI.open('night', `夜　${K.fmt()}`, body, '<span class="sub">行動を1つ選ぶと、その晩は終わり</span><span></span>', { noClose: true, cls: 'wide' });
    UI.bind(p, 'button[data-a]', b => { p.classList.add('hidden'); G.openPanel = null; res(b.dataset.a); });
  });

  // ================================================================ 夜の流れ
  N.run = async (opt = {}) => {
    G.mode = 'night';
    G.scene = 'room';
    UI.show('menu', false);
    UI.show('timebar', false);
    UI.updateHud();
    if (!G.done.night1 && G.chapter >= 2) { G.done.night1 = true; await Dlg.run(SCRIPT.NIGHT1); }
    await K.runEvents('night');
    if (G.flags.skipNight) { G.flags.skipNight = false; nightBase(); return; }
    for (;;) {
      const a = await N.choose();
      const ok = await N.act(a);
      if (ok !== false) break;
    }
    nightBase();
    UI.updateHud();
    void opt;
  };
  // 眠ると少し戻る。シャオはお腹が空く
  const nightBase = () => K.fx(D.NIGHT_BASE);

  const variantOf = (pool, key) => {
    const n = G.flags[key] || 0;
    G.flags[key] = n + 1;
    return pool[n % pool.length];
  };
  N.act = async a => {
    if (a === 'talk') {
      G.flags.talkCount = (G.flags.talkCount || 0) + 1;
      if (G.date.m === 4 && G.date.y === 2026) G.flags.talkApril = (G.flags.talkApril || 0) + 1;
      const used = G.flags.talkUsed || [];
      // 2-07：4月の3回目は「シャオの好きなもの」
      if (G.flags.talkApril === 3 && !G.done.suki) {
        G.done.suki = true;
        await Dlg.run(SCRIPT.SUKI);
        K.fx({ mood: 15, rel: 2, stress: -6 });
        if (K.mActive('2-07')) K.mFinish('2-07');
        return;
      }
      const t = SCRIPT.TALK.find(x => !x.event && !used.includes(x.id));
      if (t) {
        used.push(t.id);
        G.flags.talkUsed = used;
        await Dlg.run(t.lines);
        K.fx(t.fx);
      } else {
        await Dlg.run(variantOf(SCRIPT.TALK_AGAIN, 'talkAgain'));
        K.fx({ ...D.NIGHT_FX.talk, rel: 0.5 });
      }
      return;
    }
    if (a === 'sex') {
      const g = G.gauges;
      const key = g.hp < 35 ? 'tired' : g.hunger > 70 ? 'hungry' : g.mood < 35 ? 'moody' : g.stress > 70 ? 'stress' : 'normal';
      const lines = variantOf(SCRIPT.SEX[key], 'sex_' + key);
      await Dlg.run([{ dark: true }, ...lines, { hearts: 18 }, { wait: 600 }, { dark: false }, ...K.pick(SCRIPT.SEX_AFTER)]);
      K.fx({ ...D.NIGHT_FX.sex, rel: 0.5 });
      G.flags.sexCount = (G.flags.sexCount || 0) + 1;
      return;
    }
    if (a === 'sleep') {
      await Dlg.run(G.gauges.hunger > 75 ? SCRIPT.SLEEP_HUNGRY : variantOf(SCRIPT.SLEEP, 'sleepN'));
      K.fx(D.NIGHT_FX.sleep);
      return;
    }
    if (a === 'smoke') {
      await Dlg.run(variantOf(SCRIPT.SMOKE, 'smokeN'));
      K.fx(D.NIGHT_FX.smoke);
      return;
    }
    if (a === 'books') {
      const pend = K.pendingBooks();
      if (!pend) return false;
      const fx = booksFx();
      await Dlg.run(variantOf(SCRIPT.BOOKS, 'booksN'));
      G.flags.booked = G.dayNo;
      K.fx(fx);
      G.flags.booksCount = (G.flags.booksCount || 0) + 1;
      G.flags.booksYear = (G.flags.booksYear || 0) + 1;
      G.flags.booksMonth = K.monthKey();
      E.toast(`帳簿をつけた（${pend}日分）。${G.date.m}月の分はこれでよし`);
      Game.check();
      return;
    }
    if (a === 'share') {
      await Dlg.run(variantOf(SCRIPT.SHARE, 'shareN'));
      K.fx({ ...D.NIGHT_FX.share, seiki: -15, rel: 0.5 });
      return;
    }
    if (a === 'outing') return N.outing();
    if (a === 'study') return N.study();
    if (a === 'form') return N.form();
    return;
  };

  // ================================================================ シャオと出かける（雑貨屋めぐり）
  N.outing = async () => {
    if (G.money < 3000) { E.toast('お金が足りない', 'bad'); return false; }
    const n = G.flags.outings || 0;
    const before = D.PRODUCTS.filter(p => K.available(p)).map(p => p.id);
    await Dlg.run(SCRIPT.OUTING[n] || variantOf(SCRIPT.OUTING_AGAIN, 'outAgain'));
    G.flags.outings = n + 1;
    K.personal('date', 3000);
    K.fx({ ...D.NIGHT_FX.outing, rel: 1 });
    const now = D.PRODUCTS.filter(p => K.available(p) && !before.includes(p.id));
    if (now.length) E.toast(`仕入れられるようになった：${now.map(p => p.name).join('、')}`);
    Game.check();
    return true;
  };

  // ================================================================ 勉強
  N.study = async () => {
    const topics = studyTopics();
    const k = await new Promise(res => {
      let body = '<div class="nacts">';
      for (const t of topics) {
        const lv = G.study[t] || 0;
        const st = SCRIPT.STUDY[t];
        body += `<button class="nact" data-t="${t}" ${lv >= 3 ? 'disabled' : ''}><div class="nname">${st.name}</div>
          <div class="nfx ask">${'★'.repeat(lv)}${'☆'.repeat(3 - lv)}</div><div class="ndesc">${lv >= 3 ? 'もう全部覚えた' : `第${lv + 1}回を読む${st.form ? `。★3で「${FORMS[st.form] ? FORMS[st.form].short : ''}」が書ける` : st.perks && st.perks[lv + 1] ? `。★${lv + 1}で「${st.perks[lv + 1].name}」` : ''}`}</div></button>`;
      }
      body += '</div>';
      const p = UI.open('study', '勉強する', body, '<span class="sub">本とネットで調べる。最後に2問だけ確かめる</span><button class="pbtn" id="st-back">やめる</button>', { noClose: true });
      UI.bind(p, 'button[data-t]', b => { p.classList.add('hidden'); G.openPanel = null; res(b.dataset.t); });
      UI.bind(p, '#st-back', () => { p.classList.add('hidden'); G.openPanel = null; res(null); });
    });
    if (!k) return false;
    const st = SCRIPT.STUDY[k];
    const lv = G.study[k] || 0;
    const lesson = st.lessons[lv];
    await Dlg.run(lesson.lines);
    const right = await N.quiz(st.name, lv + 1, lesson.quiz);
    K.fx(D.NIGHT_FX.study);
    if (right === lesson.quiz.length) {
      G.study[k] = lv + 1;
      E.toast(`${st.name}：${'★'.repeat(lv + 1)}${'☆'.repeat(2 - lv)}`);
      const perk = st.perks && st.perks[lv + 1];
      if (perk) {
        G.flags['u_' + perk.id] = true;
        E.toast(perk.toast);
      }
      if (st.unlock && lv + 1 === 1) {
        G.flags['u_' + st.unlock] = true;
        await Dlg.run(SCRIPT.STUDY_BOOKS_OPEN);
        E.toast('夜の行動に「帳簿をつける」が増えた');
      } else if (lv + 1 >= 3) {
        await Dlg.run(SCRIPT.STUDY_DONE);
        if (st.form && FORMS[st.form]) E.toast(`「${FORMS[st.form].short}」が書けるようになった`);
      } else await Dlg.run(K.pick(SCRIPT.STUDY_PASS));
      Game.check();
    } else {
      await Dlg.run(SCRIPT.STUDY_FAIL);
    }
    return true;
  };
  // 確かめの2問。間違えたら解説を見せる
  N.quiz = (name, n, qs) => new Promise(res => {
    let i = 0, right = 0;
    const p = () => document.getElementById('panel');
    // 選択肢の順番は毎回まぜる
    const orders = qs.map(q => q.a.map((_, j) => j).sort(() => Math.random() - 0.5));
    const show = (answered, pickIdx) => {
      const q = qs[i];
      let body = `<div class="quiz"><div class="qn sub">${name}　第${n}回の確かめ（${i + 1}／${qs.length}）</div><div class="qq">${UI.esc(q.q)}</div><div class="fopts">`;
      body += orders[i].map(j => {
        let cls = '';
        if (answered) cls = j === q.ok ? 'okans' : j === pickIdx ? 'ngans' : '';
        return `<button class="pbtn ${cls}" data-j="${j}" ${answered ? 'disabled' : ''}>${UI.esc(q.a[j])}</button>`;
      }).join('') + '</div>';
      if (answered) body += `<div class="${pickIdx === q.ok ? 'good' : 'bad'}" style="margin-top:16px">${pickIdx === q.ok ? '○ 正解' : '× ちがう'}</div><div class="fnote" style="margin-top:8px">${UI.esc(q.why)}</div>`;
      body += '</div>';
      const foot = answered ? `<span></span><button class="pbtn on" id="q-next">${i + 1 < qs.length ? '次へ' : 'おわり'}</button>` : '<span></span><span></span>';
      const pp = UI.open('lesson', '確かめ', body, foot, { noClose: true });
      UI.bind(pp, 'button[data-j]', b => { const j = Number(b.dataset.j); if (j === qs[i].ok) right++; show(true, j); });
      UI.bind(pp, '#q-next', () => {
        i++;
        if (i < qs.length) show(false);
        else { p().classList.add('hidden'); G.openPanel = null; res(right); }
      });
    };
    show(false);
  });

  // ================================================================ 書類
  N.form = async () => {
    const ready = formsReady();
    if (!ready.length) return false;
    let k = ready[0];
    if (ready.length > 1) {
      k = await new Promise(res => {
        const body = '<div class="nacts">' + ready.map(f => `<button class="nact" data-f="${f}"><div class="nname">${FORMS[f].short}</div><div class="ndesc">期限：${FORMS[f].deadline}</div></button>`).join('') + '</div>';
        const p = UI.open('study', 'どの書類を書く？', body, '<span></span><button class="pbtn" id="f-back">やめる</button>', { noClose: true });
        UI.bind(p, 'button[data-f]', b => { p.classList.add('hidden'); G.openPanel = null; res(b.dataset.f); });
        UI.bind(p, '#f-back', () => { p.classList.add('hidden'); G.openPanel = null; res(null); });
      });
      if (!k) return false;
    }
    const intro = { kaigyo: SCRIPT.FORM_KAIGYO_IN, aoiro: SCRIPT.FORM_AOIRO_IN }[k] || FORMS[k].intro;
    if (intro) await Dlg.run(intro);
    const res = await FormGame.open(k);
    K.fx(D.NIGHT_FX.form);
    if (!res.done) { await Dlg.run(SCRIPT.FORM_LATER); return true; }
    G.forms[k] = { day: G.dayNo, perfect: res.perfect };
    if (FORMS[k].onDone) await FORMS[k].onDone(res.ans);
    if (k === 'kaigyo') G.flags.kaigyoDate = res.ans.date_open;
    if (k === 'aoiro') { G.flags.kaigyoDate = G.flags.kaigyoDate || res.ans.date_open; G.flags.boki = res.ans.boki; }
    const mid = { kaigyo: '1-09', aoiro: '1-10' }[k];
    if (mid && K.mActive(mid)) K.mFinish(mid);
    Game.check();
    const after = k === 'kaigyo' ? SCRIPT.FORM_KAIGYO_DONE : k === 'aoiro' ? (G.flags.boki === 'double' ? SCRIPT.FORM_AOIRO_DOUBLE : SCRIPT.FORM_AOIRO_SIMPLE) : (FORMS[k].after || []);
    const lines = res.perfect ? [X('一発で書けたのか。やるじゃないか'), ...after] : [...SCRIPT.FORM_RETRY, ...after];
    if (res.perfect) K.fx({ stress: -10 });
    await Dlg.run(lines);
    if (FORMS[k].finale) await FORMS[k].finale(res.ans);
    return true;
  };
  void H; void yen;
  return N;
})();
