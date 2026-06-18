const CACHE_NAME = 'foot-mardi-v14';
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
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDA_WQbWZWCA84MQOlQ2BWJYG9q2P48RdI",
  authDomain: "gestion-soccer-29e1b.firebaseapp.com",
  databaseURL: "https://gestion-soccer-29e1b-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gestion-soccer-29e1b",
  messagingSenderId: "216640013813",
  appId: "1:216640013813:web:2256d73a45096e52198bc"
});

const db = firebase.database();
const messaging = firebase.messaging();

// Quand l'appli est en arrière-plan ou fermée, on construit nous-mêmes la
// notification (plutôt que de laisser Firebase l'afficher automatiquement)
// pour pouvoir y ajouter des boutons d'action adaptés à chaque joueur.
messaging.onBackgroundMessage(payload => {
  const data = payload.data || {};
  const notif = payload.notification || {};
  const inPlanning = data.inPlanning === '1';
  const actions = inPlanning
    ? [{ action: 'present', title: 'Présent' }, { action: 'pd', title: 'Pas dispo' }]
    : [{ action: 'pd', title: 'Pas dispo' }, { action: 'sb', title: 'Si besoin' }];

  self.registration.showNotification(notif.title, {
    body: notif.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.matchId ? ('foot-mardi-' + data.matchId) : undefined,
    data: data,
    actions: actions
  });
});

function labelForChoice(choice) {
  if (choice === 'present') return 'Présent';
  if (choice === 'pd') return 'Pas dispo';
  if (choice === 'sb') return 'Dispo si besoin';
  return choice;
}

// Enregistre le vote directement depuis le service worker (sans ouvrir l'appli),
// puis remplace la notification par une confirmation.
function castVoteFromSW(playerId, matchId, choice) {
  if (!playerId || !matchId) return Promise.resolve();
  return db.ref('matches/' + matchId + '/votes/' + playerId).set({
    choice: choice,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  }).then(() => {
    return self.registration.showNotification('Foot du mardi', {
      body: 'Vote enregistré : ' + labelForChoice(choice),
      icon: '/icons/icon-192.png',
      tag: 'foot-mardi-' + matchId
    });
  }).catch(() => {
    return self.registration.showNotification('Foot du mardi', {
      body: "Erreur, ouvre l'appli pour voter manuellement.",
      icon: '/icons/icon-192.png',
      tag: 'foot-mardi-' + matchId
    });
  });
}

// Au clic sur la notification : si c'est un bouton d'action, on vote directement.
// Sinon (clic sur le corps de la notification), on ouvre l'appli comme avant.
self.addEventListener('notificationclick', event => {
  const action = event.action;
  const data = event.notification.data || {};
  event.notification.close();

  if (action === 'present' || action === 'pd' || action === 'sb') {
    event.waitUntil(castVoteFromSW(data.playerId, data.matchId, action));
    return;
  }

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
