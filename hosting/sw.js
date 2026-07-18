/* Torrek Service Worker — Offline-First (000 Vision).
   Strategie: Cache-first mit Hintergrund-Aktualisierung (stale-while-revalidate).
   Die App-Daten selbst liegen in localStorage; hier geht es um die App-Shell. */
const CACHE = "torrek-v16";
const SHELL = ["./index.html", "./manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET" || new URL(request.url).origin !== location.origin) return;

  // Seiten-Navigationen (auch Deep-Links wie ?p=… aus dem Projekt-QR) fallen immer auf
  // die App-Shell zurück. Ohne das liefert der SW für ?p=… offline nichts → 404.
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy)); // Shell aktuell halten
          return res;
        })
        .catch(() => caches.match("./index.html", { ignoreSearch: true })),
    );
    return;
  }

  e.respondWith(
    caches.match(request).then((hit) => {
      const net = fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => hit); // offline: Cache-Treffer oder eben nichts
      return hit || net;
    }),
  );
});
