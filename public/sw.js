/* TheoFinance service worker — offline parcial + cache básico */
/* Estratégia: network-first para páginas, cache-first para estáticos, offline fallback */

const VERSION = "v1";
const PRECACHE = `theofinance-precache-${VERSION}`;
const RUNTIME = `theofinance-runtime-${VERSION}`;

const PRECACHE_URLS = [
  "/offline",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  const expected = new Set([PRECACHE, RUNTIME]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !expected.has(key)).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

const isApiRequest = (url) => url.pathname.startsWith("/api/");
const isAuthRoute = (url) =>
  url.pathname.startsWith("/auth") || url.pathname.includes("/callback");
const isStaticAsset = (url) =>
  url.pathname.startsWith("/_next/static") ||
  /\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|webp|avif|svg|ico)$/i.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isApiRequest(url) || isAuthRoute(url)) return;

  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          const cache = await caches.open(RUNTIME);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        } catch {
          const cache = await caches.open(RUNTIME);
          const cached = await cache.match(request);
          if (cached) return cached;
          const offline = await caches.match("/offline");
          if (offline) return offline;
          return Response.error();
        }
      })()
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            const cache = await caches.open(RUNTIME);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          return cached ?? Response.error();
        }
      })()
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "TheoFinance", body: event.data.text() };
  }
  const { title = "TheoFinance", body, url = "/dashboard", tag } = payload;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag,
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(target));
      if (existing) return existing.focus();
      return self.clients.openWindow(target);
    })
  );
});
