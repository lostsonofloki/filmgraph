export const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/sw.js');
      // Registration success is intentionally silent for clean console.
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  });
};
