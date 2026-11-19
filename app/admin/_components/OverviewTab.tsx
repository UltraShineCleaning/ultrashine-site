'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import s from './OverviewTab.module.css';
import type { HomePayload } from '../../_lib/home/build';
import { OPEN_STAGES, STAGE_LABEL, leadValue, sourceCode, type LeadRecord, type Stage } from '../../_lib/leads/types';

/**
 * Overview — Ultra Shine HQ home (2026-11-18, approved preview 00_STATE/admin-redesign-preview).
 *
 * Reads the same /api/home payload the old Home tab used (Jobber money + visits, leads,
 * social, reviews, website) plus the lead store (/api/leads) for the pipeline card and
 * the monthly goals saved in Settings. Every card works on its own: a source that isn't
 * connected shows a plain "not connected" line instead of breaking the page.
 */

type Goals = { quotes: number; jobs: number; revenue: number; reviews: number } | null;
const STAGE_DOT: Record<Stage, string> = { new: '#9fbfe8', contacted: '#d8f23f', walkthrough: '#f07a55', quoted: '#ede6d6', booked: '#d8f23f', lost: '#7e7970' };
const SRC_BG: Record<string, string> = { W: '#B9D7F7', '@': '#F2C6A8', IG: '#E7C1F2', FB: '#BFD3F7', G: '#D8F2B8', R: '#F7E2C8' };
const DAY = 86_400_000;

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const short = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : `$${Math.round(n)}`);
const go = (tab: string) => window.dispatchEvent(new CustomEvent('admin:go', { detail: tab }));
function ago(ms: number, now: number): string {
  const m = Math.max(1, Math.round((now - ms) / 60_000));
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

/** Smooth SVG path through points (Catmull-Rom → Bézier). */
function smooth(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export default function OverviewTab() {
  const [home, setHome] = useState<HomePayload | null>(null);
  const [goals, setGoals] = useState<Goals>(null);
  const [leads, setLeads] = useState<LeadRecord[] | null>(null);
  const [err, setErr] = useState(false);
  const [range, setRange] = useState<6 | 12>(12);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (refresh = false) => {
    setBusy(true);
    try {
      const [h, l] = await Promise.all([
        fetch(`/api/home${refresh ? '?refresh=1' : ''}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject())),
        fetch('/api/leads', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : { leads: [] })),
      ]);
      setHome(h.home);
      setGoals(h.goals ?? null);
      setLeads(l.leads ?? []);
      setErr(false);
      // Counters beside the tabs + the alerts bell.
      window.dispatchEvent(new CustomEvent('admin:badges', { detail: h.home.counts }));
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => load(), 300_000);
    const again = () => load();
    window.addEventListener('admin:goals-saved', again);
    return () => {
      clearInterval(t);
      window.removeEventListener('admin:goals-saved', again);
    };
  }, [load]);

  const now = home?.at ?? Date.now();

  /* ---------- pipeline numbers ---------- */
  const pipe = useMemo(() => {
    const open = (leads ?? []).filter((l) => l.kind !== 'application' && !l.archived && OPEN_STAGES.includes(l.stage) && now - l.stageAt < 60 * DAY);
    const by = OPEN_STAGES.map((st) => {
      const items = open.filter((l) => l.stage === st);
      return { st, n: items.length, v: items.reduce((a, l) => a + leadValue(l), 0) };
    });
    const total = by.reduce((a, b) => a + b.v, 0);
    const recent = (leads ?? [])
      .filter((l) => l.kind !== 'application' && !l.archived)
      .sort((a, b) => b.at - a.at)
      .slice(0, 5);
    const monthStart = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime();
    const closed = (leads ?? []).filter((l) => l.kind !== 'application' && (l.stage === 'booked' || l.stage === 'lost') && now - l.stageAt < 90 * DAY);
    const rate = closed.length >= 3 ? Math.round((closed.filter((l) => l.stage === 'booked').length / closed.length) * 100) : null;
    const bookedMonth = (leads ?? []).filter((l) => l.stage === 'booked' && l.stageAt >= monthStart).length;
    return { by, total, count: open.length, recent, rate, bookedMonth };
  }, [leads, now]);

  /* ---------- revenue chart ---------- */
  const rev = home?.revenue ?? null;
  const months = rev ? rev.months.slice(-range) : [];
  const goal = goals?.revenue || 0;
  const chart = useMemo(() => {
    const W = 760, H = 200, L = 46, R = 12, T = 14, B = 26;
    const max = Math.max(goal * 1.15, ...months.map((m) => m.amount), 1);
    const step = months.length > 1 ? (W - L - R) / (months.length - 1) : 0;
    const pts = months.map((m, i) => [L + i * step, T + (1 - m.amount / max) * (H - T - B)] as [number, number]);
    const line = smooth(pts);
    const area = pts.length ? `${line} L${pts[pts.length - 1][0]},${H - B} L${pts[0][0]},${H - B} Z` : '';
    const gy = goal ? T + (1 - goal / max) * (H - T - B) : null;
    const ticks = [0, 0.5, 1].map((f) => ({ y: T + (1 - f) * (H - T - B), label: short(max * f) }));
    return { W, H, B, pts, line, area, gy, ticks };
  }, [months, goal]);
  const hits = goal ? months.filter((m) => m.amount >= goal).length : 0;

  /* ---------- goal ring ---------- */
  const earned = rev?.thisMonth ?? 0;
  const pct = goal ? Math.min(999, Math.round((earned / goal) * 100)) : 0;
  const d = new Date(now);
  const daysLeft = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate();
  const vsLast = rev && rev.lastMonth ? Math.round(((earned - rev.lastMonth) / rev.lastMonth) * 100) : null;

  if (err && !home) {
    return (
      <div className={s.err}>
        Couldn’t load the overview. <button onClick={() => load(true)}>Try again</button>
      </div>
    );
  }

  return (
    <div>
      <div className={s.head}>
        <h1 className={s.h1}>
          {home ? home.greeting.replace('.', ',') : 'Hello,'}
          <br />
          <span>{home?.dateLabel ?? ' '}</span>
        </h1>
        <div className={s.kpi}>
          <span className={s.ic}>$</span>
          <div>
            <b>
              {rev ? money(earned) : '—'}
              {vsLast != null && <span className={`${s.pill} ${vsLast >= 0 ? s.up : s.down}`}>{vsLast >= 0 ? '+' : ''}{vsLast}% vs last month</span>}
            </b>
            <small>Collected this month</small>
          </div>
        </div>
        <div className={s.kpi}>
          <span className={s.ic}>▤</span>
          <div>
            <b>{leads ? money(pipe.total) : '—'}</b>
            <small>Open pipeline · {pipe.count} leads</small>
          </div>
        </div>
        <div className={s.kpi}>
          <span className={s.ic}>◔</span>
          <div>
            <b>{pipe.rate != null ? `${pipe.rate}%` : '—'}</b>
            <small>{pipe.rate != null ? 'Leads that book (90 days)' : 'Book rate shows after 3 closed leads'}</small>
          </div>
        </div>
        <div className={s.grow} />
        <button className={s.btn} onClick={() => load(true)} disabled={busy}>{busy ? 'Updating…' : '↻ Refresh'}</button>
      </div>

      <div className={s.gMain}>
        {/* Revenue */}
        <section className={s.card}>
          <h3>Revenue</h3>
          <div className={s.cardTools}>
            <div className={s.seg}>
              <button className={range === 6 ? s.on : ''} onClick={() => setRange(6)}>6M</button>
              <button className={range === 12 ? s.on : ''} onClick={() => setRange(12)}>12M</button>
            </div>
            <button className={s.round} title="Open Money" onClick={() => go('money')}>↗</button>
          </div>
          {rev ? (
            <>
              <div className={s.big}>
                {money(months.reduce((a, m) => a + m.amount, 0))}
                <small>collected in {months.length} months{goal ? ` · goal hit ${hits} of ${months.length}` : ''}</small>
              </div>
              <div className={s.legend}>
                <span><i style={{ background: 'var(--hq-coral)' }} />Collected</span>
                {goal ? <span>- - - Monthly goal · {money(goal)}</span> : <button className={s.link} onClick={() => window.dispatchEvent(new Event('admin:settings'))}>Set a monthly goal</button>}
              </div>
              <svg className={s.chart} viewBox={`0 0 ${chart.W} ${chart.H}`} preserveAspectRatio="none" role="img" aria-label="Revenue by month">
                <defs>
                  <linearGradient id="ovRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#F07A55" stopOpacity=".35" />
                    <stop offset="1" stopColor="#F07A55" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {chart.ticks.map((t, i) => (
                  <g key={i}>
                    <line x1="46" x2={chart.W - 12} y1={t.y} y2={t.y} stroke="rgba(255,255,255,.06)" />
                    <text x="0" y={t.y + 3} className={s.axis}>{t.label}</text>
                  </g>
                ))}
                {chart.gy != null && <line x1="46" x2={chart.W - 12} y1={chart.gy} y2={chart.gy} stroke="rgba(255,255,255,.55)" strokeDasharray="5 6" />}
                <path d={chart.area} fill="url(#ovRev)" />
                <path d={chart.line} fill="none" stroke="#F07A55" strokeWidth="2.5" />
                {chart.pts.map((p, i) => (
                  <g key={i}>
                    <circle cx={p[0]} cy={p[1]} r="3.5" fill="#F07A55">
                      <title>{`${months[i].label}: ${money(months[i].amount)}`}</title>
                    </circle>
                    <text x={p[0]} y={chart.H - 6} textAnchor="middle" className={s.axis}>{months[i].label.split(' ')[0]}</text>
                  </g>
                ))}
              </svg>
            </>
          ) : (
            <p className={s.none}>{home ? 'Jobber isn’t connected — reconnect it on the Schedule tab to see revenue.' : 'Loading…'}</p>
          )}
        </section>

        {/* Goal */}
        <section className={`${s.card} ${s.goal}`}>
          <h3>Monthly goal</h3>
          <button className={`${s.round} ${s.roundGoal}`} title="Change goals" onClick={() => window.dispatchEvent(new Event('admin:settings'))}>⋯</button>
          {goal ? (
            <>
              <div className={s.ring}>
                <svg width="150" height="150" viewBox="0 0 150 150" aria-hidden="true">
                  <circle cx="75" cy="75" r="60" stroke="rgba(0,0,0,.25)" strokeWidth="13" fill="none" />
                  <circle cx="75" cy="75" r="60" stroke="#D8F23F" strokeWidth="13" fill="none" strokeLinecap="round" strokeDasharray="377" strokeDashoffset={377 - (377 * Math.min(pct, 100)) / 100} transform="rotate(-90 75 75)" />
                </svg>
                <b>
                  {pct}%<small>of this month’s goal</small>
                </b>
              </div>
              <div className={s.trio}>
                <div><b>{money(earned)}</b>Collected</div>
                <div><b>{money(goal)}</b>Goal</div>
                <div><b>{daysLeft}</b>Days left</div>
              </div>
              <div className={s.chip}>
                {earned >= goal ? 'Goal reached — great month!' : `${money(goal - earned)} to go${daysLeft > 0 ? ` · about ${money((goal - earned) / Math.max(1, daysLeft))} a day` : ''}.`}
              </div>
            </>
          ) : (
            <div className={s.noGoal}>
              <p>Set a monthly revenue goal and this ring tracks it every day.</p>
              <button className={s.btnDark} onClick={() => window.dispatchEvent(new Event('admin:settings'))}>Set goal</button>
            </div>
          )}
        </section>
      </div>

      <div className={s.g3}>
        {/* Pipeline */}
        <section className={s.card}>
          <h3>Pipeline by stage</h3>
          <button className={s.round} title="Open Pipeline" onClick={() => go('leads')}>↗</button>
          <div className={s.big2}>
            {money(pipe.total)}
            <small>open in {pipe.count} leads</small>
          </div>
          <div className={s.sbar}>
            {pipe.by.map((b) => (
              <span key={b.st} style={{ flex: Math.max(b.n, pipe.count ? 0.25 : 1), background: STAGE_DOT[b.st], opacity: b.n ? 1 : 0.25 }} title={`${STAGE_LABEL[b.st]}: ${b.n}`} />
            ))}
          </div>
          {pipe.by.map((b) => (
            <button key={b.st} className={s.srow} onClick={() => go('leads')}>
              <span><i style={{ background: STAGE_DOT[b.st] }} />{STAGE_LABEL[b.st]}</span>
              <b>{b.n} · {money(b.v)}</b>
            </button>
          ))}
          <p className={s.foot}>{pipe.bookedMonth} booked this month</p>
        </section>

        {/* New leads */}
        <section className={s.card}>
          <h3>Newest leads <span className={s.tag}>website, email &amp; DMs</span></h3>
          <button className={s.round} title="Open Pipeline" onClick={() => go('leads')}>↗</button>
          {!leads ? (
            <p className={s.none}>Loading…</p>
          ) : pipe.recent.length === 0 ? (
            <p className={s.none}>No leads yet — new website requests show up here.</p>
          ) : (
            pipe.recent.map((l) => {
              const src = sourceCode(l);
              const hot = l.stage === 'new' && now - l.at > 3600_000;
              return (
                <button key={l.id} className={s.li} onClick={() => go('leads')}>
                  <span className={s.ini} style={{ background: SRC_BG[src.code] ?? '#EDE6D6' }}>{src.code}</span>
                  <span className={s.t}>
                    <b>{l.name}{l.service ? ` · ${l.service}` : ''}</b>
                    <small>{[l.city, src.label, ago(l.at, now)].filter(Boolean).join(' · ')}</small>
                  </span>
                  <span className={s.r}>
                    {l.quotedPrice ? money(l.quotedPrice) : l.estimate ?? ''}
                    <small style={hot ? { color: 'var(--hq-coral)' } : undefined}>{hot ? 'reply now' : STAGE_LABEL[l.stage]}</small>
                  </span>
                </button>
              );
            })
          )}
        </section>

        {/* Today */}
        <section className={s.card}>
          <h3>Today</h3>
          <button className={s.round} title="Open Schedule" onClick={() => go('schedule')}>↗</button>
          {!home ? (
            <p className={s.none}>Loading…</p>
          ) : !home.today ? (
            <p className={s.none}>Jobber isn’t connected — reconnect it on the Schedule tab.</p>
          ) : home.today.jobs.length === 0 ? (
            <p className={s.none}>No visits today.{home.today.tomorrowCount ? ` Tomorrow: ${home.today.tomorrowCount} (first at ${home.today.tomorrowFirst}).` : ''}</p>
          ) : (
            <>
              {home.today.jobs.map((j) => (
                <div key={j.id} className={s.li}>
                  <span className={`${s.ini} ${s.time}`} style={{ background: j.state === 'done' ? '#7e7970' : j.state === 'now' ? 'var(--hq-lime)' : 'var(--hq-cream)' }}>{j.time.replace(/:00/g, '').replace(/\s/g, '').toLowerCase()}</span>
                  <span className={s.t}>
                    <b>{j.title} · {j.client}</b>
                    <small>{[j.city, j.team.join(', ')].filter(Boolean).join(' · ')}</small>
                  </span>
                  <span className={s.tag}>{j.state === 'done' ? 'done' : j.state === 'now' ? 'now' : 'next'}</span>
                </div>
              ))}
              {home.today.tomorrowCount > 0 && <p className={s.foot}>Tomorrow: {home.today.tomorrowCount} visits, first at {home.today.tomorrowFirst}</p>}
            </>
          )}
        </section>
      </div>

      <div className={s.g3}>
        {/* Needs you */}
        <section className={s.card}>
          <h3>What needs you</h3>
          {!home ? (
            <p className={s.none}>Loading…</p>
          ) : home.needs.length === 0 ? (
            <p className={s.none}>All caught up. ✓</p>
          ) : (
            home.needs.slice(0, 5).map((n) => (
              <button key={n.id} className={s.need} onClick={() => go(n.tab)}>
                <span className={s.needIc}>{n.icon}</span>
                <span className={s.t}>
                  <b>{n.title}</b>
                  <small>{n.detail}</small>
                </span>
                <span className={s.needAct}>{n.action}</span>
              </button>
            ))
          )}
        </section>

        {/* Reviews + social */}
        <section className={s.card}>
          <h3>Reviews &amp; social</h3>
          {home && (
            <>
              <button className={s.li} onClick={() => go('reviews')}>
                <span className={s.ini} style={{ background: '#F7E2C8' }}>★</span>
                <span className={s.t}><b>Google rating {home.reviews.rating.toFixed(1)}</b><small>{home.reviews.count} reviews{home.reviews.newThisMonth != null ? ` · +${home.reviews.newThisMonth} this month` : ''}</small></span>
                <span className={s.r}>{home.reviews.pending}<small>to ask</small></span>
              </button>
              <button className={s.li} onClick={() => go('social')}>
                <span className={s.ini} style={{ background: '#E7C1F2' }}>IG</span>
                <span className={s.t}>
                  <b>{home.social.connected ? `@${home.social.igUsername ?? 'instagram'}` : 'Instagram not connected'}</b>
                  <small>{home.social.connected ? `${home.social.followers ?? '—'} followers${home.social.reach7 != null ? ` · ${home.social.reach7.toLocaleString('en-US')} reached this week` : ''}` : 'Connect it on the Social tab'}</small>
                </span>
                <span className={s.r}>{home.social.unread}<small>unanswered</small></span>
              </button>
              {home.social.nextPost && (
                <button className={s.li} onClick={() => go('social')}>
                  <span className={s.ini} style={{ background: 'var(--hq-lime)' }}>▶</span>
                  <span className={s.t}><b>Next post · {new Date(home.social.nextPost.at).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })}</b><small>{home.social.nextPost.caption.slice(0, 70)}</small></span>
                  <span className={s.tag}>{home.social.nextPost.approved ? 'approved' : 'needs OK'}</span>
                </button>
              )}
            </>
          )}
        </section>

        {/* Website */}
        <section className={s.card}>
          <h3>Website · last 7 days</h3>
          <button className={s.round} title="Open Reports" onClick={() => go('insights')}>↗</button>
          {!home ? (
            <p className={s.none}>Loading…</p>
          ) : !home.web ? (
            <p className={s.none}>Website stats aren’t connected yet.</p>
          ) : (
            <>
              <div className={s.big2}>{home.web.visitors.toLocaleString('en-US')}<small>visitors</small></div>
              <div className={s.srow}><span>Opened the quote form</span><b>{home.web.quoteOpens}</b></div>
              <div className={s.srow}><span>Sent a quote request</span><b>{home.web.quotesSent}</b></div>
              {home.web.topSource && <div className={s.srow}><span>Top source</span><b>{home.web.topSource.label} · {home.web.topSource.pct}%</b></div>}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
