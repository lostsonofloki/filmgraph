export const registerServiceWorker = () => {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      if (import.meta.env.DEV) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
        return;
      }

      await navigator.serviceWorker.register("/sw.js");
      // Registration success is intentionally silent for clean console.
    } catch (error) {
      console.error("Service worker registration failed:", error);
    }
  });
};
