"use client";
import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      // Quan un nou SW pren el control → recarregar per servir el codi nou
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });

      // Comprova actualitzacions cada vegada que l'app recupera el focus
      const checkOnFocus = () => {
        if (document.visibilityState === "visible") reg.update().catch(() => {});
      };
      document.addEventListener("visibilitychange", checkOnFocus);

      // Comprova actualitzacions cada 60 s mentre l'app és oberta
      const interval = setInterval(() => reg.update().catch(() => {}), 60_000);

      return () => {
        document.removeEventListener("visibilitychange", checkOnFocus);
        clearInterval(interval);
      };
    }).catch(() => {});
  }, []);

  return null;
}
