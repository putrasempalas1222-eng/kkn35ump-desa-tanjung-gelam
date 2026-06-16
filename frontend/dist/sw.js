const CACHE_NAME = 'kkn-35-app-v1';
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/report-assets/logokknv1.png',
  '/report-assets/logo-kkn.png',
  '/report-assets/logo-ump.png'
];

try {
  importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

  firebase.initializeApp({
    apiKey: 'AIzaSyCxFcWI6vLfGNcQMnTVRsRtXsDJfzqiWEw',
    authDomain: 'project-3dfa8c97-bc93-4195-a5a.firebaseapp.com',
    databaseURL: 'https://project-3dfa8c97-bc93-4195-a5a-default-rtdb.firebaseio.com',
    projectId: 'project-3dfa8c97-bc93-4195-a5a',
    storageBucket: 'project-3dfa8c97-bc93-4195-a5a.firebasestorage.app',
    messagingSenderId: '275478991025',
    appId: '1:275478991025:web:80d97124eb119cc039d290',
    measurementId: 'G-YL95DFEMDK',
  });

  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    self.registration.showNotification(data.title || 'Pesan Baru KKN 35', {
      body: data.body || 'Ada pesan chat divisi baru.',
      icon: '/report-assets/logokknv1.png',
      badge: '/report-assets/logokknv1.png',
      tag: data.messageId || 'division-chat',
      data: {
        url: data.url || '/#admin',
      },
    });
  });
} catch (error) {
  console.warn('Firebase Messaging service worker disabled:', error);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => undefined);
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/#admin';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
