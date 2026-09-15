const CACHE = "aljawarih-shell-v11";
const SHELL = ["/", "/styles.css?v=11", "/app.js?v=11", "/manifest.webmanifest", "/icon.svg", "/assets/club/logo-aigle.jpg", "/assets/club/logo-association.jpg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((match) => match || caches.match("/")))
  );
});
