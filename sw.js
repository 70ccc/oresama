'use strict';
// オフラインでも遊べるように、ゲームのファイルをスマホの中に保存しておく（https で開いたときだけ動く）
// ふだんはネットの新しいファイルを使い、つながらないときだけ保存した分を使う。BGMは一度鳴らした曲を保存する
const VERSION = 'keiei-v1';
const CORE_CACHE = 'keiei-core-' + VERSION;
const AUDIO_CACHE = 'keiei-bgm-v1';
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./css/font.css", "./css/style.css", "./js/atlas.js", "./js/bgm.js", "./js/data.js", "./js/engine.js", "./js/events.js", "./js/events5.js", "./js/field.js", "./js/forms.js", "./js/kit.js", "./js/night.js", "./js/panels.js", "./js/script.js", "./js/script2.js", "./js/script3.js", "./js/script4.js", "./js/script5.js", "./js/shelf.js", "./js/sim.js", "./js/story.js", "./js/ui.js", "./assets/sprites.png", "./assets/bg_store.png", "./assets/bg_room.png", "./assets/hajime_base.png", "./assets/xiao_base.png", "./assets/icon-192.png", "./assets/icon-180.png"];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CORE_CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('keiei-core-') && k !== CORE_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// BGM：曲を丸ごと保存して、audio が頼む一部分（Range）だけを切り出して返す
async function bgm(req) {
  const cache = await caches.open(AUDIO_CACHE);
  let full = await cache.match(req.url);
  if (!full) {
    let r;
    try { r = await fetch(req.url); } catch (e) { return new Response('', { status: 504 }); }
    if (!r.ok || r.status !== 200) return r;
    await cache.put(req.url, r.clone());
    full = r;
  }
  const range = req.headers.get('range');
  if (!range) return full;
  const buf = await full.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  const size = buf.byteLength;
  let start = m[1] ? Number(m[1]) : 0;
  let end = m[2] ? Number(m[2]) : size - 1;
  if (!m[1] && m[2]) { start = size - Number(m[2]); end = size - 1; }
  end = Math.min(end, size - 1);
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: { 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1), 'Content-Type': full.headers.get('Content-Type') || 'audio/mpeg', 'Accept-Ranges': 'bytes' },
  });
}

// それ以外：ネットを先に見て（4秒まで）、だめなら保存した分
async function core(req) {
  const cache = await caches.open(CORE_CACHE);
  try {
    const r = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))]);
    if (r && r.ok && r.status === 200) cache.put(req, r.clone());
    return r;
  } catch (e) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    throw e;
  }
}

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.url.includes('/assets/bgm/')) { ev.respondWith(bgm(req)); return; }
  ev.respondWith(core(req));
});
