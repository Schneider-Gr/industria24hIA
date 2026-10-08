// Service worker do app do entregador: só notificação push. Sem handler de
// fetch de propósito: nada é guardado em cache, a tela sempre vem da rede.

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let dados;
  try {
    dados = event.data.json();
  } catch {
    dados = { titulo: "Indústria 24h", corpo: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(dados.titulo || "Indústria 24h", {
      body: dados.corpo || "",
      icon: "/entregador-icon-192.png",
      badge: "/entregador-icon-192.png",
      tag: dados.tag || undefined,
      renotify: Boolean(dados.tag),
      vibrate: [200, 100, 200],
      data: { url: dados.url || "/afiliado/logistica" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/afiliado/logistica", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((abas) => {
      const aberta = abas.find((a) => a.url === url) || abas.find((a) => new URL(a.url).origin === self.location.origin);
      if (aberta) return aberta.navigate(url).then((a) => (a || aberta).focus());
      return self.clients.openWindow(url);
    }),
  );
});
