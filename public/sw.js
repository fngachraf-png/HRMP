// FWMS — عامل خدمة إشعارات Web Push (المرحلة 5 — SPEC §4.1 و§8)
// معيار مفتوح (RFC 8030 + VAPID) بلا خدمة سحابية مغلقة (SPEC §7) — يعمل عبر HTTPS العام فقط
// التسجيل من notification-bell.tsx؛ الإرسال من src/lib/notifications.ts (dispatchWebPush)

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = null;
  try {
    payload = event.data ? event.data.json() : null;
  } catch {
    payload = null;
  }

  const data = payload ?? {};
  const p = data.payload ?? {};
  // نص عربي احتياطي — المتصفح لا يملك قواميس i18n؛ النص الأساسي يُبنى في التطبيق نفسه
  const title = data.type === "shift_replacement_assigned" ? "FWMS — وردية تغطية" : "FWMS";
  const body =
    data.type === "shift_replacement_assigned" && p.siteName
      ? `أُسندت إليك وردية تغطية في «${p.siteName}» ${p.localDate ?? ""} ${p.startLabel ?? ""}–${p.endLabel ?? ""}`
      : "لديك إشعار جديد في FWMS";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: data.type ?? "fwms", // دمج المتكرر من نفس النوع
      data: { url: "/dashboard/my-schedule" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) return client.navigate(url);
          return undefined;
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
