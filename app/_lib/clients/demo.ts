import type { ProfileDeps } from './profiles';

/** Sample data for local screenshots + tests only (INSIGHTS_DEMO=1, never in production). */
export function demoProfileDeps(now = Date.now()): ProfileDeps {
  const D = 86_400_000;
  const b64 = (n: number) => Buffer.from(`gid://Jobber/Client/${n}`).toString('base64');
  const c = (n: number, name: string, city: string, extra: Partial<{ companyName: string; isCompany: boolean; email: string; phone: string; since: number }> = {}) => ({
    id: b64(n), name, companyName: extra.companyName ?? null, isCompany: !!extra.isCompany, email: extra.email ?? `${name.split(' ')[0].toLowerCase()}@example.com`,
    phone: extra.phone ?? `(561) 555-01${String(n).padStart(2, '0')}`, address: `${100 + n} Main St`, city, createdAt: new Date(extra.since ?? now - (100 + n * 20) * D).toISOString(),
  });
  const clients = [
    c(1, 'Karen Williams', 'Boca Raton'), c(2, 'Sandra Parker', 'Boca Raton'), c(3, 'Laura Mendes', 'Delray Beach', { phone: '(561) 555-0188' }),
    c(4, 'Greg Hall', 'Boca Raton'), c(5, 'Seaside Brokers LLC', 'Pompano Beach', { companyName: 'Seaside Brokers LLC', isCompany: true }), c(6, 'Janet Ross', 'Parkland'),
  ];
  const job = (id: string, n: number, title: string, type: string, total: number, recurrence: string | null) => ({
    id, title, type, status: 'upcoming', total, clientId: b64(n), createdAt: new Date(now - 90 * D).toISOString(), recurrence, lineItems: [{ name: title, unitPrice: total }],
  });
  const inv = (client: string, daysAgo: number, total: number, paid: number) => ({
    issued: new Date(now - daysAgo * D).toISOString(), total, paid, balance: total - paid, client, overdue: total > paid && daysAgo > 14, owed: total > paid,
  });
  const visit = (name: string, inDays: number) => ({ id: name + inDays, title: 'Cleaning', clientName: name, startAt: new Date(now + inDays * D).toISOString(), endAt: null, address: null, team: [], completed: false });
  return {
    clients: async () => ({ clients }),
    jobs: async () => ({ jobs: [
      job('j1', 1, 'Weekly Cleaning', 'RECURRING', 160, 'Every week'),
      job('j2', 2, 'Bi-Weekly Cleaning', 'RECURRING', 150, 'Every 2 weeks'),
      job('j3', 3, 'Bi-Weekly Cleaning', 'RECURRING', 200, 'Every 2 weeks'),
      job('j4', 4, 'Cleaning Service', 'RECURRING', 180, 'Every 4 weeks'),
      job('j5', 5, 'Office Cleaning', 'RECURRING', 240, 'Every week'),
      job('j6', 6, 'Post-Construction Cleaning', 'ONE_OFF', 650, null),
    ] }),
    money: async () => ({
      outstanding: [{ id: 'o1', invoiceNumber: '1051', clientName: 'Laura Mendes', status: 'past_due', issuedDate: null, dueDate: null, total: 200, balance: 200, paid: 0, daysOverdue: 4 }],
      outstandingTotal: 200, overdueTotal: 200, overdueCount: 1, paidThisWeek: 0, paidLastWeek: 0, paidThisMonth: 0, paidLastMonth: 0, paidThisQuarter: 0,
      averageInvoice: 190, avgCollectionDays: 4, weeklyRevenue: [], monthlyRevenue: [], topClients: [], invoiceCount: 40,
      invoiceLite: [
        ...Array.from({ length: 14 }, (_, i) => inv('Karen Williams', 7 + i * 14, 160, 160)),
        ...Array.from({ length: 12 }, (_, i) => inv('Sandra Parker', 10 + i * 14, 150, 150)),
        inv('Laura Mendes', 3, 200, 0), ...Array.from({ length: 11 }, (_, i) => inv('Laura Mendes', 17 + i * 14, 200, 200)),
        ...Array.from({ length: 8 }, (_, i) => inv('Greg Hall', 20 + i * 28, 180, 180)),
        ...Array.from({ length: 6 }, (_, i) => inv('Seaside Brokers LLC', 7 + i * 7, 240, 240)),
        inv('Janet Ross', 30, 650, 650),
      ],
    }),
    metrics: async () => ({
      jobsToday: 0, jobsThisWeek: 0, upcomingJobs: [], activeClientCount: 6, pendingInvoiceCount: 1, pendingInvoiceTotal: 200, thisWeekRevenue: 0,
      allVisits: [visit('Karen Williams', 3), visit('Sandra Parker', 2), visit('Laura Mendes', 1), visit('Greg Hall', 1), visit('Seaside Brokers LLC', 2)],
    }),
    leads: async () => [
      { id: 'q', kind: 'quote', at: now - 200 * D, name: 'Laura Mendes', phone: '5615550188', bedrooms: 4, bathrooms: 3, sqft: 2600, stage: 'booked', stageAt: now, history: [], origin: 'form' },
    ],
    reviewRequests: async () => [{ id: 'r', clientId: b64(3), clientName: 'Laura Mendes', email: 'l@example.com', service: 'Bi-Weekly', completedAt: now - 20 * D, status: 'sent', sentAt: now - 17 * D }],
    homes: async () => ({ [b64(1)]: { bedrooms: 3, bathrooms: 2, sqft: 1800, pets: '1 dog', notes: 'Gate code 4411. Skip the office.' } }),
  };
}
