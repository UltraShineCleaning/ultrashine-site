'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import s from './InsightsTab.module.css';
import { Area, Bars, Donut, Funnel, Gauge, Heatmap, Radial, Ring, Spark, VBars, fmt, money, moneyK } from './insights/Charts';
import { RANGES, type Goals, type InsightsPayload, type Kpi, type RangeKey, type SourceId } from '../../_lib/insights/types';

/**
 * Admin → Insights. Design locked 2026-09-25 (00_STATE/design-insights-dark.html).
 *
 * One page for "how the business is growing": goals, the path from Google to a
 * booked job, the website, when customers reach out, Google search, Instagram +
 * Facebook, money and reviews. Everything stays on this page — nothing opens
 * another site. A source that isn't connected shows its setup steps in place
 * of its charts; the rest keeps working.
 */

const RANGE_LABEL: Record<RangeKey, string> = { 7: '7 days', 30: '30 days', 90: '90 days', 365: '12 months' };
const PERIOD: Record<RangeKey, string> = { 7: 'This week', 30: 'This month', 90: 'Last 90 days', 365: 'This year' };

type Tip = { x: number; y: number; text: string } | null;

function Delta({ k }: { k: Kpi }) {
  if (k.prev == null || k.prev === 0) return <span className={s.mut}>no earlier numbers yet</span>;
  const ch = Math.round(((k.value - k.prev) / k.prev) * 100);
  return (
    <>
      <span className={`${s.chip} ${ch >= 0 ? s.chipUp : s.chipDn}`}>
        {ch >= 0 ? '▲' : '▼'} {Math.abs(ch)}%
      </span>
      <span className={s.mut}>vs previous</span>
    </>
  );
}

function KpiCard(props: { label: string; k: Kpi | null; color: string; format?: (n: number) => string; empty: string }) {
  const { label, k, color, format = fmt, empty } = props;
  return (
    <div className={`${s.card} ${s.s3} ${s.kpi}`}>
      <div className={s.lbl}>{label}</div>
      {k ? (
        <>
          <div className={`${s.v} ${s.num}`}>{format(k.value)}</div>
          <div className={s.d}>
            <Delta k={k} />
          </div>
          <Spark data={k.spark} color={color} />
        </>
      ) : (
        <>
          <div className={`${s.v} ${s.soft}`}>—</div>
          <div className={s.kpiEmpty}>{empty}</div>
        </>
      )}
    </div>
  );
}

const SETUP: Record<SourceId, { title: string; icon: ReactNode; bg: string; steps: ReactNode[] }> = {
  vercel: {
    title: 'Connect website visitors (Vercel) — free',
    icon: '▲',
    bg: '#000',
    steps: [
      <>Vercel → your profile picture → <b>Account Settings → Tokens</b> → Create. Name it “Ultra Shine Insights”, scope it to the team that owns ultrashine-site, pick the longest expiry offered.</>,
      <>ultrashine-site → Settings → <b>Environment Variables</b>: add <b>VERCEL_ANALYTICS_TOKEN</b> (the token) and <b>VERCEL_ANALYTICS_TEAM</b> = contact-8079s-projects.</>,
      <>Redeploy. This section fills in on the next load.</>,
    ],
  },
  google: {
    title: 'Connect Google search (Search Console) — free',
    icon: 'G',
    bg: '#4285f4',
    steps: [
      <>The site has to be verified in <b>Search Console</b> first (our open to-do).</>,
      <>Google Cloud console → new project → enable <b>Google Search Console API</b> → IAM &amp; Admin → <b>Service Accounts</b> → Create → Keys → Add key → JSON.</>,
      <>Search Console → Settings → <b>Users and permissions</b> → Add user → paste the service account email (ends in iam.gserviceaccount.com) → Restricted.</>,
      <>Vercel → Environment Variables: <b>GSC_SERVICE_ACCOUNT_JSON</b> = the whole downloaded file. Redeploy. It stays connected until someone removes that user.</>,
    ],
  },
  meta: {
    title: 'Connect Instagram + Facebook',
    icon: 'IG',
    bg: 'linear-gradient(45deg,#f58529,#dd2a7b 45%,#8134af 75%,#515bd4)',
    steps: [<>Social tab → Overview → <b>Connected accounts</b> → Connect. Numbers are then saved every morning.</>],
  },
  jobber: {
    title: 'Connect Jobber',
    icon: 'J',
    bg: '#1a7f5a',
    steps: [<>Schedule tab → <b>Connect Jobber</b>. Revenue, jobs and invoices come from there.</>],
  },
};

function ConnectCard({ id, error }: { id: SourceId; error?: string }) {
  const c = SETUP[id];
  return (
    <div className={`${s.connect} ${s.s12}`} style={{ gridColumn: 'span 12' }}>
      <span className={s.connIco} style={{ background: c.bg, border: id === 'vercel' ? '1px solid #333' : undefined }}>
        {c.icon}
      </span>
      <div>
        <b>{error ? `${c.title.split(' — ')[0]} — needs attention` : c.title}</b>
        {error && <div className={s.err}>{error}</div>}
        <ol>
          {c.steps.map((st, i) => (
            <li key={i}>{st}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Section(props: { id: string; icon: ReactNode; bg: string; title: string; sub: string; dark?: boolean }) {
  return (
    <div className={s.sec} id={props.id}>
      <span className={s.secIco} style={{ background: props.bg, color: props.dark ? '#000' : '#fff', border: props.bg === '#000' ? '1px solid #333' : undefined }}>
        {props.icon}
      </span>
      <div>
        <h2>{props.title}</h2>
        <p>{props.sub}</p>
      </div>
    </div>
  );
}

export default function InsightsTab() {
  const [range, setRange] = useState<RangeKey>(30);
  const [data, setData] = useState<InsightsPayload | null>(null);
  const [demo, setDemo] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tip, setTip] = useState<Tip>(null);
  const [editGoals, setEditGoals] = useState<Goals | null>(null);
  const reqId = useRef(0);

  const load = useCallback(async (r: RangeKey, refresh = false) => {
    const id = ++reqId.current;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/insights?range=${r}${refresh ? '&refresh=1' : ''}`, { cache: 'no-store' });
      const body = await res.json();
      if (id !== reqId.current) return;
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setData(body.insights);
      setDemo(!!body.demo);
    } catch (e) {
      if (id === reqId.current) setErr((e as Error).message);
    } finally {
      if (id === reqId.current) setBusy(false);
    }
  }, []);

  useEffect(() => {
    load(range);
  }, [load, range]);

  const onMove = (e: React.MouseEvent) => {
    const t = (e.target as Element).closest?.('[data-tip]');
    const text = t?.getAttribute('data-tip');
    setTip(text ? { x: e.clientX, y: e.clientY, text } : null);
  };

  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  async function saveGoals() {
    if (!editGoals) return;
    const res = await fetch('/api/insights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goals: editGoals }) });
    if (res.ok) {
      setEditGoals(null);
      load(range);
    }
  }

  if (!data) {
    return (
      <div className={s.root}>
        <div className={s.loading}>{err ? `Couldn't load Insights: ${err}` : 'Loading insights…'}</div>
      </div>
    );
  }

  const d = data;
  const src = d.sources;
  const g = d.goals.forRange;
  const updated = new Date(d.generatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });

  const goalRings: { label: string; value: number | null; goal: number; color: string; f: (n: number) => string; none: string }[] = [
    { label: 'Quote requests', value: d.progress.quotes, goal: g.quotes, color: '#4d7cff', f: fmt, none: '' },
    { label: 'Jobs billed', value: d.progress.jobs, goal: g.jobs, color: '#a78bfa', f: fmt, none: 'connect Jobber' },
    { label: 'Revenue', value: d.progress.revenue, goal: g.revenue, color: '#34d399', f: moneyK, none: 'connect Jobber' },
    { label: 'New reviews', value: d.progress.reviews, goal: g.reviews, color: '#fbbf24', f: fmt, none: 'counting from today' },
  ];

  const funnelSteps = [
    { label: 'Saw us on Google', value: d.funnel.seenOnGoogle },
    { label: 'Visited the website', value: d.funnel.visited },
    { label: 'Opened the quote page', value: d.funnel.quoteOpened },
    { label: 'Sent a quote request', value: d.funnel.quoteSent as number | null },
  ].filter((x): x is { label: string; value: number } => x.value != null);

  const quoteRate = d.funnel.quoteOpened ? d.funnel.quoteSent / d.funnel.quoteOpened : null;

  return (
    <div className={s.root} onMouseMove={onMove} onMouseLeave={() => setTip(null)}>
      <div className={s.top}>
        <div className={s.seg} role="tablist" aria-label="Date range">
          {RANGES.map((r) => (
            <button key={r} type="button" className={range === r ? s.segOn : undefined} onClick={() => setRange(r)} aria-selected={range === r}>
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>
        <div className={s.upd}>
          <span className={s.live} />
          {busy ? 'Updating…' : `Updated ${updated} · refreshes every morning`}
          <button type="button" className={s.refresh} onClick={() => load(range, true)} disabled={busy}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {demo && <div className={s.banner}>Test mode — these are made-up numbers (INSIGHTS_DEMO is on). The live site never shows this.</div>}

      <nav className={s.jump}>
        {[
          ['in-web', 'Website', '#4d7cff'],
          ['in-when', 'When customers reach out', '#fbbf24'],
          ['in-google', 'Google', '#4285f4'],
          ['in-social', 'Instagram + Facebook', '#ec4899'],
          ['in-money', 'Money', '#34d399'],
          ['in-reviews', 'Reviews', '#fbbf24'],
        ].map(([id, label, c]) => (
          <button key={id} type="button" onClick={() => jump(id)}>
            <i style={{ background: c }} />
            {label}
          </button>
        ))}
      </nav>

      {/* ===== OVERVIEW ===== */}
      <div className={s.bento}>
        <div className={`${s.card} ${s.s8} ${s.glow}`}>
          <div className={s.ch}>
            <h3>{PERIOD[range]}&apos;s goals</h3>
            <span className={s.src}>
              {d.goals.auto ? 'aiming 10% above last period · ' : ''}
              <button
                type="button"
                className={s.linkBtn}
                onClick={() => {
                  const f = range === 7 ? 7 / 30 : range === 30 ? 1 : range === 90 ? 3 : 12;
                  setEditGoals(
                    d.goals.monthly ?? { quotes: Math.round(g.quotes / f), jobs: Math.round(g.jobs / f), revenue: Math.round(g.revenue / f), reviews: Math.max(1, Math.round(g.reviews / f)) },
                  );
                }}
              >
                {d.goals.auto ? 'set your own' : 'edit goals'}
              </button>
            </span>
          </div>
          {editGoals ? (
            <>
              <div className={s.goalForm}>
                {(
                  [
                    ['quotes', 'Quote requests / month'],
                    ['jobs', 'Jobs / month'],
                    ['revenue', 'Revenue / month ($)'],
                    ['reviews', 'New reviews / month'],
                  ] as [keyof Goals, string][]
                ).map(([k, l]) => (
                  <label key={k}>
                    {l}
                    <input type="number" min={1} value={editGoals[k] || ''} onChange={(e) => setEditGoals({ ...editGoals, [k]: Number(e.target.value) })} />
                  </label>
                ))}
              </div>
              <div className={s.formRow}>
                <button type="button" className={s.btn} onClick={() => setEditGoals(null)}>
                  Cancel
                </button>
                <button type="button" className={`${s.btn} ${s.primary}`} onClick={saveGoals}>
                  Save goals
                </button>
              </div>
            </>
          ) : (
            <div className={s.goals}>
              {goalRings.map((r) => (
                <div key={r.label} className={s.goal}>
                  <Ring
                    pct={r.value != null && r.goal ? r.value / r.goal : 0}
                    color={r.color}
                    size={124}
                    big={r.value != null ? r.f(r.value) : '—'}
                    small={r.value != null && r.goal ? `${Math.round((r.value / r.goal) * 100)}%` : r.none}
                    tip={r.value != null ? `${r.label}\n${r.f(r.value)} of ${r.f(r.goal)}` : `${r.label}\n${r.none}`}
                  />
                  <div className={s.t}>{r.label}</div>
                  <div className={s.g}>goal {r.f(r.goal)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`${s.card} ${s.s4}`}>
          <div className={s.ch}>
            <h3>What stands out</h3>
            <span className={s.src}>worked out from the numbers</span>
          </div>
          <div className={s.stand}>
            {d.standouts.length === 0 && <div className={s.empty}>Nothing stands out yet. This fills in as sources connect and numbers build up.</div>}
            {d.standouts.map((x) => (
              <div key={x.title} className={s.so}>
                <span
                  className={s.dt}
                  style={
                    x.tone === 'up'
                      ? { background: 'rgba(52,211,153,.14)', color: '#34d399' }
                      : x.tone === 'warn'
                        ? { background: 'rgba(251,191,36,.14)', color: '#fbbf24' }
                        : { background: 'rgba(77,124,255,.14)', color: '#4d7cff' }
                  }
                >
                  {x.tone === 'up' ? '▲' : x.tone === 'warn' ? '!' : 'i'}
                </span>
                <span>
                  <b>{x.title}</b> {x.body}
                </span>
              </div>
            ))}
          </div>
        </div>

        <KpiCard label="Website visits" k={d.kpi.visitors} color="#4d7cff" empty="Connect Vercel below." />
        <KpiCard label="Clicks from Google" k={d.kpi.googleClicks} color="#22d3ee" empty="Connect Search Console below." />
        <KpiCard label="Instagram reach" k={d.kpi.socialReach} color="#ec4899" empty="Connect Instagram in the Social tab." />
        <KpiCard label="Revenue (Jobber)" k={d.kpi.revenue} color="#34d399" format={money} empty="Connect Jobber on the Schedule tab." />

        <div className={`${s.card} ${s.s12}`}>
          <div className={s.ch}>
            <h3>The path to a booked job</h3>
            <span className={s.src}>Google · website · quote form · Jobber</span>
          </div>
          <Funnel steps={funnelSteps} />
          {quoteRate != null && d.funnel.quoteOpened! >= 10 && (
            <div className={s.note}>
              <span style={{ color: '#fbbf24' }}>●</span>
              <span>
                Of the people who open the quote page, <em>{Math.round(quoteRate * 100)}% send it</em>.
                {quoteRate < 0.25 && ` At 25% that would be about ${Math.max(1, Math.round(d.funnel.quoteOpened! * 0.25 - d.funnel.quoteSent))} more requests from the same visitors.`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ===== WEBSITE ===== */}
      <Section id="in-web" icon="▲" bg="#000" title="Website" sub="who visits, where they came from, what they look at" />
      <div className={s.bento}>
        {!d.web ? (
          <ConnectCard id="vercel" error={src.vercel.error} />
        ) : (
          <>
            <div className={`${s.card} ${s.s8}`}>
              <div className={s.ch}>
                <h3>Visits per day</h3>
                <span className={s.src}>
                  <b style={{ background: '#000', border: '1px solid #333' }}>▲</b>Vercel Web Analytics
                </span>
              </div>
              {d.web.traffic.prev.length ? (
                <Area series={[d.web.traffic.cur, d.web.traffic.prev]} labels={d.web.traffic.labels} colors={['#4d7cff', '#3a3c46']} names={['This period', 'Previous']} />
              ) : (
                <Area series={[d.web.traffic.cur]} labels={d.web.traffic.labels} colors={['#4d7cff']} names={['Visits']} />
              )}
              <div className={s.legend}>
                <span>
                  <i style={{ background: '#4d7cff' }} />
                  This period
                </span>
                {d.web.traffic.prev.length ? (
                  <span>
                    <i style={{ background: '#3a3c46' }} />
                    Previous period
                  </span>
                ) : (
                  <span className={s.soft}>previous period appears once we&apos;ve saved that far back</span>
                )}
              </div>
            </div>
            <div className={`${s.card} ${s.s4}`}>
              <div className={s.ch}>
                <h3>Where visitors came from</h3>
              </div>
              <Donut
                segs={d.web.sources.map((x, i) => ({ ...x, color: ['#4d7cff', '#a78bfa', '#ec4899', '#1877f2', '#22d3ee', '#3a3c46'][i] ?? '#3a3c46' }))}
                sub="visitors"
              />
            </div>
            <div className={`${s.card} ${s.s4}`}>
              <div className={s.ch}>
                <h3>Phone vs computer</h3>
              </div>
              {(() => {
                const tot = d.web.devices.reduce((a, x) => a + x.value, 0);
                const phone = d.web.devices.find((x) => x.label === 'Phone')?.value ?? 0;
                return (
                  <Donut
                    segs={d.web.devices.map((x) => ({ ...x, color: x.label === 'Phone' ? '#4d7cff' : x.label === 'Computer' ? '#a78bfa' : '#3a3c46' }))}
                    center={tot ? `${Math.round((phone / tot) * 100)}%` : '—'}
                    sub="on a phone"
                  />
                );
              })()}
            </div>
            <div className={`${s.card} ${s.s5}`}>
              <div className={s.ch}>
                <h3>Most visited pages</h3>
              </div>
              <div className={s.rows}>
                {d.web.pages.length === 0 && <div className={s.empty}>No page views in this range yet.</div>}
                {d.web.pages.map((p) => (
                  <div key={p.label} className={s.row} data-tip={`${p.label}\n${fmt(p.value)} views`}>
                    <div>
                      {p.label}
                      <div className={s.bar}>
                        <i style={{ width: `${(p.value / (d.web!.pages[0]?.value || 1)) * 100}%`, background: 'linear-gradient(90deg,#4d7cff,#a78bfa)' }} />
                      </div>
                    </div>
                    <b className={s.num}>{fmt(p.value)}</b>
                  </div>
                ))}
              </div>
            </div>
            <div className={`${s.card} ${s.s3}`}>
              <div className={s.ch}>
                <h3>Quote page</h3>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Ring
                  pct={quoteRate ?? 0}
                  color="#fbbf24"
                  size={120}
                  big={quoteRate != null ? `${Math.round(quoteRate * 100)}%` : '—'}
                  small="sent it"
                  tip={quoteRate != null ? `${Math.round(quoteRate * 100)}% of people who open the quote page send it` : undefined}
                />
              </div>
              <div className={s.rows} style={{ marginTop: 10 }}>
                <div className={s.row}>
                  <span className={s.mut}>Opened it</span>
                  <b className={s.num}>{d.web.quoteOpened != null ? fmt(d.web.quoteOpened) : '—'}</b>
                </div>
                <div className={s.row}>
                  <span className={s.mut}>Sent a request</span>
                  <b className={s.num}>{fmt(d.funnel.quoteSent)}</b>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ===== WHEN ===== */}
      <Section id="in-when" icon="◷" bg="#fbbf24" dark title="When customers reach out" sub="quote requests + DMs by day and hour, Florida time — our own data" />
      <div className={s.bento}>
        <div className={`${s.card} ${s.s8}`}>
          <div className={s.ch}>
            <h3>Busiest times</h3>
            <span className={s.src}>{fmt(d.when.total)} requests + DMs</span>
          </div>
          <Heatmap grid={d.when.grid} />
          <div className={s.scale}>
            Fewer <i style={{ background: '#1b1c22' }} />
            <i style={{ background: 'rgba(251,191,36,.3)' }} />
            <i style={{ background: 'rgba(251,191,36,.6)' }} />
            <i style={{ background: '#fbbf24' }} /> More
          </div>
        </div>
        <div className={`${s.card} ${s.s4}`}>
          <div className={s.ch}>
            <h3>So the best time to post is…</h3>
          </div>
          {d.when.bestDays && d.when.bestHour != null ? (
            <>
              <div className={s.bigstat}>{d.when.bestDays}</div>
              <div style={{ fontSize: 22, fontWeight: 600, marginTop: 6, color: '#fbbf24' }}>
                around {(d.when.bestHour + 23) % 24 % 12 || 12} {(d.when.bestHour + 23) % 24 < 12 ? 'AM' : 'PM'}
              </div>
              <div className={`${s.mut} ${s.sm}`} style={{ marginTop: 12, lineHeight: 1.55 }}>
                The busiest hour is around {d.when.bestHour % 12 || 12} {d.when.bestHour < 12 ? 'AM' : 'PM'}. Posting an hour before puts us at the top of their feed right when they&apos;re thinking about it.
              </div>
            </>
          ) : (
            <div className={s.empty}>Needs at least 5 quote requests or DMs in this range to call it. Try a longer range.</div>
          )}
          {d.when.total > 0 && (
            <div style={{ marginTop: 16 }}>
              <Donut
                segs={[
                  { label: 'Weekdays', value: d.when.weekdays, color: '#fbbf24' },
                  { label: 'Weekend', value: d.when.weekend, color: '#3a3c46' },
                ]}
                size={96}
                sw={13}
                center={`${Math.round((d.when.weekdays / d.when.total) * 100)}%`}
                sub="weekdays"
              />
            </div>
          )}
        </div>
      </div>

      {/* ===== GOOGLE ===== */}
      <Section id="in-google" icon="G" bg="#4285f4" title="Google search" sub="what people type before they find us · about a 2-day delay (Google's)" />
      <div className={s.bento}>
        {!d.google ? (
          <ConnectCard id="google" error={src.google.error} />
        ) : (
          <>
            <div className={`${s.card} ${s.s4}`}>
              <div className={s.ch}>
                <h3>Average position</h3>
                <span className={s.src}>lower is better</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {d.google.avgPosition != null ? <Gauge value={d.google.avgPosition} prev={d.google.prevAvgPosition} /> : <div className={s.empty}>No searches yet.</div>}
              </div>
              {d.google.avgPosition != null && (
                <div className={`${s.mut} ${s.sm}`} style={{ textAlign: 'center', marginTop: 4 }}>
                  Page 1 is positions 1–10.
                  {d.google.prevAvgPosition != null && d.google.prevAvgPosition !== d.google.avgPosition && (
                    <>
                      {' '}
                      {d.google.avgPosition < d.google.prevAvgPosition ? 'Moved up ' : 'Slipped '}
                      <span className={d.google.avgPosition < d.google.prevAvgPosition ? s.up : s.dn}>
                        {Math.abs(Math.round((d.google.prevAvgPosition - d.google.avgPosition) * 10) / 10)} places
                      </span>
                      .
                    </>
                  )}
                </div>
              )}
            </div>
            <div className={`${s.card} ${s.s4}`}>
              <div className={s.ch}>
                <h3>Seen vs clicked</h3>
              </div>
              <Donut
                segs={[
                  { label: 'Clicked', value: d.google.clicks, color: '#22d3ee' },
                  { label: 'Only saw it', value: Math.max(0, d.google.impressions - d.google.clicks), color: '#1f2b3a' },
                ]}
                center={d.google.impressions ? `${((d.google.clicks / d.google.impressions) * 100).toFixed(1)}%` : '—'}
                sub="click rate"
              />
            </div>
            <div className={`${s.card} ${s.s4}`}>
              <div className={s.ch}>
                <h3>Searches from</h3>
              </div>
              <Donut segs={d.google.devices.map((x) => ({ ...x, color: x.label === 'Phone' ? '#4285f4' : x.label === 'Computer' ? '#a78bfa' : '#3a3c46' }))} sub="clicks" />
            </div>
            <div className={`${s.card} ${s.s7}`}>
              <div className={s.ch}>
                <h3>Top searches</h3>
              </div>
              {d.google.queries.length === 0 ? (
                <div className={s.empty}>No searches recorded in this range yet.</div>
              ) : (
                <table className={s.tbl}>
                  <thead>
                    <tr>
                      <th>Search</th>
                      <th>Clicks</th>
                      <th>Seen</th>
                      <th className={s.hideS}>Click rate</th>
                      <th>Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.google.queries.map((q) => (
                      <tr key={q.q}>
                        <td>{q.q}</td>
                        <td className={s.num}>{fmt(q.clicks)}</td>
                        <td className={`${s.num} ${s.mut}`}>{fmt(q.impressions)}</td>
                        <td className={`${s.num} ${s.mut} ${s.hideS}`}>{q.ctr}%</td>
                        <td>
                          <span className={`${s.pos} ${q.position <= 5 ? s.p1 : q.position <= 10 ? s.p2 : s.p3}`}>{q.position}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className={`${s.card} ${s.s5}`}>
              <div className={s.ch}>
                <h3>Almost on page 1</h3>
                <span className={s.src}>easiest wins</span>
              </div>
              <div className={`${s.mut} ${s.sm}`} style={{ marginBottom: 6 }}>
                We show up on page 2 for these. A little work on the matching page can move them up.
              </div>
              <div className={s.rows}>
                {d.google.wins.length === 0 && <div className={s.empty}>Nothing sitting on page 2 right now.</div>}
                {d.google.wins.map((x) => (
                  <div key={x.q} className={s.row}>
                    <div>
                      {x.q}
                      <div className={`${s.soft} ${s.sm}`}>
                        {x.page ? x.page.replace(/^https?:\/\/[^/]+/, '') || '/' : ''} · seen {fmt(x.impressions)}×
                      </div>
                      <div className={s.bar}>
                        <i style={{ width: `${((30 - x.position) / 30) * 100}%`, background: 'linear-gradient(90deg,#fbbf24,#34d399)' }} />
                      </div>
                    </div>
                    <span className={`${s.pos} ${s.p3}`}>{x.position}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ===== SOCIAL ===== */}
      <Section id="in-social" icon="IG" bg="linear-gradient(45deg,#f58529,#dd2a7b 45%,#8134af 75%,#515bd4)" title="Instagram + Facebook" sub="saved every morning, so the history stays ours" />
      <div className={s.bento}>
        {!d.social ? (
          <ConnectCard id="meta" error={src.meta.error} />
        ) : (
          <>
            <div className={`${s.card} ${s.s6}`}>
              <div className={s.ch}>
                <h3>Followers</h3>
                <span className={s.src}>
                  <b style={{ background: 'linear-gradient(45deg,#f58529,#dd2a7b 45%,#8134af 75%,#515bd4)' }}>IG</b>
                  <b style={{ background: '#1877f2' }}>f</b>Meta
                </span>
              </div>
              <div style={{ display: 'flex', gap: 28, marginBottom: 4 }}>
                <div>
                  <div className={`${s.mut} ${s.sm}`}>Instagram</div>
                  <div className={s.num} style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-.02em' }}>
                    {d.social.igFollowers != null ? fmt(d.social.igFollowers) : '—'}{' '}
                    {d.social.igGain != null && d.social.igGain !== 0 && (
                      <span className={`${s.chip} ${d.social.igGain > 0 ? s.chipUp : s.chipDn}`}>
                        {d.social.igGain > 0 ? '+' : ''}
                        {d.social.igGain}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className={`${s.mut} ${s.sm}`}>Facebook</div>
                  <div className={s.num} style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-.02em' }}>
                    {d.social.fbFollowers != null ? fmt(d.social.fbFollowers) : '—'}
                  </div>
                </div>
              </div>
              {d.social.followerHistory.length >= 2 ? (
                <Area
                  series={[d.social.followerHistory.map((h) => h.ig)]}
                  labels={d.social.followerHistory.map((h) => {
                    const [, m, day] = h.day.split('-');
                    return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m) - 1]} ${Number(day)}`;
                  })}
                  colors={['#ec4899']}
                  names={['Instagram followers']}
                  w={560}
                  h={170}
                  zero={false}
                />
              ) : (
                <div className={s.empty}>The follower line starts after a couple of mornings of saved numbers.</div>
              )}
            </div>
            <div className={`${s.card} ${s.s3}`}>
              <div className={s.ch}>
                <h3>How people interact</h3>
              </div>
              {d.social.interactions.length ? (
                <Donut
                  column
                  size={130}
                  sw={17}
                  sub="interactions"
                  segs={d.social.interactions.map((x) => ({ ...x, color: { Likes: '#ec4899', Saves: '#a78bfa', Shares: '#22d3ee', Comments: '#fbbf24' }[x.label] ?? '#3a3c46' }))}
                />
              ) : (
                <div className={s.empty}>No likes, saves, shares or comments recorded in this range yet.</div>
              )}
            </div>
            <div className={`${s.card} ${s.s3}`}>
              <div className={s.ch}>
                <h3>Reels vs posts vs stories</h3>
                <span className={s.src}>avg reach</span>
              </div>
              {d.social.avgReachByType.length ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Radial items={d.social.avgReachByType.map((x) => ({ ...x, color: x.label === 'Reels' ? '#ec4899' : x.label === 'Posts' ? '#a78bfa' : '#22d3ee' }))} />
                  </div>
                  <div className={s.legend} style={{ justifyContent: 'center' }}>
                    {d.social.avgReachByType.map((x) => (
                      <span key={x.label}>
                        <i style={{ background: x.label === 'Reels' ? '#ec4899' : x.label === 'Posts' ? '#a78bfa' : '#22d3ee' }} />
                        {x.label} {fmt(x.value)}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className={s.empty}>Shows once our recent posts have reach numbers.</div>
              )}
            </div>
            <div className={`${s.card} ${s.s7}`}>
              <div className={s.ch}>
                <h3>Best posts</h3>
                <span className={s.src}>by reach · opens the post on Instagram</span>
              </div>
              {d.social.topPosts.length === 0 ? (
                <div className={s.empty}>No posts in this range yet.</div>
              ) : (
                <div className={s.posts}>
                  {d.social.topPosts.map((p, i) => (
                    <a key={p.id} className={s.pst} href={p.permalink} target="_blank" rel="noopener noreferrer">
                      <div className={s.pim} style={p.thumb ? { backgroundImage: `url(${p.thumb})` } : undefined}>
                        <span>{/REEL/i.test(p.type) ? 'REEL' : /STORY/i.test(p.type) ? 'STORY' : 'POST'}</span>
                        <span className={s.rank}>#{i + 1}</span>
                      </div>
                      <div className={s.pm}>
                        <div>
                          <b className={s.num}>{p.reach != null ? fmt(p.reach) : '—'}</b>reach
                        </div>
                        <div>
                          <b className={s.num}>{fmt(p.likes)}</b>likes
                        </div>
                        <div>
                          <b className={s.num}>{fmt(p.comments)}</b>comments
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div className={`${s.card} ${s.s5}`}>
              <div className={s.ch}>
                <h3>Who follows us</h3>
              </div>
              {d.social.demographicsHidden ? (
                <div className={s.empty}>Instagram only shares who follows an account once it has 100+ followers. This fills in on its own after that.</div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
                    {(() => {
                      const women = d.social.gender.find((x) => x.label === 'Women')?.value ?? 0;
                      const men = d.social.gender.find((x) => x.label === 'Men')?.value ?? 0;
                      return <Ring pct={women / 100} color="#ec4899" size={110} sw={12} big={`${women}%`} small="women" track="#1877f2" tip={`Women ${women}%\nMen ${men}%`} />;
                    })()}
                    <div style={{ flex: 1 }}>
                      <VBars items={d.social.ages} color="#ec4899" />
                    </div>
                  </div>
                  <div className={s.rows} style={{ marginTop: 10 }}>
                    {d.social.cities.map((c) => (
                      <div key={c.label} className={s.row}>
                        <div>
                          {c.label}
                          <div className={s.bar}>
                            <i style={{ width: `${(c.value / (d.social!.cities[0]?.value || 1)) * 100}%`, background: 'linear-gradient(90deg,#ec4899,#a78bfa)' }} />
                          </div>
                        </div>
                        <b className={s.num}>{c.value}%</b>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className={`${s.card} ${s.s12}`}>
              <div className={s.ch}>
                <h3>From Instagram to a quote</h3>
                <span className={s.src}>each ring = share of the step before</span>
              </div>
              <div className={s.igpath}>
                {(
                  [
                    ['People reached', d.social.path.reach, '#ec4899'],
                    ['Visited the website', d.social.path.websiteVisits, '#a78bfa'],
                    ['Started a DM', d.social.path.dms, '#22d3ee'],
                    ['Sent a quote', d.social.path.quotes, '#34d399'],
                  ] as [string, number | null, string][]
                ).map(([label, v, c], i, all) => {
                  // Each ring = what share of the step before made it to this one.
                  const before = i ? all[i - 1][1] : null;
                  const pct = i && before && v != null ? Math.min(1, v / before) : null;
                  return (
                    <div key={label} className={s.igstep}>
                      <Ring
                        pct={i === 0 ? 1 : pct ?? 0}
                        color={c}
                        size={56}
                        sw={7}
                        big={i === 0 ? '' : pct != null ? `${Math.round(pct * 100)}%` : '—'}
                        tip={`${label}\n${v != null ? fmt(v) : 'needs Vercel connected'}${pct != null ? `\n${Math.round(pct * 100)}% of the step before` : ''}`}
                      />
                      <div>
                        <div className={s.num} style={{ fontSize: 22, fontWeight: 600 }}>
                          {v != null ? fmt(v) : '—'}
                        </div>
                        <div className={`${s.mut} ${s.sm}`}>{label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ===== MONEY ===== */}
      <Section id="in-money" icon="$" bg="#1a7f5a" title="Money" sub="from Jobber — invoices and payments, by the date each invoice was issued" />
      <div className={s.bento}>
        {!d.money ? (
          <ConnectCard id="jobber" error={src.jobber.error} />
        ) : (
          <>
            <div className={`${s.card} ${s.s8}`}>
              <div className={s.ch}>
                <h3>Revenue</h3>
                <span className={s.src}>
                  <b style={{ background: '#1a7f5a' }}>J</b>Jobber
                </span>
              </div>
              <Bars bars={d.money.bars} goal={g.revenue ? Math.round(g.revenue / d.money.bars.length) : null} />
              <div className={s.legend}>
                <span>
                  <i style={{ background: '#34d399' }} />
                  Paid
                </span>
                <span>
                  <i style={{ background: 'rgba(52,211,153,.3)' }} />
                  Invoiced, not paid yet
                </span>
                <span>
                  <i style={{ background: 'transparent', border: '1px dashed #8b8d98' }} />
                  Goal per bar
                </span>
              </div>
            </div>
            <div className={`${s.card} ${s.s4}`}>
              <div className={s.ch}>
                <h3>Top clients</h3>
                <span className={s.src}>paid in this range</span>
              </div>
              {d.money.topClients.length ? (
                <Donut column size={130} sw={17} fmtv={money} sub="revenue" segs={d.money.topClients.map((x, i) => ({ ...x, color: ['#34d399', '#22d3ee', '#a78bfa', '#fbbf24', '#3a3c46'][i] ?? '#3a3c46' }))} />
              ) : (
                <div className={s.empty}>No paid invoices in this range yet.</div>
              )}
            </div>
            <div className={`${s.card} ${s.s4}`}>
              <div className={s.ch}>
                <h3>Returning vs new clients</h3>
              </div>
              <Donut
                size={120}
                sw={16}
                center={d.money.returning + d.money.newClients ? `${Math.round((d.money.returning / (d.money.returning + d.money.newClients)) * 100)}%` : '—'}
                sub="returning"
                segs={[
                  { label: 'Returning', value: d.money.returning, color: '#34d399' },
                  { label: 'New', value: d.money.newClients, color: '#4d7cff' },
                ]}
              />
            </div>
            <div className={`${s.card} ${s.s4}`}>
              <div className={s.ch}>
                <h3>Average job</h3>
              </div>
              <div className={`${s.bigstat} ${s.num}`}>{d.money.avgJob != null ? money(d.money.avgJob) : '—'}</div>
              <div className={s.sm} style={{ margin: '8px 0 14px', display: 'flex', gap: 6, alignItems: 'center' }}>
                {d.money.avgJob != null && d.money.avgJobPrev != null && d.money.avgJobPrev !== d.money.avgJob ? (
                  <>
                    <span className={`${s.chip} ${d.money.avgJob >= d.money.avgJobPrev ? s.chipUp : s.chipDn}`}>
                      {d.money.avgJob >= d.money.avgJobPrev ? '▲' : '▼'} {money(Math.abs(d.money.avgJob - d.money.avgJobPrev))}
                    </span>
                    <span className={s.mut}>vs previous</span>
                  </>
                ) : (
                  <span className={s.mut}>per invoice</span>
                )}
              </div>
              <Area series={[d.money.avgJobSeries]} labels={d.money.bars.map((b) => b.label)} colors={['#34d399']} names={['Average job']} w={300} h={80} zero={false} yLabels={false} fmtv={money} />
            </div>
            <div className={`${s.card} ${s.s4}`}>
              <div className={s.ch}>
                <h3>Unpaid invoices</h3>
                <span className={s.src}>right now</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Ring
                  pct={d.money.revenue ? d.money.unpaidTotal / (d.money.revenue + d.money.unpaidTotal) : d.money.unpaidTotal ? 1 : 0}
                  color="#f87171"
                  size={92}
                  sw={10}
                  big={String(d.money.unpaidCount)}
                  small="invoices"
                  tip={`${money(d.money.unpaidTotal)} unpaid\n${d.money.overdueCount} past due`}
                />
                <div>
                  <div className={`${s.bigstat} ${s.num}`} style={{ fontSize: 30 }}>
                    {money(d.money.unpaidTotal)}
                  </div>
                  <div className={`${s.mut} ${s.sm}`} style={{ marginTop: 6 }}>
                    {d.money.overdueCount ? `${d.money.overdueCount} past due` : 'none past due'}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ===== REVIEWS ===== */}
      <Section id="in-reviews" icon="★" bg="#fbbf24" dark title="Reviews" sub="Google rating + the automatic review requests" />
      <div className={s.bento}>
        <div className={`${s.card} ${s.s4} ${s.glow}`}>
          <div className={s.ch}>
            <h3>Google rating</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, position: 'relative' }}>
            <Ring pct={d.reviews.rating / 5} color="#fbbf24" size={120} sw={12} big={d.reviews.rating.toFixed(1)} small="out of 5" tip={`${d.reviews.rating.toFixed(1)} on Google\n${d.reviews.count} reviews`} />
            <div>
              <div style={{ color: '#fbbf24', letterSpacing: 2, fontSize: 15 }}>★★★★★</div>
              <div className={`${s.mut} ${s.sm}`} style={{ marginTop: 6 }}>
                {d.reviews.count} reviews
                {d.reviews.gained != null ? ` · +${d.reviews.gained} in this range` : ''}
              </div>
            </div>
          </div>
        </div>
        <div className={`${s.card} ${s.s4}`}>
          <div className={s.ch}>
            <h3>Newest reviews</h3>
          </div>
          <div className={s.rows}>
            {d.reviews.latest.map((r) => (
              <div key={r.name + r.when} className={s.row} data-tip={`${r.name}\n${r.text}`}>
                <div>
                  <span style={{ color: '#fbbf24' }}>{'★'.repeat(r.rating)}</span> {r.name}
                  <div className={`${s.soft} ${s.sm}`} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.text}
                  </div>
                </div>
                <span className={`${s.soft} ${s.sm}`}>{r.when}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={`${s.card} ${s.s4}`}>
          <div className={s.ch}>
            <h3>Review requests</h3>
            <span className={s.src}>sent after each job</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Ring
              pct={d.reviews.requests.sent ? d.reviews.requests.reviewed / d.reviews.requests.sent : 0}
              color="#fbbf24"
              size={100}
              sw={11}
              big={d.reviews.requests.sent ? `${Math.round((d.reviews.requests.reviewed / d.reviews.requests.sent) * 100)}%` : '—'}
              small="reviewed"
              tip={`${d.reviews.requests.reviewed} of ${d.reviews.requests.sent} left a review`}
            />
            <div className={s.rows} style={{ flex: 1 }}>
              <div className={s.row}>
                <span className={s.mut}>Emails sent</span>
                <b className={s.num}>{d.reviews.requests.sent}</b>
              </div>
              <div className={s.row}>
                <span className={s.mut}>Left a review</span>
                <b className={s.num}>{d.reviews.requests.reviewed}</b>
              </div>
              <div className={s.row}>
                <span className={s.mut}>Waiting to send</span>
                <b className={s.num}>{d.reviews.requests.waiting}</b>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== SOURCES ===== */}
      <Section id="in-sources" icon="⚡" bg="#1b1c22" title="Where the numbers come from" sub="all free · each connects once and stays connected" />
      <div className={s.srcs}>
        {(
          [
            ['vercel', 'Website visitors', 'Vercel Web Analytics · $0'],
            ['google', 'Google search', 'Search Console · $0'],
            ['meta', 'Instagram + Facebook', 'Meta · $0'],
            ['jobber', 'Jobber', 'revenue + jobs · $0'],
          ] as [SourceId, string, string][]
        ).map(([id, label, sub]) => {
          const st = src[id];
          return (
            <div key={id} className={s.sc} data-tip={st.error ? `${label}\n${st.error}` : `${label}\n${st.connected ? 'Connected' : 'Not connected yet'}`}>
              <span className={s.connIco} style={{ background: SETUP[id].bg, border: id === 'vercel' ? '1px solid #333' : undefined }}>
                {SETUP[id].icon}
              </span>
              <div>
                <b>{label}</b>
                <span>{st.error ? 'needs attention' : st.connected ? sub : 'not connected yet'}</span>
              </div>
              <span className={`${s.dot} ${st.error ? s.dotBad : st.connected ? '' : s.dotOff}`} />
            </div>
          );
        })}
      </div>

      {tip && (
        <div className={s.tip} style={{ left: tip.x, top: tip.y }}>
          {tip.text}
        </div>
      )}
    </div>
  );
}
