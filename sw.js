// Service worker: offline, atualizações e notificações push.
// IMPORTANTE: ao mudares QUALQUER ficheiro da app, aumenta a VERSION (e APP_VERSION em js/constants.js).
const VERSION = '2.0.0';
const CACHE = `habitos30-v${VERSION}`;
const RUNTIME = 'habitos30-runtime';
const ASSETS = [
  './', './index.html', './manifest.json', './favicon.ico', './css/style.css',
  './js/main.js', './js/constants.js', './js/utils.js', './js/stats.js', './js/achievements.js', './js/store.js',
  './js/cloud.js', './js/theme.js', './js/notifications.js',
  './js/ui/confetti.js', './js/ui/sheets.js', './js/ui/today.js', './js/ui/progress.js',
  './js/ui/achievements-view.js', './js/ui/profile.js', './js/ui/auth-ui.js', './js/ui/onboarding.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon-32.png', './icons/logo-mark.png'
];

// Sem skipWaiting automático: a app mostra "Nova versão disponível" e o utilizador decide.
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS))));
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k !== RUNTIME).map((k) => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('message', (e) => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Ficheiros da própria app
  if (url.origin === location.origin) {
    // firebase-config.js: rede primeiro (para as tuas alterações aparecerem logo)
    if (url.pathname.endsWith('/firebase-config.js')) {
      e.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(RUNTIME).then((x) => x.put(req, c)); return r; })
        .catch(() => caches.match(req)));
      return;
    }
    e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).catch(() =>
      req.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
    return;
  }
  // SDK do Firebase (gstatic): guarda para funcionar offline e atualiza em segundo plano
  if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    e.respondWith(caches.open(RUNTIME).then(async (c) => {
      const hit = await c.match(req);
      const net = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
  }
  // Todo o resto (API do Firestore/Auth): passa direto, sem cache.
});

// Notificações push (Firebase Cloud Messaging, mensagens só com "data")
self.addEventListener('push', (e) => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (_) { p = { data: { body: e.data && e.data.text() } }; }
  const d = p.data || p.notification || p;
  const title = d.title || '30 Dias';
  e.waitUntil((async () => {
    const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (cs.some((c) => c.visibilityState === 'visible')) { cs.forEach((c) => c.postMessage({ type: 'PUSH', title, body: d.body })); return; }
    await self.registration.showNotification(title, {
      body: d.body || '', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
      tag: d.tag || '30dias', data: { url: d.url || './' }
    });
  })());
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    const c = cs.find((x) => x.url.startsWith(self.registration.scope));
    return c ? c.focus() : self.clients.openWindow(target);
  }));
});
