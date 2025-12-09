// Firebase Messaging Service Worker

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSy...", // Same as frontend config
  authDomain: "salesflow-ai.firebaseapp.com",
  projectId: "salesflow-ai",
  storageBucket: "salesflow-ai.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);

  const { title, body, data } = payload.notification || payload.data || {};

  const notificationOptions = {
    body: body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200],
    data: data || {},
    actions: getActionsForType(data?.type)
  };

  self.registration.showNotification(title, notificationOptions);
});

// Get actions based on notification type
function getActionsForType(type) {
  switch (type) {
    case 'overdue_followups':
      return [
        { action: 'view', title: 'Anzeigen' },
        { action: 'snooze', title: 'Später' }
      ];
    case 'hot_lead':
      return [
        { action: 'call', title: 'Anrufen' },
        { action: 'view', title: 'Details' }
      ];
    case 'power_hour':
      return [
        { action: 'start', title: 'Starten' },
        { action: 'skip', title: 'Überspringen' }
      ];
    default:
      return [
        { action: 'view', title: 'Öffnen' }
      ];
  }
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  let url = '/chat';

  // Determine URL based on action and type
  if (action === 'view' || !action) {
    switch (data.type) {
      case 'overdue_followups':
        url = '/chat?prompt=' + encodeURIComponent('zeig mir meine überfälligen follow-ups');
        break;
      case 'hot_lead':
        if (data.lead_id) {
          url = `/leads/${data.lead_id}`;
        } else {
          url = '/chat?prompt=' + encodeURIComponent('zeig mir meine hot leads');
        }
        break;
      case 'churn_risk':
        url = '/chat?prompt=' + encodeURIComponent('welche kunden brauchen aufmerksamkeit');
        break;
      case 'daily_briefing':
        url = '/dashboard';
        break;
      case 'power_hour':
        url = '/chat?prompt=' + encodeURIComponent('starte power hour');
        break;
      default:
        url = '/chat';
    }
  } else if (action === 'start' && data.type === 'power_hour') {
    url = '/chat?prompt=' + encodeURIComponent('starte power hour');
  } else if (action === 'call' && data.lead_id) {
    // Could open phone app, for now go to lead
    url = `/leads/${data.lead_id}`;
  }

  // Open or focus window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes('salesflow') && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
