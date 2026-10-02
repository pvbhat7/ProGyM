/* eslint-disable */
// ProGym web-push service worker.
//
// Registered with scope "<app base>/push/" so it never clashes with the
// root /sw.js used by landing.html — it only receives pushes, it does not
// control pages.
//
// The server (class/PushSender.php) sends DATA-ONLY FCM messages, so we read
// the raw push payload here and build the notification ourselves. That keeps
// one code path whether the app is open or closed, and lets relative links
// resolve against whichever domain the app is served from.

const APP_ROOT = self.registration.scope.replace(/push\/$/, '')
const ICON_URL = 'https://progym.co.in/logo/progym.jpg'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

function resolveLink(link) {
  if (!link) return APP_ROOT + 'member-dashboard'
  if (/^https:\/\//i.test(link)) return link
  return APP_ROOT + link.replace(/^\//, '')
}

// Tell the server this device showed / the member tapped the notification
// (admin "Delivery log"). Best effort — never blocks the notification.
function sendReceipt(meta, eventName) {
  if (!meta || !meta.rcpt || !meta.nid || !meta.tid) return Promise.resolve()
  return fetch(meta.rcpt, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nid: meta.nid, tid: meta.tid, event: eventName }),
  }).catch(() => {})
}

self.addEventListener('push', (event) => {
  let payload = {}
  try { payload = event.data ? event.data.json() : {} } catch (e) { payload = {} }
  const d = payload.data || payload || {}

  // Apple (iPhone/iPad/Mac) web push ignores `image`, so point the member to the
  // in-app inbox instead: add a hint and open the bell panel on tap.
  const noImageSupport = /iPhone|iPad|Macintosh/.test(self.navigator.userAgent)
  const imageViaInbox = !!d.image && noImageSupport

  const options = {
    body: (d.body || '') + (imageViaInbox ? '\n📷 Tap to view photo' : ''),
    icon: ICON_URL,
    badge: ICON_URL,
    tag: 'progym-' + (d.nid || Date.now()),
    data: {
      url: imageViaInbox ? APP_ROOT + 'member-dashboard?notifications=open' : resolveLink(d.link),
      nid: d.nid, tid: d.tid, rcpt: d.rcpt,
    },
  }
  if (d.image) options.image = d.image

  event.waitUntil(Promise.all([
    self.registration.showNotification(d.title || 'ProGym', options)
      .then(() => sendReceipt(options.data, 'delivered')),
    // Let open tabs refresh their notification bell.
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      list.forEach((c) => c.postMessage({ type: 'progym-push', nid: d.nid || null }))
    }),
  ]))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const meta = event.notification.data || {}
  const target = meta.url || APP_ROOT

  event.waitUntil(Promise.all([
    sendReceipt(meta, 'clicked'),
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // This SW controls no pages, so client.navigate() is not allowed —
      // focus an open app tab and ask it to navigate itself (see pushNotifications.ts).
      for (const c of list) {
        if (c.url.startsWith(APP_ROOT) && !c.url.includes('/wc2026') && 'focus' in c) {
          c.postMessage({ type: 'progym-navigate', url: target })
          return c.focus()
        }
      }
      return self.clients.openWindow(target)
    }),
  ]))
})
