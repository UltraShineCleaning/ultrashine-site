import type { OverviewDeps } from './overview';

/** Sample data for local screenshots + tests only (INSIGHTS_DEMO=1, never in production). */
export function demoOverviewDeps(now = Date.now()): OverviewDeps {
  const D = 86_400_000;
  return {
    requests: async () => [
      { id: 'v1', clientId: 'c1', clientName: 'Sandra Parker', email: 's@example.com', service: 'Regular Cleaning', completedAt: now - D, status: 'pending', reason: 'Waiting: verify your domain in Resend so emails can reach customers' },
      { id: 'v2', clientId: 'c2', clientName: 'Greg Hall', email: 'g@example.com', service: 'Deep Cleaning', completedAt: now - 2 * D, status: 'pending' },
      { id: 'v3', clientId: 'c3', clientName: 'Nina Reyes', email: 'n@example.com', service: 'Deep Cleaning', completedAt: now - 6 * D, status: 'sent', sentAt: now - 6 * D },
      { id: 'v4', clientId: 'c4', clientName: 'Ana Silva', email: 'a@example.com', service: 'Regular Cleaning', completedAt: now - 9 * D, status: 'sent', sentAt: now - 9 * D },
      { id: 'v5', clientId: 'c5', clientName: 'Laura Mendes', email: null, service: 'Regular Cleaning', completedAt: now - 16 * D, status: 'skipped', reason: 'No email in Jobber' },
    ],
    reviewCounts: async () => ({ '2000-01-31': 17 }),
    reviews: async () => [
      { author_name: 'Jane Doe', rating: 5, text: 'They left my condo spotless and even organized the pantry without being asked.', relative_time_description: '2 days ago', time: Math.floor((now - 2 * D) / 1000) },
      { author_name: 'Maria Santos', rating: 5, text: 'On time, friendly, and the bathrooms have never looked this good.', relative_time_description: '4 days ago', time: Math.floor((now - 4 * D) / 1000) },
    ],
    settings: async () => ({ on: true, mode: 'auto' }),
    canEmail: false,
  };
}
