// NeuraMed Custom Service Worker — Push Notification Handler

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "NeuraMed", body: event.data.text() };
  }

  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: payload.badge || "/icons/badge-72x72.png",
    vibrate: [200, 100, 200],
    tag: payload.data?.reminderId || "neuramed-notification",
    renotify: true,
    data: payload.data || {},
    actions: [
      { action: "taken", title: "✅ Qabul qildim" },
      { action: "postpone", title: "⏰ 10 daqiqadan keyin" },
    ],
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const url = data.url || "/";

  if (event.action === "taken") {
    // Log dose taken — post to API
    if (data.reminderId) {
      event.waitUntil(
        fetch(`/api/reminders/${data.reminderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "log",
            scheduledAt: new Date().toISOString(),
            status: "TAKEN",
          }),
        })
      );
    }
    return;
  }

  if (event.action === "postpone") {
    // Schedule another notification in 10 minutes
    event.waitUntil(
      new Promise((resolve) => {
        setTimeout(() => {
          self.registration.showNotification(event.notification.title, {
            body: event.notification.body,
            icon: event.notification.icon,
            data,
          });
          resolve(undefined);
        }, 10 * 60 * 1000);
      })
    );
    return;
  }

  // Default: open the app
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
