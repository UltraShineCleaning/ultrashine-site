/**
 * Boca Raton wall-clock helpers. Vercel runs in UTC; every rule a person
 * reads ("after 5 PM", "9 AM slot", "not at night") means Florida time.
 */
export const TZ = 'America/New_York';

export type EtParts = { y: number; m: number; d: number; h: number; min: number; s: number; dow: number };

export function etParts(ms: number): EtParts {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(new Date(ms));
  const get = (t: string) => f.find((p) => p.type === t)?.value ?? '0';
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { y: +get('year'), m: +get('month'), d: +get('day'), h: +get('hour') % 24, min: +get('minute'), s: +get('second'), dow };
}

function offsetMs(ms: number): number {
  const p = etParts(ms);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(ms / 1000) * 1000;
}

/** Florida wall-clock → UTC ms (handles daylight saving). */
export function etToMs(y: number, m: number, d: number, h: number, min = 0): number {
  const guess = Date.UTC(y, m - 1, d, h, min);
  let t = guess - offsetMs(guess);
  const off2 = offsetMs(t);
  if (guess - off2 !== t) t = guess - off2;
  return t;
}

/** Business hours from the site's JSON-LD: Mon–Fri 7:00–17:00, Sat 8:00–12:00, closed Sunday. */
export function isBusinessHours(ms: number): boolean {
  const p = etParts(ms);
  const hm = p.h + p.min / 60;
  if (p.dow >= 1 && p.dow <= 5) return hm >= 7 && hm < 17;
  if (p.dow === 6) return hm >= 8 && hm < 12;
  return false;
}

/** Never message people at night: pushes a time inside 9 PM–8 AM to 8 AM. */
export function politeTime(ms: number): number {
  const p = etParts(ms);
  if (p.h >= 21) {
    const next = etParts(ms + 12 * 3600_000);
    return etToMs(next.y, next.m, next.d, 8);
  }
  if (p.h < 8) return etToMs(p.y, p.m, p.d, 8);
  return ms;
}

export function etDayKey(ms: number): string {
  const p = etParts(ms);
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
}
