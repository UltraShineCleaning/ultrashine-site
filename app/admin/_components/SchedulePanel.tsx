import JobberStatusCard from './JobberStatusCard';
import JobberDashboard from './JobberDashboard';
import ScheduleTab from './ScheduleTab';
import { getJobberMetrics } from '../../_lib/jobberClient';
import { demoEnabled } from '../../_lib/insights/demo';
import { demoVisits } from '../../_lib/schedule/demo';

/**
 * Server side of Admin → Schedule. Not connected to Jobber yet → the connect
 * card. Token broken → the reconnect panel. Otherwise the calendar, fed with
 * every visit from the 1st of this month to ~90 days ahead.
 */
export default async function SchedulePanel({ force = false }: { force?: boolean }) {
  if (demoEnabled()) return <ScheduleTab visits={demoVisits()} />;
  if (!process.env.JOBBER_CLIENT_ID || !process.env.JOBBER_REFRESH_TOKEN) return <JobberStatusCard force={force} />;
  const m = await getJobberMetrics({ force });
  if (m.errorDetail && /token/i.test(m.errorDetail) && !m.allVisits.length) return <JobberDashboard force={force} />;
  return <ScheduleTab visits={m.allVisits} error={m.errorDetail && !/token/i.test(m.errorDetail) ? m.errorDetail : null} />;
}
