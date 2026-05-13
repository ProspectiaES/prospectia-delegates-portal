"use server";

export async function triggerHoldedSync() {
  const secret = process.env.CRON_SECRET;
  if (!secret) return;

  const base = process.env.APP_URL ?? "https://dashboard.prospectia.es";
  try {
    await fetch(`${base}/api/holded/sync?type=full`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      // fire-and-wait: the sync completes before we return
    });
  } catch {
    // best-effort — page will still refresh
  }
}
