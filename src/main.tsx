import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Автоматическая регистрация и обновление Service Worker для оффлайн-работы
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('[PWA] Доступна новая версия приложения');
  },
  onOfflineReady() {
    console.log('[PWA] Приложение готово к полной автономной оффлайн-работе');
  },
});

createRoot(document.getElementById('root')!).render(<App />);

