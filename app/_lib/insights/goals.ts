import { getJSON, setJSON } from '../kv';
import type { Goals } from './types';

/** Monthly goals, set from the ring card on the Insights tab. Null until someone sets them. */
export async function getGoals(): Promise<Goals | null> {
  return getJSON<Goals>('insights:goals');
}

export async function saveGoals(g: Partial<Goals>): Promise<Goals> {
  const clean = (v: unknown) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n > 0 && n < 10_000_000 ? n : null;
  };
  const cur = (await getGoals()) ?? { quotes: 0, jobs: 0, revenue: 0, reviews: 0 };
  const next: Goals = {
    quotes: clean(g.quotes) ?? cur.quotes,
    jobs: clean(g.jobs) ?? cur.jobs,
    revenue: clean(g.revenue) ?? cur.revenue,
    reviews: clean(g.reviews) ?? cur.reviews,
  };
  await setJSON('insights:goals', next);
  return next;
}
