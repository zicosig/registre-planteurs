/* Service worker — rend l'application utilisable sans réseau.
   Incrémentez VERSION à chaque mise en ligne d'une nouvelle version
   du fichier index.html : c'est ce qui déclenche la mise à jour
   sur les téléphones des agents. */
const VERSION = "rp-2026-07-29-cloud-v8";
const SOCLE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icone-192.png",
  "./icone-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(SOCLE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  /* L'API Supabase n'est jamais mise en cache : soit le réseau répond,
     soit la synchronisation attendra le prochain passage. */
  if (url.hostname.endsWith(".supabase.co")) return;

  /* Le document lui-même : réseau d'abord pour récupérer les corrections,
     cache en secours quand il n'y a pas de réseau. */
  if (req.mode === "navigate" || url.pathname.endsWith("index.html")) {
    e.respondWith(
      fetch(req)
        .then((rep) => {
          const copie = rep.clone();
          caches.open(VERSION).then((c) => c.put("./index.html", copie));
          return rep;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  /* Tout le reste — bibliothèques, icônes, tuiles de carte déjà vues :
     cache d'abord, réseau ensuite, et on garde au passage. */
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((rep) => {
          if (rep && (rep.ok || rep.type === "opaque")) {
            const copie = rep.clone();
            caches.open(VERSION).then((c) => c.put(req, copie));
          }
          return rep;
        })
        .catch(() => hit);
    })
  );
});
