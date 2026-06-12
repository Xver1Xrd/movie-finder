// Минимальный service worker для установки PWA.
// Сетевые запросы не перехватываем — приложению нужен онлайн (Supabase realtime).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
