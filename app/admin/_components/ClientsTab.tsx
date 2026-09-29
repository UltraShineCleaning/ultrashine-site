'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from './ClientsTab.module.css';
import type { ClientProfile, ClientsPayload, HomeDetails } from '../../_lib/clients/types';

/**
 * Admin → Clients. Design locked 2026-09-29 (00_STATE/design-clients-dark.html).
 *
 * Everyone you clean for: how often, what they pay per visit, their home size,
 * what they've paid and owe, their next visit, and a one-tap way to reach them.
 * Home details (bed / bath / sqft / pets / notes) can be filled in here — they
 * start from what the client typed on the website quote form when we have it.
 * Editing the client itself still happens in Jobber.
 */

type Filter = 'all' | 'weekly' | 'biweekly' | 'monthly' | 'oneoff' | 'owes' | 'quiet' | 'companies';
type Sort = 'value' | 'name' | 'next';

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const DAY = 86_400_000;

function when(ms: number | null, now: number): string {
  if (!ms) return '—';
  const d = new Date(ms);
  const days = Math.round((ms - now) / DAY);
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }).replace(':00', '').replace(' AM', 'a').replace(' PM', 'p');
  if (days >= 0 && days < 7) return `${d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/New_York' })} ${time}`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });
}
const monthYear = (ms: number | null) => (ms ? new Date(ms).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : null);

function initials(name: string) {
  const p = name.replace(/[^A-Za-zÀ-ÿ\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() || '•';
}
const e164 = (raw: string | null) => {
  const d = (raw ?? '').replace(/\D/g, '');
  return d.length === 10 ? `+1${d}` : d.length === 11 && d.startsWith('1') ? `+${d}` : null;
};
const homeLine = (h: HomeDetails) =>
  [h.bedrooms ? `${h.bedrooms} bd` : null, h.bathrooms ? `${h.bathrooms} ba` : null, h.sqft ? `${h.sqft.toLocaleString('en-US')} sqft` : null].filter(Boolean).join(' · ');

const quiet = (c: ClientProfile, now: number) => !c.nextVisit && (!c.lastInvoice || now - c.lastInvoice > 60 * DAY);

export default function ClientsTab() {
  const [data, setData] = useState<ClientsPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('value');
  const [city, setCity] = useState<string | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [home, setHome] = useState<HomeDetails | null>(null);
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showAll, setShowAll] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const now = Date.now();

  const load = useCallback(async (refresh = false) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/clients${refresh ? '?refresh=1' : ''}`, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setData(j);
      setErr(null);
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load');
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const clients = data?.clients ?? [];
  const count = (f: Filter) => clients.filter((c) => match(c, f)).length;
  function match(c: ClientProfile, f: Filter) {
    switch (f) {
      case 'weekly': return c.cadence === 'weekly';
      case 'biweekly': return c.cadence === 'biweekly';
      case 'monthly': return c.cadence === 'monthly' || c.cadence === 'every3' || c.cadence === 'other';
      case 'oneoff': return !c.recurring;
      case 'owes': return c.owed > 0;
      case 'quiet': return quiet(c, now);
      case 'companies': return c.isCompany;
      default: return true;
    }
  }

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const dq = needle.replace(/\D/g, '');
    return clients
      .filter((c) => match(c, filter))
      .filter((c) => (city ? c.city === city : true))
      .filter((c) => {
        if (!needle) return true;
        const hay = [c.name, c.company, c.city, c.email, c.address, c.service].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(needle) || (dq.length >= 3 && (c.phone ?? '').replace(/\D/g, '').includes(dq));
      })
      .sort((a, b) =>
        sort === 'name'
          ? a.name.localeCompare(b.name)
          : sort === 'next'
            ? (a.nextVisit ?? Infinity) - (b.nextVisit ?? Infinity)
            : (b.perYear ?? b.paid12m) - (a.perYear ?? a.paid12m) || b.paid12m - a.paid12m,
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, filter, sort, city, q]);

  const sel = list.find((c) => c.id === selId) ?? list[0] ?? null;
  useEffect(() => {
    setHome(sel ? { bedrooms: sel.home.bedrooms, bathrooms: sel.home.bathrooms, sqft: sel.home.sqft, pets: sel.home.pets, notes: sel.home.notes } : null);
    setSaved('idle');
  }, [sel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (id: string) => {
    setSelId(id);
    if (window.matchMedia('(max-width: 1180px)').matches) setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  };

  const saveHome = async () => {
    if (!sel || !home) return;
    setSaved('saving');
    try {
      const r = await fetch('/api/clients', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sel.id, home }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error);
      setData((d) => (d ? { ...d, clients: d.clients.map((c) => (c.id === sel.id ? { ...c, home: { ...j.home, source: 'you' } } : c)) } : d));
      setSaved('saved');
    } catch {
      setSaved('error');
    }
  };

  if (!data) {
    return (
      <div className={s.root}>
        {err ? (
          <div className={s.banner}>
            Couldn&apos;t load clients: {err}. <button onClick={() => load()} style={{ textDecoration: 'underline' }}>Try again</button>
          </div>
        ) : (
          <>
            <div className={s.kp}>{[0, 1, 2, 3].map((i) => <div key={i} className={s.sk} style={{ height: 110 }} />)}</div>
            <div className={s.bento}>
              <div className={`${s.sk} ${s.s7}`} style={{ height: 460 }} />
              <div className={`${s.sk} ${s.s5}`} style={{ height: 460 }} />
            </div>
          </>
        )}
      </div>
    );
  }

  const st = data.stats;
  const cc = st.cadenceCounts;
  const shown = showAll ? list : list.slice(0, 40);
  const maxCity = st.cities[0]?.n || 1;
  const tel = sel ? e164(sel.phone) : null;
  const FILTERS: [Filter, string][] = [
    ['all', 'All'], ['weekly', 'Weekly'], ['biweekly', 'Bi-weekly'], ['monthly', 'Monthly'], ['oneoff', 'One-time'],
    ['owes', 'Owes money'], ['quiet', 'No visit in 60 days'], ['companies', 'Companies'],
  ];

  return (
    <div className={s.root}>
      <div className={s.bar}>
        <span className={s.upd}><span className={s.live} />{busy ? 'Updating…' : 'Live from Jobber'}</span>
        <button className={s.pill} onClick={() => load(true)} disabled={busy}>↻ Refresh</button>
        <a className={s.btnW} href="https://secure.getjobber.com/clients/new" target="_blank" rel="noopener noreferrer">+ New client in Jobber ↗</a>
      </div>
      {data.errors.length > 0 && <div className={s.banner}>Some details may be missing — Jobber said: {data.errors.join(' · ')}</div>}

      {/* ========== FOUR NUMBERS ========== */}
      <div className={s.kp}>
        <section className={s.card}>
          <div className={s.l}><i style={{ background: 'var(--blue)' }} />Active clients</div>
          <div className={s.v}>{st.active}</div>
          <div className={s.d}>{st.homes} homes · {st.companies} {st.companies === 1 ? 'company' : 'companies'}</div>
        </section>
        <section className={s.card}>
          <div className={s.l}><i style={{ background: 'var(--violet)' }} />Recurring</div>
          <div className={s.v}>{st.recurring}</div>
          <div className={s.d}>
            {[cc.weekly && `${cc.weekly} weekly`, cc.biweekly && `${cc.biweekly} bi-weekly`, (cc.every3 || cc.monthly) && `${cc.every3 + cc.monthly} monthly`].filter(Boolean).join(' · ') || 'no recurring jobs found'}
          </div>
        </section>
        <section className={s.card}>
          <div className={s.l}><i style={{ background: 'var(--green)' }} />Recurring revenue</div>
          <div className={s.v}>{st.recurringMonthly ? `${money(st.recurringMonthly)}` : '—'}<small>/mo</small></div>
          <div className={s.d}>price per visit × how often, all recurring clients</div>
        </section>
        <section className={`${s.card} ${st.owingCount ? s.alert : ''}`}>
          <div className={s.l}><i style={{ background: 'var(--red)' }} />Owe you money</div>
          <div className={s.v}>{st.owingCount}</div>
          <div className={s.d}>{st.owingCount ? `${money(st.owingTotal)} total · see Money` : 'everyone is paid up'}</div>
        </section>
      </div>

      <div className={s.bento}>
        {/* ========== LIST ========== */}
        <section className={`${s.card} ${s.s7}`}>
          <input className={s.search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="⌕  Search name, city, phone, email or address" aria-label="Search clients" />
          <div className={s.fl}>
            {FILTERS.map(([k, label]) => {
              const n = count(k);
              if (k !== 'all' && !n) return null;
              return (
                <button key={k} className={filter === k ? s.on : ''} onClick={() => setFilter(k)}>
                  {label} <span>{n}</span>
                </button>
              );
            })}
          </div>
          <div className={s.sortRow}>
            {city && (
              <button className={s.cityChip} onClick={() => setCity(null)}>
                {city} ✕
              </button>
            )}
            <label>
              Sort
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                <option value="value">Most valuable</option>
                <option value="next">Next visit</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>
          {list.length === 0 ? (
            <p className={s.empty}>{clients.length ? 'No clients match.' : 'No clients yet — they come straight from Jobber.'}</p>
          ) : (
            shown.map((c) => (
              <button key={c.id} className={`${s.cr} ${sel?.id === c.id ? s.crSel : ''}`} onClick={() => pick(c.id)}>
                <div className={s.av}>{initials(c.name)}</div>
                <div style={{ minWidth: 0 }}>
                  <b>{c.name}</b>
                  <div className={s.m}>
                    {[c.city, c.nextVisit ? `Next: ${when(c.nextVisit, now)}` : null, homeLine(c.home) || null].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
                <span className={s.tgw}>
                  {c.recurring && <span className={`${s.tg} ${s.tgRec}`}>{c.cadenceLabel}</span>}
                  {c.owed > 0 && <span className={`${s.tg} ${s.tgOwe}`}>Owes</span>}
                  {c.isCompany && <span className={`${s.tg} ${s.tgCo}`}>Company</span>}
                </span>
                <div className={s.val}>
                  {c.pricePerVisit ? `${money(c.pricePerVisit)}` : money(c.paid12m)}
                  <span>{c.pricePerVisit ? (c.recurring ? 'per visit' : 'last job') : `${c.invoices12m} invoices`}</span>
                </div>
              </button>
            ))
          )}
          {list.length > 40 && (
            <button className={s.more} onClick={() => setShowAll((v) => !v)}>{showAll ? 'Show fewer' : `Show all ${list.length}`}</button>
          )}
        </section>

        {/* ========== DETAIL ========== */}
        <div className={`${s.s5} ${s.stack}`} ref={detailRef}>
          <section className={`${s.card} ${s.glow}`}>
            {!sel ? (
              <p className={s.empty}>Pick a client to see everything about them.</p>
            ) : (
              <>
                <div className={s.dh}>
                  <div className={`${s.av} ${s.avBig}`}>{initials(sel.name)}</div>
                  <div style={{ minWidth: 0 }}>
                    <b>{sel.name}</b>
                    <span>{[sel.city, sel.since ? `client since ${monthYear(sel.since)}` : null].filter(Boolean).join(' · ')}</span>
                  </div>
                  {sel.recurring && <span className={`${s.tg} ${s.tgRec}`} style={{ marginLeft: 'auto' }}>{sel.cadenceLabel}</span>}
                </div>
                <div className={s.acts}>
                  {tel ? <a className={s.pri} href={`tel:${tel}`}>✆ Call</a> : <span className={s.off}>✆ Call</span>}
                  {tel ? <a href={`sms:${tel}`}>✉ Text</a> : <span className={s.off}>✉ Text</span>}
                  {sel.email ? <a href={`mailto:${sel.email}`}>@ Email</a> : <span className={s.off}>@ Email</span>}
                  {sel.jobberUrl ? <a href={sel.jobberUrl} target="_blank" rel="noopener noreferrer">Jobber ↗</a> : <span className={s.off}>Jobber</span>}
                </div>
                <div className={s.st4}>
                  <div>
                    <b>{sel.pricePerVisit ? money(sel.pricePerVisit) : '—'}</b>
                    <span>{sel.recurring ? 'per visit' : 'last job'}{sel.service ? ` · ${sel.service}` : ''}</span>
                  </div>
                  <div>
                    <b>{sel.cadenceLabel}</b>
                    <span>{sel.perYear ? `≈ ${money(sel.perYear)} a year` : 'how often'}</span>
                  </div>
                  <div>
                    <b>{money(sel.paid12m)}</b>
                    <span>paid in 12 months · {sel.invoices12m} {sel.invoices12m === 1 ? 'invoice' : 'invoices'}</span>
                  </div>
                  <div className={sel.owed > 0 ? s.red : ''}>
                    <b>{money(sel.owed)}</b>
                    <span>{sel.owed > 0 ? (sel.daysLate ? `owed · ${sel.daysLate} days late` : 'owed · not due yet') : 'owed'}</span>
                  </div>
                  <div>
                    <b>{sel.nextVisit ? when(sel.nextVisit, now) : '—'}</b>
                    <span>next visit</span>
                  </div>
                  <div>
                    <b>{sel.review === 'reviewed' ? '★ Reviewed' : sel.review === 'asked' ? 'Asked' : '—'}</b>
                    <span>{sel.review === 'asked' && sel.reviewAskedAt ? `Google review · asked ${when(sel.reviewAskedAt, now)}` : 'Google review'}</span>
                  </div>
                </div>
                <dl className={s.kv}>
                  {sel.phone && (<><dt>Phone</dt><dd>{sel.phone}</dd></>)}
                  {sel.email && (<><dt>Email</dt><dd style={{ wordBreak: 'break-all' }}>{sel.email}</dd></>)}
                  {(sel.address || sel.city) && (
                    <>
                      <dt>Address</dt>
                      <dd>
                        {[sel.address, sel.city].filter(Boolean).join(', ')} ·{' '}
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([sel.address, sel.city, 'FL'].filter(Boolean).join(', '))}`} target="_blank" rel="noopener noreferrer">Map ↗</a>
                      </dd>
                    </>
                  )}
                </dl>
              </>
            )}
          </section>

          {sel && home && (
            <section className={s.card}>
              <div className={s.ch}>
                <h3>Home details</h3>
                <span className={s.go}>{sel.home.source === 'quote form' ? 'From their website quote' : sel.home.source === 'you' ? 'Saved by you' : 'Only you see these'}</span>
              </div>
              <div className={s.homeGrid}>
                <label>Bedrooms<input inputMode="decimal" value={home.bedrooms ?? ''} onChange={(e) => { setHome({ ...home, bedrooms: e.target.value ? Number(e.target.value) : null }); setSaved('idle'); }} /></label>
                <label>Bathrooms<input inputMode="decimal" value={home.bathrooms ?? ''} onChange={(e) => { setHome({ ...home, bathrooms: e.target.value ? Number(e.target.value) : null }); setSaved('idle'); }} /></label>
                <label>Sq ft<input inputMode="numeric" value={home.sqft ?? ''} onChange={(e) => { setHome({ ...home, sqft: e.target.value ? Number(e.target.value.replace(/\D/g, '')) : null }); setSaved('idle'); }} /></label>
                <label className={s.full}>Pets<input value={home.pets ?? ''} placeholder="e.g. 1 dog, friendly" maxLength={120} onChange={(e) => { setHome({ ...home, pets: e.target.value || null }); setSaved('idle'); }} /></label>
                <label className={s.full}>Notes<textarea value={home.notes ?? ''} placeholder="Gate code, parking, rooms to skip, products they like…" maxLength={1000} onChange={(e) => { setHome({ ...home, notes: e.target.value || null }); setSaved('idle'); }} /></label>
              </div>
              <div className={s.saveRow}>
                <span>{saved === 'saved' ? '✓ Saved' : saved === 'error' ? "Couldn't save — try again" : saved === 'saving' ? 'Saving…' : ''}</span>
                <button onClick={saveHome} disabled={saved === 'saving'}>Save home details</button>
              </div>
            </section>
          )}

          {st.cities.length > 0 && (
            <section className={s.card}>
              <div className={s.ch}><h3>Where your clients are</h3>{city && <button className={s.go} onClick={() => setCity(null)}>Show all</button>}</div>
              <div className={s.cities}>
                {st.cities.slice(0, 6).map((x) => (
                  <button key={x.city} className={`${s.rr} ${city === x.city ? s.rrOn : ''}`} onClick={() => setCity(city === x.city ? null : x.city)}>
                    <span>{x.city}</span>
                    <span className={s.cbar}><i style={{ width: `${(x.n / maxCity) * 100}%` }} /></span>
                    <b>{x.n}</b>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
