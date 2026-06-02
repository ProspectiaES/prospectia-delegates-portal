import type { TipusVenciment } from "./types";

// ─── Core helper ──────────────────────────────────────────────────────────────

/**
 * Returns the next Monday strictly after `date`.
 * If `date` is already a Monday, returns date + 7 days (as per spec).
 *
 * Examples:
 *   nextMonday(Mon 2024-01-08) → Mon 2024-01-15  (+7)
 *   nextMonday(Sun 2024-01-07) → Mon 2024-01-08  (+1)
 *   nextMonday(Wed 2024-01-10) → Mon 2024-01-15  (+5)
 */
function nextMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const add = day === 1 ? 7 : (8 - day) % 7;
  d.setDate(d.getDate() + add);
  return d;
}

/**
 * Returns the nearest Monday ON OR AFTER `date`.
 * If `date` is already a Monday, returns it unchanged.
 *
 * Examples:
 *   nearestMondayOnOrAfter(Mon 2024-01-08) → Mon 2024-01-08  (same)
 *   nearestMondayOnOrAfter(Tue 2024-01-09) → Mon 2024-01-15  (+6)
 *   nearestMondayOnOrAfter(Sun 2024-01-14) → Mon 2024-01-15  (+1)
 */
function nearestMondayOnOrAfter(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  if (day === 1) return d;
  const add = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + add);
  return d;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the Monday–Sunday bounds of the calendar week containing `date`.
 *
 * Examples:
 *   getSetmanaBounds(Wed 2024-01-10) → { inici: Mon 2024-01-08, fi: Sun 2024-01-14 }
 *   getSetmanaBounds(Mon 2024-01-08) → { inici: Mon 2024-01-08, fi: Sun 2024-01-14 }
 *   getSetmanaBounds(Sun 2024-01-14) → { inici: Mon 2024-01-08, fi: Sun 2024-01-14 }
 */
export function getSetmanaBounds(date: Date): { inici: Date; fi: Date } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  // Distance to Monday: Sun=6, Mon=0, Tue=1 … Sat=5
  const toMonday = day === 0 ? -6 : -(day - 1);
  const inici = new Date(d);
  inici.setDate(d.getDate() + toMonday);
  const fi = new Date(inici);
  fi.setDate(inici.getDate() + 6);
  return { inici, fi };
}

/**
 * The remesa is generated on the Monday immediately following setmanaFi (Sunday).
 * This is "week 2" in the weekly cycle.
 *
 * Example:
 *   getDataRemesa(Sun 2024-01-14) → Mon 2024-01-15
 */
export function getDataRemesa(setmanaFi: Date): Date {
  return nextMonday(setmanaFi);
}

/**
 * Standard collection date: the Monday of "week 3" (7 days after data_remesa).
 * data_remesa is always a Monday, so nextMonday adds exactly 7.
 *
 * Example:
 *   getCobramentEstandard(Mon 2024-01-15) → Mon 2024-01-22
 */
export function getCobramentEstandard(dataRemesa: Date): Date {
  return nextMonday(dataRemesa); // Monday → +7
}

/**
 * Extended collection date:
 *   1. Target = dataEmissio + 30 days
 *   2. Snap to nearest Monday on or after target
 *   3. Result must never be before cobramentEstandard
 *
 * Examples:
 *   dataEmissio = Wed 2024-01-10 → target = Fri 2024-02-09
 *     → nearest Mon on/after = Mon 2024-02-12
 *     → if Mon 2024-02-12 >= estandard → Mon 2024-02-12
 *
 *   dataEmissio = Mon 2024-01-08 → target = Wed 2024-02-07
 *     → nearest Mon = Mon 2024-02-12
 *     → result = Mon 2024-02-12
 */
export function getCobramentAmpliat(
  dataEmissio: Date,
  cobramentEstandard: Date
): Date {
  const target = new Date(dataEmissio);
  target.setDate(target.getDate() + 30);
  const monday = nearestMondayOnOrAfter(target);
  return monday >= cobramentEstandard ? monday : new Date(cobramentEstandard);
}

/**
 * Returns the collection date for a given invoice depending on payment terms.
 *
 * Examples:
 *   getDataCobrament(Wed 2024-01-10, 'estandard', Mon 2024-01-22) → Mon 2024-01-22
 *   getDataCobrament(Wed 2024-01-10, 'ampliat',   Mon 2024-01-22) → Mon 2024-02-12
 */
export function getDataCobrament(
  dataEmissio: Date,
  tipus: TipusVenciment,
  cobramentEstandard: Date
): Date {
  if (tipus === "estandard") return new Date(cobramentEstandard);
  return getCobramentAmpliat(dataEmissio, cobramentEstandard);
}

// ─── Date formatting helpers ──────────────────────────────────────────────────

/** Format as YYYY-MM-DD (for SEPA XML fields) */
export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Parse a YYYY-MM-DD date string safely to midnight local time */
export function parseDate(s: string): Date {
  const [y, m, day] = s.split("-").map(Number);
  return new Date(y, m - 1, day, 0, 0, 0, 0);
}
