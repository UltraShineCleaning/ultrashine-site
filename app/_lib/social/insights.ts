import { getJSON, setJSON } from '../kv';
import { fetchFbFollowers, fetchIgDay, fetchIgDemographics, fetchInsights, type IgDay, type IgMediaStat } from './meta';
import { getMeta } from './store';
import { etDayKey, etParts, etToMs } from './time';

/**
 * The Instagram + Facebook numbers the Insights tab reads, refreshed by the
 * daily cron (and the ↻ button). Everything is SAVED here as it arrives, so the
 * history is ours: Meta's own window is short, ours keeps growing.
 */
export type InsightsSnapshot = {
  at: number;
  followers: number | null;
  history: { day: string; followers: number }[];
  media: IgMediaStat[];
  /** Account totals per Florida day, 'YYYY-MM-DD' → numbers. Kept 400 days. */
  days?: Record<string, IgDay>;
  demographics?: Record<'age' | 'gender' | 'city', { key: string; value: number }[]> | null;
  fbFollowers?: number | null;
  error?: string;
};

const DAY = 86_400_000;

/** [since, until) in unix seconds for the Florida day `dayKey`. */
function dayBounds(dayKey: string): [number, number] {
  const [y, m, d] = dayKey.split('-').map(Number);
  const start = etToMs(y, m, d, 0);
  const n = etParts(start + DAY + 3 * 3600_000);
  const end = etToMs(n.y, n.m, n.d, 0);
  return [Math.floor(start / 1000), Math.floor(end / 1000)];
}

/**
 * Pull fresh numbers. The first run backfills the last 30 days; after that it
 * re-reads the last 3 (Meta says data can arrive up to 48 hours late).
 */
export async function refreshInsights(): Promise<InsightsSnapshot> {
  const prev = (await getJSON<InsightsSnapshot>('social:insights')) ?? { at: 0, followers: null, history: [], media: [] };
  const conn = await getMeta();
  if (!conn) return { ...prev, error: 'Not connected yet' };
  try {
    const { followers, media } = await fetchInsights(conn);
    const today = etDayKey(Date.now());
    const history = prev.history.filter((h) => h.day !== today);
    if (followers != null) history.push({ day: today, followers });

    const days: Record<string, IgDay> = { ...(prev.days ?? {}) };
    const back = Object.keys(days).length ? 3 : 30;
    for (let i = 1; i <= back; i++) {
      const key = etDayKey(Date.now() - i * DAY);
      const [since, until] = dayBounds(key);
      const got = await fetchIgDay(conn, since, until).catch(() => ({}) as IgDay);
      if (Object.keys(got).length) days[key] = got;
    }
    const keep = Object.keys(days).sort().slice(-400);
    const trimmed: Record<string, IgDay> = {};
    for (const k of keep) trimmed[k] = days[k];

    const [demographics, fbFollowers] = await Promise.all([fetchIgDemographics(conn), fetchFbFollowers(conn)]);

    const snap: InsightsSnapshot = {
      at: Date.now(),
      followers,
      media,
      history: history.slice(-400),
      days: trimmed,
      demographics,
      fbFollowers,
    };
    await setJSON('social:insights', snap);
    return snap;
  } catch (e) {
    return { ...prev, error: (e as Error).message };
  }
}

export async function getInsights(): Promise<InsightsSnapshot | null> {
  return getJSON<InsightsSnapshot>('social:insights');
}
