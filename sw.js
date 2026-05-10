// ============================================
// NOUR — Service Worker v3
// Auto-update + Offline
// ============================================

const CACHE_VERSION = "nour-v3";
const ASSETS = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/app.js",
  "/js/data.js",
  "/js/auth.js",
  "/js/premium.js",
  "/js/notifications.js",
  "/js/share.js",
  "/manifest.json",
  "/img/icon-192.png",
  "/img/icon-512.png",
];

// Installation
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()), // Activer immédiatement
  );
});

// Activation — nettoyer anciens caches + notifier les clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()) // Prendre contrôle immédiatement
      .then(() => {
        // Notifier tous les clients qu'une mise à jour est disponible
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: "SW_UPDATED", version: CACHE_VERSION });
          });
        });
      }),
  );
});

// Fetch — Network First pour HTML, Cache First pour assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Toujours réseau pour API externe
  if (
    url.hostname === "cdn.islamic.network" ||
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("stripe.com")
  ) {
    event.respondWith(
      fetch(event.request).catch(() => new Response("", { status: 503 })),
    );
    return;
  }

  // Network First pour les pages HTML
  if (event.request.destination === "document") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches
            .open(CACHE_VERSION)
            .then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match("/index.html")),
    );
    return;
  }

  // Cache First pour les assets statiques
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches
            .open(CACHE_VERSION)
            .then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }),
  );
});
