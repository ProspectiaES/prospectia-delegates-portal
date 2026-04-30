"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function getSessionId(): string {
  if (typeof sessionStorage === "undefined") return "";
  const key = "psp_sid";
  let id = sessionStorage.getItem(key);
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(key, id); }
  return id;
}

function send(payload: object) {
  const body = JSON.stringify({ ...payload, session_id: getSessionId() });
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/activity/log", blob);
  } else {
    fetch("/api/activity/log", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  }
}

export function ActivityTracker() {
  const pathname    = usePathname();
  const startRef    = useRef<number>(Date.now());
  const prevPathRef = useRef<string>("");

  useEffect(() => {
    // Log leave for previous page
    if (prevPathRef.current && prevPathRef.current !== pathname) {
      send({ event_type: "page_view", path: prevPathRef.current, duration_ms: Date.now() - startRef.current });
    }

    // Start tracking current page
    startRef.current    = Date.now();
    prevPathRef.current = pathname;

    // Log entry
    send({ event_type: "page_view", path: pathname, duration_ms: null });

    // Log on tab close / navigate away
    const handleUnload = () => {
      send({ event_type: "page_view", path: pathname, duration_ms: Date.now() - startRef.current });
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [pathname]);

  return null;
}
