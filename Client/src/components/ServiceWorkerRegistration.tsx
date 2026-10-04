"use client";

import { useEffect } from "react";

/**
 * ServiceWorkerRegistration - registers /sw.js on first mount.
 * This is a client component placed in the root layout.
 * The SW handles app-shell caching only.
 * All operational driver data continues through IndexedDB (DriverConnectivityContext).
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .then((registration) => {
            console.log("[RightGo] Service Worker registered:", registration.scope);
          })
          .catch((err) => {
            console.warn("[RightGo] Service Worker registration failed:", err);
          });
      });
    }
  }, []);

  return null; // purely side-effect component
}
