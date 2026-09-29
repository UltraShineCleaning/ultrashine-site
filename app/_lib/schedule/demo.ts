import type { JobberVisit } from '../jobberClient';
import { etMidnight } from '../insights/range';

/** Sample visits for local screenshots only (INSIGHTS_DEMO=1, never in production). */
export function demoVisits(now = Date.now()): JobberVisit[] {
  const H = 3600_000;
  const D = 86_400_000;
  const t0 = etMidnight(now);
  const clients: [string, string, string][] = [
    ['Megan Turner', '12 Ocean Dr, Lighthouse Point', 'Deep Cleaning'],
    ['Sandra Parker', '402 NW 7th St, Boca Raton', 'Bi-Weekly Cleaning'],
    ['Laura Mendes', '1520 Seabreeze Ave, Delray Beach', 'Move-Out Cleaning'],
    ['Nina Reyes', '88 Heron Way, Parkland', 'Regular Cleaning'],
    ['Greg Hall', '9 Palm Ct, Boca Raton', 'Regular Cleaning'],
    ['Ana Silva', '77 Coral Way, Coral Springs', 'Deep Cleaning'],
    ['Karen Williams', '55 Bay Rd, Boca Raton', 'Weekly Cleaning'],
  ];
  const out: JobberVisit[] = [];
  let id = 0;
  for (let d = -5; d <= 40; d++) {
    const n = d % 7 === 0 ? 0 : (Math.abs(d * 7) % 3) + (d === 1 ? 1 : 0);
    for (let j = 0; j < n; j++) {
      const [name, addr, title] = clients[(Math.abs(d) + j * 3) % clients.length];
      const start = t0 + d * D + (8.5 + j * 3) * H;
      out.push({
        id: `v${id++}`, title, clientName: name, startAt: new Date(start).toISOString(), endAt: new Date(start + (j === 0 ? 3 : 2) * H).toISOString(),
        address: addr, team: (d === 1 && j === 1) || d === 9 ? [] : [j % 2 ? 'Team B' : 'Team A'], completed: d < 0 || (d === 0 && j === 0),
      });
    }
  }
  return out;
}
