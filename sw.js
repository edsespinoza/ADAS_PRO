/* ═══════════════════════════════════════════════════════════
   ADAS PRO — Service Worker v1.1.0
   Stale-while-revalidate static · Network-only API · Offline PDFs
   ═══════════════════════════════════════════════════════════ */

const CACHE_VERSION = 'v1.1.0';
const CACHE_PREFIX = 'adaspro';

const APP_SHELL_CACHE = `${CACHE_PREFIX}-shell-${CACHE_VERSION}`;
const STATIC_CACHE    = `${CACHE_PREFIX}-static-${CACHE_VERSION}`;
const PDF_CACHE       = `${CACHE_PREFIX}-pdfs-${CACHE_VERSION}`;
const FONT_CACHE      = `${CACHE_PREFIX}-fonts-${CACHE_VERSION}`;
const API_CACHE       = `${CACHE_PREFIX}-api-${CACHE_VERSION}`;
const OFFLINE_CACHE   = `${CACHE_PREFIX}-offline-${CACHE_VERSION}`;

const ALL_CACHES = [
  APP_SHELL_CACHE, STATIC_CACHE, PDF_CACHE,
  FONT_CACHE, API_CACHE, OFFLINE_CACHE
];

const APP_SHELL = [
  '/',
  '/login.html',
  '/membros.html',
  '/admin.html',
  '/superadmin.html',
  '/css/style.css',
  '/css/auth.css',
  '/js/auth.js',
  '/js/app.js',
  '/js/animations.js',
  '/manifest.json'
];

const SUPABASE_URL = 'https://zqydyyticvtmirjzskly.supabase.co';

/* ─── Install: pre-cache app shell ─── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then(c => c.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

/* ─── Activate: purge old versions ─── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => CACHE_PREFIX.split('-')[0] === k.split('-')[0] && !ALL_CACHES.includes(k))
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ─── Fetch: smart routing ─── */
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  /* Skip non-GET and cross-origin (except Supabase) — POST/PUT/DELETE never cached */
  if (request.method !== 'GET') {
    if (url.origin === SUPABASE_URL) {
      e.respondWith(fetch(request));
    }
    return;
  }

  /* PDFs → stale-while-revalidate with dedicated cache */
  if (url.pathname.endsWith('.pdf')) {
    e.respondWith(staleWhileRevalidate(request, PDF_CACHE));
    return;
  }

  /* Google Fonts → dedicated cache */
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  /* Supabase API calls → network-first */
  if (url.origin === SUPABASE_URL) {
    e.respondWith(networkFirst(request));
    return;
  }

  /* Static assets (CSS/JS/images) → stale-while-revalidate (always fetch fresh, serve cache instantly) */
  if (/\.(css|js|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot)$/i.test(url.pathname)) {
    e.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  /* HTML navigation → network-first with offline fallback */
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(networkFirstWithFallback(request));
    return;
  }

  /* Everything else → network-first */
  e.respondWith(networkFirst(request));
});

/* ─── Cache strategies ─── */

function cacheFirst(request, cacheName) {
  return caches.open(cacheName).then(c => c.match(request)).then(cached => {
    if (cached) return cached;
    return fetch(request).then(resp => {
      if (resp.ok) {
        const clone = resp.clone();
        caches.open(cacheName).then(c => c.put(request, clone));
      }
      return resp;
    }).catch(() => new Response('Offline', { status: 503 }));
  });
}

function staleWhileRevalidate(request, cacheName) {
  return caches.open(cacheName).then(c => {
    return c.match(request).then(cached => {
      const fetchPromise = fetch(request).then(resp => {
        if (resp.ok) c.put(request, resp.clone());
        return resp;
      }).catch(() => cached);

      return cached || fetchPromise;
    });
  });
}

function networkFirst(request) {
  return fetch(request).catch(() =>
    caches.open(API_CACHE).then(c => c.match(request)).then(cached => cached || new Response('Offline', { status: 503 }))
  );
}

function networkFirstWithFallback(request) {
  return fetch(request).then(resp => {
    if (resp.ok) {
      const clone = resp.clone();
      caches.open(STATIC_CACHE).then(c => c.put(request, clone));
    }
    return resp;
  }).catch(() =>
    caches.open(STATIC_CACHE).then(c => c.match(request)).then(cached => cached || caches.open(APP_SHELL_CACHE).then(c2 => c2.match('/login.html')))
  );
}

/* ─── Background Sync ─── */
self.addEventListener('sync', e => {
  if (e.tag === 'adaspro-sync') {
    e.waitUntil(replayPendingActions());
  }
});

async function replayPendingActions() {
  try {
    const db = await openDB();
    const tx = db.transaction('pending', 'readonly');
    const store = tx.objectStore('pending');
    const all = await getAllFromStore(store);
    for (const action of all) {
      try {
        const resp = await fetch(action.url, {
          method: action.method || 'POST',
          headers: { 'Content-Type': 'application/json', ...action.headers },
          body: JSON.stringify(action.body)
        });
        if (resp.ok) {
          const delTx = db.transaction('pending', 'readwrite');
          delTx.objectStore('pending').delete(action.id);
        }
      } catch (_) { /* will retry next sync */ }
    }
  } catch (_) { /* IndexedDB unavailable */ }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('adaspro-pending', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('pending', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/* ─── Message: skip waiting ─── */
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
