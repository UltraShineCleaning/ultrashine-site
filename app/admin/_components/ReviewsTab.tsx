'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import s from './ReviewsTab.module.css';
import type { ReviewsOverview } from '../../_lib/reviews/overview';

/**
 * Admin → Reviews. Design locked 2026-09-28 (00_STATE/design-reviews-dark.html).
 *
 * The rating, the automatic after-job review requests (switch + mode + the
 * waiting list), the latest Google reviews to reply to, and a quick "ask
 * someone now" form. Replies are posted on Google itself — there's no API a
 * small business can use to post them from here.
 */

const GOOGLE_REVIEWS_ADMIN = 'https://business.google.com/reviews';
const GOOGLE_PROFILE = 'https://maps.app.goo.gl/DrJtdje7XW1g8fDk9';

function ago(ms: number, now: number) {
  const d = Math.max(0, now - ms);
  if (d < 3600_000) return 'just now';
  if (d < 86_400_000) return `${Math.floor(d / 3600_000)}h ago`;
  if (d < 2 * 86_400_000) return 'yesterday';
  const dt = new Date(ms);
  if (d < 7 * 86_400_000) return dt.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/New_York' });
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });
}

function initials(name: string) {
  const p = name.replace(/[^A-Za-zÀ-ÿ\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() || '•';
}
const shortName = (n: string) => {
  const p = n.trim().split(/\s+/);
  return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : n;
};

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
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

const SERVICES = ['Regular Cleaning', 'Deep Cleaning', 'Move-In / Move-Out Cleaning', 'Post-Construction Cleaning', 'Commercial Cleaning'];

export default function ReviewsTab() {
  const [o, setO] = useState<ReviewsOverview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', service: '' });
  const [formMsg, setFormMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const now = Date.now();

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/reviews/overview', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setO(j.overview);
      setErr(null);
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveAuto = async (patch: { on?: boolean; mode?: 'auto' | 'ask' }) => {
    if (!o) return;
    const before = o.auto;
    setO({ ...o, auto: { ...o.auto, ...patch } });
    const r = await fetch('/api/social/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reviewRequests: patch }) }).catch(() => null);
    if (!r?.ok) {
      setO((cur) => (cur ? { ...cur, auto: before } : cur));
      setMsg("Couldn't save that setting — try again.");
    }
  };

  const act = async (id: string, action: 'send' | 'skip' | 'check-now') => {
    setBusy(id);
    setMsg(null);
    try {
      const r = await fetch('/api/reviews/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action === 'check-now' ? { action } : { id, action }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      if (action === 'check-now' && j.result) {
        const x = j.result;
        setMsg(x.note ? x.note : `Checked Jobber: ${x.checked} finished ${x.checked === 1 ? 'job' : 'jobs'} · ${x.sent} sent · ${x.queued} waiting · ${x.skipped} skipped`);
      }
      if (j.request?.status === 'failed') setMsg(j.request.reason ?? 'Sending failed');
      await load();
    } catch (e: any) {
      setMsg(e?.message ?? 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  const sendOne = async (e: FormEvent) => {
    e.preventDefault();
    setBusy('form');
    setFormMsg(null);
    try {
      const r = await fetch('/api/admin/send-review-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, service: form.service || undefined }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setFormMsg({ ok: true, text: `Sent to ${form.email}` });
      setForm({ name: '', email: '', service: '' });
    } catch (e: any) {
      setFormMsg({ ok: false, text: e?.message ?? 'Send failed' });
    } finally {
      setBusy(null);
    }
  };

  if (!o) {
    return (
      <div className={s.root}>
        {err ? (
          <div className={s.banner}>
            Couldn&apos;t load reviews: {err}. <button onClick={load} style={{ textDecoration: 'underline' }}>Try again</button>
          </div>
        ) : (
          <div className={s.bento}>
            <div className={`${s.sk} ${s.s7}`} style={{ height: 300 }} />
            <div className={`${s.sk} ${s.s5}`} style={{ height: 300 }} />
          </div>
        )}
      </div>
    );
  }

  const waiting = o.requests.filter((r) => r.status === 'pending' || r.status === 'failed');
  const recent = o.requests.filter((r) => r.status === 'sent' || r.status === 'skipped').slice(0, 8);
  const smsBody = `Thank you for choosing Ultra Shine Cleaning! If you have a moment, a quick Google review helps us a lot: ${o.reviewLink}`;

  return (
    <div className={s.root}>
      {msg && <div className={s.banner}>{msg}</div>}

      <div className={s.bento}>
        {/* ========== RATING ========== */}
        <section className={`${s.card} ${s.s7} ${s.glow}`}>
          <div className={s.ch}>
            <h3>Google rating</h3>
            <a className={s.go} href={GOOGLE_PROFILE} target="_blank" rel="noopener noreferrer">Open on Google ↗</a>
          </div>
          <div className={s.hero}>
            <span className={s.big}>{o.rating.toFixed(1)}</span>
            <div className={s.meta}>
              <span className={s.stars}>★★★★★</span>
              <b>{o.count} reviews on Google</b>
              <span className={s.mut}>
                {o.newThisMonth != null ? `+${o.newThisMonth} this month · ` : ''}HomeAdvisor 4.9 ★ (25)
              </span>
            </div>
            {o.rating >= 5 && (
              <div className={s.bars} aria-label="Every review is 5 stars">
                {[5, 4, 3, 2, 1].map((n) => (
                  <div key={n}>
                    <span>{n}</span>
                    <span className={s.b}><i style={{ width: n === 5 ? '100%' : 0 }} /></span>
                    <span>{n === 5 ? o.count : 0}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className={s.link}>
            <span>{o.reviewLink.replace(/^https?:\/\/(www\.)?/, '')}</span>
            <button
              onClick={async () => {
                if (await copyText(o.reviewLink)) {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}
            >
              {copied ? '✓ Copied' : 'Copy review link'}
            </button>
          </div>
          <div className={s.tools}>
            <a href="/review-card" target="_blank" rel="noopener noreferrer">
              🖨 Print review cards<span>QR cards to leave after a clean</span>
            </a>
            <a href="/leave-a-review" target="_blank" rel="noopener noreferrer">
              ★ Leave-a-review page<span>What customers see</span>
            </a>
            <a href={`sms:?&body=${encodeURIComponent(smsBody)}`}>
              ✆ Text the link<span>Opens your Messages app</span>
            </a>
          </div>
        </section>

        {/* ========== AUTOMATIC REQUESTS ========== */}
        <section className={`${s.card} ${s.s5}`}>
          <div className={s.ch}>
            <h3>Automatic review requests</h3>
            <button
              className={`${s.sw} ${o.auto.on ? '' : s.swOff}`}
              onClick={() => saveAuto({ on: !o.auto.on })}
              role="switch"
              aria-checked={o.auto.on}
              aria-label="Automatic review requests"
            />
          </div>
          <div className={s.row}>
            <span className={s.mut}>When a Jobber job is marked done</span>
            <div className={s.seg2}>
              <button className={o.auto.mode === 'auto' ? s.segOn : ''} onClick={() => saveAuto({ mode: 'auto' })} disabled={!o.auto.on}>
                Send automatically
              </button>
              <button className={o.auto.mode === 'ask' ? s.segOn : ''} onClick={() => saveAuto({ mode: 'ask' })} disabled={!o.auto.on}>
                Ask me first
              </button>
            </div>
          </div>
          {!o.canEmailCustomers && (
            <div className={s.warn}>
              Emails to customers are paused until your domain is verified in Resend — requests wait in the list below until then.{' '}
              <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer">Open Resend ↗</a>
            </div>
          )}
          <div className={s.nums}>
            <div>
              <b>{o.stats.sent30}</b>
              <span>sent · 30 days</span>
            </div>
            <div>
              <b>{o.stats.reviewed30}</b>
              <span>left a review</span>
            </div>
            <div>
              <b>{o.stats.returnRate != null ? `${o.stats.returnRate}%` : '—'}</b>
              <span>came back</span>
            </div>
          </div>
          <p className={s.fine}>Never asks the same client twice in a year, and skips anyone who already reviewed you.</p>
        </section>
      </div>

      <div className={s.bento}>
        {/* ========== WAITING + RECENT ========== */}
        <section className={`${s.card} ${s.s7}`}>
          <div className={s.ch}>
            <h3>Waiting for you</h3>
            <span className={s.cnt}>{waiting.length}</span>
            <button className={s.go} onClick={() => act('check', 'check-now')} disabled={busy === 'check'}>
              {busy === 'check' ? 'Checking…' : '↻ Check Jobber now'}
            </button>
          </div>
          {waiting.length === 0 ? (
            <p className={s.empty}>Nobody waiting. Finished Jobber jobs show up here (or go out automatically) the day after.</p>
          ) : (
            waiting.map((r) => (
              <div key={r.id} className={s.rq}>
                <div className={s.av}>{initials(r.clientName)}</div>
                <div style={{ minWidth: 0 }}>
                  <b>{shortName(r.clientName)}</b>
                  <div className={s.m}>
                    {r.service} · finished {ago(r.completedAt, now)}
                    {r.status === 'failed' && r.reason ? ` · ${r.reason}` : ''}
                  </div>
                </div>
                <span className={`${s.stt} ${r.status === 'failed' ? s.st_fail : s.st_wait}`}>{r.status === 'failed' ? 'Failed' : 'Waiting'}</span>
                <div className={s.btns}>
                  <button className={s.pri} onClick={() => act(r.id, 'send')} disabled={!!busy || !o.canEmailCustomers} title={o.canEmailCustomers ? '' : 'Verify your domain in Resend first'}>
                    {busy === r.id ? 'Sending…' : 'Send'}
                  </button>
                  <button onClick={() => act(r.id, 'skip')} disabled={!!busy}>Skip</button>
                </div>
              </div>
            ))
          )}
          {recent.length > 0 && (
            <>
              <p className={s.sub2}>Recent</p>
              {recent.map((r) => (
                <div key={r.id} className={s.rq}>
                  <div className={s.av}>{initials(r.clientName)}</div>
                  <div style={{ minWidth: 0 }}>
                    <b>{shortName(r.clientName)}</b>
                    <div className={s.m}>
                      {r.service} · {r.status === 'sent' ? `sent ${ago(r.sentAt ?? r.completedAt, now)}` : ago(r.completedAt, now)}
                    </div>
                  </div>
                  {r.status === 'sent' ? (
                    r.reviewed ? <span className={`${s.stt} ${s.st_rev}`}>Left a review ★</span> : <span className={`${s.stt} ${s.st_sent}`}>Sent</span>
                  ) : (
                    <span className={`${s.stt} ${s.st_skip}`}>Skipped{r.reason ? ` · ${r.reason.replace(/^Already left a Google review$/, 'already reviewed').replace(/^./, (c) => c.toLowerCase())}` : ''}</span>
                  )}
                  <span />
                </div>
              ))}
            </>
          )}
        </section>

        <div className={`${s.s5} ${s.stack}`}>
          {/* ========== LATEST REVIEWS ========== */}
          <section className={s.card}>
            <div className={s.ch}>
              <h3>Latest reviews</h3>
              <a className={s.go} href={GOOGLE_REVIEWS_ADMIN} target="_blank" rel="noopener noreferrer">All on Google ↗</a>
            </div>
            {o.latest.length === 0 ? (
              <p className={s.empty}>No reviews loaded.</p>
            ) : (
              o.latest.map((r, i) => (
                <div key={i} className={s.rvw}>
                  <div className={s.top}>
                    <div className={s.av} style={{ width: 28, height: 28, fontSize: 11 }}>{r.author[0]}</div>
                    <b>{shortName(r.author)}</b>
                    <span className={s.s5star}>{'★'.repeat(Math.round(r.rating))}</span>
                    <em>{r.when}</em>
                  </div>
                  <p>“{r.text}”</p>
                  <a className={s.rep} href={GOOGLE_REVIEWS_ADMIN} target="_blank" rel="noopener noreferrer">Reply on Google ↗</a>
                </div>
              ))
            )}
          </section>

          {/* ========== ASK SOMEONE NOW ========== */}
          <section className={s.card}>
            <div className={s.ch}>
              <h3>Ask someone now</h3>
              <span className={s.go}>For a client not in Jobber</span>
            </div>
            <form className={s.form} onSubmit={sendOne}>
              <input required placeholder="First name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} />
              <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={200} />
              <select className={s.full} value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>
                <option value="">Service (optional)</option>
                {SERVICES.map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>
              <button type="submit" disabled={busy === 'form' || !o.canEmailCustomers}>
                {busy === 'form' ? 'Sending…' : 'Send review request'}
              </button>
              {!o.canEmailCustomers && <p className={`${s.fine} ${s.full}`}>Turns on once your domain is verified in Resend.</p>}
              {formMsg && <p className={`${s.full} ${formMsg.ok ? s.ok : s.bad}`}>{formMsg.ok ? '✓ ' : ''}{formMsg.text}</p>}
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
