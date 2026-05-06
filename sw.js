// ============================================
// NOUR — Service Worker v2 — Mode Offline
// ============================================

const CACHE_NAME = 'nour-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/data.js',
  '/js/notifications.js',
  '/js/share.js',
  '/manifest.json',
  '/img/icon-192.png',
  '/img/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Outfit:wght@300;400;500;600;700;800&display=swap'
];

// Installation — mise en cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.log('Cache partiel:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activation — nettoyage anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — Cache First pour assets, Network First pour API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API audio — toujours depuis le réseau
  if (url.hostname === 'cdn.islamic.network') {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response('Audio non disponible hors ligne', { status: 503 })
      )
    );
    return;
  }

  // Supabase — toujours réseau
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(fetch(event.request).catch(() => new Response('{}', { status: 503 })));
    return;
  }

  // Assets — Cache First
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Mettre en cache les nouvelles ressources statiques
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Fallback offline
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Notifications push
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Nour — Arabe Coranique';
  const options = {
    body: data.body || 'Ton mot du jour t\'attend !',
    icon: '/img/icon-192.png',
    badge: '/img/icon-192.png',
    tag: 'nour-daily',
    renotify: true,
    data: { url: '/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Notifications locales programmées
self.addEventListener('message', event => {
  if (event.data?.type === 'SCHEDULE_NOTIFICATION') {
    scheduleLocalNotification(event.data.streak, event.data.hour);
  }
});

function scheduleLocalNotification(streak, hour = 18) {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, 0, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  const delay = target - now;

  setTimeout(() => {
    const messages = [
      { title: '🔥 Streak en danger !', body: `${streak} jours de suite — ne brise pas ta série !` },
      { title: '📖 Mot du jour', body: 'Un nouveau mot coranique t\'attend. 5 minutes suffisent.' },
      { title: '🕌 Rappel Nour', body: 'Comprends le Coran un mot à la fois. C\'est le moment !' }
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];
    self.registration.showNotification(msg.title, {
      body: msg.body, icon: '/img/icon-192.png', tag: 'nour-daily', renotify: true, data: { url: '/' }
    });
    scheduleLocalNotification(streak, hour);
  }, delay);
}
