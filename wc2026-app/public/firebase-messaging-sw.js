/* eslint-disable */
// Service worker for FCM background messages.
// Must be served from the same scope as the app — placed at /wc2026/firebase-messaging-sw.js.

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyC14zzhI5JQvJS_GCSaWLoSRWRE3KQ5G2I',
  authDomain: 'progym-web.firebaseapp.com',
  projectId: 'progym-web',
  storageBucket: 'progym-web.firebasestorage.app',
  messagingSenderId: '552542942423',
  appId: '1:552542942423:web:7e0b4199467836acc52c92',
})

const messaging = firebase.messaging()

// When the OS shows a background notification and the user clicks it,
// open the URL the server attached as `fcmOptions.link` (or the data.click_action),
// reusing an existing tab if one is open.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification?.data || {}
  const fcmLink = data.FCM_MSG?.notification?.click_action || data.click_action || data['fcmOptions']?.link
  const target = fcmLink || 'https://tavrostechinfo.com/wc2026/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const c of clientsArr) {
        if (c.url.includes('/wc2026') && 'focus' in c) {
          c.navigate(target)
          return c.focus()
        }
      }
      return self.clients.openWindow(target)
    })
  )
})

// Fallback handler — Firebase auto-shows the notification when the message
// has a `notification` field, so we don't need to call showNotification ourselves.
messaging.onBackgroundMessage((payload) => {
  // No-op: Firebase displays it. We intentionally avoid showNotification() here
  // to prevent the "two notifications" bug.
  void payload
})
