'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import s from './LeadsTab.module.css';
import {
  STAGES,
  STAGE_LABEL,
  e164,
  homeLine,
  leadStats,
  mailHref,
  mapHref,
  prettyPhone,
  smsHref,
  type LeadRecord,
  type LeadStats,
  type Stage,
} from '../../_lib/leads/types';

/**
 * Admin → Leads. Design locked 2026-09-28 (00_STATE/design-leads-dark.html).
 *
 * A simple pipeline — New → Contacted → Quoted → Booked / Lost — so no quote
 * request slips. Call / Text / Email open the owner's own phone or email app;
 * the dashboard never contacts anyone. Stages and notes are private.
 */

type Src = 'all' | 'web' | 'instagram' | 'facebook';

const STAGE_DOT: Record<Stage, string> = { new: 'var(--blue)', contacted: 'var(--amber)', quoted: 'var(--violet)', booked: 'var(--green)', lost: 'var(--soft)' };

function ago(ms: number, now: number) {
  const d = Math.max(0, now - ms);
  if (d < 60_000) return 'just now';
  if (d < 3600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3600_000)}h ago`;
  const dt = new Date(ms);
  if (d < 7 * 86_400_000) return dt.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/New_York' });
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });
}
const stamp = (ms: number) =>
  new Date(ms).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });

function initials(name: string) {
  const p = name.replace(/[^A-Za-zÀ-ÿ\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() || '•';
}

function Avatar({ l, big }: { l: LeadRecord; big?: boolean }) {
  const cls = `${s.av} ${big ? s.avBig : ''}`;
  if (l.kind === 'social' && l.platform === 'instagram') return <div className={cls} style={{ background: 'var(--ig)', color: '#fff' }}>@</div>;
  if (l.kind === 'social') return <div className={cls} style={{ background: 'var(--fb)', color: '#fff' }}>f</div>;
  return <div className={cls}>{initials(l.name)}</div>;
}

function srcOf(l: LeadRecord): { label: string; cls: string } {
  if (l.kind === 'social') return l.platform === 'facebook' ? { label: 'Facebook', cls: s.src_fb } : { label: 'Instagram', cls: s.src_ig };
  return { label: 'Website', cls: s.src_web };
}

function summary(l: LeadRecord): string {
  if (l.kind === 'social') return [l.lastMessage ? `“${l.lastMessage}”` : 'Asked about a quote', l.city].filter(Boolean).join(' · ');
  const home = [l.bedrooms ? `${l.bedrooms} bd` : null, l.bathrooms ? `${l.bathrooms} ba` : null, !l.bedrooms && l.sqft ? `${l.sqft.toLocaleString('en-US')} sqft` : null]
    .filter(Boolean)
    .join(' / ');
  return [l.service, l.frequency && !/one/i.test(l.frequency) ? l.frequency.toLowerCase() : null, home || null, l.city].filter(Boolean).join(' · ') || 'Quote request';
}

export default function LeadsTab() {
  const [leads, setLeads] = useState<LeadRecord[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<Stage | null>(null);
  const [src, setSrc] = useState<Src>('all');
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved'>('idle');
  const detailRef = useRef<HTMLElement>(null);
  const now = Date.now();

  const load = useCallback(async (refresh = false) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/leads${refresh ? '?refresh=1' : ''}`, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setLeads(j.leads);
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

  const prospects = useMemo(() => (leads ?? []).filter((l) => l.kind !== 'application'), [leads]);
  const applicants = useMemo(() => (leads ?? []).filter((l) => l.kind === 'application').sort((a, b) => b.at - a.at), [leads]);
  const stats: LeadStats | null = useMemo(() => (leads ? leadStats(leads) : null), [leads]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const digitsQ = needle.replace(/\D/g, '');
    return prospects
      .filter((l) => (stage ? l.stage === stage : true))
      .filter((l) =>
        src === 'all' ? true : src === 'web' ? l.kind === 'quote' : l.kind === 'social' && l.platform === src,
      )
      .filter((l) => {
        if (!needle) return true;
        const hay = [l.name, l.city, l.service, l.email, l.lastMessage].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(needle) || (!!digitsQ && digitsQ.length >= 3 && (l.phone ?? '').replace(/\D/g, '').includes(digitsQ));
      })
      .sort((a, b) => (a.stage === 'new' ? 0 : 1) - (b.stage === 'new' ? 0 : 1) || b.at - a.at);
  }, [prospects, stage, src, q]);

  const sel = list.find((l) => l.id === selId) ?? list[0] ?? null;

  useEffect(() => {
    setNotes(sel?.ownerNotes ?? '');
    setSaved('idle');
  }, [sel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = async (id: string, body: { stage?: Stage; ownerNotes?: string }) => {
    // Optimistic: move it now, put it back if the save fails.
    const before = leads;
    setLeads((ls) =>
      (ls ?? []).map((l) =>
        l.id !== id
          ? l
          : {
              ...l,
              ...(body.stage && body.stage !== l.stage
                ? {
                    stage: body.stage,
                    stageAt: Date.now(),
                    contactedAt: l.contactedAt ?? (body.stage !== 'new' ? Date.now() : undefined),
                    history: [...(l.history ?? []), { at: Date.now(), text: `Moved to ${STAGE_LABEL[body.stage]}` }],
                  }
                : {}),
              ...(body.ownerNotes != null ? { ownerNotes: body.ownerNotes } : {}),
            },
      ),
    );
    try {
      const r = await fetch('/api/leads', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...body }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || `HTTP ${r.status}`);
      return true;
    } catch (e: any) {
      setLeads(before);
      setErr(`Couldn't save: ${e?.message ?? 'error'}`);
      return false;
    }
  };

  const saveNotes = async () => {
    if (!sel || notes === (sel.ownerNotes ?? '')) return;
    setSaved('saving');
    const ok = await patch(sel.id, { ownerNotes: notes });
    setSaved(ok ? 'saved' : 'idle');
  };

  const pick = (id: string) => {
    setSelId(id);
    if (window.matchMedia('(max-width: 1180px)').matches) {
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
    }
  };

  if (!leads) {
    return (
      <div className={s.root}>
        {err ? (
          <div className={s.banner}>
            Couldn&apos;t load leads: {err}.{' '}
            <button onClick={() => load()} style={{ textDecoration: 'underline' }}>Try again</button>
          </div>
        ) : (
          <>
            <div className={s.stages}>{STAGES.map((k) => <div key={k} className={s.sk} style={{ height: 96 }} />)}</div>
            <div className={s.bento}>
              <div className={`${s.sk} ${s.s7}`} style={{ height: 420 }} />
              <div className={`${s.sk} ${s.s5}`} style={{ height: 420 }} />
            </div>
          </>
        )}
      </div>
    );
  }

  const hint: Record<Stage, string> = {
    new: stats!.newWaiting ? `${stats!.newWaiting} waiting over an hour` : stats!.counts.new ? 'all answered quickly' : 'nothing new',
    contacted: 'reached, no price yet',
    quoted: stats!.quotedValue ? `price sent · ${stats!.quotedValue}` : 'price sent',
    booked: stats!.bookedValue ? `≈ $${stats!.bookedValue.toLocaleString('en-US')} in first cleans` : 'last 30 days',
    lost: 'last 30 days',
  };

  const tel = sel ? e164(sel.phone) : null;
  const sms = sel ? smsHref(sel) : null;
  const mail = sel ? mailHref(sel) : null;
  const map = sel ? mapHref(sel) : null;

  return (
    <div className={s.root}>
      <div className={s.bar}>
        <span className={s.upd}>
          <span className={s.live} />
          {busy ? 'Updating…' : 'Live'}
        </span>
        <button className={s.pill} onClick={() => load(true)} disabled={busy}>
          ↻ Refresh
        </button>
      </div>
      {err && <div className={s.banner}>{err}</div>}

      {/* ========== STAGES ========== */}
      <div className={s.stages}>
        {STAGES.map((k) => (
          <button key={k} className={`${s.stg} ${stage === k ? s.stgOn : ''}`} onClick={() => setStage((cur) => (cur === k ? null : k))} aria-pressed={stage === k}>
            <div className={s.l}>
              <i style={{ background: STAGE_DOT[k] }} />
              {STAGE_LABEL[k]}
              {(k === 'booked' || k === 'lost') && ' · 30 days'}
            </div>
            <div className={s.v}>{stats!.counts[k]}</div>
            <div className={s.h}>{hint[k]}</div>
          </button>
        ))}
      </div>
      <div className={s.stats}>
        {stats!.bookedRate != null && (
          <span>
            Booked <b>{stats!.bookedRate}%</b> of leads this month
          </span>
        )}
        {stats!.medianReplyMin != null && (
          <span>
            Typical first reply{' '}
            <b>{stats!.medianReplyMin < 60 ? `${stats!.medianReplyMin} min` : `${Math.round(stats!.medianReplyMin / 60)} h`}</b>
          </span>
        )}
        {stats!.bestSource && (
          <span>
            Best source <b>{stats!.bestSource}</b>
          </span>
        )}
        {stats!.bookedRate == null && stats!.medianReplyMin == null && (
          <span>Move leads through the stages and your booking rate + reply time show up here.</span>
        )}
      </div>

      {/* ========== LIST + DETAIL ========== */}
      <div className={s.bento}>
        <section className={`${s.card} ${s.s7}`}>
          <div className={s.ch}>
            <h3>{stage ? `${STAGE_LABEL[stage]} leads` : 'All leads'}</h3>
            <span className={s.cnt}>{list.length}</span>
            <div className={s.srcs}>
              {(['all', 'web', 'instagram', 'facebook'] as Src[]).map((k) => (
                <button key={k} className={src === k ? s.srcOn : ''} onClick={() => setSrc(k)}>
                  {k === 'all' ? 'All' : k === 'web' ? 'Website' : k === 'instagram' ? 'Instagram' : 'Facebook'}
                </button>
              ))}
            </div>
          </div>
          <input className={s.search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="⌕  Search name, city or phone" aria-label="Search leads" />
          {list.length === 0 ? (
            <p className={s.empty}>
              {prospects.length === 0
                ? 'No leads yet. Quote requests from the website and Instagram / Facebook leads land here the moment they arrive.'
                : 'No leads match.'}
            </p>
          ) : (
            list.map((l) => {
              const sc = srcOf(l);
              const waiting = l.stage === 'new' && now - l.at > 3600_000;
              return (
                <button key={l.id} className={`${s.lr} ${sel?.id === l.id ? s.lrSel : ''}`} onClick={() => pick(l.id)}>
                  <Avatar l={l} />
                  <div style={{ minWidth: 0 }}>
                    <b>{l.name}</b>
                    <div className={s.m}>{summary(l)}</div>
                  </div>
                  <span className={`${s.src} ${sc.cls}`}>{sc.label}</span>
                  <div className={s.rt}>
                    <span className={`${s.st} ${s[`st_${l.stage}`]}`}>{STAGE_LABEL[l.stage]}</span>
                    <span className={s.ago}>
                      {ago(l.at, now)}
                      {waiting && <span className={s.late}> · not contacted</span>}
                    </span>
                  </div>
                </button>
              );
            })
          )}
          {list.length > 0 && <div className={s.foot}>New first, then newest · tap a lead to open it</div>}
        </section>

        <section className={`${s.card} ${s.s5} ${s.glow}`} ref={detailRef}>
          {!sel ? (
            <p className={s.empty}>Pick a lead to see everything they sent.</p>
          ) : (
            <>
              <div className={s.dh}>
                <Avatar l={sel} big />
                <div style={{ minWidth: 0 }}>
                  <b>{sel.name}</b>
                  <span>
                    {srcOf(sel).label}
                    {sel.kind === 'quote' ? ' quote' : ' message'} · {ago(sel.at, now)}
                    {sel.stage === 'new' && now - sel.at > 3600_000 && <span className={s.late}> · not contacted yet</span>}
                  </span>
                </div>
                <span className={`${s.st} ${s[`st_${sel.stage}`]}`} style={{ marginLeft: 'auto' }}>
                  {STAGE_LABEL[sel.stage]}
                </span>
              </div>

              {sel.kind === 'social' ? (
                <div className={s.acts} style={{ gridTemplateColumns: '1fr' }}>
                  <a className={s.pri} href="#social" onClick={() => window.scrollTo({ top: 0 })}>
                    ◈ Open the conversation in Social → Inbox
                  </a>
                </div>
              ) : (
                <div className={s.acts}>
                  {tel ? <a className={s.pri} href={`tel:${tel}`}>✆ Call</a> : <span className={s.off}>✆ No phone</span>}
                  {sms ? <a href={sms}>✉ Text</a> : <span className={s.off}>✉ Text</span>}
                  {mail ? <a href={mail}>@ Email</a> : <span className={s.off}>@ No email</span>}
                </div>
              )}

              {sel.estimate && (
                <div className={s.estbox}>
                  <div>
                    <span>Estimate shown on the site</span>
                    <br />
                    <b>{sel.estimate}</b>
                  </div>
                  <span>{[sel.service, sel.frequency].filter(Boolean).join(' · ')}</span>
                </div>
              )}

              <dl className={s.kv}>
                {sel.kind === 'quote' && !sel.estimate && sel.service && (
                  <>
                    <dt>Service</dt>
                    <dd>{[sel.service, sel.frequency].filter(Boolean).join(' · ')}</dd>
                  </>
                )}
                {homeLine(sel) && (
                  <>
                    <dt>Home</dt>
                    <dd>{homeLine(sel)}</dd>
                  </>
                )}
                {(sel.street || sel.city) && (
                  <>
                    <dt>Address</dt>
                    <dd>
                      {[sel.street, sel.city, sel.zip].filter(Boolean).join(', ')}
                      {map && (
                        <>
                          {' · '}
                          <a href={map} target="_blank" rel="noopener noreferrer">Map ↗</a>
                        </>
                      )}
                    </dd>
                  </>
                )}
                {sel.addOns && sel.addOns.length > 0 && (
                  <>
                    <dt>Add-ons</dt>
                    <dd>{sel.addOns.join(', ')}</dd>
                  </>
                )}
                {sel.phone && (
                  <>
                    <dt>Phone</dt>
                    <dd>{prettyPhone(sel.phone)}</dd>
                  </>
                )}
                {sel.email && (
                  <>
                    <dt>Email</dt>
                    <dd style={{ wordBreak: 'break-all' }}>{sel.email}</dd>
                  </>
                )}
                {sel.heardFrom && (
                  <>
                    <dt>Found us</dt>
                    <dd>{sel.heardFrom}</dd>
                  </>
                )}
              </dl>

              {(sel.notes || sel.lastMessage) && <div className={s.quote}>“{sel.notes || sel.lastMessage}”</div>}
              {sel.origin === 'email' && sel.kind === 'quote' && !sel.phone && !sel.email && (
                <p className={s.empty} style={{ marginTop: 10 }}>Older request — only the name and city could be read back. The full details are in the office email.</p>
              )}

              <div className={s.move}>
                <span>Move to</span>
                {STAGES.filter((k) => k !== 'new').map((k) => (
                  <button key={k} className={sel.stage === k ? s.moveCur : ''} onClick={() => patch(sel.id, { stage: k })} disabled={sel.stage === k}>
                    {STAGE_LABEL[k]}
                    {k === 'booked' ? ' ✓' : ''}
                  </button>
                ))}
                {sel.stage !== 'new' && (
                  <button className={s.undo} onClick={() => patch(sel.id, { stage: 'new' })}>
                    back to New
                  </button>
                )}
              </div>

              <textarea
                className={s.notes}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setSaved('idle');
                }}
                onBlur={saveNotes}
                maxLength={2000}
                placeholder="Your notes — only you see these (e.g. called, left voicemail)"
              />
              <div className={s.saved}>{saved === 'saving' ? 'Saving…' : saved === 'saved' ? '✓ Saved' : notes !== (sel.ownerNotes ?? '') ? 'Saves when you click away' : ''}</div>

              <div className={s.tlv}>
                {[...(sel.history ?? [])].reverse().slice(0, 6).map((h, i) => (
                  <div key={i}>
                    <i />
                    <span>
                      <b>{h.text}</b> · {stamp(h.at)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {/* ========== APPLICANTS ========== */}
      <div className={s.bento}>
        <section className={`${s.card} ${s.s12}`}>
          <div className={s.ch}>
            <h3>Cleaner applicants</h3>
            <span className={s.cnt}>{applicants.length}</span>
            <span className={s.go}>From the Work for us page</span>
          </div>
          {applicants.length === 0 ? (
            <p className={s.empty}>No applications yet.</p>
          ) : (
            <div className={s.apps}>
              {applicants.slice(0, 12).map((a) => {
                const t = e164(a.phone);
                const sm = smsHref(a);
                const ml = mailHref(a);
                const tags = [
                  a.ownTransport === true ? { t: 'Own car', ok: true } : a.ownTransport === false ? { t: 'No car', ok: false } : null,
                  a.usAuthorized === true ? { t: 'Authorized to work', ok: true } : a.usAuthorized === false ? { t: 'Not authorized', ok: false } : null,
                  a.experience ? { t: `${a.experience} experience`, ok: true } : null,
                  a.availableDays?.length ? { t: a.availableDays.join(', '), ok: false } : null,
                ].filter(Boolean) as { t: string; ok: boolean }[];
                return (
                  <div key={a.id} className={s.ap}>
                    <div className={s.apTop}>
                      <b>{a.name}</b>
                      {a.stage !== 'new' ? (
                        <span className={`${s.st} ${s.st_contacted}`}>Contacted</span>
                      ) : (
                        <button className={s.mark} onClick={() => patch(a.id, { stage: 'contacted' })}>✓ Mark contacted</button>
                      )}
                    </div>
                    <div className={s.m}>{[a.city, ago(a.at, now), a.language].filter(Boolean).join(' · ')}</div>
                    {tags.length > 0 && (
                      <div className={s.tags}>
                        {tags.map((x) => (
                          <i key={x.t} className={x.ok ? s.tagOk : ''}>{x.t}</i>
                        ))}
                      </div>
                    )}
                    <div className={s.row2}>
                      {t ? <a href={`tel:${t}`}>Call</a> : <span className={s.off}>Call</span>}
                      {sm ? <a href={sm}>Text</a> : <span className={s.off}>Text</span>}
                      {ml ? <a href={ml}>Email</a> : <span className={s.off}>Email</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
