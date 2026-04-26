/**
 * Sustituto de los crons de Vercel para IONOS.
 *
 * Añadir al crontab del servidor IONOS (crontab -e):
 *
 *   # Sync completo cada 15 min
 *   *\/15 * * * * node /ruta/app/scripts/cron-sync.mjs full >> /var/log/holded-sync.log 2>&1
 *
 *   # Actualización de estado cada 4 horas
 *   0 *\/4 * * * node /ruta/app/scripts/cron-sync.mjs status >> /var/log/holded-sync.log 2>&1
 *
 * Variables de entorno necesarias en /etc/environment o en el crontab:
 *   APP_URL=https://tudominio.com
 *   CRON_SECRET=tu_cron_secret
 */

const MODE    = process.argv[2] ?? "full";   // "full" | "status"
const APP_URL = process.env.APP_URL;
const SECRET  = process.env.CRON_SECRET;

if (!APP_URL || !SECRET) {
  console.error(`[${new Date().toISOString()}] ❌ APP_URL o CRON_SECRET no definidos`);
  process.exit(1);
}

const endpoint = MODE === "status"
  ? `${APP_URL}/api/holded/sync-status`
  : `${APP_URL}/api/holded/sync`;

console.log(`[${new Date().toISOString()}] 🔄 Sync ${MODE} → ${endpoint}`);

try {
  const res = await fetch(endpoint, {
    method:  "POST",
    headers: { "authorization": `Bearer ${SECRET}` },
  });

  const body = await res.text();
  const icon = res.ok ? "✅" : "❌";
  console.log(`[${new Date().toISOString()}] ${icon} ${res.status} ${body}`);
  if (!res.ok) process.exit(1);
} catch (err) {
  console.error(`[${new Date().toISOString()}] ❌ Error:`, err.message);
  process.exit(1);
}
