export function pedirPermissao() {
  if ("Notification" in window) {
    Notification.requestPermission();
  }
}

export function notificar(titulo: string, mensagem: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(titulo, {
      body: mensagem,
      icon: '/pwa-192x192.svg'
    });
  }
}
