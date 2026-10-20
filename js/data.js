'use strict';
// ゲームの数字と品物のデータ（創業期）。数字は docs/03_創業期ミッション.md の仮の値。試遊で調整する
window.D = {
  TILE: 16,
  FX: 144,          // 床の左上（フィールドの座標）
  FY: 104,
  COLS: 12,
  ROWS: 5,
  ENTRANCE: [[5, 4], [6, 4]],          // 入口のマス（ふさげない）
  DOOR: { x: 240, y: 198 },            // 店の出入口
  WALLSHELF: { c: 2, r: 0, w: 4, h: 1 }, // 居抜きの壁面棚
  START_MONEY: 987000,     // 4月1日の手元（シャオが開業パックの頭金48万円を払ったあと）
  START_DATE: { y: 2026, m: 4, d: 1 },
  OPEN_DATE: { y: 2026, m: 4, d: 8 },
  END_DATE: { y: 2027, m: 3, d: 31 },  // 創業期の関門の日
  PROTO_END: { y: 2026, m: 4, d: 30 }, // 試作版はここまで（5月からは作り直し中）
  PLAY_DAYS: [1, 3, 5, 0],             // 遊ぶ曜日（月・水・金・日）。ほかの日は自動で営業して結果だけ出す
  WEEK: ['日', '月', '火', '水', '木', '金', '土'],

  ITEMS: {
    register: { name: 'レジ', w: 3, h: 1, cost: 50000, desc: 'お会計をするところ。肇がこの後ろに立つ。前と後ろに1マスずつ空きが要る' },
    shelf: { name: '島棚', w: 3, h: 1, cost: 30000, desc: 'お菓子や雑貨を並べる棚。ドリンク以外の商品を6枠並べられる' },
    fridge: { name: '冷蔵ケース', w: 2, h: 1, cost: 120000, wall: true, desc: 'ドリンクを冷やして売る（8枠）。壁際（いちばん奥の列）にしか置けない' },
    gacha: { name: 'ガチャガチャ', w: 1, h: 1, cost: 0, desc: 'カプセルトイの台。子どもと学生がよく回す' },
    plant: { name: '観葉植物', w: 1, h: 1, cost: 10000, max: 3, desc: '店の雰囲気が少しよくなる（評判が少し上がる）' },
    pop: { name: 'POP', w: 1, h: 1, cost: 3000, max: 3, desc: '手書きの値札と一言。棚の商品が少し売れやすくなる（3つまで）' },
    rejiyoko: { name: 'レジ横の小棚', w: 1, h: 1, cost: 8000, max: 1, desc: 'レジのすぐ横に置く（2枠）。会計のついでに、ガムや電池が売れる' },
    // ♥で解放する置物（「シャオ」→「魔界の通販」）
    lamp: { name: 'ハートのランプ', w: 1, h: 1, cost: 12000, max: 1, heart: true, desc: 'ピンクに光る。大人の客が入りやすくなる（+8%）', enter: { adult: 0.08 } },
    plush: { name: 'おれさまのぬいぐるみ', w: 1, h: 1, cost: 8000, max: 1, heart: true, desc: '小学生と学生が入りやすくなる（+10%）', enter: { kid: 0.1, student: 0.1 } },
    aroma: { name: '甘い匂いのアロマ', w: 1, h: 1, cost: 6000, max: 1, heart: true, desc: '女性の会社員が入りやすくなる（+15%）', enter: { woman: 0.15 } },
    bell: { name: '魔除けの鈴', w: 1, h: 1, cost: 3000, max: 1, heart: true, desc: '万引きされなくなる' },
  },

  GENRES: ['駄菓子', '菓子', 'ドリンク', '日用品', 'ファンシー雑貨', '季節', 'シャオグッズ'],
  BASE_GENRES: ['駄菓子', '菓子', 'ドリンク', '日用品', 'ファンシー雑貨'],
  // 賞味期限（日）。null は期限なし
  SHELF_LIFE: { '駄菓子': 120, '菓子': 150, 'ドリンク': 270, '日用品': null, 'ファンシー雑貨': null, '季節': 45, 'シャオグッズ': null },
  // cost：1個の仕入れ値（現金問屋）、unit：1ケースの入数、price：推奨価格、pop：人気（1〜3。客が選ぶときの重み）
  // months：その月だけ仕入れられる、gift：贈り物に選ばれやすい、rejiyoko：レジ横に置ける
  // tol：推奨価格の何割増しまで「にっこり」か（なければジャンルの値）、face：棚の1枠に並ぶ数（同じ商品は店の中で1枠だけ）、need：仕入れられるようになる条件（なければ最初から）、col：棚に並べたときの色
  PRODUCTS: [
    { id: 'dg1', name: '10円スナック', genre: '駄菓子', cost: 8, unit: 30, price: 10, pop: 3, face: 45, col: '#f2c14e' },
    { id: 'dg2', name: 'きなこ棒', genre: '駄菓子', cost: 7, unit: 50, price: 10, pop: 3, face: 45, col: '#c99a5b' },
    { id: 'dg3', name: 'ソースカツ', genre: '駄菓子', cost: 22, unit: 20, price: 30, pop: 3, face: 30, col: '#d2603a' },
    { id: 'dg4', name: 'すっぱいグミ', genre: '駄菓子', cost: 36, unit: 20, price: 50, pop: 2, face: 30, need: { tonya: 1 }, col: '#9be37a' },
    { id: 'dg5', name: '当たりつきガム', genre: '駄菓子', cost: 14, unit: 40, price: 20, pop: 3, rejiyoko: true, face: 45, col: '#ff8fc7' },
    { id: 'ks1', name: 'ポテトチップス', genre: '菓子', cost: 105, unit: 12, price: 150, pop: 3, face: 12, col: '#f5d76e' },
    { id: 'ks2', name: 'チョコバー', genre: '菓子', cost: 84, unit: 20, price: 120, pop: 3, rejiyoko: true, face: 18, col: '#8b5a3c' },
    { id: 'ks3', name: 'クッキー缶', genre: '菓子', cost: 420, unit: 6, price: 600, pop: 1, gift: true, face: 6, need: { outing: 3 }, tol: 0.25, col: '#7fb3d5' },
    { id: 'ks4', name: '金色の箱のチョコ', genre: '菓子', cost: 1050, unit: 6, price: 1500, pop: 1, gift: true, face: 6, need: { flag: 'u_gold' }, tol: 0.25, col: '#e6c44f' },
    { id: 'dr1', name: 'お茶', genre: 'ドリンク', cost: 98, unit: 24, price: 140, pop: 3, face: 12, col: '#7cc576' },
    { id: 'dr2', name: '炭酸ジュース', genre: 'ドリンク', cost: 112, unit: 24, price: 160, pop: 3, face: 12, col: '#5fa8e8' },
    { id: 'dr3', name: '缶コーヒー', genre: 'ドリンク', cost: 91, unit: 30, price: 130, pop: 2, face: 12, need: { tonya: 1 }, col: '#a0785a' },
    { id: 'dr4', name: 'エナジードリンク', genre: 'ドリンク', cost: 154, unit: 24, price: 220, pop: 2, face: 12, need: { tonya: 2 }, tol: 0.15, col: '#e8e15a' },
    { id: 'nc1', name: 'ポケットティッシュ', genre: '日用品', cost: 70, unit: 20, price: 100, pop: 2, face: 15, col: '#f0f0f0' },
    { id: 'nc2', name: '乾電池', genre: '日用品', cost: 280, unit: 10, price: 400, pop: 2, rejiyoko: true, face: 9, need: { tonya: 2 }, col: '#9aa0b0' },
    { id: 'nc3', name: '歯ブラシ', genre: '日用品', cost: 105, unit: 12, price: 150, pop: 1, face: 9, need: { tonya: 3 }, col: '#7fd8e0' },
    { id: 'nc4', name: 'ビニール傘', genre: '日用品', cost: 385, unit: 10, price: 550, pop: 1, rain: true, face: 6, need: { tonya: 3 }, col: '#d8e6f0' },
    { id: 'fs1', name: 'キーホルダー', genre: 'ファンシー雑貨', cost: 220, unit: 10, price: 400, pop: 2, face: 9, need: { outing: 1 }, col: '#c792ea' },
    { id: 'fs2', name: 'シール', genre: 'ファンシー雑貨', cost: 110, unit: 20, price: 200, pop: 3, face: 15, need: { outing: 1 }, col: '#ff9ec7' },
    { id: 'fs3', name: 'ヘアピン', genre: 'ファンシー雑貨', cost: 165, unit: 12, price: 300, pop: 2, face: 9, need: { outing: 2 }, col: '#f7a072' },
    { id: 'fs4', name: '推しうちわ', genre: 'ファンシー雑貨', cost: 330, unit: 10, price: 600, pop: 1, face: 6, need: { outing: 2 }, tol: 0.35, col: '#ff6fa8' },
    // 季節・イベント（解放されたときだけ仕入れられる）
    { id: 'sm1', name: 'ラムネ', genre: '季節', cost: 70, unit: 30, price: 120, pop: 3, months: [7, 8], unlock: 'summer', face: 15, col: '#9fe2f5' },
    { id: 'sm2', name: '花火セット', genre: '季節', cost: 600, unit: 10, price: 980, pop: 2, months: [7, 8], unlock: 'summer', face: 6, tol: 0.3, col: '#ff7a5a' },
    { id: 'hw1', name: 'ハロウィン詰め合わせ', genre: '季節', cost: 260, unit: 20, price: 450, pop: 3, months: [10], unlock: 'halloween', face: 9, col: '#ff9a3c' },
    { id: 'xm1', name: 'クリスマスお菓子ブーツ', genre: '季節', cost: 480, unit: 12, price: 800, pop: 3, months: [12], unlock: 'xmas', gift: true, face: 6, tol: 0.25, col: '#e84d4d' },
    { id: 'og1', name: 'おれさまアクスタ', genre: 'シャオグッズ', cost: 520, unit: 20, price: 1500, pop: 3, unlock: 'goods', face: 9, tol: 0.5, col: '#f89cc1' },
  ],
  NET_DISCOUNT: 0.9,    // ネット卸は1割安い（届くまで2日）
  NET_DAYS: 2,
  NET_MIN: 5000,        // ネット卸の最低注文額
  RUN_MARKUP: 1.1,      // 営業中に問屋へ走ったとき（急ぎで1割高い）
  RUN_MINUTES: 60,      // 問屋へ走ると店を空ける時間（分）
  LATE_OPEN: 660,       // 朝に現金問屋へ行くと、開店は11時
  STOCK_BUDGET: 60000,  // 初回仕入れの予算

  // 仕入れ値の相場：毎日いくつかの商品の仕入れ値が動いて、推奨価格も変わる
  MARKET: { moves: [0, 1, 1, 2, 2, 3], step: [0.06, 0.15], min: 0.8, max: 1.3, newsRate: 0.12 },
  MARKET_NEWS: [
    { ids: ['ks2', 'ks4'], up: true, text: 'カカオ豆が高騰。チョコの仕入れ値が上がった' },
    { genre: 'ドリンク', up: true, text: '原材料の値上がりで、飲み物の仕入れ値が上がった' },
    { ids: ['ks1'], up: true, text: 'じゃがいもが不作。ポテトチップスの仕入れ値が上がった' },
    { ids: ['ks1'], up: false, text: 'じゃがいもが豊作。ポテトチップスの仕入れ値が下がった' },
    { genre: '駄菓子', up: true, text: '駄菓子メーカーが値上げを発表した' },
    { ids: ['nc2'], up: false, text: '乾電池の大口セール。仕入れ値が下がった' },
    { genre: 'ファンシー雑貨', up: false, text: '雑貨の問屋が在庫処分。仕入れ値が下がった' },
    { ids: ['dr3', 'dr4'], up: false, text: '缶飲料の工場が増産。仕入れ値が少し下がった' },
  ],

  // 値段への客の反応。推奨価格（その日の相場）の何倍までなら「にっこり」か。下は0.85倍より安いと「にやり」（安すぎ）
  PRICE_LOW: 0.85,
  PRICE_TOL: { '駄菓子': 0.1, '菓子': 0.15, 'ドリンク': 0.1, '日用品': 0.15, 'ファンシー雑貨': 0.3, '季節': 0.2, 'シャオグッズ': 0.4 },
  // 反応ごとの買う確率。怒り（高すぎ）は、高すぎの線をどれだけ超えたかで下がる
  PRICE_BUY: { grin: 1, smile: 0.9, mad: [[0.1, 0.4], [0.25, 0.15], [9, 0.03]] },

  // ♥（生気）で使うおまじない：次の遊ぶ日の朝まで効く
  SPELLS: [
    { id: 'kids', name: '子どもを呼ぶおまじない', cost: 30, desc: '小学生が入りやすくなる（+40%）', enter: { kid: 0.4 } },
    { id: 'adults', name: '大人を呼ぶおまじない', cost: 45, desc: '大人（会社員・近所の人・学生）が入りやすくなる（+30%）', enter: { adult: 0.3 } },
    { id: 'women', name: 'お姉さんを呼ぶおまじない', cost: 30, desc: '女性の会社員が入りやすくなる（+50%）', enter: { woman: 0.5 } },
    { id: 'wallet', name: '財布のひもをゆるめるおまじない', cost: 50, desc: '客の財布の中身が増える（+25%）', budget: 0.25 },
    { id: 'tag', name: '値札が気にならなくなるおまじない', cost: 40, desc: '「にっこり」の幅が広がる（高すぎの線が+10%）', tol: 0.1 },
    { id: 'watch', name: '見張りのおまじない', cost: 15, desc: '万引きされない', theft: true },
  ],
  // ♥で買う「魔界の通販」：一度買えばずっと効く
  HEART_SHOP: [
    { id: 'gacha2', name: 'ガチャガチャの台を増やす（2台まで）', cost: 100, desc: '業者がもう1台持ってくる。台が多いほど、回す客が増える' },
    { id: 'gacha3', name: 'ガチャガチャの台を増やす（3台まで）', cost: 200, desc: '3台目。ガチャガチャ目当ての小学生が増える', need: 'gacha2' },
    { id: 'lamp', name: '置物「ハートのランプ」', cost: 80, desc: '設置に1.2万円。大人の客が入りやすくなる（+8%）' },
    { id: 'plush', name: '置物「おれさまのぬいぐるみ」', cost: 80, desc: '設置に8,000円。小学生と学生が入りやすくなる（+10%）' },
    { id: 'aroma', name: '置物「甘い匂いのアロマ」', cost: 60, desc: '設置に6,000円。女性の会社員が入りやすくなる（+15%）' },
    { id: 'bell', name: '置物「魔除けの鈴」', cost: 40, desc: '設置に3,000円。万引きされなくなる' },
  ],
  APRIL_GROSS: 120000,   // ミッション2-08：4月の粗利の目標。開店してからの23日分の家賃と光熱費（(13万＋2.5万)×23/30 ≒ 12万）
  THEFT_RATE: 0.04,   // 万引きが始まってから、小学生と学生が気づかれずに盗っていく確率（1人あたり）

  // 肇の体力：1日の営業で減る分（自動の日は、肇がぼんやり回すぶん少しだけ軽い）
  HP_DAY: { play: 16, playLate: 20, auto: 12, autoLate: 14 },
  // 夜の行動の効き目（どの行動のあとも、眠ると NIGHT_BASE がつく）
  NIGHT_BASE: { hp: 14, hunger: 8, mood: -2, stress: -2 },
  NIGHT_FX: {
    talk: { mood: 10, stress: -3 },
    sex: { hp: -12, stress: -22, hunger: -50, mood: 15 },
    sleep: { hp: 36, stress: -6, mood: -5 },
    smoke: { stress: -14, hp: -1, mood: -3 },
    outing: { hp: -6, mood: 25, stress: -8 },
    study: { hp: -3, stress: 3, mood: -8 },
    form: { hp: -3 },
    books: { hp: -3, mood: -6, stress: 2 },
    share: { hp: 35, hunger: 25, mood: -5 },
  },

  // 陳列：設置物ごとの枠の数。島棚と壁の棚はドリンク以外、冷蔵ケースはドリンクだけ、レジ横はガムや電池
  SLOTS: { shelf: 6, wallshelf: 9, fridge: 8, rejiyoko: 2 },
  // 相性コンボ：同じ棚（設置物）に全部並んでいると発動。ヒントはコンボ帳に出る
  COMBOS: [
    { id: 'sanshu', name: '駄菓子屋の三種の神器', items: ['dg2', 'dg3', 'dg5'], where: '棚', hint: '昔ながらの駄菓子屋に、だいたい置いてある3つ', fx: { kid: 0.15 }, desc: '小学生が入りやすくなる' },
    { id: 'bukatsu', name: '部活帰り', items: ['dr1', 'dr2'], where: '冷蔵ケース', hint: '部活帰りの学生が、一気に飲みそうな2本', fx: { student: 0.12, kid: 0.05 }, desc: '学生が入りやすくなる' },
    { id: 'ensoku', name: '遠足のおやつ', items: ['ks1', 'dg1', 'dg4'], where: '棚', hint: '遠足のリュックに入っていそうなお菓子3つ（300円まで）', fx: { kid: 0.12, student: 0.05 }, desc: '小学生と学生が入りやすくなる' },
    { id: 'zangyo', name: '残業のおとも', items: ['dr3', 'dr4', 'dr1'], where: '冷蔵ケース', hint: '残業中の会社員の机に並んでいそうな飲み物3つ', fx: { salary: 0.2 }, desc: '会社員が入りやすくなる' },
    { id: 'otsukai', name: 'ついでのおつかい', items: ['nc1', 'nc2', 'nc3'], where: '棚', hint: '近所の人が「ついでに」買っていく日用品3つ', fx: { elder: 0.2 }, desc: '近所の人が入りやすくなる' },
    { id: 'ame', name: '急な雨', items: ['nc4', 'nc1'], where: '棚', hint: '急に雨が降ってきたときに欲しいもの2つ', fx: { rain: 0.15 }, desc: '雨の日に大人が入りやすくなる' },
    { id: 'gohoubi', name: '仕事帰りのごほうび', items: ['ks2', 'ks4'], where: '棚', hint: '仕事帰りに自分へのごほうび。甘いもの2つ', fx: { woman: 0.15 }, desc: '会社員（女性）が入りやすくなる' },
    { id: 'oshikatsu', name: '推し活セット', items: ['fs4', 'fs2', 'fs1'], where: '棚', hint: '推しのライブに持っていくもの3つ', fx: { student: 0.2 }, desc: '学生が入りやすくなる' },
    { id: 'natsu', name: '夏の夜', items: ['sm1', 'sm2'], where: '棚', hint: '夏の夜、河原で遊ぶときに欲しいもの2つ', fx: { kid: 0.1, student: 0.1 }, desc: '小学生と学生が入りやすくなる' },
  ],
  // 曜日の特徴（遊ぶ日だけでなく、自動の日にも効く）
  WEEKDAY_NOTE: ['日曜：休日。子どもと家族連れで、朝からにぎやか', '月曜：週のはじめ。人通りは少なめ', '火曜', '水曜：ノー残業デー。会社員が早めに帰ってくる', '木曜', '金曜：花金。夜は会社員と学生でにぎわう', '土曜'],
  // 祝日（日曜と同じにぎわい）
  HOLIDAYS: ['2026-04-29', '2026-05-03', '2026-05-04', '2026-05-05', '2026-05-06', '2026-07-20', '2026-08-11', '2026-09-21', '2026-09-22', '2026-09-23', '2026-10-12', '2026-11-03', '2026-11-23', '2027-01-01', '2027-01-11', '2027-02-11', '2027-02-23', '2027-03-21'],
  // 開業パック（シャオが肇の名前で申し込んだ分割払い）
  PACK: { name: '開業パック（分割払い）', amount: 1200000, rate: 0.148, months: 36, items: { register: 1, shelf: 2 } },

  // 客の種類。genres は欲しいジャンルの順。budget は財布の中身（円）
  CUSTOMERS: {
    kid: { label: '小学生', genres: ['駄菓子', 'ファンシー雑貨', '季節'], budget: [100, 500], gacha: 0.5, enter: 0.55, sprites: ['kid1', 'kid2', 'kid3'] },
    elder: { label: '近所の人', genres: ['日用品', '菓子', 'ドリンク'], budget: [150, 1000], gacha: 0, enter: 0.2, sprites: ['elder'], adult: true },
    salary: { label: '会社員', genres: ['ドリンク', '菓子', '日用品'], budget: [150, 800], gacha: 0, enter: 0.14, sprites: ['salary'], adult: true, tired: true },
    woman: { label: '会社員', genres: ['菓子', 'ファンシー雑貨', 'ドリンク', 'シャオグッズ', '季節'], budget: [200, 1800], gacha: 0.05, enter: 0.16, sprites: ['woman'], adult: true },
    student: { label: '学生', genres: ['ファンシー雑貨', 'ドリンク', '駄菓子', 'シャオグッズ', '季節'], budget: [150, 900], gacha: 0.3, enter: 0.2, sprites: ['student'], adult: true, young: true },
  },
  // 時間帯ごとの通行人（1分あたりの人数と、客の種類の割合）。平日の基本
  TRAFFIC: [
    { from: 600, to: 720, rate: 0.10, mix: { elder: 4, salary: 1, woman: 1 } },
    { from: 720, to: 780, rate: 0.16, mix: { salary: 3, woman: 2, elder: 1 } },
    { from: 780, to: 900, rate: 0.10, mix: { elder: 3, woman: 1, student: 1 } },
    { from: 900, to: 1050, rate: 0.24, mix: { kid: 4, student: 3, elder: 1 } },
    { from: 1050, to: 1200, rate: 0.20, mix: { salary: 4, woman: 3, student: 2 } },
    { from: 1200, to: 1260, rate: 0.16, mix: { salary: 5, woman: 3, student: 1 } },
  ],
  WEEKDAY_TRAFFIC: [1.2, 0.95, 1, 1, 1, 1.05, 1.3],   // 日〜土
  MONTH_TRAFFIC: { 1: 0.92, 2: 0.9, 3: 1.05, 4: 1.0, 5: 1.0, 6: 0.9, 7: 1.05, 8: 1.1, 9: 0.95, 10: 1.0, 11: 0.95, 12: 1.3 },
  RAIN_RATE: { 1: 0.12, 2: 0.15, 3: 0.2, 4: 0.2, 5: 0.2, 6: 0.45, 7: 0.25, 8: 0.2, 9: 0.3, 10: 0.22, 11: 0.18, 12: 0.12 },
  GACHA_PRICE: 300,
  GACHA_VENDOR_SHARE: 0.25, // 業者に置いてもらったときの店の取り分
  GACHA_OWN_MARGIN: 0.4,    // 自前のときの粗利率

  // 毎月のお金（月末に払う）
  COSTS: {
    rent: { name: '家賃', amount: 130000 },
    utility: { name: '水道光熱', amount: 25000, summer: 32000 },
    comm: { name: '通信・POS', amount: 8000 },
    misc: { name: '消耗品・雑費', amount: 7000 },
  },
  LATE_UTILITY: 3000,       // 21時まで開けると増える光熱費
  KAI_FEE: 3000,            // 商店街の会費
  LEASE_FEE: 5000,          // 冷蔵ケースのリース
  PERSONAL: {
    living: { name: '生活費（自宅の家賃・食費など）', amount: 160000 },
    nenkin: { name: '国民年金', amount: 17920, from: { y: 2026, m: 5 } },
    kokuho: { name: '国民健康保険', amount: 35000, from: { y: 2026, m: 6 } },
    jumin: { name: '住民税', amount: 20000, from: { y: 2026, m: 6 } },
  },
  // 有給消化中の給料（前の会社から）
  LAST_SALARY: [{ y: 2026, m: 4, d: 24, amount: 270000 }, { y: 2026, m: 5, d: 25, amount: 140000 }],

  // 融資の借り先
  LENDERS: {
    kouko: { name: '日本政策金融公庫', amount: 3000000, rate: 0.030, years: 7, grace: 6, wait: 25, desc: '審査に1か月くらい。金利は低め（年3%）。元金の返済を6か月待ってもらえる。創業計画書と面談が要る' },
    shinkin: { name: '地元の信用金庫（区の創業融資）', amount: 3000000, rate: 0.016, years: 7, grace: 6, wait: 40, fee: 30000, desc: '区が利子の一部を出してくれる（実質年1.6%）。保証協会の審査が入って1〜2か月。商店街の会員だと話が早い' },
    loan: { name: '隣の「ローン」', amount: 500000, rate: 0.18, years: 3, grace: 0, wait: 0, desc: '今日借りられる。審査はゆるい。金利は年18%' },
  },
  // アルバイトの応募者
  APPLICANTS: [
    { id: 'kohai', name: '後輩', wage: 1250, skill: 3, desc: '肇の前の会社の後輩。真面目でよく働く。肇を慕っている', sprite: 'kohai' },
    { id: 'student', name: '大学生', wage: 1230, skill: 2, desc: '近所の大学生。夕方と土日に入れる。たまに遅刻する', sprite: 'student_f' },
    { id: 'elder', name: '元店主', wage: 1230, skill: 2, desc: '商店街で昔、文房具屋をやっていた人。午前中に強い', sprite: 'elder_f' },
  ],
  MIN_WAGE: [{ from: { y: 2025, m: 10, d: 3 }, wage: 1226 }, { from: { y: 2026, m: 10, d: 1 }, wage: 1280 }],
};
