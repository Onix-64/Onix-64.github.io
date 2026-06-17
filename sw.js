const CACHE_NAME = 'foot-mardi-v7';
const ASSETS = ['/', '/index.html', '/manifest.json', '/logo-dark.png', '/logo-light.png', '/ball-dark.png', '/ball-light.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// ══ NOTIFICATIONS PUSH (Firebase Cloud Messaging) ══
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDA_WQbWZWCA84MQOlQ2BWJYG9q2P48RdI",
  authDomain: "gestion-soccer-29e1b.firebaseapp.com",
  databaseURL: "https://gestion-soccer-29e1b-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gestion-soccer-29e1b",
  messagingSenderId: "216640013813",
  appId: "1:216640013813:web:2256d73a45096e52198bc"
});

// Quand l'appli est en arrière-plan ou fermée, Firebase affiche automatiquement
// la notification système grâce au champ "notification" envoyé par le serveur.
firebase.messaging();

// Au clic sur la notification : ouvrir l'appli si elle n'est pas déjà ouverte,
// ou simplement la mettre au premier plan si elle l'est déjà.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientsArr => {
      const hadWindow = clientsArr.some(client => {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          return true;
        }
        return false;
      });
      if (!hadWindow) self.clients.openWindow('/');
    })
  );
});
