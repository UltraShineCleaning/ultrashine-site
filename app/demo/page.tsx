import type { Metadata } from 'next';
import AdminShell from '../admin/_components/AdminShell';
import HomeTab from '../admin/_components/HomeTab';
import ScheduleTab from '../admin/_components/ScheduleTab';
import ClientsTab from '../admin/_components/ClientsTab';
import MoneyTab from '../admin/_components/MoneyTab';
import LeadsTab from '../admin/_components/LeadsTab';
import ReviewsTab from '../admin/_components/ReviewsTab';
import SocialTab from '../admin/_components/SocialTab';
import InsightsTab from '../admin/_components/InsightsTab';
import DemoFetchShim from './DemoFetchShim';
import { buildDemo } from './_data/payloads';

/**
 * /demo — the real admin dashboard (same shell, same tabs, same components),
 * filled with an invented cleaning business. Public, never indexed.
 *
 * No auth, no cookies, and no real data source: the server props come only
 * from ./_data (built relative to the request time), and <DemoFetchShim>
 * answers every /api/* call the tabs make in the browser from that same fake
 * data, so nothing reaches the real admin APIs.
 */

export const metadata: Metadata = {
  title: { absolute: 'Ultra Shine · Admin' },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

// Built per request so "today" is always today.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DemoDashboard({ searchParams }: { searchParams?: { social?: string } }) {
  const { payload, money, visits, recentJobs } = await buildDemo(Date.now());
  const flash = typeof searchParams?.social === 'string' ? searchParams.social.slice(0, 120) : undefined;

  return (
    <>
      <DemoFetchShim data={payload} />
      <AdminShell
        overview={<HomeTab />}
        schedule={<ScheduleTab visits={visits} />}
        clients={<ClientsTab />}
        money={<MoneyTab money={money} monthlyGoal={payload.goals.revenue} />}
        leads={<LeadsTab />}
        reviews={<ReviewsTab />}
        social={<SocialTab flash={flash} recentJobs={recentJobs} />}
        insights={<InsightsTab />}
      />
    </>
  );
}
