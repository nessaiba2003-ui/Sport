const CACHE = "aljawarih-shell-v6";
const SHELL = ["/", "/styles.css", "/app.js", "/manifest.webmanifest", "/icon.svg", "/assets/club/logo-aigle.jpg", "/assets/club/logo-association.jpg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((match) => match || caches.match("/")))
  );
});
