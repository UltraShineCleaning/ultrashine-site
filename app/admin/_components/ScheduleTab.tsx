'use client';

import { useMemo, useState } from 'react';
import s from './ScheduleTab.module.css';
import type { JobberVisit } from '../../_lib/jobberClient';

/**
 * Admin → Schedule. Design locked 2026-09-29 (00_STATE/design-schedule-dark.html).
 *
 * Every visit from Jobber: a month (or week) calendar, the jobs of the day you
 * tap, what's coming up, who has how much work, and a red flag for any visit
 * with no cleaner assigned. Changing the schedule still happens in Jobber.
 * All dates are Florida time.
 */

const TZ = 'America/New_York';
const DAY = 86_400_000;
const WD = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** 'YYYY-MM-DD' of an instant, in Florida. */
const keyOf = (ms: number) => new Date(ms).toLocaleDateString('en-CA', { timeZone: TZ });
const keyParts = (k: string) => k.split('-').map(Number) as [number, number, number];
/** Noon UTC of a calendar date — a safe anchor for date arithmetic that never crosses a day line. */
const anchor = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d, 12);
const keyFromAnchor = (a: number) => new Date(a).toISOString().slice(0, 10);

const time = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ }).replace(' AM', 'a').replace(' PM', 'p') : 'Any time';
const dur = (v: JobberVisit) => {
  if (!v.startAt || !v.endAt) return null;
  const h = (Date.parse(v.endAt) - Date.parse(v.startAt)) / 3600_000;
  if (h <= 0 || h > 12) return null;
  return h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`;
};
const cityOf = (a: string | null) => {
  const p = (a ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  return p.length > 1 ? p[p.length - 1] : null;
};
const shortName = (n: string) => {
  const p = n.trim().split(/\s+/);
  return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : n;
};
const shortService = (t: string) =>
  t.replace(/cleaning services?/i, '').replace(/service/i, '').trim().replace(/^[-·\s]+|[-·\s]+$/g, '') || 'Cleaning';
const mapHref = (a: string | null) => (a ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${a}, FL`)}` : null);

export default function ScheduleTab({ visits, error }: { visits: JobberVisit[]; error?: string | null }) {
  const now = Date.now();
  const todayKey = keyOf(now);
  const [ty, tm, td] = keyParts(todayKey);

  const [view, setView] = useState<'month' | 'week'>('month');
  const [month, setMonth] = useState<[number, number]>([ty, tm]);
  const [selKey, setSelKey] = useState(todayKey);

  const byDay = useMemo(() => {
    const m = new Map<string, JobberVisit[]>();
    for (const v of visits) {
      if (!v.startAt) continue;
      const k = keyOf(Date.parse(v.startAt));
      m.set(k, [...(m.get(k) ?? []), v]);
    }
    for (const list of Array.from(m.values())) list.sort((a, b) => (a.startAt ?? '').localeCompare(b.startAt ?? ''));
    return m;
  }, [visits]);

  // ---- the four numbers ----
  const todayA = anchor(ty, tm, td);
  const dow = new Date(todayA).getUTCDay();
  const weekStartA = todayA - dow * DAY;
  const keysFrom = (startA: number, n: number) => Array.from({ length: n }, (_, i) => keyFromAnchor(startA + i * DAY));
  const inKeys = (keys: string[]) => keys.flatMap((k) => byDay.get(k) ?? []);
  const today = byDay.get(todayKey) ?? [];
  const week = inKeys(keysFrom(weekStartA, 7));
  const tomorrow = byDay.get(keyFromAnchor(todayA + DAY)) ?? [];
  const next14 = inKeys(keysFrom(todayA, 14));
  const unassigned = next14.filter((v) => !v.team.length && !v.completed);
  const doneToday = today.filter((v) => v.completed || (v.endAt && Date.parse(v.endAt) < now)).length;
  const nowToday = today.filter((v) => !v.completed && v.startAt && Date.parse(v.startAt) <= now && (!v.endAt || Date.parse(v.endAt) >= now)).length;

  // ---- team load this week ----
  const load = new Map<string, number>();
  for (const v of week) {
    if (!v.team.length) load.set('Unassigned', (load.get('Unassigned') ?? 0) + 1);
    for (const t of v.team) load.set(t, (load.get(t) ?? 0) + 1);
  }
  const loadRows = Array.from(load.entries()).sort((a, b) => (a[0] === 'Unassigned' ? 1 : b[0] === 'Unassigned' ? -1 : b[1] - a[1]));
  const loadMax = Math.max(1, ...loadRows.map((r) => r[1]));

  // ---- calendar cells ----
  const [my, mm] = month;
  const firstA = anchor(my, mm, 1);
  const gridStartA = firstA - new Date(firstA).getUTCDay() * DAY;
  const monthCells = keysFrom(gridStartA, 42);
  const selA = anchor(...keyParts(selKey));
  const selWeekStart = selA - new Date(selA).getUTCDay() * DAY;
  const weekCells = keysFrom(selWeekStart, 7);
  const lastRow = monthCells.slice(35).every((k) => keyParts(k)[1] !== mm);
  const cells = view === 'month' ? (lastRow ? monthCells.slice(0, 35) : monthCells) : weekCells;

  // Jobber data starts on the 1st of this month and runs ~90 days ahead.
  const canPrev = my > ty || (my === ty && mm > tm);
  const maxA = todayA + 92 * DAY;
  const canNext = anchor(my, mm + 1, 1) <= maxA;
  const stepMonth = (d: number) => {
    const dt = new Date(Date.UTC(my, mm - 1 + d, 1, 12));
    setMonth([dt.getUTCFullYear(), dt.getUTCMonth() + 1]);
  };
  const stepWeek = (d: number) => {
    const k = keyFromAnchor(selA + d * 7 * DAY);
    setSelKey(k);
    const [yy, mo] = keyParts(k);
    setMonth([yy, mo]);
  };
  const monthTitle = new Date(firstA).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const weekTitle = `${new Date(selWeekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} – ${new Date(selWeekStart + 6 * DAY).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;

  const dayJobs = byDay.get(selKey) ?? [];
  const dayTitle = new Date(selA).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });
  const upcoming = inKeys(keysFrom(todayA + DAY, 7)).slice(0, 8);

  const pill = (v: JobberVisit) => (v.completed ? s.pDone : !v.team.length ? s.pWarn : '');

  return (
    <div className={s.root}>
      <div className={s.bar}>
        <span className={s.upd}><span className={s.live} />Live from Jobber</span>
        <a className={s.pill} href={`/admin?t=${now}#schedule`}>↻ Refresh</a>
        <a className={s.btnW} href="https://secure.getjobber.com/calendar" target="_blank" rel="noopener noreferrer">Open Jobber ↗</a>
      </div>
      {error && <div className={s.banner}>Some visits may be missing — Jobber said: {error}</div>}

      {/* ========== FOUR NUMBERS ========== */}
      <div className={s.kp}>
        <button className={s.card} onClick={() => { setSelKey(todayKey); setMonth([ty, tm]); }}>
          <div className={s.l}><i style={{ background: 'var(--blue)' }} />Today</div>
          <div className={s.v}>{today.length}</div>
          <div className={s.d}>{today.length ? [doneToday && `${doneToday} done`, nowToday && `${nowToday} in progress`, today.length - doneToday - nowToday > 0 && `${today.length - doneToday - nowToday} to go`].filter(Boolean).join(' · ') : 'no jobs today'}</div>
        </button>
        <div className={s.card}>
          <div className={s.l}><i style={{ background: 'var(--violet)' }} />This week</div>
          <div className={s.v}>{week.length}</div>
          <div className={s.d}>Sun–Sat · {tomorrow.length} tomorrow</div>
        </div>
        <div className={s.card}>
          <div className={s.l}><i style={{ background: 'var(--green)' }} />Next 14 days</div>
          <div className={s.v}>{next14.length}</div>
          <div className={s.d}>{new Set(next14.map((v) => v.clientName)).size} different clients</div>
        </div>
        <button
          className={`${s.card} ${unassigned.length ? s.alert : ''}`}
          onClick={() => {
            const f = unassigned[0];
            if (f?.startAt) {
              const k = keyOf(Date.parse(f.startAt));
              setSelKey(k);
              setMonth([keyParts(k)[0], keyParts(k)[1]]);
            }
          }}
        >
          <div className={s.l}><i style={{ background: 'var(--red)' }} />No cleaner assigned</div>
          <div className={s.v}>{unassigned.length}</div>
          <div className={s.d}>
            {unassigned.length ? `${new Date(Date.parse(unassigned[0].startAt!)).toLocaleDateString('en-US', { weekday: 'short', timeZone: TZ })} · ${shortName(unassigned[0].clientName)}${unassigned.length > 1 ? ` + ${unassigned.length - 1} more` : ''} — assign in Jobber` : 'every visit has a cleaner'}
          </div>
        </button>
      </div>

      {/* ========== CALENDAR + DAY ========== */}
      <div className={s.bento}>
        <section className={`${s.card} ${s.s8}`}>
          <div className={s.calh}>
            <h3>{view === 'month' ? monthTitle : weekTitle}</h3>
            <div className={s.nav}>
              <button onClick={() => (view === 'month' ? stepMonth(-1) : stepWeek(-1))} disabled={view === 'month' ? !canPrev : selWeekStart <= weekStartA} aria-label="Previous">‹</button>
              <button onClick={() => (view === 'month' ? stepMonth(1) : stepWeek(1))} disabled={view === 'month' ? !canNext : selWeekStart + 7 * DAY > maxA} aria-label="Next">›</button>
            </div>
            <button className={s.pill} onClick={() => { setSelKey(todayKey); setMonth([ty, tm]); }}>Today</button>
            <div className={s.seg}>
              <button className={view === 'month' ? s.segOn : ''} onClick={() => setView('month')}>Month</button>
              <button className={view === 'week' ? s.segOn : ''} onClick={() => setView('week')}>Week</button>
            </div>
          </div>
          <div className={`${s.grid} ${view === 'week' ? s.gridWeek : ''}`}>
            {WD.map((d) => <div key={d} className={s.dow}>{d}</div>)}
            {cells.map((k) => {
              const [, cm, cd] = keyParts(k);
              const js = byDay.get(k) ?? [];
              const out = view === 'month' && cm !== mm;
              const max = view === 'week' ? 8 : 2;
              return (
                <button key={k} className={`${s.day} ${out ? s.out : ''} ${k === todayKey ? s.today : ''} ${k === selKey ? s.sel : ''}`} onClick={() => setSelKey(k)}>
                  <span className={s.n}>
                    {cd}
                    {js.length > 0 && <em>{js.length} {js.length === 1 ? 'job' : 'jobs'}</em>}
                  </span>
                  {js.slice(0, max).map((v) => (
                    <span key={v.id} className={`${s.p} ${pill(v)}`} title={`${time(v.startAt)} · ${v.title} · ${v.clientName}`}>
                      {view === 'week' ? `${time(v.startAt)} ` : ''}{shortService(v.title)} · {shortName(v.clientName)}
                    </span>
                  ))}
                  {js.length > max && <span className={s.more}>+{js.length - max} more</span>}
                  {js.length > 0 && <span className={s.dots}>{js.slice(0, 4).map((v) => <i key={v.id} className={pill(v)} />)}</span>}
                </button>
              );
            })}
          </div>
          <div className={s.legend}><span><i />Scheduled</span><span><i className={s.pDone} />Done</span><span><i className={s.pWarn} />No cleaner assigned</span></div>
        </section>

        <section className={`${s.card} ${s.s4}`}>
          <div className={s.ch}><h3 className={s.dayT}>{dayTitle}</h3><span className={s.cnt}>{dayJobs.length}</span></div>
          {dayJobs.length === 0 ? (
            <p className={s.empty}>No visits this day.</p>
          ) : (
            dayJobs.map((v) => {
              const m = mapHref(v.address);
              const done = v.completed || (v.endAt && Date.parse(v.endAt) < now);
              return (
                <div key={v.id} className={s.job}>
                  <div className={s.t}>{time(v.startAt)}<span>{dur(v) ?? ''}</span></div>
                  <div className={s.r}><span className={`${s.dt} ${done ? s.dtDone : ''}`} /></div>
                  <div style={{ minWidth: 0 }}>
                    <b>{v.title}</b>
                    <span className={s.c}>{[v.clientName, cityOf(v.address)].filter(Boolean).join(' · ')}</span>
                    {m && <a className={s.a} href={m} target="_blank" rel="noopener noreferrer">{v.address} ↗</a>}
                    <div className={s.tags}>
                      {v.completed && <i className={s.tDone}>Done</i>}
                      {v.team.length ? v.team.map((t) => <i key={t}>{t}</i>) : <i className={s.tWarn}>No cleaner assigned</i>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>

      {/* ========== COMING UP + TEAM LOAD ========== */}
      <div className={s.bento}>
        <section className={`${s.card} ${s.s7}`}>
          <div className={s.ch}><h3>Coming up · next 7 days</h3><button className={s.go} onClick={() => setView('week')}>Week view →</button></div>
          {upcoming.length === 0 ? (
            <p className={s.empty}>Nothing scheduled in the next 7 days.</p>
          ) : (
            upcoming.map((v) => (
              <button key={v.id} className={s.rw} onClick={() => { const k = keyOf(Date.parse(v.startAt!)); setSelKey(k); setMonth([keyParts(k)[0], keyParts(k)[1]]); }}>
                <span className={s.when}>
                  {new Date(Date.parse(v.startAt!)).toLocaleDateString('en-US', { weekday: 'short', timeZone: TZ })} {time(v.startAt)}
                </span>
                <div style={{ minWidth: 0 }}>
                  <b>{v.title}</b>
                  <span className={s.c}>{[shortName(v.clientName), cityOf(v.address), v.team.join(', ') || null].filter(Boolean).join(' · ')}</span>
                </div>
                <span className={s.tags}>{v.team.length ? (dur(v) ? <i>{dur(v)}</i> : null) : <i className={s.tWarn}>Unassigned</i>}</span>
              </button>
            ))
          )}
        </section>
        <section className={`${s.card} ${s.s5}`}>
          <div className={s.ch}><h3>Team load · this week</h3></div>
          {loadRows.length === 0 ? (
            <p className={s.empty}>No visits this week.</p>
          ) : (
            <div className={s.load}>
              {loadRows.map(([name, n]) => (
                <div key={name} className={s.rr}>
                  <span className={name === 'Unassigned' ? s.mut : ''}>{name}</span>
                  <span className={s.lbar}><i style={{ width: `${(n / loadMax) * 100}%`, background: name === 'Unassigned' ? '#f87171' : undefined }} /></span>
                  <b>{n}</b>
                </div>
              ))}
            </div>
          )}
          <p className={s.fine}>Visits per cleaner or crew, from Jobber. Moving or assigning jobs still happens in Jobber.</p>
        </section>
      </div>
    </div>
  );
}
