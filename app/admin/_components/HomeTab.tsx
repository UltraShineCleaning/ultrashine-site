'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import s from './HomeTab.module.css';
import type { HomeLead, HomePayload, LeadSource } from '../../_lib/home/build';

/**
 * Admin → Home. Design locked 2026-09-28 (00_STATE/design-home-dark.html).
 *
 * "What needs me right now": a to-do list the dashboard builds from every
 * source, today's jobs, four numbers, the latest leads and a short summary of
 * social, reviews, the website and the automations. Every card opens its tab
 * on this same page — the only links that leave are the dev shortcuts.
 */

const go = (tab: string) => {
  window.location.hash = `#${tab}`;
  window.scrollTo({ top: 0 });
};

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.round(n));
const fmt = (n: number) => (n >= 10_000 ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}k` : n.toLocaleString('en-US'));

function ago(ms: number, now: number) {
  const d = Math.max(0, now - ms);
  if (d < 60_000) return 'just now';
  if (d < 3600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3600_000)}h ago`;
  const dt = new Date(ms);
  if (d < 7 * 86_400_000) return dt.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/New_York' });
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });
}

function whenLabel(ms: number) {
  return new Date(ms).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });
}

function Delta({ value, prev, suffix }: { value: number; prev: number; suffix: string }) {
  if (!prev) return <span>{suffix}</span>;
  const ch = Math.round(((value - prev) / prev) * 100);
  return (
    <>
      <span className={`${s.chip} ${ch >= 0 ? s.chipUp : s.chipDn}`}>
        {ch >= 0 ? '▲' : '▼'} {Math.abs(ch)}%
      </span>
      {suffix}
    </>
  );
}

function Line({ data, color, h = 40 }: { data: number[]; color: string; h?: number }) {
  const id = useId().replace(/:/g, '');
  const w = 200;
  if (data.length < 2) return <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" />;
  const mx = Math.max(...data, 1);
  const X = (i: number) => (i * w) / (data.length - 1);
  const Y = (v: number) => h - 3 - (v / mx) * (h - 8);
  const d = data.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w} ${h} L0 ${h}Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Columns({ data, color, fadeFrom }: { data: number[]; color: string; fadeFrom?: number }) {
  const w = 200;
  const h = 40;
  const n = Math.max(1, data.length);
  const bw = w / n;
  const mx = Math.max(...data, 1);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {data.map((v, i) => {
        const bh = Math.max(3, (v / mx) * (h - 2));
        return <rect key={i} x={i * bw + 4} y={h - bh} width={bw - 8} height={bh} rx="3" fill={color} opacity={fadeFrom != null && i >= fadeFrom ? 0.35 : i === n - 1 ? 1 : 0.8} />;
      })}
    </svg>
  );
}

const SRC: Record<LeadSource, { label: string; cls: string }> = {
  web: { label: 'Website quote', cls: s.src_web },
  ig: { label: 'Instagram', cls: s.src_ig },
  fb: { label: 'Facebook', cls: s.src_fb },
  job: { label: 'Applicant', cls: s.src_job },
};

function initials(name: string) {
  const parts = name.replace(/[^A-Za-zÀ-ÿ\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '•';
}

function Avatar({ lead }: { lead: HomeLead }) {
  if (lead.source === 'ig') return <div className={s.av} style={{ background: 'var(--ig)', color: '#fff' }}>@</div>;
  if (lead.source === 'fb') return <div className={s.av} style={{ background: 'var(--fb)', color: '#fff' }}>f</div>;
  return <div className={s.av}>{initials(lead.name)}</div>;
}

type LeadFilter = 'all' | 'web' | 'social' | 'job';

export default function HomeTab() {
  const [home, setHome] = useState<HomePayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<LeadFilter>('all');
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (refresh = false) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/home${refresh ? '?refresh=1' : ''}`, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setHome(j.home);
      setErr(null);
      // The sidebar shows these as little counters next to each tab.
      window.dispatchEvent(new CustomEvent('admin:badges', { detail: j.home.counts }));
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Keep it fresh while the tab stays open.
    const t = setInterval(() => load(), 5 * 60_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  if (!home) {
    return (
      <div className={s.root}>
        {err ? (
          <div className={s.banner}>Couldn&apos;t load Home: {err}. <button onClick={() => load()} style={{ textDecoration: 'underline' }}>Try again</button></div>
        ) : (
          <>
            <div className={s.bento}>
              <div className={`${s.sk} ${s.s8}`} style={{ height: 300 }} />
              <div className={`${s.sk} ${s.s4}`} style={{ height: 300 }} />
            </div>
            <div className={s.bento}>
              {[0, 1, 2, 3].map((i) => <div key={i} className={`${s.sk} ${s.s3}`} style={{ height: 150 }} />)}
            </div>
          </>
        )}
      </div>
    );
  }

  const now = home.at;
  const { kpi, social, reviews, web, autos } = home;
  const jobsToday = home.today?.jobs.length ?? 0;
  const subBits = [
    home.needs.length ? `${home.needs.length} ${home.needs.length === 1 ? 'thing needs' : 'things need'} you` : 'All caught up',
    home.today ? `${jobsToday} ${jobsToday === 1 ? 'job' : 'jobs'} today` : null,
    kpi.collected ? `${money(kpi.collected.value)} collected this week` : null,
  ].filter(Boolean);

  const leads = home.leads.filter((l) =>
    filter === 'all' ? true : filter === 'social' ? l.source === 'ig' || l.source === 'fb' : l.source === filter,
  );

  const owedLatePct = kpi.owed && kpi.owed.total > 0 ? Math.min(100, (kpi.owed.late / kpi.owed.total) * 100) : 0;
  const sentPct = reviews.sent30 ? (reviews.reviewed30 / reviews.sent30) * 100 : 0;

  return (
    <div className={s.root}>
      {/* ========== HEADER ========== */}
      <div className={s.top}>
        <div>
          <p className={s.eyebrow}>{home.dateLabel}</p>
          <h1 className={s.h1}>{home.greeting}</h1>
          <p className={s.sub}>{subBits.join(' · ')}</p>
        </div>
        <div className={s.topR}>
          <span className={s.upd}>
            <span className={s.live} />
            {busy ? 'Updating…' : `Live · updated ${ago(now, Date.now()) === 'just now' ? 'just now' : ago(now, Date.now())}`}
          </span>
          <button className={s.pill} onClick={() => load(true)} disabled={busy}>
            ↻ Refresh
          </button>
          <div className={s.newWrap} ref={menuRef}>
            <button className={s.btnW} onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
              + New
            </button>
            {menu && (
              <div className={s.menu} role="menu">
                <button onClick={() => { setMenu(false); go('social'); }}>◈ New Instagram / Facebook post</button>
                <button onClick={() => { setMenu(false); go('reviews'); }}>★ Send a review request</button>
                <a href="/quote" target="_blank" rel="noopener noreferrer" onClick={() => setMenu(false)}>✦ Open the quote form</a>
                <a href="/review-card" target="_blank" rel="noopener noreferrer" onClick={() => setMenu(false)}>🖨 Print review cards</a>
              </div>
            )}
          </div>
        </div>
      </div>
      {err && <div className={s.banner}>Last refresh failed: {err}. Showing the numbers from before.</div>}

      {/* ========== NEEDS YOU + TODAY ========== */}
      <div className={s.bento}>
        <section className={`${s.card} ${s.s8} ${s.glow}`}>
          <div className={s.ch}>
            <h3>Needs you</h3>
            {home.needs.length > 0 && <span className={s.cnt}>{home.needs.length}</span>}
            <span className={s.go} style={{ cursor: 'default' }}>Most urgent first</span>
          </div>
          {home.needs.length === 0 ? (
            <div className={s.allgood}>
              <div className={`${s.ic} ${s.t_g}`}>✓</div>
              <div>
                <b style={{ color: '#fff' }}>All caught up.</b> No overdue invoices, new quotes, unanswered messages or posts waiting on you.
              </div>
            </div>
          ) : (
            <div className={s.todo}>
              {home.needs.map((n) => (
                <div key={n.id} className={s.td}>
                  <div className={`${s.ic} ${s[`t_${n.tone}`]}`}>{n.icon}</div>
                  <div className={s.tx}>
                    <b>{n.title}</b>
                    <span>{n.detail}</span>
                  </div>
                  <button className={s.act} onClick={() => go(n.tab)}>
                    {n.action}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={`${s.card} ${s.s4}`}>
          <div className={s.ch}>
            <h3>Today&apos;s jobs</h3>
            {home.today && <span className={s.cnt}>{jobsToday}</span>}
            <button className={s.go} onClick={() => go('schedule')}>Schedule →</button>
          </div>
          {!home.today ? (
            <p className={s.empty}>Jobber isn&apos;t connected — open <b>Schedule</b> to connect it.</p>
          ) : jobsToday === 0 ? (
            <p className={s.empty}>Nothing on the schedule today.</p>
          ) : (
            <div>
              {home.today.jobs.map((j) => (
                <div key={j.id} className={s.job}>
                  <div className={s.jt}>{j.time}</div>
                  <div className={s.jr}>
                    <span className={`${s.jd} ${j.state === 'done' ? s.jd_done : j.state === 'now' ? s.jd_now : ''}`} />
                  </div>
                  <div className={s.jb}>
                    <b>
                      {j.title}
                      {j.state === 'done' && <span className={`${s.st} ${s.st_done}`}>Done</span>}
                      {j.state === 'now' && <span className={`${s.st} ${s.st_now}`}>In progress</span>}
                    </b>
                    <span>{[j.client, j.city].filter(Boolean).join(' · ')}</span>
                    {j.team.length > 0 && (
                      <div className={s.team}>
                        {j.team.map((t) => <i key={t}>{t}</i>)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {home.today && (
            <div className={s.tomorrow}>
              <span>Tomorrow</span>
              <span>
                {home.today.tomorrowCount ? (
                  <>
                    <b>{home.today.tomorrowCount} {home.today.tomorrowCount === 1 ? 'job' : 'jobs'}</b>
                    {home.today.tomorrowFirst ? ` · first at ${home.today.tomorrowFirst}` : ''}
                  </>
                ) : (
                  'No jobs yet'
                )}
              </span>
            </div>
          )}
        </section>
      </div>

      {/* ========== FOUR NUMBERS ========== */}
      <div className={`${s.bento} ${s.kpis}`}>
        <button className={`${s.card} ${s.s3} ${s.kpi}`} onClick={() => go('money')}>
          <div className={s.lbl}><i style={{ background: 'var(--green)' }} />Collected · this week</div>
          {kpi.collected ? (
            <>
              <div className={`${s.v} ${s.num}`}>{money(kpi.collected.value)}</div>
              <div className={s.d}><Delta value={kpi.collected.value} prev={kpi.collected.prev} suffix="vs last week" /></div>
              <Line data={kpi.collected.spark} color="#34d399" />
            </>
          ) : (
            <><div className={`${s.v} ${s.soft}`}>—</div><div className={s.d}>Connect Jobber to see payments</div></>
          )}
        </button>

        <button className={`${s.card} ${s.s3} ${s.kpi}`} onClick={() => go('money')}>
          <div className={s.lbl}><i style={{ background: 'var(--red)' }} />Owed to you</div>
          {kpi.owed ? (
            <>
              <div className={`${s.v} ${s.num}`}>{money(kpi.owed.total)}</div>
              <div className={s.d}>
                {kpi.owed.late > 0 && <span className={`${s.chip} ${s.chipDn}`}>{money(kpi.owed.late)} late</span>}
                {kpi.owed.open} open {kpi.owed.open === 1 ? 'invoice' : 'invoices'}
              </div>
              <svg viewBox="0 0 200 40" preserveAspectRatio="none">
                <rect x="0" y="16" width="200" height="8" rx="4" fill="#1b1c22" />
                {kpi.owed.total > 0 && owedLatePct > 0 && <rect x="0" y="16" width={Math.max(8, owedLatePct * 2)} height="8" rx="4" fill="#f87171" />}
                {kpi.owed.total > 0 && owedLatePct < 100 && (
                  <rect x={owedLatePct > 0 ? owedLatePct * 2 + 2 : 0} y="16" width={Math.max(8, 200 - owedLatePct * 2 - (owedLatePct > 0 ? 2 : 0))} height="8" rx="4" fill="#fbbf24" opacity=".7" />
                )}
              </svg>
            </>
          ) : (
            <><div className={`${s.v} ${s.soft}`}>—</div><div className={s.d}>Connect Jobber to see invoices</div></>
          )}
        </button>

        <button className={`${s.card} ${s.s3} ${s.kpi}`} onClick={() => go('leads')}>
          <div className={s.lbl}><i style={{ background: 'var(--blue)' }} />New leads · 7 days</div>
          <div className={`${s.v} ${s.num}`}>{kpi.leads.value}</div>
          <div className={s.d}>
            {kpi.leads.prev > 0 && kpi.leads.value !== kpi.leads.prev && (
              <span className={`${s.chip} ${kpi.leads.value >= kpi.leads.prev ? s.chipUp : s.chipDn}`}>
                {kpi.leads.value >= kpi.leads.prev ? '▲' : '▼'} {Math.abs(kpi.leads.value - kpi.leads.prev)}
              </span>
            )}
            {kpi.leads.web} website · {kpi.leads.social} social
          </div>
          <Columns data={kpi.leads.spark} color="#4d7cff" />
        </button>

        <button className={`${s.card} ${s.s3} ${s.kpi}`} onClick={() => go('schedule')}>
          <div className={s.lbl}><i style={{ background: 'var(--violet)' }} />Jobs · next 7 days</div>
          {kpi.jobs ? (
            <>
              <div className={`${s.v} ${s.num}`}>{kpi.jobs.value}</div>
              <div className={s.d}>{kpi.jobs.clients} active clients</div>
              <Columns data={kpi.jobs.spark} color="#a78bfa" />
            </>
          ) : (
            <><div className={`${s.v} ${s.soft}`}>—</div><div className={s.d}>Connect Jobber to see the schedule</div></>
          )}
        </button>
      </div>

      {/* ========== LEADS + SOCIAL ========== */}
      <div className={s.bento}>
        <section className={`${s.card} ${s.s7}`}>
          <div className={s.ch}>
            <h3>Latest leads</h3>
            <div className={s.tabs}>
              {(['all', 'web', 'social', 'job'] as LeadFilter[]).map((f) => (
                <button key={f} className={filter === f ? s.tabOn : ''} onClick={() => setFilter(f)}>
                  {f === 'all' ? 'All' : f === 'web' ? 'Website' : f === 'social' ? 'Social' : 'Applicants'}
                </button>
              ))}
            </div>
          </div>
          {leads.length === 0 ? (
            <p className={s.empty}>
              {home.leads.length === 0 ? 'No leads yet. Quote requests, social leads and cleaner applications show up here the moment they arrive.' : 'Nothing in this group yet.'}
            </p>
          ) : (
            <div>
              {leads.map((l) => (
                <div key={l.id} className={s.ld}>
                  <Avatar lead={l} />
                  <div style={{ minWidth: 0 }}>
                    <b>
                      {l.name}
                      {l.isNew && <span className={s.newDot} title="New in the last 24 hours" />}
                    </b>
                    <div className={s.m}>{l.detail}</div>
                  </div>
                  <span className={`${s.src} ${SRC[l.source].cls}`}>{SRC[l.source].label}</span>
                  <span className={s.when}>{ago(l.at, now)}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <button className={s.go} style={{ marginLeft: 0 }} onClick={() => go(filter === 'social' ? 'social' : 'leads')}>
              See every lead →
            </button>
          </div>
        </section>

        <section className={`${s.card} ${s.s5}`}>
          <div className={s.ch}>
            <h3>Social</h3>
            <span className={`${s.conn} ${social.connected ? '' : s.connOff}`}>
              ● {social.connected ? (social.igUsername ? `@${social.igUsername}` : 'Connected') : 'Not connected'}
            </span>
            <button className={s.go} onClick={() => go('social')}>Open Social →</button>
          </div>
          {social.nextPost ? (
            <div className={s.nextpost}>
              <div className={s.thumb} style={social.nextPost.thumb ? { backgroundImage: `url(${social.nextPost.thumb})` } : undefined}>
                <em>{social.nextPost.kind}</em>
              </div>
              <div className={s.np}>
                <span className={s.npWhen}>Next post · {whenLabel(social.nextPost.at)}</span>
                <p>{social.nextPost.caption || 'No caption yet'}</p>
                <div className={s.plats}>
                  {social.nextPost.platforms.includes('instagram') && <i style={{ background: 'var(--ig)' }}>IG</i>}
                  {social.nextPost.platforms.includes('facebook') && <i style={{ background: 'var(--fb)' }}>f</i>}
                  <span className={`${s.sm} ${social.nextPost.approved ? s.soft : ''}`} style={{ marginLeft: 4, color: social.nextPost.approved ? undefined : 'var(--amber)' }}>
                    {social.nextPost.approved ? 'Approved' : 'Waiting for approval'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className={s.empty}>{social.connected ? 'Nothing scheduled yet — plan the next post in Social.' : 'Connect Instagram + Facebook in Social to plan and auto-post.'}</p>
          )}
          <div className={s.mini}>
            <div>
              <b className={s.num}>{social.followers != null ? fmt(social.followers) : '—'}</b>
              <span>
                IG followers{' '}
                {social.followersDelta ? <span className={social.followersDelta > 0 ? s.up : s.dn}>{social.followersDelta > 0 ? '+' : ''}{social.followersDelta}</span> : null}
              </span>
            </div>
            <div>
              <b className={s.num}>{social.reach7 != null ? fmt(social.reach7) : '—'}</b>
              <span>Reach · 7 days</span>
            </div>
            <div>
              <b className={s.num}>{social.unread}</b>
              <span>Unanswered</span>
            </div>
          </div>
        </section>
      </div>

      {/* ========== REVIEWS + WEBSITE + AUTOPILOT ========== */}
      <div className={s.bento}>
        <section className={`${s.card} ${s.s4}`}>
          <div className={s.ch}>
            <h3>Reviews</h3>
            <button className={s.go} onClick={() => go('reviews')}>Reviews →</button>
          </div>
          <div className={s.rv}>
            <span className={s.big}>{reviews.rating.toFixed(1)}</span>
            <span className={s.stars}>★★★★★</span>
            <span className={`${s.sm} ${s.mut}`}>{reviews.count} on Google</span>
          </div>
          <div className={s.rlines}>
            <div>
              <div className={s.rl}><span>New this month</span><b>{reviews.newThisMonth != null ? `+${reviews.newThisMonth}` : '—'}</b></div>
              <div className={s.bar}><i style={{ width: `${Math.min(100, (reviews.newThisMonth ?? 0) * 12)}%`, background: 'var(--amber)' }} /></div>
            </div>
            <div>
              <div className={s.rl}><span>Requests sent · 30 days</span><b>{reviews.sent30} sent · {reviews.reviewed30} reviewed</b></div>
              <div className={s.bar}><i style={{ width: `${sentPct}%`, background: 'var(--green)' }} /></div>
            </div>
            <div className={s.rl}><span className={s.mut}>HomeAdvisor</span><span className={s.mut}>4.9 ★ · 25</span></div>
          </div>
        </section>

        <section className={`${s.card} ${s.s4}`}>
          <div className={s.ch}>
            <h3>Website today</h3>
            <button className={s.go} onClick={() => go('insights')}>Insights →</button>
          </div>
          {web ? (
            <>
              <div className={s.wt}>
                <div>
                  <b className={s.num}>{fmt(web.visitors)}</b>
                  <span>visitors{web.avg7 != null ? ` · avg ${web.avg7}` : ''}</span>
                </div>
                <div>
                  <b className={s.num}>{web.quoteOpens}</b>
                  <span>opened quote form</span>
                </div>
                <div>
                  <b className={s.num}>{web.quotesSent}</b>
                  <span>sent a quote</span>
                </div>
              </div>
              <div className={s.spark}><Line data={web.spark} color="#4d7cff" h={70} /></div>
              <div className={`${s.sm} ${s.soft}`} style={{ marginTop: 6 }}>
                {web.topSource ? `Top source today: ${web.topSource.label} · ${web.topSource.pct}%` : 'Line = visitors per day, last 7 days'}
              </div>
            </>
          ) : (
            <p className={s.empty}>Website visitors aren&apos;t connected yet — Insights shows the two-minute setup.</p>
          )}
        </section>

        <section className={`${s.card} ${s.s4}`}>
          <div className={s.ch}><h3>Running on autopilot</h3></div>
          <div>
            <div className={s.au}>
              <div className={s.tx}><b>Morning email · 7:00 AM</b><span>Yesterday&apos;s leads, today&apos;s jobs, unpaid invoices</span></div>
              <a className={s.pill} style={{ padding: '4px 9px' }} href="/api/cron/daily-summary" target="_blank" rel="noopener noreferrer">Send test</a>
              <span className={s.sw} />
            </div>
            <div className={s.au} onClick={() => go('reviews')} style={{ cursor: 'pointer' }}>
              <div className={s.tx}><b>Review requests</b><span>{autos.reviewRequests.note}</span></div>
              <span className={`${s.sw} ${autos.reviewRequests.on ? '' : s.swOff}`} />
            </div>
            <div className={s.au} onClick={() => go('social')} style={{ cursor: 'pointer' }}>
              <div className={s.tx}><b>Auto-post approved posts</b><span>{autos.autopost.note}</span></div>
              <span className={`${s.sw} ${autos.autopost.on ? '' : s.swOff}`} />
            </div>
            <div className={s.au} onClick={() => go('social')} style={{ cursor: 'pointer' }}>
              <div className={s.tx}><b>DM auto-replies</b><span>{autos.dms.note}</span></div>
              <span className={`${s.sw} ${autos.dms.on ? '' : s.swOff}`} />
            </div>
          </div>
        </section>
      </div>

      {/* ========== SHORTCUTS ========== */}
      <p className={s.sclbl}>Shortcuts</p>
      <div className={s.sc}>
        <a href="/quote" target="_blank" rel="noopener noreferrer">✦ Test the quote form</a>
        <a href="/review-card" target="_blank" rel="noopener noreferrer">🖨 Print review cards</a>
        <a href="/leave-a-review" target="_blank" rel="noopener noreferrer">★ Leave-a-review page</a>
        <a href="https://vercel.com/contact-8079s-projects/ultrashine-site" target="_blank" rel="noopener noreferrer">⚡ Vercel</a>
        <a href="https://github.com/UltraShineCleaning/ultrashine-site" target="_blank" rel="noopener noreferrer">⚙ GitHub</a>
        <a href="https://resend.com/emails" target="_blank" rel="noopener noreferrer">✉ Resend</a>
      </div>
    </div>
  );
}
