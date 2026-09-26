import { etParts, etToMs } from '../social/time';
import type { RangeKey } from './types';

/**
 * The time window behind every number on the Insights tab, in Florida time.
 *
 *  7 days  → 7 daily buckets      30 days → 30 daily buckets
 *  90 days → 13 weekly buckets    12 months → 12 calendar months
 *
 * `prev` is the window of the same length right before it, for "▲ 18% vs
 * previous". Buckets are half-open [start, end).
 */
export type Bucket = { start: number; end: number; label: string };
export type Window = { range: RangeKey; start: number; end: number; prevStart: number; buckets: Bucket[]; grain: 'day' | 'week' | 'month' };

const DAY = 86_400_000;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Midnight (Florida) of the day containing `ms`. */
export function etMidnight(ms: number): number {
  const p = etParts(ms);
  return etToMs(p.y, p.m, p.d, 0);
}

export function windowFor(range: RangeKey, now = Date.now()): Window {
  const tomorrow = etMidnight(etMidnight(now) + DAY + 3 * 3600_000); // DST-safe "next midnight"
  if (range === 365) {
    const p = etParts(now);
    const buckets: Bucket[] = [];
    for (let i = 11; i >= 0; i--) {
      let y = p.y;
      let m = p.m - i;
      while (m < 1) { m += 12; y -= 1; }
      let ny = y;
      let nm = m + 1;
      if (nm > 12) { nm = 1; ny += 1; }
      buckets.push({ start: etToMs(y, m, 1, 0), end: etToMs(ny, nm, 1, 0), label: MON[m - 1] });
    }
    const start = buckets[0].start;
    const end = buckets[buckets.length - 1].end;
    return { range, start, end, prevStart: start - (end - start), buckets, grain: 'month' };
  }
  if (range === 90) {
    const buckets: Bucket[] = [];
    for (let i = 12; i >= 0; i--) {
      const end = tomorrow - i * 7 * DAY;
      const start = end - 7 * DAY;
      const p = etParts(start + 3600_000);
      buckets.push({ start, end, label: `${MON[p.m - 1]} ${p.d}` });
    }
    const start = buckets[0].start;
    return { range, start, end: tomorrow, prevStart: start - (tomorrow - start), buckets, grain: 'week' };
  }
  const buckets: Bucket[] = [];
  for (let i = range - 1; i >= 0; i--) {
    const start = etMidnight(tomorrow - (i + 1) * DAY + 3 * 3600_000);
    const end = i === 0 ? tomorrow : etMidnight(tomorrow - i * DAY + 3 * 3600_000);
    const p = etParts(start + 3600_000);
    const label = range === 7 ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][p.dow] : `${MON[p.m - 1]} ${p.d}`;
    buckets.push({ start, end, label });
  }
  const start = buckets[0].start;
  return { range, start, end: tomorrow, prevStart: start - (tomorrow - start), buckets, grain: 'day' };
}

/** Which bucket a timestamp falls in, or -1. */
export function bucketOf(w: Window, ms: number): number {
  if (ms < w.start || ms >= w.end) return -1;
  for (let i = 0; i < w.buckets.length; i++) if (ms >= w.buckets[i].start && ms < w.buckets[i].end) return i;
  return -1;
}

/** Sum values into the window's buckets. `prev` shifts every item forward by the window length first. */
export function bucketize(w: Window, items: { at: number; v: number }[], prev = false): number[] {
  const out = w.buckets.map(() => 0);
  const shift = prev ? w.start - w.prevStart : 0;
  for (const it of items) {
    const i = bucketOf(w, it.at + shift);
    if (i >= 0) out[i] += it.v;
  }
  return out;
}

/** Percent change, or null when there is nothing to compare against. */
export function pctChange(cur: number, prev: number | null): number | null {
  if (prev == null || prev === 0) return null;
  return Math.round(((cur - prev) / prev) * 100);
}
