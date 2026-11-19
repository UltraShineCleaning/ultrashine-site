'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import s from './PipelineTab.module.css';
import {
  LEAD_SOURCES,
  OPEN_STAGES,
  STAGE_LABEL,
  STAGE_WEIGHT,
  e164,
  homeLine,
  leadValue,
  leadsToCsv,
  mailHref,
  mapHref,
  prettyPhone,
  smsHref,
  sourceCode,
  sourceLabel,
  type LeadRecord,
  type Stage,
} from '../../_lib/leads/types';

/**
 * Pipeline — the leads board (2026-11-18, approved preview 00_STATE/admin-redesign-preview).
 *
 * Every quote request from the website lands in "New lead" by itself (saved the moment the
 * office email goes out — app/api/quote). Older email requests are read back from Resend and
 * Instagram/Facebook DMs tagged as leads come in too (app/_lib/leads/store.ts). Leads typed in
 * by hand use "+ New lead". Drag a card between columns, or open it and use the stage arrows.
 * Nothing is ever deleted: Archive hides a card, Restore brings it back.
 */

const DAY = 86_400_000;
const STAGE_CLASS: Record<Stage, string> = { new: s.stNew, contacted: s.stCon, walkthrough: s.stWalk, quoted: s.stQuote, booked: s.stWon, lost: s.stLost };
const STAGE_DOT: Record<Stage, string> = { new: '#9fbfe8', contacted: '#d8f23f', walkthrough: '#f07a55', quoted: '#ede6d6', booked: '#d8f23f', lost: '#7e7970' };
const SRC_BG: Record<string, string> = { W: '#B9D7F7', '@': '#F2C6A8', IG: '#E7C1F2', FB: '#BFD3F7', G: '#D8F2B8', R: '#F7E2C8', N: '#C9F2DD', Y: '#F7C6C6' };
const SERVICES = ['Regular Cleaning', 'Deep Cleaning', 'Move-In / Move-Out', 'Post-Construction', 'Commercial'];
const LOST_REASONS = ['Price', 'Picked another company', 'No reply', 'Outside our area', 'Not a fit', 'Other'];

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const day = (ms: number) => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });
const dayTime = (ms: number) =>
  new Date(ms).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });
function ago(ms: number, now: number): string {
  const m = Math.max(0, Math.round((now - ms) / 60_000));
  if (m < 60) return `${m || 1} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days`;
}
/** <input type="datetime-local"> wants local "YYYY-MM-DDTHH:mm". */
function toLocalInput(ms?: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function title(l: LeadRecord): string {
  if (l.kind === 'application') return 'Job application';
  if (l.kind === 'social' && !l.service) return `${l.platform === 'facebook' ? 'Facebook' : 'Instagram'} message`;
  const f = l.frequency && !/one/i.test(l.frequency) ? ` · ${l.frequency}` : '';
  return `${l.service || 'Cleaning quote'}${f}`;
}
function cardDate(l: LeadRecord, now: number): string {
  if (l.stage === 'walkthrough' && l.walkthroughAt) return `Walkthrough ${dayTime(l.walkthroughAt)}`;
  if (l.stage === 'quoted') {
    const late = now - l.stageAt > 3 * DAY;
    return `Quote sent ${day(l.stageAt)}${late ? ' · follow up' : ''}`;
  }
  if (l.stage === 'contacted') return `Contacted ${day(l.stageAt)}`;
  return `Requested ${day(l.at)} · ${ago(l.at, now)}`;
}
function valueText(l: LeadRecord): string {
  if (l.quotedPrice) return money(l.quotedPrice);
  if (l.estimate) return l.estimate.replace(/\s*–\s*/, '–');
  return l.stage === 'walkthrough' ? 'walkthrough' : 'price after visit';
}

type View = 'board' | 'list' | 'applicants' | 'closed';

export default function PipelineTab() {
  const [leads, setLeads] = useState<LeadRecord[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [q, setQ] = useState('');
  const [srcs, setSrcs] = useState<string[]>([]);
  const [view, setView] = useState<View>('board');
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [dragOver, setDragOver] = useState<Stage | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/leads${refresh ? '?refresh=1' : ''}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      setLeads(d.leads ?? []);
      setErr(null);
    } catch {
      setErr('Could not load leads. Check your connection and try again.');
    } finally {
      setLoading(false);
      setNow(Date.now());
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => load(), 120_000); // new website requests appear without a reload
    const onSearch = () => {
      setView('board');
      setTimeout(() => searchRef.current?.focus(), 80);
    };
    const onNew = () => setAdding(true);
    window.addEventListener('admin:search', onSearch);
    window.addEventListener('admin:new-lead', onNew);
    return () => {
      clearInterval(t);
      window.removeEventListener('admin:search', onSearch);
      window.removeEventListener('admin:new-lead', onNew);
    };
  }, [load]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };

  /** Save a change; the card moves at once and rolls back if the save fails. */
  const patch = useCallback(async (id: string, body: Partial<LeadRecord> & { stage?: Stage }, msg?: string) => {
    let before: LeadRecord | undefined;
    setLeads((cur) =>
      cur?.map((l) => {
        if (l.id !== id) return l;
        before = l;
        const next = { ...l, ...body } as LeadRecord;
        if (body.stage && body.stage !== l.stage) {
          next.stageAt = Date.now();
          next.history = [...(l.history ?? []), { at: Date.now(), text: `Moved to ${STAGE_LABEL[body.stage]}` }];
        }
        return next;
      }) ?? cur,
    );
    try {
      const r = await fetch('/api/leads', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, ...body }) });
      if (!r.ok) throw new Error();
      const d = await r.json();
      if (d.lead?.id) setLeads((cur) => cur?.map((l) => (l.id === id ? { ...l, ...d.lead } : l)) ?? cur);
      if (msg) flash(msg);
    } catch {
      if (before) setLeads((cur) => cur?.map((l) => (l.id === id ? before! : l)) ?? cur);
      flash('Could not save — try again');
    }
  }, []);

  /* ---------- filtering ---------- */
  const visible = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (leads ?? []).filter((l) => {
      if (t) {
        const hay = [l.name, l.phone, l.email, l.city, l.service, l.street, l.zip].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(t) && !(l.phone && l.phone.replace(/\D/g, '').includes(t.replace(/\D/g, '') || '§'))) return false;
      }
      if (srcs.length && !srcs.includes(sourceCode(l).label.replace(/^Google.*/, 'Google'))) return false;
      return true;
    });
  }, [leads, q, srcs]);

  const prospects = visible.filter((l) => l.kind !== 'application');
  const live = prospects.filter((l) => !l.archived);
  const byStage = (st: Stage) =>
    live
      .filter((l) => l.stage === st)
      .sort((a, b) => (st === 'walkthrough' ? (a.walkthroughAt ?? 9e15) - (b.walkthroughAt ?? 9e15) : b.at - a.at));

  const monthStart = useMemo(() => {
    const d = new Date(now);
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  }, [now]);
  const open = live.filter((l) => OPEN_STAGES.includes(l.stage) && now - l.stageAt < 60 * DAY);
  const openValue = open.reduce((a, l) => a + leadValue(l), 0);
  const weighted = open.reduce((a, l) => a + leadValue(l) * STAGE_WEIGHT[l.stage], 0);
  const bookedMonth = live.filter((l) => l.stage === 'booked' && l.stageAt >= monthStart);
  const lostMonth = live.filter((l) => l.stage === 'lost' && l.stageAt >= monthStart);
  const applicants = visible.filter((l) => l.kind === 'application' && !l.archived);
  const waiting = live.filter((l) => l.stage === 'new' && now - l.at > 3600_000).length;
  const usedSources = useMemo(() => {
    const set = new Set<string>();
    (leads ?? []).forEach((l) => set.add(sourceCode(l).label.replace(/^Google.*/, 'Google')));
    const known: string[] = LEAD_SOURCES.filter((x) => set.has(x));
    return known.concat(Array.from(set).filter((x) => !(LEAD_SOURCES as readonly string[]).includes(x)));
  }, [leads]);

  const sel = leads?.find((l) => l.id === openId) ?? null;

  /* ---------- drag + drop ---------- */
  const onDragStart = (e: DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const dropTo = (st: Stage) => (e: DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData('text/plain');
    const l = leads?.find((x) => x.id === id);
    if (l && l.stage !== st) patch(id, { stage: st }, `${l.name.split(' ')[0] || 'Lead'} → ${STAGE_LABEL[st]}`);
  };
  const over = (st: Stage) => (e: DragEvent) => {
    e.preventDefault();
    if (dragOver !== st) setDragOver(st);
  };

  const exportCsv = () => {
    const blob = new Blob([leadsToCsv(view === 'applicants' ? applicants : prospects)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ultra-shine-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  /* ---------- render ---------- */
  const Card = ({ l }: { l: LeadRecord }) => {
    const src = sourceCode(l);
    const hot = l.stage === 'new' && now - l.at > 3600_000;
    return (
      <div
        className={`${s.deal} ${STAGE_CLASS[l.stage]}`}
        draggable
        onDragStart={(e) => onDragStart(e, l.id)}
        onClick={() => setOpenId(l.id)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpenId(l.id))}
        role="button"
        tabIndex={0}
        aria-label={`${l.name}, ${title(l)}, ${STAGE_LABEL[l.stage]}`}
      >
        <span className={s.more} aria-hidden="true">⋯</span>
        <div className={s.d}>{cardDate(l, now)}</div>
        <h4>{title(l)}</h4>
        <div className={s.c}>
          {l.name}
          {l.city ? ` · ${l.city}` : ''}
        </div>
        <div className={s.v}>
          <b>{valueText(l)}</b>
          <span className={s.srcRow}>
            {hot && <span className={s.hot}>reply now</span>}
            <span className={s.src} style={{ background: SRC_BG[src.code] ?? '#EDE6D6' }} title={src.label}>{src.code}</span>
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className={s.wrap}>
      <div className={s.head}>
        <h1 className={s.h1}>
          Leads
          <br />
          pipeline
        </h1>
        <div className={s.kpi}>
          <span className={s.ic}>$</span>
          <div>
            <b>{money(openValue)}</b>
            <small>Open pipeline · {open.length} leads</small>
          </div>
        </div>
        <div className={s.kpi}>
          <span className={s.ic}>↗</span>
          <div>
            <b>{money(weighted)}</b>
            <small>Likely to book</small>
          </div>
        </div>
        <div className={s.kpi}>
          <span className={s.ic}>✓</span>
          <div>
            <b>
              {bookedMonth.length} <span className={s.pill}>this month</span>
            </b>
            <small>Booked{bookedMonth.length ? ` · ${money(bookedMonth.reduce((a, l) => a + leadValue(l), 0))}` : ''}</small>
          </div>
        </div>
        <div className={s.grow} />
        <div className={s.actions}>
        <div className={s.seg} role="tablist" aria-label="View">
          <button className={view === 'board' ? s.on : ''} onClick={() => setView('board')}>Board</button>
          <button className={view === 'list' ? s.on : ''} onClick={() => setView('list')}>List</button>
          <button className={view === 'applicants' ? s.on : ''} onClick={() => setView('applicants')}>Applicants{applicants.length ? ` · ${applicants.length}` : ''}</button>
        </div>
        <button className={s.btn} onClick={() => load(true)} disabled={loading} title="Check for new requests now">{loading ? 'Checking…' : '↻ Refresh'}</button>
        <button className={s.btn} onClick={exportCsv}>⤓ Export</button>
        <button className={`${s.btn} ${s.lime}`} onClick={() => setAdding(true)}>+ New lead</button>
        </div>
      </div>

      <div className={s.toolbar}>
        <label className={s.search}>
          <span aria-hidden="true">⌕</span>
          <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, city…" aria-label="Search leads" />
          {q && <button onClick={() => setQ('')} aria-label="Clear search">✕</button>}
        </label>
        {usedSources.map((x) => {
          const on = srcs.includes(x);
          const code = sourceCode({ source: x } as LeadRecord).code;
          return (
            <button key={x} className={`${s.fchip} ${on ? s.fchipOn : ''}`} onClick={() => setSrcs((cur) => (on ? cur.filter((y) => y !== x) : [...cur, x]))} aria-pressed={on}>
              <i style={{ background: SRC_BG[code] ?? '#EDE6D6' }}>{code}</i>
              {x}
            </button>
          );
        })}
        {waiting > 0 && <span className={s.alert}>{waiting} waiting over an hour for a reply</span>}
      </div>

      {err && <div className={s.error}>{err} <button onClick={() => load(true)}>Try again</button></div>}

      {!leads && !err && (
        <div className={s.board}>
          {[0, 1, 2, 3].map((i) => <div key={i} className={`${s.col} ${s.sk}`} />)}
        </div>
      )}

      {leads && view === 'board' && (
        <div className={s.board}>
          {OPEN_STAGES.map((st) => {
            const items = byStage(st);
            const val = items.reduce((a, l) => a + leadValue(l), 0);
            return (
              <section key={st} className={`${s.col} ${dragOver === st ? s.colOver : ''}`} onDragOver={over(st)} onDragLeave={() => setDragOver(null)} onDrop={dropTo(st)} aria-label={STAGE_LABEL[st]}>
                <div className={s.colh}>
                  <div>
                    <b>
                      <i style={{ background: STAGE_DOT[st] }} />
                      {STAGE_LABEL[st]} <span className={s.n}>{items.length}</span>
                    </b>
                    <small>{val ? money(val) : '—'}</small>
                  </div>
                  {st === 'new' && <button className={s.add} onClick={() => setAdding(true)} aria-label="Add a lead">+</button>}
                </div>
                {items.length === 0 && <p className={s.empty}>{st === 'new' ? 'New website requests land here.' : 'Drag a card here.'}</p>}
                {items.map((l) => <Card key={l.id} l={l} />)}
              </section>
            );
          })}
          <div className={s.side}>
            <div className={`${s.drop} ${s.won} ${dragOver === 'booked' ? s.dropOver : ''}`} onDragOver={over('booked')} onDragLeave={() => setDragOver(null)} onDrop={dropTo('booked')} onClick={() => setView('closed')} role="button" tabIndex={0}>
              <span className={s.o}>✓</span>
              <b>Booked</b>
              <span>{bookedMonth.length} this month</span>
              {bookedMonth.length > 0 && <span>{money(bookedMonth.reduce((a, l) => a + leadValue(l), 0))}</span>}
            </div>
            <div className={`${s.drop} ${s.lost} ${dragOver === 'lost' ? s.dropOver : ''}`} onDragOver={over('lost')} onDragLeave={() => setDragOver(null)} onDrop={dropTo('lost')} onClick={() => setView('closed')} role="button" tabIndex={0}>
              <span className={s.o}>✕</span>
              <b>Lost</b>
              <span>{lostMonth.length} this month</span>
            </div>
          </div>
        </div>
      )}

      {leads && view !== 'board' && (
        <LeadList
          rows={
            view === 'applicants'
              ? applicants
              : view === 'closed'
                ? live.filter((l) => l.stage === 'booked' || l.stage === 'lost').sort((a, b) => b.stageAt - a.stageAt)
                : [...prospects].sort((a, b) => b.at - a.at)
          }
          now={now}
          onOpen={setOpenId}
          title={view === 'applicants' ? 'Job applicants' : view === 'closed' ? 'Booked + lost' : 'All leads'}
          back={view === 'closed' ? () => setView('board') : undefined}
        />
      )}

      <p className={s.hint}>
        Drag a card to move it, or open it. Website quote requests land in “New lead” on their own; older email requests and Instagram/Facebook DMs tagged as leads appear too. Archive hides a card — nothing is ever deleted.
      </p>

      {sel && <Drawer l={sel} now={now} onClose={() => setOpenId(null)} patch={patch} />}
      {adding && (
        <NewLead
          onClose={() => setAdding(false)}
          onSaved={(l) => {
            setLeads((cur) => [l, ...(cur ?? [])]);
            setAdding(false);
            setOpenId(l.id);
            flash('Lead added');
          }}
        />
      )}
      {toast && <div className={s.toast} role="status">{toast}</div>}
    </div>
  );
}

/* ================================================================ list */
function LeadList({ rows, now, onOpen, title, back }: { rows: LeadRecord[]; now: number; onOpen: (id: string) => void; title: string; back?: () => void }) {
  return (
    <div className={s.listCard}>
      <div className={s.listHead}>
        <b>{title}</b>
        <span>{rows.length}</span>
        {back && <button className={s.btn} onClick={back}>← Board</button>}
      </div>
      {rows.length === 0 ? (
        <p className={s.empty}>Nothing here yet.</p>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>What</th>
                <th>City</th>
                <th>Value</th>
                <th>Stage</th>
                <th>Source</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} onClick={() => onOpen(l.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen(l.id)}>
                  <td>
                    <b>{l.name}</b>
                    <small>{prettyPhone(l.phone) ?? l.email ?? ''}</small>
                  </td>
                  <td>{title === 'Job applicants' ? [l.language, l.experience].filter(Boolean).join(' · ') || 'Application' : l.service || '—'}</td>
                  <td>{l.city || '—'}</td>
                  <td>{l.quotedPrice ? money(l.quotedPrice) : l.estimate || '—'}</td>
                  <td>
                    <span className={s.stagePill} style={{ color: STAGE_DOT[l.stage] }}>● {STAGE_LABEL[l.stage]}</span>
                    {l.archived && <small>archived</small>}
                  </td>
                  <td>{sourceLabel(l) ?? '—'}</td>
                  <td>
                    {day(l.at)}
                    <small>{ago(l.at, now)}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ================================================================ drawer */
function Drawer({ l, now, onClose, patch }: { l: LeadRecord; now: number; onClose: () => void; patch: (id: string, b: Partial<LeadRecord> & { stage?: Stage }, m?: string) => Promise<void> }) {
  const [notes, setNotes] = useState(l.ownerNotes ?? '');
  const [price, setPrice] = useState(l.quotedPrice ? String(l.quotedPrice) : '');
  const [walk, setWalk] = useState(toLocalInput(l.walkthroughAt));
  const [losing, setLosing] = useState(false);

  useEffect(() => {
    setNotes(l.ownerNotes ?? '');
    setPrice(l.quotedPrice ? String(l.quotedPrice) : '');
    setWalk(toLocalInput(l.walkthroughAt));
    setLosing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [l.id]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  const tel = e164(l.phone);
  const sms = smsHref(l);
  const mail = mailHref(l);
  const map = mapHref(l);
  const home = homeLine(l);
  const chev: Stage[] = ['new', 'contacted', 'walkthrough', 'quoted', 'booked'];
  const src = sourceLabel(l);

  const savePrice = () => {
    const n = Math.round(Number(price.replace(/[^\d.]/g, '')));
    if (!price.trim() && l.quotedPrice) patch(l.id, { quotedPrice: null as unknown as number }, 'Price cleared');
    else if (n > 0 && n !== l.quotedPrice) patch(l.id, { quotedPrice: n }, 'Price saved');
  };
  const saveWalk = (v: string) => {
    setWalk(v);
    if (!v) {
      if (l.walkthroughAt) patch(l.id, { walkthroughAt: null as unknown as number }, 'Walkthrough cleared');
      return;
    }
    const t = new Date(v).getTime();
    if (Number.isFinite(t) && t !== l.walkthroughAt) patch(l.id, { walkthroughAt: t, ...(l.stage === 'new' || l.stage === 'contacted' ? { stage: 'walkthrough' as Stage } : {}) }, 'Walkthrough saved');
  };

  return (
    <div className={s.drawerWrap} role="dialog" aria-modal="true" aria-label={`Lead ${l.name}`}>
      <button className={s.scrim} onClick={onClose} aria-label="Close" />
      <aside className={s.drawer}>
        <div className={s.dh}>
          <span>{l.kind === 'application' ? 'Applicant' : 'Lead'} · {l.name}</span>
          <button className={s.x} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className={`${s.hero} ${STAGE_CLASS[l.stage]}`}>
          <div className={s.heroTop}>
            <span>Received {day(l.at)} · {ago(l.at, now)} ago</span>
            <span>● {STAGE_LABEL[l.stage]}</span>
          </div>
          <h2>{title(l)}</h2>
          <div className={s.heroSub}>{[l.city, src ? `from ${src}` : null].filter(Boolean).join(' · ')}</div>
          <div className={s.heroV}>{valueText(l)}</div>
        </div>

        {l.kind !== 'application' && (
          <div className={s.chev} role="group" aria-label="Stage">
            {chev.map((st) => (
              <button key={st} className={l.stage === st ? s.chevOn : ''} onClick={() => l.stage !== st && patch(l.id, { stage: st }, `Moved to ${STAGE_LABEL[st]}`)} aria-pressed={l.stage === st}>
                {STAGE_LABEL[st].replace('New lead', 'New')}
              </button>
            ))}
          </div>
        )}

        <div className={s.acts}>
          {tel ? <a href={`tel:${tel}`}>☎<span>Call</span></a> : <span className={s.actOff}>☎<span>No phone</span></span>}
          {sms ? <a href={sms}>✎<span>Text</span></a> : <span className={s.actOff}>✎<span>Text</span></span>}
          {mail ? <a href={mail}>✉<span>Email</span></a> : <span className={s.actOff}>✉<span>No email</span></span>}
          {map ? <a href={map} target="_blank" rel="noreferrer">⌖<span>Map</span></a> : <span className={s.actOff}>⌖<span>Map</span></span>}
        </div>

        <div className={s.fl}>Contact</div>
        <div className={s.facts}>
          <div><small>Phone</small>{prettyPhone(l.phone) ?? '—'}</div>
          <div><small>Email</small>{l.email ?? '—'}</div>
          {l.kind === 'application' ? (
            <>
              <div><small>Language</small>{l.language ?? '—'}</div>
              <div><small>Experience</small>{l.experience ?? '—'}</div>
              <div><small>Own car</small>{l.ownTransport == null ? '—' : l.ownTransport ? 'Yes' : 'No'}</div>
              <div><small>Days</small>{l.availableDays?.join(', ') || '—'}</div>
            </>
          ) : (
            <>
              <div><small>Home</small>{home ?? '—'}</div>
              <div><small>How often</small>{l.frequency ?? '—'}</div>
              <div className={s.span2}><small>Extras</small>{l.addOns?.length ? l.addOns.join(', ') : 'None'}</div>
              <div className={s.span2}><small>Address</small>{[l.street, l.city, l.zip].filter(Boolean).join(', ') || '—'}</div>
              {l.estimate && <div className={s.span2}><small>Website estimate</small>{l.estimate}</div>}
            </>
          )}
        </div>

        {l.kind !== 'application' && (
          <div className={s.two}>
            <label>
              <span className={s.fl}>Quoted price ($)</span>
              <input className={s.inp} inputMode="numeric" value={price} placeholder="after the walkthrough" onChange={(e) => setPrice(e.target.value)} onBlur={savePrice} onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()} />
            </label>
            <label>
              <span className={s.fl}>Walkthrough</span>
              <input className={s.inp} type="datetime-local" value={walk} onChange={(e) => saveWalk(e.target.value)} />
            </label>
          </div>
        )}

        {(l.notes || l.lastMessage) && (
          <>
            <div className={s.fl}>{l.kind === 'social' ? 'Their message' : 'Their note'}</div>
            <div className={`${s.inp} ${s.quote}`}>“{l.notes || l.lastMessage}”</div>
          </>
        )}

        <label>
          <span className={s.fl}>Private notes</span>
          <textarea className={s.inp} rows={3} value={notes} placeholder="What they asked, objections, next step…" onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (l.ownerNotes ?? '') && patch(l.id, { ownerNotes: notes }, 'Notes saved')} />
        </label>

        <div className={s.fl}>History</div>
        <div className={s.tl}>
          {[...(l.history ?? [])].reverse().slice(0, 12).map((h, i) => (
            <div key={i}>
              {h.text} <small>· {dayTime(h.at)}</small>
            </div>
          ))}
          {l.heardFrom && <div>Heard about us: {l.heardFrom}</div>}
          {l.lostReason && <div>Lost because: {l.lostReason}</div>}
        </div>

        {losing ? (
          <div className={s.lostBox}>
            <b>Why was it lost?</b>
            <div className={s.reasons}>
              {LOST_REASONS.map((r) => (
                <button key={r} onClick={() => { patch(l.id, { stage: 'lost', lostReason: r }, 'Marked lost'); setLosing(false); }}>{r}</button>
              ))}
            </div>
            <button className={s.btn} onClick={() => setLosing(false)}>Cancel</button>
          </div>
        ) : (
          <div className={s.foot}>
            {l.kind !== 'application' && l.stage !== 'booked' && <button className={`${s.btn} ${s.lime}`} onClick={() => patch(l.id, { stage: 'booked' }, 'Booked! 🎉')}>✓ Mark booked</button>}
            {l.kind !== 'application' && l.stage !== 'lost' && <button className={s.btn} onClick={() => setLosing(true)}>✕ Mark lost</button>}
            {l.kind === 'social' && <button className={s.btn} onClick={() => window.dispatchEvent(new CustomEvent('admin:go', { detail: 'social' }))}>Open conversation</button>}
            <button className={s.btn} onClick={() => patch(l.id, { archived: !l.archived }, l.archived ? 'Restored' : 'Archived')}>{l.archived ? '↺ Restore' : '⇩ Archive'}</button>
          </div>
        )}
      </aside>
    </div>
  );
}

/* ================================================================ new lead */
function NewLead({ onClose, onSaved }: { onClose: () => void; onSaved: (l: LeadRecord) => void }) {
  const [f, setF] = useState({ name: '', phone: '', email: '', service: 'Regular Cleaning', city: '', source: 'Phone call', notes: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((c) => ({ ...c, [k]: e.target.value }));

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  const save = async () => {
    if (!f.name.trim()) return setErr('Add a name');
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch('/api/leads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f) });
      const d = await r.json();
      if (!r.ok || !d.lead) throw new Error(d.error);
      onSaved(d.lead);
    } catch (e) {
      setErr((e as Error).message || 'Could not save — try again');
      setBusy(false);
    }
  };

  return (
    <div className={s.drawerWrap} role="dialog" aria-modal="true" aria-label="New lead">
      <button className={s.scrim} onClick={onClose} aria-label="Close" />
      <aside className={s.drawer}>
        <div className={s.dh}>
          <span>New lead</span>
          <button className={s.x} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className={s.sub}>For calls, referrals and anyone who didn&apos;t use the website form. It lands in “New lead”. Nobody gets an email.</p>
        <label><span className={s.fl}>Name *</span><input className={s.inp} value={f.name} onChange={set('name')} autoFocus /></label>
        <div className={s.two}>
          <label><span className={s.fl}>Phone</span><input className={s.inp} value={f.phone} onChange={set('phone')} inputMode="tel" /></label>
          <label><span className={s.fl}>Email</span><input className={s.inp} value={f.email} onChange={set('email')} inputMode="email" /></label>
        </div>
        <div className={s.two}>
          <label><span className={s.fl}>Service</span>
            <select className={s.inp} value={f.service} onChange={set('service')}>{SERVICES.map((x) => <option key={x}>{x}</option>)}</select>
          </label>
          <label><span className={s.fl}>City</span><input className={s.inp} value={f.city} onChange={set('city')} /></label>
        </div>
        <label><span className={s.fl}>Where they came from</span>
          <select className={s.inp} value={f.source} onChange={set('source')}>{LEAD_SOURCES.map((x) => <option key={x}>{x}</option>)}</select>
        </label>
        <label><span className={s.fl}>Notes</span><textarea className={s.inp} rows={3} value={f.notes} onChange={set('notes')} /></label>
        {err && <p className={s.errText}>{err}</p>}
        <div className={s.foot}>
          <button className={`${s.btn} ${s.lime}`} onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Add lead'}</button>
          <button className={s.btn} onClick={onClose}>Cancel</button>
        </div>
      </aside>
    </div>
  );
}
