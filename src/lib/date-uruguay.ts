/**
 * Fechas de negocio en America/Montevideo (UYT, sin DST).
 * Medianoche local = 03:00 UTC del mismo día calendario.
 */

export function uyYmdFromUtc(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Inicio del día calendario YYYY-MM-MM en Uruguay (instante UTC). */
export function uyStartOfCalendarDay(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(Date.UTC(y, m - 1, d, 3, 0, 0, 0));
}

/** Fin del día calendario YYYY-MM-MM en Uruguay (instante UTC). */
export function uyEndOfCalendarDay(ymd: string): Date {
  const start = uyStartOfCalendarDay(ymd);
  const next = new Date(start);
  next.setUTCDate(next.getUTCDate() + 1);
  return new Date(next.getTime() - 1);
}

export function uyAddCalendarDays(ymd: string, delta: number): string {
  const start = uyStartOfCalendarDay(ymd);
  const t = new Date(start);
  t.setUTCDate(t.getUTCDate() + delta);
  return uyYmdFromUtc(t);
}

export function uyEachCalendarDayInclusive(startYmd: string, endYmd: string): string[] {
  const keys: string[] = [];
  let cur = startYmd;
  const last = endYmd;
  let guard = 0;
  while (cur <= last && guard++ < 400) {
    keys.push(cur);
    if (cur === last) break;
    cur = uyAddCalendarDays(cur, 1);
  }
  return keys;
}

export function uyTodayYmd(): string {
  return uyYmdFromUtc(new Date());
}
