'use strict';
// HUD・ミッション欄・メニュー・パネル（設置・仕入れ・価格・帳簿・設定・シャオ・結果）
window.UI = (() => {
  const $ = E.$;
  const U = {};
  const yen = K.yen;
  U.yen = yen;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  U.esc = esc;
  // スプライトをパネルの中に出す（ドットのまま拡大）
  U.spr = (name, sc = 3) => {
    const a = window.ATLAS[name], im = E.img && E.img.sprites;
    if (!a || !im) return '';
    return `<i class="spr" style="width:${a.w * sc}px;height:${a.h * sc}px;background-position:-${a.x * sc}px -${a.y * sc}px;background-size:${im.width * sc}px ${im.height * sc}px"></i>`;
  };
  const FACE_SPR = { smile: 'bubble_smile', grin: 'bubble_grin', mad: 'bubble_mad' };
  U.face = (f, label = true) => (f ? `<span class="face ${f}">${U.spr(FACE_SPR[f], 3)}${label ? `<span>${K.FACE_NAME[f]}</span>` : ''}</span>` : '<span class="sub">—</span>');

  // ---------------------------------------------------------------- HUD
  const clock = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  U.clock = clock;
  const WEATHER = { '晴': '☀', '曇': '☁', '雨': '☂' };
  const mini = (lbl, v, pink) => `<span class="mg"><span>${lbl}</span><i class="${pink ? 'pink' : ''} ${v < 25 ? 'low' : ''}"><b style="width:${K.clamp(v, 0, 100)}%"></b></i></span>`;
  U.updateHud = () => {
    $('hud-name').textContent = '■ ' + G.storeName;
    const showTime = ['day', 'close'].includes(G.mode);
    $('hud-date').textContent = `${K.yearLabel()} ${K.fmt()} ${G.chapter >= 2 ? WEATHER[G.weather] || '' : ''}`;
    $('hud-time').textContent = showTime ? clock(G.time) : G.mode === 'night' ? '夜' : G.mode === 'morning' ? '朝' : '';
    const m = $('hud-money');
    m.textContent = yen(G.money);
    m.classList.toggle('bad', G.chapter >= 2 && K.danger());
    const r = K.clamp(Math.floor(G.rep), 1, 5);
    $('hud-rep').textContent = '★'.repeat(r) + '☆'.repeat(5 - r);
    $('hud-seiki').textContent = '♥' + Math.floor(G.seiki);
    $('clock').textContent = clock(G.time);
    const g = G.gauges;
    $('hud-gauges').innerHTML = G.chapter >= 2
      ? `<span class="sub">肇</span>${mini('体力', g.hp)}${mini('元気', 100 - g.stress)}<span class="sub">シャオ</span>${mini('満腹', 100 - g.hunger, true)}${mini('機嫌', g.mood, true)}`
      : '';
    $('hud-gauges').classList.toggle('hidden', G.chapter < 2);
    U.layout();

  };
  U.show = (id, on) => { $(id).classList.toggle('hidden', !on); if (id === 'hud' || id === 'missions') U.layout(); };
  // ミッション欄の位置と高さ：HUDの下から、メニューの上まで（スマホで窓を大きくしたときも重ならないように）
  U.layout = () => {
    const ui = E.ui || 1, hud = $('hud'), mi = $('missions');
    if (!hud || !mi) return;
    const h = hud.classList.contains('hidden') ? 0 : hud.offsetHeight;
    const top = h ? 16 + h * ui + 12 : 214;
    mi.style.top = top + 'px';
    $('mission-list').style.maxHeight = Math.max(150, (1080 - top - 100 * ui - 30) / ui - 56) + 'px';
  };

  // ---------------------------------------------------------------- ミッション
  // 「_」でたたむ（メイン・トラブル・おねだりだけ出す）、「□」で全部出す。多いときは欄の中でスクロール
  let missionsMin = !!E.touch;   // スマホでは最初からたたんでおく
  try { const v = localStorage.getItem('keiei_missions_min'); if (v != null) missionsMin = v === '1'; } catch (e) { /* 保存できなくても動く */ }
  const setMin = v => { missionsMin = v; try { localStorage.setItem('keiei_missions_min', v ? '1' : '0'); } catch (e) { /* 無視 */ } U.renderMissions(); };
  let lastMissionHtml = '';
  U.renderMissions = () => {
    const list = $('mission-list');
    const rows = K.missionRows();
    const big = ['メイン', 'トラブル', 'おねだり'];
    const shown = missionsMin ? rows.filter(m => m.state === 'active' && big.includes(m.kind)) : rows;
    const hidden = rows.filter(m => m.state === 'active').length - shown.filter(m => m.state === 'active').length;
    let html = '';
    // かけているおまじない（次の遊ぶ日の朝まで）
    const sp = (D.SPELLS || []).filter(x => K.spellOn(x.id));
    if (sp.length) html += `<div class="mission"><span class="badge ask">おまじない</span><span class="mtitle">${sp.map(x => x.name.replace('のおまじない', '').replace('おまじない', '')).join('・')}</span><div class="prog">${K.fmt(K.dateOf(G.spells[sp[0].id]))}の朝まで効く</div></div>`;
    for (const m of shown) {
      const cls = { 'メイン': 'main', 'おねだり': 'ask', 'トラブル': 'trouble', '関係': 'rel' }[m.kind] || 'sub';
      html += `<div class="mission${m.state !== 'active' ? ' done' : ''}${m.state === 'failed' ? ' failed' : ''}"><span class="badge ${cls}">${m.kind}</span><span class="mtitle">${esc(m.title)}</span>${m.progress && m.state === 'active' ? `<div class="prog">${esc(m.progress)}</div>` : ''}</div>`;
    }
    if (hidden > 0) html += `<div class="mission more" data-open="1">ほか${hidden}件（□で全部見る）</div>`;
    if (html === lastMissionHtml) return;   // 毎フレーム書き換えるとスクロールが戻るので、変わったときだけ
    lastMissionHtml = html;
    const sc = list.scrollTop;
    list.innerHTML = html;
    list.scrollTop = sc;
    const more = list.querySelector('[data-open]');
    if (more) more.addEventListener('click', ev => { ev.stopPropagation(); setMin(false); });
  };
  setTimeout(() => {
    const bs = document.querySelectorAll('#missions .tb .btns span');
    if (bs[0]) bs[0].addEventListener('click', ev => { ev.stopPropagation(); setMin(true); });
    if (bs[1]) bs[1].addEventListener('click', ev => { ev.stopPropagation(); setMin(false); });
    if (bs[2]) bs[2].addEventListener('click', ev => { ev.stopPropagation(); setMin(!missionsMin); });
    $('mission-list').addEventListener('wheel', ev => ev.stopPropagation(), { passive: true });
  }, 0);
  U.hint = text => {
    const h = $('hint');
    if (!text) { h.classList.add('hidden'); return; }
    h.textContent = E.words(text);
    h.classList.remove('hidden');
  };

  // ---------------------------------------------------------------- メニュー
  const MENU = [
    { id: 'place', label: '設置', modes: ['play', 'morning'] },
    { id: 'stock', label: '仕入れ', modes: ['play', 'morning', 'day'] },
    { id: 'display', label: '陳列', modes: ['play', 'morning', 'day'] },
    { id: 'price', label: '価格', modes: ['play', 'morning', 'day'] },
    { id: 'xiao', label: 'シャオ', modes: ['morning', 'day'] },
    { id: 'data', label: '帳簿', modes: ['morning', 'day'] },
    { id: 'settings', label: '店の設定', modes: ['morning'] },
    { id: 'hire', label: '採用', modes: ['morning'] },
    { id: 'loan', label: '借入', modes: ['morning'] },
    { id: 'open', label: '開店', modes: ['play', 'morning'] },
  ];
  U.renderMenu = () => {
    const m = $('menu');
    m.innerHTML = '';
    for (const it of MENU) {
      if (!G.unlock[it.id] && (it.id === 'open' || G.chapter >= 2)) continue;
      const b = document.createElement('button');
      b.textContent = it.label;
      // 気にしてほしい数：推奨価格とずれている商品、売切の枠
      const n = G.chapter >= 2 ? (it.id === 'price' ? K.priceOff().length : it.id === 'display' ? Shelf.soldOutTotal() : 0) : 0;
      if (n) { const sp = document.createElement('span'); sp.className = 'mbadge'; sp.textContent = n; b.appendChild(sp); }
      const ok = G.unlock[it.id] && it.modes.includes(G.mode) && !Dlg.active;
      if (!ok) b.classList.add('locked');
      if (it.id === 'open') b.classList.add('openbtn');
      if (G.pulse === it.id) b.classList.add('pulse');
      if (G.openPanel === it.id || (it.id === 'place' && G.place)) b.classList.add('on');
      b.addEventListener('click', ev => {
        ev.stopPropagation();
        if (!ok) { E.toast(G.unlock[it.id] ? 'いまは使えない' : 'まだ使えない'); return; }
        Game.onMenu(it.id);
      });
      m.appendChild(b);
    }
  };

  // ---------------------------------------------------------------- パネル共通
  U.open = (id, title, body, foot, opt = {}) => {
    const p = $('panel');
    G.openPanel = id;
    p.className = 'win' + (opt.cls ? ' ' + opt.cls : '');
    p.innerHTML = `<div class="tb"><span>■ ${title}</span><span class="btns">${opt.noClose ? '' : '<span class="tclose" id="pclose">×</span>'}</span></div>
      <div class="pbody">${E.words(body)}</div><div class="pfoot">${E.words(foot || '')}</div>`;
    p.classList.remove('hidden');
    if (!opt.noClose) $('pclose').addEventListener('click', ev => { ev.stopPropagation(); U.closePanel(); });
    U.renderMenu();
    return p;
  };
  U.closePanel = () => {
    $('panel').classList.add('hidden');
    G.openPanel = null;
    U.renderMenu();
    Game.check();
  };
  U.bind = (p, sel, fn) => p.querySelectorAll(sel).forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); fn(b, ev); }));

  // ---------------------------------------------------------------- 設置
  U.panelPlace = () => {
    const keys = Object.keys(D.ITEMS).filter(k => G.allowed[k] || ['register', 'shelf', 'fridge', 'gacha', 'plant'].includes(k) || (D.ITEMS[k].heart && G.unlock.spells));
    let body = '';
    for (const k of keys) {
      const it = D.ITEMS[k];
      const st = Field.itemStatus(k);
      body += `<div class="itemcard ${st.ok ? '' : 'locked'}">
        <canvas width="64" height="48" data-item="${k}"></canvas>
        <div class="info"><div>${it.name}　<span class="money">${st.priceText}</span>　<span class="sub">${it.w}×${it.h}マス</span></div>
        <div class="desc">${it.desc}</div>${st.note ? `<div class="desc ask">${st.note}</div>` : ''}</div>
        <button class="pbtn" data-place="${k}" ${st.ok ? '' : 'disabled'}>${st.ok ? '置く' : st.lockText}</button></div>`;
    }
    const foot = `<span class="sub">置いた物を動かすときは「動かす」を押してから物をクリック</span>
      <span><button class="pbtn" id="pl-move">動かす</button> <button class="pbtn" id="pl-close">閉じる</button></span>`;
    const p = U.open('place', '設置', body, foot);
    p.querySelectorAll('canvas[data-item]').forEach(cv => drawIcon(cv, cv.dataset.item));
    U.bind(p, 'button[data-place]', b => { U.closePanel(); Field.startPlace(b.dataset.place); });
    U.bind(p, '#pl-move', () => { U.closePanel(); Field.startPick(); });
    U.bind(p, '#pl-close', () => U.closePanel());
  };
  function drawIcon(cv, k) {
    const name = { shelf: 'shelf_full', fridge: 'fridge_full' }[k] || k;
    const a = window.ATLAS[name];
    if (!a) return;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const s = Math.min(60 / a.w, 44 / a.h, 1.5);
    const w = a.w * s, h = a.h * s;
    ctx.drawImage(E.img.sprites, a.x, a.y, a.w, a.h, (64 - w) / 2, (48 - h) / 2, w, h);
  }

  // ---------------------------------------------------------------- 仕入れ
  const recentSold = (id, days) => G.days.slice(-days).reduce((s, d) => s + ((d.sold || {})[id] || 0), 0);
  U.recentSold = recentSold;
  // 前日（いちばん新しい営業日）に売れた数
  const lastOpenDay = () => { for (let i = G.days.length - 1; i >= 0; i--) if (!G.days[i].closed) return G.days[i]; return null; };
  const soldYesterday = id => { const d = lastOpenDay(); return d ? ((d.sold || {})[id] || 0) : 0; };
  U.soldYesterday = soldYesterday;
  U.panelStock = (tab) => {
    const order = {};
    const first = G.chapter <= 1;
    const dayMode = G.mode === 'day';
    let shop = tab || (dayMode ? 'run' : 'cash');
    const p = U.open('stock', '仕入れ', '', '', { cls: 'wide' });
    const netMin = () => (G.flags.u_netmin ? 3000 : D.NET_MIN);
    const costOf = pr => Math.round(K.costOf(pr, shop === 'run' ? 'cash' : shop) * (shop === 'run' ? D.RUN_MARKUP : 1));
    const total = () => D.PRODUCTS.reduce((t, pr) => t + (order[pr.id] || 0) * pr.unit * costOf(pr), 0);
    const visited = () => G.flags.tonyaDay === G.dayNo;
    function render() {
      const yd = lastOpenDay();
      let body = `<div class="shoptab">
        ${dayMode ? `<button class="pbtn ${shop === 'run' ? 'on' : ''}" data-shop="run">問屋に走る（1時間空ける・1割高い）</button>`
          : `<button class="pbtn ${shop === 'cash' ? 'on' : ''}" data-shop="cash">現金問屋（すぐ持ち帰る${!first && !visited() ? '・開店11時に' : ''}）</button>`}
        <button class="pbtn ${shop === 'net' ? 'on' : ''}" data-shop="net">ネット卸（1割安い・${first ? '開店前に届く' : `2日後・${yen(netMin())}〜`}）</button>
        <button class="pbtn ${shop === 'catalog' ? 'on' : ''}" data-shop="catalog">カタログ</button>
        ${G.flags.charmUntil > G.dayNo ? '<span class="ask">　魅了営業：仕入れ値1割引き中</span>' : ''}</div>`;
      if (shop === 'catalog') {
        body += Shelf.catalogHtml();
        p.querySelector('.pbody').innerHTML = E.words(body);
        p.querySelector('.pfoot').innerHTML = '<span></span><button class="pbtn" id="st-close">閉じる</button>';
        U.bind(p, 'button[data-shop]', b => { shop = b.dataset.shop; render(); });
        U.bind(p, '#st-close', () => U.closePanel());
        return;
      }
      if (shop === 'cash' && !first && !dayMode) {
        const can = !visited() || !G.flags.talkedTonya || G.flags.talkedTonya !== G.dayNo;
        body += `<div class="xrow"><button class="pbtn" id="st-talk" ${G.flags.talkedTonya === G.dayNo ? 'disabled' : ''}>問屋さんと話す（交渉）</button>
          <span class="sub">　仲よくなると仕入れられる商品が増える（いま${G.flags.tonya || 0}回）。${visited() ? '<span class="good">今朝は問屋に来ている（開店は11時）</span>' : '行くと開店が11時になって、肇の体力も少し使う'}</span></div>`;
        void can;
      }
      if (shop === 'run' && G.flags.runDay === G.dayNo) body += '<div class="xrow bad">今日はもう問屋に走った</div>';
      let rows = '';
      for (const g of D.GENRES) {
        const list = D.PRODUCTS.filter(x => x.genre === g && K.available(x) && (K.inSeason(x) || K.stockOf(x.id) > 0));
        if (!list.length) continue;
        rows += `<tr><td colspan="11" class="genre">${g}</td></tr>`;
        for (const pr of list) {
          const c = costOf(pr);
          const left = K.daysLeft(pr.id);
          const inc = K.incoming(pr.id);
          const disp = Shelf.displayed(pr.id), back = Shelf.backroom(pr.id);
          const sold7 = first ? '—' : recentSold(pr.id, 7);
          const sold1 = first || !yd ? '—' : soldYesterday(pr.id);
          const clr = G.clearance[pr.id];
          rows += `<tr class="${clr ? 'clr' : ''}"><td>${pr.name}${clr ? '<span class="tag">見切り</span>' : ''}${!Shelf.carried(pr.id) && K.stockOf(pr.id) > 0 ? '<span class="tag bad">棚にない</span>' : ''}</td>
            <td class="pop">${'★'.repeat(pr.pop)}<span class="sub">${'☆'.repeat(3 - pr.pop)}</span></td>
            <td class="num">${pr.unit}個</td><td class="num">${yen(c)}</td><td class="num">${yen(c * pr.unit)}</td>
            <td class="num">${disp}<span class="sub">／裏${back}</span>${inc ? `<span class="sub">＋${inc}</span>` : ''}</td>
            <td class="num ${left != null && left < 14 ? 'bad' : 'sub'}">${left == null ? '—' : left + '日'}</td>
            <td class="num">${sold1}</td><td class="num sub">${sold7}</td>
            <td class="num qty"><button data-d="-1" data-id="${pr.id}">−</button><span>${order[pr.id] || 0}箱</span><button data-d="1" data-id="${pr.id}">＋</button></td>
            <td>${G.flags.u_clearance && K.stockOf(pr.id) > 0 ? `<button class="mini" data-clr="${pr.id}">${clr ? 'やめる' : '見切り'}</button>` : ''}</td></tr>`;
        }
      }
      body += `<table><tr><th>商品</th><th>人気</th><th class="num">入数</th><th class="num">1個</th><th class="num">1箱</th><th class="num">棚／裏</th><th class="num">賞味</th><th class="num">${yd ? `前日（${yd.d}日）` : '前日'}</th><th class="num">7日</th><th class="num">注文</th><th></th></tr>${rows}</table>`;
      if (!first) body += `<div class="xrow sub">「前日」「7日」は売れた個数。1個の値段は、きょうの相場（毎日いくつかの商品が上がったり下がったりする）</div>`;
      p.querySelector('.pbody').innerHTML = E.words(body);
      const t = total();
      const budgetLeft = D.STOCK_BUDGET - G.stockSpent - t;
      p.querySelector('.pfoot').innerHTML = `
        <span>合計 <span class="money">${yen(t)}</span>　${first ? `初回予算の残り <span class="${budgetLeft < 0 ? 'bad' : 'good'}">${yen(budgetLeft)}</span>　` : ''}資金 ${yen(G.money)}</span>
        <span>${first ? '<button class="pbtn" id="st-auto">おまかせ</button>' : G.flags.u_hacchu ? '<button class="pbtn" id="st-refill" title="売れた分を、前に仕入れた数まで戻す">発注メモ</button>' : ''}
        <button class="pbtn on" id="st-buy">${shop === 'net' && !first ? '注文する' : '買う'}</button> <button class="pbtn" id="st-close">閉じる</button></span>`;
      U.bind(p, 'button[data-id]', b => {
        const id = b.dataset.id;
        order[id] = Math.max(0, (order[id] || 0) + Number(b.dataset.d));
        const sc = p.querySelector('.pbody').scrollTop;
        render();
        p.querySelector('.pbody').scrollTop = sc;
      });
      U.bind(p, 'button[data-shop]', b => { shop = b.dataset.shop; render(); });
      U.bind(p, 'button[data-clr]', b => {
        const id = b.dataset.clr;
        G.clearance[id] = !G.clearance[id];
        if (G.clearance[id]) E.toast(`${K.prod(id).name}：半額で売り切って、補充しない`);
        const sc = p.querySelector('.pbody').scrollTop;
        render();
        p.querySelector('.pbody').scrollTop = sc;
        Game.check();
      });
      U.bind(p, '#st-talk', () => { U.closePanel(); Game.negotiate(); });
      U.bind(p, '#st-buy', () => {
        const t2 = total();
        if (t2 <= 0) { E.toast('買う商品を選んでね'); return; }
        if (t2 > G.money) { E.toast('お金が足りない', 'bad'); return; }
        if (first && G.stockSpent + t2 > D.STOCK_BUDGET) { E.toast(`初回予算の${K.man(D.STOCK_BUDGET)}を超えている`, 'bad'); return; }
        if (shop === 'net' && !first && t2 < netMin()) { E.toast(`ネット卸は${yen(netMin())}から`, 'bad'); return; }
        if (shop === 'run' && G.flags.runDay === G.dayNo) { E.toast('今日はもう問屋に走った', 'bad'); return; }
        const top = G.flags.sawData ? topSellers() : [];
        if (top.some(id => order[id])) G.flags.boughtTop = true;
        let got;
        if (shop === 'run') {
          got = 0;
          for (const [id, n] of Object.entries(order)) if (n) { const pr = K.prod(id); const c = costOf(pr); got += n * pr.unit * c; K.addStock(id, n * pr.unit, c); }
          K.buyStock(got);
          G.stockSpent += got;
          G.flags.runDay = G.dayNo;
          G.flags.awayUntil = G.time + D.RUN_MINUTES;
          K.fx({ hp: -5 });
          E.toast(`問屋に走った　−${yen(got)}　1時間、店を空ける（シャオがレジにいれば会計はできる）`);
        } else {
          if (shop === 'cash' && !first && !dayMode && !visited()) goTonya();
          got = K.order(order, shop);
          E.toast(`${shop === 'net' && !first ? 'ネット卸で注文した（2日後の朝に届く）' : '買ってきた'}　−${yen(got)}`);
        }
        if (order.ks4) G.flags.goldBought = G.dayNo;
        const notOn = Object.keys(order).filter(id => order[id] && !Shelf.carried(id) && K.stockOf(id) > 0);
        if (notOn.length && !first) E.toast(`${notOn.map(id => K.prod(id).name).join('、')}は、まだ棚にない。「陳列」で並べよう`);
        for (const k of Object.keys(order)) delete order[k];
        render();
        Game.check();
      });
      U.bind(p, '#st-auto', () => {
        for (const k of Object.keys(order)) delete order[k];
        for (const pr of D.PRODUCTS.filter(x => K.available(x) && !x.unlock)) { const n = pr.pop === 3 ? 2 : 1; order[pr.id] = n; }
        render();
        E.toast(`おまかせで選んだ　合計${yen(total())}`);
      });
      U.bind(p, '#st-refill', () => {
        const o = K.restockOrder();
        for (const k of Object.keys(order)) delete order[k];
        Object.assign(order, o);
        render();
        E.toast(Object.keys(o).length ? `発注メモの分を選んだ　合計${yen(total())}` : '補充が必要な商品はない');
      });
      U.bind(p, '#st-close', () => U.closePanel());
    }
    render();
  };
  // 朝に現金問屋へ行く：開店が遅れて、肇が少し疲れる
  function goTonya() {
    G.flags.tonyaDay = G.dayNo;
    K.fx({ hp: -4 });
    E.toast('問屋に行ってきた。今日の開店は11時');
  }
  U.goTonya = goTonya;
  const topSellers = () => D.PRODUCTS.map(p => [p.id, recentSold(p.id, 14)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
  U.topSellers = topSellers;

  // ---------------------------------------------------------------- 価格
  // 推奨価格は相場で毎日動く。客の反応（にっこり・にやり・怒り）を見ながら値段を決める。にっこりのうちは、推奨より上げてもいい
  U.panelPrice = () => {
    const p = U.open('price', '価格', '', '', { cls: 'wide' });
    const step = v => v < 30 ? 1 : v < 100 ? 5 : v < 300 ? 10 : v < 1000 ? 50 : 100;
    // 最近の値動き（7日以内）
    const moved = id => { const l = (G.marketLog || []).filter(x => x.id === id && G.dayNo - x.day <= 7); return l.length ? l[l.length - 1] : null; };
    function render() {
      const list = D.PRODUCTS.filter(pr => K.stockOf(pr.id) > 0 || K.incoming(pr.id) > 0);
      let rows = '';
      if (!list.length) rows = '<tr><td colspan="7" class="sub">まだ商品が無い。先に仕入れよう</td></tr>';
      for (const pr of list) {
        const c = K.avgCost(pr.id);
        const ref = K.refPrice(pr);
        const v = G.prices[pr.id];
        const gp = v != null ? v - c : null;
        const rate = v ? Math.round(gp / v * 100) : null;
        const f = G.clearance[pr.id] ? null : K.face(pr, v);
        const mv = moved(pr.id);
        const arrow = mv ? (mv.up ? '<span class="arrow-up">↑</span>' : '<span class="arrow-dn">↓</span>') : '';
        rows += `<tr class="${f && f !== 'smile' ? 'off' : ''}"><td class="nowrap">${pr.name}${G.clearance[pr.id] ? '<span class="tag">見切り</span>' : ''}</td>
          <td class="num nowrap" title="在庫の平均 ${yen(c)}">${yen(K.costOf(pr, 'cash'))}${arrow}</td>
          <td class="num nowrap" title="${mv && mv.from !== mv.to ? `前は${yen(mv.from)}` : ''}">${yen(ref)}${arrow}</td>
          <td class="num price nowrap"><button data-d="-1" data-id="${pr.id}">−</button><span>${v != null ? yen(v) : '<span class="bad">未設定</span>'}</span><button data-d="1" data-id="${pr.id}">＋</button></td>
          <td class="nowrap">${G.clearance[pr.id] ? '<span class="sub">半額で売り切り中</span>' : U.face(f)}</td>
          <td class="num nowrap">${gp != null ? `${yen(gp)}（${rate}%）` : '—'}</td>
          <td class="nowrap">${v !== ref ? `<button class="mini" data-rec="${pr.id}">推奨にする</button>` : ''}</td></tr>`;
      }
      const unset = list.filter(pr => G.prices[pr.id] == null).length;
      const offN = K.priceOff().length;
      p.querySelector('.pbody').innerHTML = E.words(`<div class="xrow sub">客の反応：${U.face('smile')} ちょうどいい　${U.face('grin')} よく売れるけど儲けそこね（まとめ買いされる）　${U.face('mad')} 怒って買わない。にっこりのうちは、推奨価格より高くしてもいい。仕入れ値は相場で毎日動く</div>
        <table class="ptable"><tr><th>商品</th><th class="num">仕入れ値</th><th class="num">推奨価格</th><th class="num">値段</th><th>客の反応</th><th class="num">粗利（粗利率）</th><th></th></tr>${rows}</table>`);
      p.querySelector('.pfoot').innerHTML = `<span>${unset ? `<span class="bad">値段が未設定：${unset}品</span>` : offN ? `<span class="ask">にっこりじゃない商品：${offN}品</span>` : '<span class="good">全部にっこり</span>'}</span>
        <span>${unset ? '<button class="pbtn" id="pr-rec">未設定を推奨価格にする</button> ' : ''}<button class="pbtn" id="pr-close">閉じる</button></span>`;
      const keep = fn => { const sc = p.querySelector('.pbody').scrollTop; fn(); render(); p.querySelector('.pbody').scrollTop = sc; Game.check(); };
      U.bind(p, 'button[data-id]', b => keep(() => {
        const pr = K.prod(b.dataset.id);
        let v = G.prices[pr.id] != null ? G.prices[pr.id] : K.refPrice(pr);
        if (G.prices[pr.id] != null) { const d = Number(b.dataset.d); v = d > 0 ? v + step(v) : v - step(v - 1); }
        G.prices[pr.id] = Math.max(5, v);
        G.flags.priceTouched = (G.flags.priceTouched || 0) + 1;
      }));
      U.bind(p, 'button[data-rec]', b => keep(() => { const pr = K.prod(b.dataset.rec); G.prices[pr.id] = K.refPrice(pr); }));
      U.bind(p, '#pr-rec', () => keep(() => { for (const pr of list) if (G.prices[pr.id] == null) G.prices[pr.id] = K.refPrice(pr); }));
      U.bind(p, '#pr-close', () => U.closePanel());
    }
    render();
  };

  // ---------------------------------------------------------------- シャオ
  // 配置・おまじない（♥で次の遊ぶ日まで）・魔界の通販（♥でずっと）
  U.panelXiao = (tab = 'place') => {
    const g = G.gauges;
    const reg = G.xiao === 'register';
    const tabs = [['place', '配置']].concat(G.unlock.spells ? [['spell', 'おまじない'], ['shop', '魔界の通販']] : []);
    if (!tabs.some(t => t[0] === tab)) tab = 'place';
    let body = `<div class="shoptab">${tabs.map(([k, l]) => `<button class="pbtn ${k === tab ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}<span class="ask" style="margin-left:auto;font-size:32px">♥${Math.floor(G.seiki)}</span></div>`;
    if (tab === 'place') {
      const state = g.hunger > 80 ? '<span class="bad">お腹が空きすぎてやる気がない</span>' : g.mood < 25 ? '<span class="bad">機嫌が悪くて、レジに立ちたがらない</span>' : g.mood > 70 ? '<span class="good">ごきげん</span>' : 'ふつう';
      body += `<div class="xrow"><div>今の場所：<b class="ask">${reg ? 'レジ（看板息子）' : '店の中でうろうろ'}</b></div><div>様子：${state}</div></div>
        <div class="xrow sub">レジに立つと、大人の客が入りやすくなって、よく買う。♥（生気）もよくたまって、お腹がふくれる。でも少しずつ飽きて、機嫌が下がる。機嫌が悪いと逃げる</div>
        <div class="xbtns"><button class="pbtn ${reg ? 'on' : ''}" data-x="register">レジに立たせる</button><button class="pbtn ${!reg ? 'on' : ''}" data-x="free">好きにさせる</button></div>`;
      if (G.flags.u_charm) {
        const can = G.seiki >= 30 && !(G.flags.charmUntil > G.dayNo);
        body += `<div class="xrow" style="margin-top:20px"><b>魅了営業</b>（♥30を使う）<div class="sub">問屋の営業を魅了して、1か月の仕入れ値を1割下げる。ばれると取引条件が悪くなる</div>
          <button class="pbtn" id="x-charm" ${can ? '' : 'disabled'}>${G.flags.charmUntil > G.dayNo ? '効いている' : '使う'}</button></div>`;
      }
    } else if (tab === 'spell') {
      const until = K.dateOf(K.nextPlay(G.dayNo));
      body += `<div class="xrow sub">♥を使って、客をちょっとだけその気にさせる。かけると、次の遊ぶ日の朝（${K.fmt(until)}）まで効く。いくつ重ねてもいい</div><div class="hlist">`;
      for (const sp of D.SPELLS) {
        if (sp.theft && !G.flags.theftOn) continue;
        const on = K.spellOn(sp.id);
        body += `<div class="hitem ${on ? 'on' : ''}"><div class="hname">${sp.name}${on ? '<span class="tag good">かけてある</span>' : ''}</div><div class="sub">${sp.desc}</div>
          <button class="pbtn" data-spell="${sp.id}" ${on || G.seiki < sp.cost || G.mode === 'day' ? 'disabled' : ''}>♥${sp.cost}でかける</button></div>`;
      }
      body += '</div>';
      if (G.mode === 'day') body += '<div class="xrow ask">おまじないは開店前にかける（営業中はかけられない）</div>';
    } else {
      body += `<div class="xrow sub">シャオが魔界の通販で取り寄せる。一度手に入れれば、ずっと使える。置物は「設置」から置く（置くのに円もかかる）</div><div class="hlist">`;
      for (const h of D.HEART_SHOP) {
        const got = K.hasHeart(h.id);
        const locked = h.need && !K.hasHeart(h.need);
        body += `<div class="hitem ${got ? 'on' : ''}"><div class="hname">${D.ITEMS[h.id] ? U.spr(h.id, 2) : ''}${h.name}${got ? '<span class="tag good">手に入れた</span>' : ''}</div><div class="sub">${h.desc}</div>
          <button class="pbtn" data-heart="${h.id}" ${got || locked || G.seiki < h.cost ? 'disabled' : ''}>${got ? '手に入れた' : locked ? '先に2台目' : `♥${h.cost}で取り寄せる`}</button></div>`;
      }
      body += '</div>';
    }
    const p = U.open('xiao', 'シャオ', body, '<span></span><button class="pbtn" id="x-close">閉じる</button>', { cls: tab === 'place' ? '' : 'wide' });
    U.bind(p, 'button[data-tab]', b => U.panelXiao(b.dataset.tab));
    U.bind(p, 'button[data-x]', b => {
      if (b.dataset.x === 'register' && (g.mood < 25 || g.hunger > 85)) {
        E.toast(g.hunger > 85 ? 'シャオ「腹が減って立てない」' : 'シャオ「やだ」', 'bad');
        return;
      }
      G.xiao = b.dataset.x;
      U.closePanel();
      Game.check();
    });
    U.bind(p, 'button[data-spell]', b => {
      const sp = D.SPELLS.find(x => x.id === b.dataset.spell);
      if (K.castSpell(sp.id)) { E.toast(`シャオ「${K.pick(['えいっ', 'ちちんぷいぷい……人間ども、来い！', 'おれさまの魔力を見ろ！'])}」　${sp.name}（♥−${sp.cost}）`); G.xiaoHeart = performance.now() + 1500; }
      U.updateHud(); U.panelXiao('spell'); Game.check();
    });
    U.bind(p, 'button[data-heart]', b => {
      const h = D.HEART_SHOP.find(x => x.id === b.dataset.heart);
      if (K.buyHeart(h.id)) E.toast(`魔界の通販から届いた：${h.name}（♥−${h.cost}）${D.ITEMS[h.id] ? '。「設置」から置ける' : ''}`);
      U.updateHud(); U.panelXiao('shop'); Game.check();
    });
    U.bind(p, '#x-charm', () => { U.closePanel(); Game.charm(); });
    U.bind(p, '#x-close', () => U.closePanel());
  };

  // ---------------------------------------------------------------- 店の設定
  U.panelSettings = () => {
    const s = G.settings;
    const body = `<div class="xrow"><b>閉店時間</b><div class="sub">21時まで開けると会社帰りの客が増える。光熱費（月3,000円）と肇の疲れも増える</div>
        <div class="xbtns"><button class="pbtn ${s.close === 1200 ? 'on' : ''}" data-close="1200">20時</button><button class="pbtn ${s.close === 1260 ? 'on' : ''}" data-close="1260">21時</button></div></div>
      <div class="xrow" style="margin-top:20px"><b>定休日</b><div class="sub">休みの日は店を開けない。肇の体力とストレスが戻る</div>
        <div class="xbtns">${[null, 1, 2, 3, 4, 5, 6, 0].map(d => `<button class="pbtn ${s.holiday === d ? 'on' : ''}" data-hol="${d}">${d == null ? 'なし' : D.WEEK[d]}</button>`).join('')}</div></div>`;
    const p = U.open('settings', '店の設定', body, '<span></span><button class="pbtn" id="s-close">閉じる</button>');
    U.bind(p, 'button[data-close]', b => { s.close = Number(b.dataset.close); G.flags.setClose = true; U.panelSettings(); Game.check(); });
    U.bind(p, 'button[data-hol]', b => { s.holiday = b.dataset.hol === 'null' ? null : Number(b.dataset.hol); G.flags.setHoliday = true; U.panelSettings(); Game.check(); });
    U.bind(p, '#s-close', () => U.closePanel());
  };

  // ---------------------------------------------------------------- 帳簿
  const row = (k, v, cls = '', sub = false) => `<div class="result-row ${sub ? 'subrow' : ''}"><span class="${sub ? 'sub' : ''}">${k}</span><span class="${cls}">${v}</span></div>`;
  U.row = row;
  const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
  const expName = k => ({ equip: '設備・備品', rent: '家賃', utility: '水道光熱', comm: '通信・POS', misc: '消耗品・雑費', kai: '商店街の会費', lease: '冷蔵ケースのリース', wage: 'アルバイト代', interest: '支払利息', repair: '修理・買い替え', event: 'イベント', other: 'その他', goods: 'グッズの製作費', guarantee: '保証料', tax: '税理士の報酬', theft: '万引きの被害', refund: '返金' }[k] || k);
  const persName = k => ({ living: '生活費（自宅の家賃・食費など）', nenkin: '国民年金', kokuho: '国民健康保険', jumin: '住民税', gacha: 'シャオの課金', ringo: 'りんご飴', date: 'デート代', mischief: 'シャオの散財', xmas: 'クリスマス', tax: '所得税（確定申告）' }[k] || k);
  const inName = k => ({ salary: '前の会社の給料（有給消化分）', loan: '借入', refund: '税金の還付' }[k] || k);
  const outName = k => ({ repay: '借入の返済（元金）' }[k] || k);
  U.expName = expName;
  U.plHtml = m => {
    let h = '<div class="col-title">損益（店がどれだけ儲かったか）</div>';
    h += row('売上', yen(m.sales + m.gacha), 'money');
    if (m.gacha) h += row('うちガチャの取り分', yen(m.gacha), '', true);
    h += row('売上原価（売れた商品の仕入れ値）', '−' + yen(m.cogs));
    h += row('粗利', yen(K.gross(m)), K.gross(m) >= 0 ? 'good' : 'bad');
    if (m.waste) h += row('廃棄（賞味期限切れ）', '−' + yen(m.waste), 'bad');
    if (m.stolen) h += row('万引きでなくなった商品', '−' + yen(m.stolen), 'bad');
    h += row('経費', '−' + yen(sum(m.exp)));
    for (const [k, v] of Object.entries(m.exp)) h += row(expName(k), yen(v), '', true);
    const pr = K.profit(m);
    h += `<div class="result-row total"><span>事業の損益</span><span class="${pr >= 0 ? 'good' : 'bad'}">${yen(pr)}</span></div>`;
    return h;
  };
  U.cfHtml = m => {
    let h = '<div class="col-title">資金繰り（手元のお金がどう動いたか）</div>';
    h += row('月のはじめの手元', yen(m.cashStart));
    h += row('売上で入ったお金', '＋' + yen(m.sales + m.gacha), 'good');
    for (const [k, v] of Object.entries(m.flowIn)) h += row(inName(k), '＋' + yen(v), 'good');
    h += row('仕入れで払ったお金', '−' + yen(m.stockBuy), 'bad');
    h += row('経費で払ったお金', '−' + yen(sum(m.exp)), 'bad');
    h += row('事業と関係ないお金（事業主貸）', '−' + yen(sum(m.pers)), 'bad');
    for (const [k, v] of Object.entries(m.pers)) h += row(persName(k), yen(v), '', true);
    for (const [k, v] of Object.entries(m.flowOut)) h += row(outName(k), '−' + yen(v), 'bad');
    const end = m.cashEnd != null ? m.cashEnd : G.money;
    h += `<div class="result-row total"><span>手元のお金</span><span class="${end >= m.cashStart ? 'good' : 'bad'}">${yen(end)}</span></div>`;
    return h;
  };
  U.panelData = (tab = 'month') => {
    const tabs = [['month', '今月'], ['items', '売れ筋'], ['days', '日別の売上'], ['ledger', 'これまでの決算']];
    let body = '<div class="shoptab">' + tabs.map(([k, l]) => `<button class="pbtn ${k === tab ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('') + '</div>';
    if (tab === 'month') {
      const bk = K.booksDone();
      body += `<div class="twocol"><div>${U.plHtml(G.month)}</div><div>${U.cfHtml(G.month)}</div></div>
        <div class="sub" style="padding:8px 24px">家賃・光熱費などの経費と、生活費・年金などは月末に払う。借入の残り：${yen(K.debt())}</div>
        <div style="padding:0 24px 8px" class="${bk ? 'good' : 'bad'}">${bk ? `${G.date.m}月の帳簿はつけてある` : `${G.date.m}月の帳簿はまだ。月末までに1回、夜に「帳簿をつける」（つけないと確定申告ができない。税務署の人が来る）`}</div>`;
    } else if (tab === 'items') {
      const days = Math.min(30, Math.max(1, G.days.filter(d => !d.closed).length));
      const lines = D.PRODUCTS.map(p => {
        const q7 = recentSold(p.id, 7), q30 = recentSold(p.id, 30);
        const v = G.prices[p.id] || p.price;
        return { p, q7, q30, gross: q30 * (v - K.avgCost(p.id)) };
      }).filter(x => x.q30 > 0 || K.stockOf(x.p.id) > 0).sort((a, b) => b.gross - a.gross);
      const tops = topSellers();
      body += `<table><tr><th>商品</th><th class="num">7日</th><th class="num">30日</th><th class="num">30日の粗利</th><th class="num">在庫</th><th class="num">在庫が持つ日数</th></tr>` +
        lines.map(x => {
          const perDay = x.q30 / days;
          const lasts = perDay > 0 ? Math.round(K.stockOf(x.p.id) / perDay) : null;
          const tag = tops.includes(x.p.id) ? '<span class="tag good">売れ筋</span>' : x.q30 === 0 && G.days.length >= 7 ? '<span class="tag bad">売れていない</span>' : '';
          return `<tr><td>${x.p.name}${tag}</td><td class="num">${x.q7}</td><td class="num">${x.q30}</td><td class="num">${yen(x.gross)}</td><td class="num">${K.stockOf(x.p.id)}</td><td class="num ${lasts != null && lasts < 4 ? 'bad' : ''}">${lasts == null ? '—' : lasts + '日'}</td></tr>`;
        }).join('') + '</table>';
      G.flags.sawData = true;
    } else if (tab === 'days') {
      const ds = G.days.slice(-30);
      const be = Math.round(K.monthlyBurn() / 26);
      const max = Math.max(20000, be * 1.2, ...ds.map(d => d.sales));
      body += `<div class="bars">${ds.map(d => `<div class="bar" title="${d.m}/${d.d} ${yen(d.sales)}"><i style="height:${d.sales / max * 100}%" class="${d.closed ? 'closed' : ''}"></i><span>${d.d}</span></div>`).join('')}
        <div class="beline" style="bottom:${Math.min(100, be / max * 100)}%"><span>手元が減らない売上の目安 ${yen(be)}／日</span></div></div>
        <div class="sub" style="padding:8px 24px">棒が線より下の日は、手元のお金が減っている</div>`;
    } else {
      body += '<table><tr><th>月</th><th class="num">売上</th><th class="num">粗利</th><th class="num">経費</th><th class="num">事業の損益</th><th class="num">月末の手元</th></tr>' +
        G.ledger.map(m => `<tr><td>${m.y !== 2026 ? m.y + '年' : ''}${m.m}月</td><td class="num">${yen(m.sales + m.gacha)}</td><td class="num">${yen(K.gross(m))}</td><td class="num">${yen(sum(m.exp))}</td><td class="num ${K.profit(m) >= 0 ? 'good' : 'bad'}">${yen(K.profit(m))}</td><td class="num">${yen(m.cashEnd)}</td></tr>`).join('') +
        (G.ledger.length ? '' : '<tr><td colspan="6" class="sub">まだ月末を迎えていない</td></tr>') + '</table>';
    }
    const p = U.open('data', '帳簿', body, '<span></span><button class="pbtn" id="d-close">閉じる</button>', { cls: 'wide' });
    U.bind(p, 'button[data-tab]', b => U.panelData(b.dataset.tab));
    U.bind(p, '#d-close', () => U.closePanel());
    Game.check();
  };

  // ---------------------------------------------------------------- ゲージ・口座
  U.renderGauges = () => {
    const g = G.gauges;
    const bar = (lbl, v, pink) => `<div class="gauge ${pink ? 'pink' : ''}"><span class="lbl">${lbl}</span><span class="bar"><i style="width:${K.clamp(v, 0, 100)}%"></i></span></div>`;
    $('gauges').innerHTML = bar('肇 体力', g.hp) + bar('シャオ 空腹', g.hunger, true) + bar('肇 ストレス', g.stress) + bar('シャオ 機嫌', g.mood, true);
  };
  U.account = async (from, to) => {
    const el = $('account');
    el.classList.remove('hidden');
    const v = $('account-val');
    v.textContent = yen(from);
    await E.sleep(600);
    for (let i = 1; i <= 30; i++) { v.textContent = yen(from + (to - from) * i / 30); await E.sleep(25); }
  };

  // ---------------------------------------------------------------- 時間
  U.renderTimebar = () => {
    document.querySelectorAll('#timebar button[data-speed]').forEach(b => b.classList.toggle('on', Number(b.dataset.speed) === G.speed));
    $('tb-skip').classList.toggle('hidden', !!G.flags.noSkip);
  };
  document.querySelectorAll('#timebar button[data-speed]').forEach(b => b.addEventListener('click', ev => {
    ev.stopPropagation(); G.speed = Number(b.dataset.speed); U.renderTimebar();
  }));
  $('tb-skip').addEventListener('click', ev => { ev.stopPropagation(); Game.skipDay(); });

  // ---------------------------------------------------------------- 結果
  U.panelChoice = (html, labels, title, opt = {}) => new Promise(res => {
    const foot = '<span></span><span>' + labels.map((l, i) => `<button class="pbtn ${i === labels.length - 1 ? 'on' : ''}" data-i="${i}">${l}</button>`).join(' ') + '</span>';
    const p = U.open(opt.id || 'result', title, html, foot, { noClose: true, cls: opt.cls });
    U.bind(p, 'button[data-i]', b => { p.classList.add('hidden'); G.openPanel = null; U.renderMenu(); res(Number(b.dataset.i)); });
  });
  U.panelResult = (html, btnLabel, title = '本日の結果', opt = {}) => U.panelChoice(html, [btnLabel], title, opt).then(() => undefined);

  // ツールチップ（設置の理由）
  U.tip = (text, ok) => {
    const t = $('tip');
    if (!text) { t.classList.add('hidden'); return; }
    t.textContent = text;
    t.classList.toggle('ok', !!ok);
    t.classList.remove('hidden');
    t.style.left = Math.min(1600, E.mouse.sx + 30) + 'px';
    t.style.top = (E.mouse.sy + 30) + 'px';
  };
  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('button');
    if (b) b.blur();
  }, true);
  return U;
})();
