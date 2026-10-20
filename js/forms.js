'use strict';
// 書類のミニゲーム：開業届、青色申告承認申請書（あとで確定申告などを足す）
// 項目と説明は国税庁の様式と案内に合わせている（docs/05 に出典）
// 項目の種類：fixed＝もう決まっている（説明を読むだけ）、choice＝1つ選ぶ、multi＝いくつでも選ぶ
// note：やさしい説明。memo：勉強が★3になると出る「勉強メモ」（答えの決め手）
window.FORMS = (() => {
  const X = t => ['シャオ', t], H = t => ['肇', t];
  const DATES = () => [
    { v: '4/1', t: '4月1日（店を借りた日）', ok: true },
    { v: '4/8', t: '4月8日（開店した日）', ok: true },
    { v: '3/x', t: '3月某日（シャオが来た日）', ok: false, say: X('おれさまと出会った記念日だ！'), why: '事業を始めた日を書く。シャオが来た日は、店の準備も何も始まっていない' },
  ];
  const F = {};
  const today = () => `令和8年${G.date.m}月${G.date.d}日`;

  F.kaigyo = {
    title: '個人事業の開業・廃業等届出書',
    short: '開業届', topic: 'kaigyo',
    deadline: '令和9年3月15日（今年の確定申告の期限）まで',
    fields: [
      { id: 'office', label: '提出先', type: 'fixed', value: () => '（住所地を受け持つ）税務署長',
        note: '家の住所を受け持つ税務署に出す。スマホとマイナンバーカードがあれば、e-Taxで送れる' },
      { id: 'date', label: '提出日', type: 'fixed', value: today, note: '出す日を書く' },
      { id: 'place', label: '納税地', type: 'choice',
        note: '税金の手続きをする場所。ふつうは自分の家（住所地）にする',
        memo: '家の住所＝「住所地」でいい',
        options: [
          { v: 'home', t: '住所地（自宅）', ok: true, rec: true },
          { v: 'stay', t: '居所地', ok: false, why: '居所地は、住所とは別のところに住んでいるときに使う。肇は自宅に住んでいる' },
          { v: 'shop', t: '事業所等（店）', ok: true, say: H('店にしてもいいのか。……ややこしくなるから家にしとくか') },
        ] },
      { id: 'name', label: '氏名・生年月日・個人番号', type: 'fixed', value: () => '真島 肇（まじま はじめ）／生年月日と個人番号はカードから写す',
        note: '個人番号（マイナンバー）はマイナンバーカードを見て写す' },
      { id: 'job', label: '職業', type: 'choice',
        note: 'これから始める仕事を短く書く。「小売業」くらいでいい',
        memo: '店で物を売る＝「小売業」',
        options: [
          { v: 'retail', t: '小売業', ok: true },
          { v: 'office', t: '会社員', ok: false, why: 'ここに書くのは、これから始める店の仕事' },
          { v: 'kaicho', t: '会長の付き人', ok: false, say: X('正直でいいじゃないか'), why: 'そんな職業はない' },
        ] },
      { id: 'yago', label: '屋号', type: 'fixed', value: () => G.storeName,
        note: '店の名前。付けなくてもいい', say: X('おれさまが付けた名前だぞ。ありがたく書け') },
      { id: 'kind', label: '届出の区分', type: 'choice',
        note: '新しく店を始めるので「開業」',
        memo: '始めた＝「開業」',
        options: [
          { v: 'open', t: '開業', ok: true },
          { v: 'close', t: '廃業', ok: false, say: X('もう辞めるのか！？'), why: '今日開店したばかり' },
          { v: 'new', t: '事務所・事業所の新増設', ok: false, why: 'もう商売をしている人が、店を増やしたときに使う' },
        ] },
      { id: 'income', label: '所得の種類', type: 'choice',
        note: '店のもうけは「事業所得」。会社の給料（給与所得）はこの欄にない',
        memo: '店のもうけ＝「事業所得」',
        options: [
          { v: 'biz', t: '事業（農業）所得', ok: true },
          { v: 'estate', t: '不動産所得', ok: false, why: '部屋や土地を貸して家賃をもらうときの所得' },
          { v: 'forest', t: '山林所得', ok: false, say: X('山を持ってるのか！？'), why: '山の木を売ったときの所得' },
          { v: 'salary', t: '給与所得', ok: false, why: '会社からもらう給料のこと。開業届の欄にはない' },
        ] },
      { id: 'date_open', label: '開業日', type: 'choice', match: 'kaigyoDate',
        note: '店を始めた日。店を借りた日か、開店した日のどちらかにする',
        memo: '店を借りた日（4/1）か、開店した日（4/8）。2つの書類でそろえる',
        options: DATES() },
      { id: 'with_aoiro', label: '開業に伴う届出書の提出の有無（青色申告承認申請書）', type: 'choice',
        note: '青色申告の申請も出すなら「有」',
        memo: '青色申告もする＝「有」',
        options: [
          { v: 'yes', t: '有', ok: true, rec: true },
          { v: 'no', t: '無', ok: true, say: H('……青色、出さないつもりか俺') },
        ] },
      { id: 'summary', label: '事業の概要', type: 'choice',
        note: '何を売る店か、具体的に書く',
        memo: '売っている物を並べて書く',
        options: [
          { v: 'detail', t: '駄菓子・菓子・飲み物・日用品・雑貨の店頭販売', ok: true },
          { v: 'vague', t: 'いろいろ売る', ok: false, why: '何を売るのか、具体的に書く' },
          { v: 'seiki', t: '人間から生気を集める', ok: false, say: X('一番正しいだろ！'), why: '税務署に出す書類です' },
        ] },
      { id: 'pay', label: '給与等の支払の状況', type: 'choice',
        note: '人を雇って給料を払うときだけ書く。雇っていなければ空欄',
        memo: '誰も雇っていない＝書かない',
        options: [
          { v: 'none', t: '書かない（雇っている人はいない）', ok: true },
          { v: 'xiao', t: '使用人1人（シャオ）', ok: false, say: X('おれさまは会長だ！ 使用人じゃない！'),
            why: '給料を払っていないので従業員ではない。人を雇ったら、別に「給与支払事務所等の開設届出書」を1か月以内に出す' },
        ] },
    ],
  };

  F.aoiro = {
    title: '所得税の青色申告承認申請書',
    short: '青色申告の申請', topic: 'aoiro',
    deadline: '開業日から2か月以内',
    fields: [
      { id: 'office', label: '提出先・提出日', type: 'fixed', value: () => `（住所地を受け持つ）税務署長／${today()}`,
        note: '開業届と同じ税務署に出す' },
      { id: 'who', label: '納税地・氏名など', type: 'fixed', value: () => '開業届と同じ',
        note: '住所、氏名、職業、屋号。開業届と同じでいい' },
      { id: 'year', label: '青色申告を始める年分', type: 'choice',
        note: '何年分から青色申告にするか。期限内に出せば今年の分から使える',
        memo: '今年から＝「令和8年分」',
        options: [
          { v: 'r8', t: '令和8年分（今年から）', ok: true },
          { v: 'r9', t: '令和9年分（来年から）', ok: false, say: H('来年からだと、今年の分は白色になるのか'), why: '期限内に出せば今年から使える。来年からにする理由がない' },
        ] },
      { id: 'shop', label: '事業所の名称・所在地', type: 'fixed', value: () => `${G.storeName}（商店街の店舗）`,
        note: '店の名前と住所' },
      { id: 'income', label: '所得の種類', type: 'choice',
        note: '開業届と同じく「事業所得」',
        memo: '店のもうけ＝「事業所得」',
        options: [
          { v: 'biz', t: '事業所得', ok: true },
          { v: 'estate', t: '不動産所得', ok: false, why: '家賃収入のときの所得' },
          { v: 'forest', t: '山林所得', ok: false, why: '山の木を売ったときの所得' },
        ] },
      { id: 'past', label: '青色申告の承認を取り消されたり、やめたりしたことがあるか', type: 'choice',
        note: '前に青色申告をしていたことがある人だけの欄。初めてなら「無」',
        memo: '初めて＝「無」',
        options: [
          { v: 'no', t: '無', ok: true },
          { v: 'yes', t: '有', ok: false, say: X('前科か？'), why: '肇は初めての開業' },
        ] },
      { id: 'date_open', label: '開業日（1月16日以後に開業した場合）', type: 'choice', match: 'kaigyoDate',
        note: '開業届と同じ日を書く。この日から2か月以内が、この申請の期限',
        memo: '開業届と同じ日',
        options: DATES() },
      { id: 'inherit', label: '相続による事業承継の有無', type: 'choice',
        note: '亡くなった家族の店を継いだときだけ「有」',
        memo: '継いでいない＝「無」',
        options: [
          { v: 'no', t: '無', ok: true },
          { v: 'yes', t: '有', ok: false, say: X('前の駄菓子屋を継いだのか？'), why: '店の場所を借りただけで、前の駄菓子屋の商売を継いだわけではない' },
        ] },
      { id: 'boki', label: '簿記方式', type: 'choice',
        note: '帳簿のつけ方。「複式簿記」はちゃんとした帳簿で、65万円引いてもらえる（会計ソフトを使えば大丈夫）。「簡易簿記」はお小遣い帳くらいで、10万円',
        memo: '会計ソフトを使うなら「複式簿記」。65万円の控除がねらえる',
        options: [
          { v: 'double', t: '複式簿記', ok: true, rec: true, say: X('ふくしき？ 65万円もらえるのか！') },
          { v: 'simple', t: '簡易簿記', ok: true, say: H('楽だけど控除は10万円か……') },
        ] },
      { id: 'books', label: '備付帳簿名', type: 'multi',
        note: 'これからつける帳簿に印をつける。複式簿記なら「総勘定元帳」と「仕訳帳」は必ず要る',
        memo: '複式なら総勘定元帳・仕訳帳＋現金出納帳・経費帳。冷蔵ケースを買ったなら固定資産台帳も',
        options: [
          { v: 'genkin', t: '現金出納帳' }, { v: 'urikake', t: '売掛帳' }, { v: 'kaikake', t: '買掛帳' },
          { v: 'keihi', t: '経費帳' }, { v: 'kotei', t: '固定資産台帳' }, { v: 'yokin', t: '預金出納帳' },
          { v: 'motocho', t: '総勘定元帳' }, { v: 'shiwake', t: '仕訳帳' }, { v: 'kanni', t: '現金式簡易帳簿' },
        ] },
      { id: 'zeirishi', label: '関与税理士', type: 'choice',
        note: '頼んでいる税理士がいれば書く。いなければ空欄',
        memo: 'いない＝書かない',
        options: [
          { v: 'none', t: '書かない（いない）', ok: true },
          { v: 'xiao', t: 'シャオ', ok: false, say: X('おれさまが見てやる！'), why: '税理士は国家資格' },
        ] },
    ],
  };

  // 創業計画書（公庫・信金の融資に使う）
  const avgSales = () => {
    const l = G.ledger.filter(m => m.y === 2026 && m.m >= 4);
    const xs = l.length ? l.map(m => m.sales + m.gacha) : [K.gross() * 3];
    return Math.max(100000, Math.round(xs.reduce((a, b) => a + b, 0) / xs.length / 10000) * 10000);
  };
  const manYen = n => `${Math.round(n / 10000)}万円`;
  F.keikaku = {
    send: '見直して出す（日本政策金融公庫へ）',
    title: '創業計画書', short: '創業計画書', topic: 'yushi',
    deadline: '融資の申し込みまで', when: () => G.flags.u_loan,
    fields: [
      { id: 'motive', label: '創業の動機', type: 'choice',
        note: 'なぜこの店を始めたか。貸す側が「この人は続けられそうか」を見るところ',
        memo: '店の目的が伝わる理由を書く',
        options: [
          { v: 'real', t: '会社員時代に体を壊しかけ、商店街で子どもと近所の人が寄れる店をやりたいと考えた', ok: true },
          { v: 'xiao', t: '同居人に言われたから', ok: false, say: X('本当のことだろ！'), why: '本当でも、貸す側には何も伝わらない' },
          { v: 'none', t: 'なんとなく', ok: false, why: '続けられるか不安に思われる' },
        ] },
      { id: 'career', label: '経営者の略歴', type: 'fixed', value: () => '会社員として営業資料の作成を10年。2026年4月に駄菓子と雑貨の店を開業', note: '前の仕事と、店との関わり' },
      { id: 'items', label: '取扱商品・サービス', type: 'fixed', value: () => `駄菓子・菓子・飲み物・日用品・雑貨の店頭販売。月の売上 約${manYen(avgSales())}`, note: '何を、どれくらい売っているか' },
      { id: 'partner', label: '取引先', type: 'fixed', value: () => '仕入れ：現金問屋、ネット卸（現金払い）／販売：近所の人、小学生、会社員', note: '誰から仕入れて、誰に売るか' },
      { id: 'staff', label: '従業員', type: 'choice', note: '雇っている人、雇う予定の人', memo: 'どちらでもいい',
        options: [{ v: 'plan', t: 'アルバイト1人を予定', ok: true }, { v: 'none', t: 'いない', ok: true }] },
      { id: 'need', label: '必要な資金と調達方法', type: 'choice',
        note: '何にいくら要って、どこから集めるか。店の規模に合った額にする',
        memo: '足りない運転資金の分だけ',
        options: [
          { v: 'ok', t: '運転資金300万円（仕入れ・家賃・人件費の不足分）／借入300万円', ok: true },
          { v: 'big', t: '運転資金1,000万円（2号店も考えている）', ok: false, why: '今の店の規模に合わない。何に使うか説明できない' },
        ] },
      { id: 'forecast', label: '事業の見通し（月の売上）', type: 'choice',
        note: '借りたあと、月にいくら売れる見込みか。今の実績からかけ離れると面談で突っ込まれる',
        memo: '実績に近い数字＋根拠',
        options: [
          { v: 'real', t: '', dyn: () => `月${manYen(avgSales() * 1.15)}（今までの平均${manYen(avgSales())}に、夏祭りとアルバイトの分を足した）`, ok: true },
          { v: 'high', t: '月150万円（がんばる）', ok: false, say: H('……前の会社だと、こういう数字を書かされてたな'), why: '実績からかけ離れている。根拠がない' },
          { v: 'low', t: '', dyn: () => `月${manYen(avgSales() * 0.5)}（控えめに）`, ok: false, why: '低すぎると、返せる見込みが立たない' },
        ] },
      { id: 'repay', label: '返済の見通し', type: 'choice', note: 'どうやって返すか', memo: '据置のあと毎月少しずつ',
        options: [
          { v: 'ok', t: '据置6か月のあと、毎月約4万円を返す（利息は毎月）', ok: true },
          { v: 'later', t: '売れたら返す', ok: false, why: '返済は毎月決まった額。売れなくても返す' },
        ] },
    ],
    onDone: ans => { G.flags.planRealistic = ans.forecast === 'real'; if (K.mActive('4-02')) K.mFinish('4-02'); },
    after: [X('書けたのか'), H('書けた。……前の会社の資料より、ずっと本気で書いた'), X('おれさまのことも書いたか'), H('書いてない')],
    intro: [H('創業計画書。……資料作りなら、前の会社で嫌というほどやった'), X('得意なのか'), H('得意だった。誰も読まなかったけど')],
  };
  // 給与支払事務所等の開設届出書（人を雇ったら1か月以内）
  F.kaisetsu = {
    title: '給与支払事務所等の開設届出書', short: '給与支払事務所の開設届',
    deadline: '人を雇ってから1か月以内', when: () => !!G.staff,
    fields: [
      { id: 'office', label: '提出先', type: 'fixed', value: () => '（住所地を受け持つ）税務署長', note: '開業届と同じ税務署' },
      { id: 'date', label: '開設年月日', type: 'choice', note: '給料を払う事務所を開いた日。初めて人を雇った日にする',
        options: [
          { v: 'hire', t: '', dyn: () => { const d = K.dateOf(G.staff ? G.staff.since : G.dayNo); return `${d.m}月${d.d}日（アルバイトを雇った日）`; }, ok: true },
          { v: 'open', t: '4月8日（開店した日）', ok: false, why: '開店した日はまだ誰も雇っていなかった' },
        ] },
      { id: 'kind', label: '届出の内容', type: 'choice', note: 'なぜ届けるか。開業届はもう出しているので「開業」ではない',
        options: [
          { v: 'hire', t: '上記以外（新たに従業員を雇った）', ok: true },
          { v: 'open', t: '開業又は法人の設立', ok: false, why: '開業したときではなく、あとから人を雇ったときに出す' },
        ] },
      { id: 'count', label: '従業員の数', type: 'choice', note: '給料を払う人の数',
        options: [
          { v: '1', t: '1人（アルバイト）', ok: true },
          { v: '2', t: '2人（アルバイトとシャオ）', ok: false, say: X('おれさまも入れろ！'), why: 'シャオには給料を払っていない' },
        ] },
      { id: 'tax', label: '源泉所得税', type: 'choice', note: '月8.8万円未満で、扶養控除等申告書を出してもらえば、源泉所得税はかからない',
        options: [
          { v: 'form', t: '扶養控除等申告書を出してもらう', ok: true },
          { v: 'none', t: '何もしない', ok: false, why: '申告書がないと、少ない給料でも源泉所得税を引くことになる' },
        ] },
    ],
    onDone: () => { if (K.mActive('4-10')) K.mFinish('4-10'); },
    after: [H('……人を雇うと、紙も増えるんだな'), X('紙を雇ったのか'), H('違う')],
  };

  // 帳簿の欄の判定（複式なら総勘定元帳と仕訳帳が要る）
  F.checkBooks = ans => {
    const b = ans.books || [];
    if (!b.length) return { ok: false, why: 'つける帳簿に1つも印がない' };
    if (ans.boki === 'double' && !(b.includes('motocho') && b.includes('shiwake'))) return { ok: false, why: '複式簿記なら、総勘定元帳と仕訳帳が要る' };
    if (ans.boki === 'simple' && !b.includes('genkin') && !b.includes('kanni')) return { ok: false, why: '簡易簿記なら、現金出納帳か現金式簡易帳簿が要る' };
    return { ok: true };
  };
  // 会計ソフトのおすすめ
  F.softBooks = ans => ans.boki === 'simple'
    ? ['genkin', 'keihi', 'kanni']
    : ['genkin', 'keihi', 'motocho', 'shiwake', ...(G.flags.fridge === 'buy' ? ['kotei'] : [])];
  return F;
})();

// ================================================================ ミニゲームの画面
window.FormGame = (() => {
  const $ = E.$;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function open(id) {
    return new Promise(resolve => {
      const def = FORMS[id];
      const studied = !def.topic || (G.study[def.topic] || 0) >= 3;
      const ans = {};
      let sel = def.fields.find(f => f.type !== 'fixed').id;
      let wrong = new Set();
      let tries = 0;
      let lastSay = null;
      const p = $('panel');
      G.openPanel = 'form';
      p.classList.add('formpanel');
      p.classList.remove('hidden');

      const fieldOk = f => {
        if (f.type === 'fixed') return { ok: true };
        if (f.type === 'multi') return FORMS.checkBooks(ans);
        const o = f.options.find(x => x.v === ans[f.id]);
        if (!o) return { ok: false, why: 'まだ書いていない' };
        if (f.match && G.flags[f.match] && ans[f.id] !== G.flags[f.match]) return { ok: false, why: 'もう出した書類に書いた開業日と違う。2つの書類で開業日はそろえる' };
        return { ok: o.okf ? !!o.okf() : o.ok, why: o.why || (f.why ? f.why() : '') };
      };
      const valueText = f => {
        if (f.type === 'fixed') return f.value();
        if (f.type === 'multi') {
          const b = ans.books || [];
          return b.length ? f.options.filter(o => b.includes(o.v)).map(o => o.t).join('、') : '';
        }
        const o = f.options.find(x => x.v === ans[f.id]);
        return o ? (o.dyn ? o.dyn() : o.t) : '';
      };
      const unfilled = () => def.fields.filter(f => f.type !== 'fixed' && !(f.type === 'multi' ? (ans.books || []).length : ans[f.id])).length;

      function render() {
        const f = def.fields.find(x => x.id === sel);
        let rows = '';
        for (const x of def.fields) {
          const v = valueText(x);
          const cls = [x.id === sel ? 'sel' : '', wrong.has(x.id) ? 'wrong' : '', x.type === 'fixed' ? 'fixed' : ''].join(' ');
          rows += `<div class="frow ${cls}" data-f="${x.id}"><div class="flabel">${esc(x.label)}</div><div class="fval">${v ? esc(v) : '<span class="blank">（未記入）</span>'}</div></div>`;
        }
        let side = `<div class="fhead">${esc(f.label)}</div><div class="fnote">${esc(f.note)}</div>`;
        if (studied && f.memo) side += `<div class="fmemo"><b>勉強メモ</b>${esc(f.memo)}</div>`;
        if (f.type === 'choice') {
          side += '<div class="fopts">' + f.options.map(o => `<button class="pbtn ${ans[f.id] === o.v ? 'on' : ''}" data-o="${o.v}">${esc(o.dyn ? o.dyn() : o.t)}${o.rec ? '<span class="rec">おすすめ</span>' : ''}</button>`).join('') + '</div>';
        } else if (f.type === 'multi') {
          const b = ans.books || [];
          if (studied) side += `<div style="margin-bottom:12px"><button class="pbtn" id="fm-soft">会計ソフトのおすすめどおりに印をつける</button></div>`;
          side += '<div class="fopts multi">' + f.options.map(o => `<button class="pbtn ${b.includes(o.v) ? 'on' : ''}" data-m="${o.v}">${b.includes(o.v) ? '☑' : '☐'} ${esc(o.t)}</button>`).join('') + '</div>';
        } else if (f.say) {
          lastSay = f.say;
        }
        if (wrong.has(f.id)) side += `<div class="fwhy">見直し：${esc(fieldOk(f).why || '')}</div>`;
        if (lastSay) side += `<div class="fsay"><b>${esc(lastSay[0])}</b>${esc(lastSay[1])}</div>`;
        const left = unfilled();
        p.innerHTML = `<div class="tb"><span>■ ${esc(def.title)}　<span style="opacity:.75">期限：${esc(def.deadline)}</span></span></div>
          <div class="fwrap"><div class="paper"><div class="ptitle">${esc(def.title)}</div>${rows}</div><div class="fside">${side}</div></div>
          <div class="pfoot"><span>${left ? `<span class="bad">未記入：${left}か所</span>` : '<span class="good">全部書けた</span>'}　<span class="sub">左の欄をクリックすると、右に説明が出る</span></span>
          <span><button class="pbtn" id="fm-later">今日はやめる</button> <button class="pbtn on" id="fm-send" ${left ? 'disabled' : ''}>${esc(def.send || '見直して送る（e-Tax）')}</button></span></div>`;
        p.querySelectorAll('.frow').forEach(r => r.addEventListener('click', ev => { ev.stopPropagation(); sel = r.dataset.f; lastSay = null; render(); }));
        p.querySelectorAll('button[data-o]').forEach(b => b.addEventListener('click', ev => {
          ev.stopPropagation();
          ans[f.id] = b.dataset.o;
          wrong.delete(f.id);
          const o = f.options.find(x => x.v === b.dataset.o);
          lastSay = o.say || null;
          // 選んだら次の空欄へ
          const next = def.fields.find(x => x.type !== 'fixed' && !(x.type === 'multi' ? (ans.books || []).length : ans[x.id]));
          if (next && !o.say) sel = next.id;
          render();
        }));
        p.querySelectorAll('button[data-m]').forEach(b => b.addEventListener('click', ev => {
          ev.stopPropagation();
          const list = ans.books = ans.books || [];
          const i = list.indexOf(b.dataset.m);
          if (i >= 0) list.splice(i, 1); else list.push(b.dataset.m);
          wrong.delete('books');
          render();
        }));
        const soft = $('fm-soft');
        if (soft) soft.addEventListener('click', ev => { ev.stopPropagation(); ans.books = FORMS.softBooks(ans); wrong.delete('books'); lastSay = ['肇', '会計ソフト、ありがたい……']; render(); });
        $('fm-later').addEventListener('click', ev => { ev.stopPropagation(); finish({ done: false }); });
        $('fm-send').addEventListener('click', ev => { ev.stopPropagation(); send(); });
      }

      function send() {
        tries++;
        wrong = new Set(def.fields.filter(f => !fieldOk(f).ok).map(f => f.id));
        if (wrong.size) {
          sel = [...wrong][0];
          lastSay = ['肇', `……送る前に見直したら、おかしいところが${wrong.size}か所ある`];
          K.fx({ stress: 3 * wrong.size });
          render();
          return;
        }
        finish({ done: true, perfect: tries === 1, ans });
      }
      function finish(res) {
        p.classList.add('hidden');
        p.classList.remove('formpanel');
        G.openPanel = null;
        resolve(res);
      }
      render();
    });
  }
  return { open };
})();
