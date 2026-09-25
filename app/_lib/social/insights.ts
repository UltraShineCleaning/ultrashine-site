import { getJSON, setJSON } from '../kv';
import { fetchInsights, type IgMediaStat } from './meta';
import { getMeta } from './store';
import { etDayKey } from './time';

export type InsightsSnapshot = {
  at: number;
  followers: number | null;
  history: { day: string; followers: number }[];
  media: IgMediaStat[];
  error?: string;
};

/** Pull fresh numbers from Instagram and keep one follower count per day (for the growth chart). */
export async function refreshInsights(): Promise<InsightsSnapshot> {
  const prev = (await getJSON<InsightsSnapshot>('social:insights')) ?? { at: 0, followers: null, history: [], media: [] };
  const conn = await getMeta();
  if (!conn) return { ...prev, error: 'Not connected yet' };
  try {
    const { followers, media } = await fetchInsights(conn);
    const day = etDayKey(Date.now());
    const history = prev.history.filter((h) => h.day !== day);
    if (followers != null) history.push({ day, followers });
    const snap: InsightsSnapshot = { at: Date.now(), followers, media, history: history.slice(-180) };
    await setJSON('social:insights', snap);
    return snap;
  } catch (e) {
    return { ...prev, error: (e as Error).message };
  }
}

export async function getInsights(): Promise<InsightsSnapshot | null> {
  return getJSON<InsightsSnapshot>('social:insights');
}
