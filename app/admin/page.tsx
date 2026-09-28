import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import JobberStatusCard from './_components/JobberStatusCard';
import AdminShell from './_components/AdminShell';
import ClientsTab from './_components/ClientsTab';
import MoneyTab from './_components/MoneyTab';
import SocialTab from './_components/SocialTab';
import InsightsTab from './_components/InsightsTab';
import HomeTab from './_components/HomeTab';
import LeadsTab from './_components/LeadsTab';
import ReviewsTab from './_components/ReviewsTab';
import { getJobberClients, getJobberMoney, getRecentlyCompletedVisits } from '../_lib/jobberClient';
import { isAdmin } from '../_lib/adminAuth';
import { getGoals } from '../_lib/insights/goals';
import { demoEnabled } from '../_lib/insights/demo';
import { demoHomeDeps } from '../_lib/home/demo';

export const metadata: Metadata = {
  title: 'Dashboard · Ultra Shine Cleaning',
  robots: { index: false, follow: false },
};

// Re-fetch every request — we want live data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams?: { t?: string; refresh?: string; social?: string };
}) {
  // Cookie gate
  if (!isAdmin()) redirect('/admin/login');

  // The "↻ Refresh now" button on the Jobber tab links to /admin?t=<timestamp>
  // — when that param is present we bypass the 60s/5min server cache and
  // pull truly-live data from Jobber. Same effect if ?refresh=1 is passed.
  const force = !!(searchParams?.t || searchParams?.refresh);

  // Live data from Jobber (clients + money) in parallel. Home and Leads load their own.
  const [jobberClientsRes, moneyRes, recentVisits, goals] = await Promise.all([
    getJobberClients({ force }),
    // Local screenshots only (INSIGHTS_DEMO=1, never in production): sample invoices.
    demoEnabled() ? demoHomeDeps().money!() : getJobberMoney({ force }),
    getRecentlyCompletedVisits(7).catch(() => ({ visits: [] })),
    // Monthly revenue goal (set on Insights) draws the dashed line on Money's chart.
    getGoals().catch(() => null),
  ]);

  // ============================================================
  // TAB PANELS — each is server-rendered JSX passed to AdminShell
  // ============================================================

  // Home — design locked 2026-09-28 (00_STATE/design-home-dark.html). Loads its
  // own numbers from /api/home so it can refresh without reloading the page.
  const overviewPanel = <HomeTab />;

  // The Jobber tab merged into Schedule (calendar focus) + Money (invoices).
  // JobberStatusCard renders the full live dashboard when connected, OR the
  // setup/reconnect flow when not — so we use it in BOTH the Schedule and
  // Home tabs in different contexts. Schedule wants the full thing
  // (calendar + upcoming list). Home wants compact stats only.
  const schedulePanel = <JobberStatusCard force={force} />;

  const clientsPanel = (
    <ClientsTab clients={jobberClientsRes.clients} error={jobberClientsRes.error} />
  );

  const moneyPanel = <MoneyTab money={moneyRes} monthlyGoal={goals?.revenue || null} />;

  const insightsPanel = <InsightsTab />;

  // Leads — design locked 2026-09-28 (00_STATE/design-leads-dark.html). Loads
  // its own pipeline from /api/leads so stage changes save without a reload.
  const leadsPanel = <LeadsTab />;

  // Reviews — design locked 2026-09-28 (00_STATE/design-reviews-dark.html).
  const reviewsPanel = <ReviewsTab />;

  // Social tab — the dark Instagram/Facebook workspace. Recent finished jobs
  // feed its "From your jobs" card; ?social=… carries the result of the Meta
  // connect flow back as a toast.
  const socialPanel = (
    <SocialTab
      flash={searchParams?.social}
      recentJobs={recentVisits.visits
        .sort((a, b) => b.completedAt - a.completedAt)
        .map((v) => ({ title: v.title, city: v.city, completedAt: v.completedAt, clientName: v.clientName }))}
    />
  );

  return (
    <AdminShell
      overview={overviewPanel}
      schedule={schedulePanel}
      clients={clientsPanel}
      money={moneyPanel}
      leads={leadsPanel}
      reviews={reviewsPanel}
      social={socialPanel}
      insights={insightsPanel}
    />
  );
}
