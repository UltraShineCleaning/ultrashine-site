'use client';

import { useMemo, useState } from 'react';
import type { JobberInvoice, JobberMoney, RevenueBucket } from '../../_lib/jobberClient';
import { reminderText, shortDate } from '../../_lib/money/reminder';
import s from './MoneyTab.module.css';

/**
 * Admin → Money. Design locked 2026-09-28 (00_STATE/design-money-dark.html).
 *
 * "What came in, what's owed, and who to nudge." The admin page fetches the
 * Jobber numbers on the server and hands them in, so there's no loading
 * spinner; this component only adds the switches (weekly/monthly, invoice
 * filter) and the Copy reminder button.
 *
 * Copy reminder only COPIES a polite message — the owner pastes it to the
 * client. Nothing here ever contacts a customer.
 */

const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function Delta({ cur, prev, label }: { cur: number; prev: number; label: string }) {
  if (!prev) return <span className={s.mut}>{label}</span>;
  const pct = Math.round(((cur - prev) / prev) * 100);
  return (
    <>
      <span className={`${s.chip} ${pct >= 0 ? s.chipUp : s.chipDn}`}>
        {pct >= 0 ? '▲' : '▼'} {Math.abs(pct)}%
      </span>{' '}
      <span className={s.mut}>{label}</span>
    </>
  );
}

/** Age groups for the ring + the row pills. */
type Age = 'cur' | 'soon' | 'late' | 'old';
function ageOf(inv: JobberInvoice): Age {
  const d = inv.daysOverdue;
  if (d == null || d <= 0) return 'cur';
  if (d <= 7) return 'soon';
  if (d <= 30) return 'late';
  return 'old';
}
function agePill(inv: JobberInvoice): string {
  const d = inv.daysOverdue;
  if (d == null) return 'no due date';
  if (d < 0) return `due in ${-d} ${-d === 1 ? 'day' : 'days'}`;
  if (d === 0) return 'due today';
  return `${d} ${d === 1 ? 'day' : 'days'} late`;
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older Safari / no permission: fall back to a hidden textarea.
    const t = document.createElement('textarea');
    t.value = text;
    t.style.position = 'fixed';
    t.style.opacity = '0';
    document.body.appendChild(t);
    t.select();
    const ok = document.execCommand('copy');
    t.remove();
    return ok;
  }
}

function RevenueChart({ buckets, goal, goalLabel }: { buckets: RevenueBucket[]; goal: number | null; goalLabel: string }) {
  const W = 760;
  const H = 230;
  const pad = { l: 46, r: 8, t: 22, b: 26 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const n = buckets.length;
  if (!n) return <p className={s.empty}>No payments recorded yet.</p>;
  const top = Math.max(goal ?? 0, ...buckets.map((b) => b.amount), 1) * 1.12;
  const Y = (v: number) => pad.t + ih - (v / top) * ih;
  const slot = iw / n;
  const bw = slot * (n > 10 ? 0.62 : 0.56);
  // three quiet gridlines at round numbers
  const step = Math.pow(10, Math.floor(Math.log10(top / 2)));
  const nice = [1, 2, 2.5, 5, 10].map((m) => m * step).find((v) => top / v <= 3) ?? step * 10;
  const grid = [0, nice, nice * 2, nice * 3].filter((v) => v < top);
  const lab = (v: number) => (v >= 1000 ? `$${Number.isInteger(v / 1000) ? v / 1000 : (v / 1000).toFixed(1)}k` : `$${v}`);
  const short = (v: number) => (v >= 10_000 ? `$${(v / 1000).toFixed(0)}k` : v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`);
  return (
    <svg className={s.chart} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Money collected per period">
      {grid.map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={Y(v)} y2={Y(v)} stroke="rgba(255,255,255,.06)" />
          <text x={pad.l - 8} y={Y(v) + 4} textAnchor="end" fontSize="10.5" fill="#5b5d68">{lab(v)}</text>
        </g>
      ))}
      {goal ? (
        <g>
          <line x1={pad.l} x2={W - pad.r} y1={Y(goal)} y2={Y(goal)} stroke="#fbbf24" strokeDasharray="4 5" opacity=".6" />
          <text x={pad.l + 6} y={Y(goal) - 6} fontSize="10.5" fill="#fbbf24">{goalLabel}</text>
        </g>
      ) : null}
      {buckets.map((b, i) => {
        const x = pad.l + slot * i + (slot - bw) / 2;
        const h = Math.max(b.amount > 0 ? 3 : 0, (b.amount / top) * ih);
        const last = i === n - 1;
        return (
          <g key={b.key} className={s.barG}>
            <title>{`${b.label}: ${money(b.amount)} · ${b.invoiceCount} ${b.invoiceCount === 1 ? 'invoice' : 'invoices'}`}</title>
            <rect x={x} y={pad.t + ih - h} width={bw} height={h} rx={Math.min(7, bw / 3)} fill="#34d399" opacity={last ? 1 : 0.55} />
            {b.amount > 0 && (
              <text x={x + bw / 2} y={pad.t + ih - h - 6} textAnchor="middle" fontSize={n > 10 ? 10 : 11} fill="#8b8d98">
                {n > 10 ? short(b.amount) : money(b.amount)}
              </text>
            )}
            <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#5b5d68">
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Ring({ parts, total, count }: { parts: { value: number; color: string }[]; total: number; count: number }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  let off = 0;
  const live = parts.filter((p) => p.value > 0);
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className={s.ring}>
      <circle cx="70" cy="70" r={r} fill="none" stroke="#1b1c22" strokeWidth="16" />
      {total > 0 &&
        live.map((p, i) => {
          const L = (p.value / total) * c;
          const el = (
            <circle
              key={i}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={p.color}
              strokeWidth="16"
              strokeDasharray={`${Math.max(0.5, L - (live.length > 1 ? 3 : 0))} ${c}`}
              strokeDashoffset={-off}
              transform="rotate(-90 70 70)"
            />
          );
          off += L;
          return el;
        })}
      <text x="70" y="68" textAnchor="middle" fontSize="20" fontWeight="600" fill="#fff">{money(total)}</text>
      <text x="70" y="86" textAnchor="middle" fontSize="10.5" fill="#8b8d98">
        {count} {count === 1 ? 'invoice' : 'invoices'}
      </text>
    </svg>
  );
}

type Filter = 'all' | 'late' | 'notdue';

export default function MoneyTab({ money: m, monthlyGoal = null }: { money: JobberMoney; monthlyGoal?: number | null }) {
  const [grain, setGrain] = useState<'week' | 'month'>('week');
  const [filter, setFilter] = useState<Filter>('all');
  const [copied, setCopied] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const ages = useMemo(() => {
    const sum: Record<Age, number> = { cur: 0, soon: 0, late: 0, old: 0 };
    for (const inv of m.outstanding) sum[ageOf(inv)] += inv.balance;
    return sum;
  }, [m.outstanding]);

  const now = new Date();
  const thisYear = now.getFullYear();
  const bestMonth = useMemo(() => {
    const inYear = m.monthlyRevenue.filter((b) => new Date(b.key).getUTCFullYear() === thisYear && b.amount > 0);
    return inYear.sort((a, b) => b.amount - a.amount)[0] ?? null;
  }, [m.monthlyRevenue, thisYear]);

  // Hard failure: say so plainly — zeros would read as "you have no money".
  if (m.errorDetail && m.invoiceCount === 0) {
    const tokenBroken = /token/i.test(m.errorDetail);
    return (
      <div className={s.root}>
        <div className={`${s.card} ${s.errCard}`}>
          <h3>Can&apos;t load invoices from Jobber</h3>
          <p>{m.errorDetail}</p>
          {tokenBroken && (
            <a className={s.btnW} href="/api/jobber/connect">
              Reconnect Jobber →
            </a>
          )}
        </div>
        <p className={s.empty} style={{ margin: '14px 6px' }}>
          Once Jobber is connected, this page shows what you collected each week and month, every unpaid invoice ranked
          by how late it is, and your top clients.
        </p>
      </div>
    );
  }

  const late = m.outstanding.filter((i) => (i.daysOverdue ?? 0) > 0);
  const list = m.outstanding.filter((i) =>
    filter === 'all' ? true : filter === 'late' ? (i.daysOverdue ?? 0) > 0 : (i.daysOverdue ?? 0) <= 0,
  );
  const shown = showAll ? list : list.slice(0, 10);
  // Jobber's month labels read "Jul 26" (July 2026), which looks like a date — show just the month.
  const buckets =
    grain === 'week'
      ? m.weeklyRevenue
      : m.monthlyRevenue.map((b) => ({ ...b, label: MON[new Date(b.key).getUTCMonth()]?.slice(0, 3) ?? b.label }));
  const goal = monthlyGoal ? (grain === 'week' ? Math.round((monthlyGoal * 7) / 30) : monthlyGoal) : null;
  const lastMonthName = MON[(now.getMonth() + 11) % 12];
  const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
  const topMax = m.topClients[0]?.total || 1;

  const ringParts = [
    { key: 'cur' as Age, label: 'Not due yet', color: '#5b5d68' },
    { key: 'soon' as Age, label: '1–7 days late', color: '#fbbf24' },
    { key: 'late' as Age, label: '8–30 days late', color: '#f87171' },
    { key: 'old' as Age, label: '30+ days late', color: '#b91c1c' },
  ];

  const onCopy = async (inv: JobberInvoice) => {
    if (await copy(reminderText(inv))) {
      setCopied(inv.id);
      setTimeout(() => setCopied((c) => (c === inv.id ? null : c)), 2500);
    }
  };

  return (
    <div className={s.root}>
      <div className={s.bar}>
        <span className={s.upd}>
          <span className={s.live} />
          Live from Jobber
        </span>
        <a className={s.pill} href={`/admin?t=${Date.now()}#money`}>
          ↻ Refresh
        </a>
        <a className={s.btnW} href="https://secure.getjobber.com/" target="_blank" rel="noopener noreferrer">
          Open Jobber ↗
        </a>
      </div>

      {m.errorDetail && <div className={s.banner}>Some numbers may be missing — Jobber said: {m.errorDetail}</div>}

      {/* ========== COLLECTED + OWED ========== */}
      <div className={s.bento}>
        <section className={`${s.card} ${s.s8} ${s.glow}`}>
          <div className={s.ch}>
            <h3>Collected</h3>
            <div className={s.tabs}>
              <button className={grain === 'week' ? s.tabOn : ''} onClick={() => setGrain('week')}>Weekly</button>
              <button className={grain === 'month' ? s.tabOn : ''} onClick={() => setGrain('month')}>Monthly</button>
            </div>
          </div>
          <div className={s.hero}>
            <div className={s.blk}>
              <div className={s.l}>This week</div>
              <div className={`${s.v} ${s.num}`}>{money(m.paidThisWeek)}</div>
              <Delta cur={m.paidThisWeek} prev={m.paidLastWeek} label="vs last week" />
            </div>
            <div className={`${s.blk} ${s.blkSm}`}>
              <div className={s.l}>This month</div>
              <div className={`${s.v} ${s.num}`}>{money(m.paidThisMonth)}</div>
              <Delta cur={m.paidThisMonth} prev={m.paidLastMonth} label={`vs ${lastMonthName}`} />
            </div>
            <div className={`${s.blk} ${s.blkSm}`}>
              <div className={s.l}>This quarter</div>
              <div className={`${s.v} ${s.num}`}>{money(m.paidThisQuarter)}</div>
              <span className={s.mut}>
                {MON[qStartMonth].slice(0, 3)} – {MON[qStartMonth + 2].slice(0, 3)}
              </span>
            </div>
          </div>
          <RevenueChart
            buckets={buckets}
            goal={goal}
            goalLabel={grain === 'week' ? `Goal ${money(goal ?? 0)} / week` : `Goal ${money(goal ?? 0)} / month`}
          />
        </section>

        <section className={`${s.card} ${s.s4}`}>
          <div className={s.ch}>
            <h3>Owed to you</h3>
            {m.outstanding.length > 0 && <span className={s.cnt}>{m.outstanding.length}</span>}
          </div>
          {m.outstanding.length === 0 ? (
            <p className={s.empty}>Nothing owed — every invoice is paid.</p>
          ) : (
            <>
              <div className={s.donutW}>
                <Ring parts={ringParts.map((p) => ({ value: ages[p.key], color: p.color }))} total={m.outstandingTotal} count={m.outstanding.length} />
                <div className={s.dl}>
                  {ringParts.map((p) => (
                    <div key={p.key}>
                      <i style={{ background: p.color }} />
                      <span>{p.label}</span>
                      <b className={s.num}>{money(ages[p.key])}</b>
                    </div>
                  ))}
                </div>
              </div>
              <div className={s.note}>
                {late.length ? (
                  <>
                    <b>{money(m.overdueTotal)} is late</b> — {late.length} {late.length === 1 ? 'invoice' : 'invoices'}. A friendly text
                    usually does it: tap <b>Copy reminder</b> below and paste it to the client.
                  </>
                ) : (
                  <>Nothing is late — every open invoice is still inside its due date.</>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* ========== UNPAID + TOP CLIENTS ========== */}
      <div className={s.bento}>
        <section className={`${s.card} ${s.s7}`}>
          <div className={s.ch}>
            <h3>Unpaid invoices</h3>
            {m.outstanding.length > 0 && <span className={s.cnt}>{m.outstanding.length}</span>}
            <div className={s.filt}>
              {(['all', 'late', 'notdue'] as Filter[]).map((f) => (
                <button key={f} className={filter === f ? s.filtOn : ''} onClick={() => setFilter(f)}>
                  {f === 'all' ? 'All' : f === 'late' ? 'Late' : 'Not due yet'}
                </button>
              ))}
            </div>
          </div>
          {list.length === 0 ? (
            <p className={s.empty}>{m.outstanding.length === 0 ? 'Every invoice is paid.' : 'Nothing in this group.'}</p>
          ) : (
            <>
              {shown.map((inv) => {
                const a = ageOf(inv);
                const meta = [
                  inv.invoiceNumber ? `#${inv.invoiceNumber}` : 'Invoice',
                  shortDate(inv.issuedDate) ? `issued ${shortDate(inv.issuedDate)}` : null,
                  shortDate(inv.dueDate) ? `due ${shortDate(inv.dueDate)}` : null,
                  inv.paid > 0 && inv.paid < inv.total ? `${money(inv.paid)} paid so far` : null,
                ]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <div key={inv.id} className={s.inv}>
                    <div style={{ minWidth: 0 }}>
                      <b>{inv.clientName}</b>
                      <div className={s.m}>{meta}</div>
                    </div>
                    <span className={`${s.age} ${s[`age_${a}`]}`}>{agePill(inv)}</span>
                    <span className={s.amt}>{money(inv.balance)}</span>
                    {a !== 'cur' ? (
                      <button className={`${s.copy} ${copied === inv.id ? s.copied : ''}`} onClick={() => onCopy(inv)} title={reminderText(inv)}>
                        {copied === inv.id ? '✓ Copied' : 'Copy reminder'}
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                );
              })}
              {list.length > 10 && (
                <button className={s.more} onClick={() => setShowAll((v) => !v)}>
                  {showAll ? 'Show fewer' : `Show all ${list.length}`}
                </button>
              )}
            </>
          )}
        </section>

        <section className={`${s.card} ${s.s5}`}>
          <div className={s.ch}>
            <h3>Top clients · 12 months</h3>
          </div>
          {m.topClients.length === 0 ? (
            <p className={s.empty}>No client totals yet.</p>
          ) : (
            <div className={s.tc}>
              {m.topClients.slice(0, 8).map((c, i) => (
                <div key={c.name} className={s.tcRow}>
                  <span className={s.tcN}>{String(i + 1).padStart(2, '0')}</span>
                  <span className={s.tcName}>
                    {c.name}
                    <span>
                      {c.invoiceCount} {c.invoiceCount === 1 ? 'invoice' : 'invoices'}
                    </span>
                  </span>
                  <b className={s.num}>{money(c.total)}</b>
                  <div className={s.tcBar}>
                    <i style={{ width: `${(c.total / topMax) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ========== THREE FACTS ========== */}
      <div className={s.mini3}>
        <section className={s.card}>
          <div className={s.l}>Average invoice</div>
          <div className={`${s.v2} ${s.num}`}>{money(m.averageInvoice)}</div>
          <div className={s.d}>
            across {m.invoiceCount} {m.invoiceCount === 1 ? 'invoice' : 'invoices'}
          </div>
        </section>
        <section className={s.card}>
          <div className={s.l}>Days to get paid</div>
          <div className={`${s.v2} ${s.num}`}>
            {m.avgCollectionDays != null ? `${m.avgCollectionDays} ${m.avgCollectionDays === 1 ? 'day' : 'days'}` : '—'}
          </div>
          <div className={s.d}>typical time from invoice to payment</div>
        </section>
        <section className={s.card}>
          <div className={s.l}>Best month this year</div>
          <div className={`${s.v2} ${s.num}`}>{bestMonth ? money(bestMonth.amount) : '—'}</div>
          <div className={s.d}>
            {bestMonth
              ? `${MON[new Date(bestMonth.key).getUTCMonth()]} · ${bestMonth.invoiceCount} ${bestMonth.invoiceCount === 1 ? 'invoice' : 'invoices'}`
              : 'no payments yet this year'}
          </div>
        </section>
      </div>

      {/* Only when Jobber hands back a shape we don't understand. */}
      {m.fieldDebug && m.fieldDebug.rawNodeCount === 0 && (
        <details className={s.debug}>
          <summary>Technical details (Jobber returned no invoices)</summary>
          <pre>{`totalCount reported: ${m.invoiceCount}
invoice keys seen:   ${m.fieldDebug.sampleKeys.join(', ') || '(none)'}
amount keys seen:    ${m.fieldDebug.sampleAmountKeys.join(', ') || '(none)'}
statuses:            ${JSON.stringify(m.fieldDebug.statusCounts)}`}</pre>
        </details>
      )}
    </div>
  );
}
