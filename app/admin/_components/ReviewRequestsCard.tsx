'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReviewRequest } from '../../_lib/social/types';

/**
 * Reviews tab → the automatic after-job Google review requests.
 * Shows what was sent, what's waiting (mode "ask me first"), and what was
 * skipped and why — plus a button to check Jobber right now.
 */
export default function ReviewRequestsCard() {
  const [reqs, setReqs] = useState<ReviewRequest[] | null>(null);
  const [canEmail, setCanEmail] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch('/api/reviews/requests', { cache: 'no-store' }).then((x) => x.json()).catch(() => null);
    if (r?.requests) {
      setReqs(r.requests);
      setCanEmail(!!r.canEmailCustomers);
    } else setReqs([]);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function post(body: Record<string, unknown>, key: string) {
    setBusy(key);
    setMsg(null);
    const r = await fetch('/api/reviews/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then((x) => x.json())
      .catch(() => ({ error: 'Network error' }));
    setBusy(null);
    if (r.error) setMsg(r.error);
    if (r.result) {
      const x = r.result;
      setMsg(x.note ? x.note : `Checked ${x.checked} finished job${x.checked === 1 ? '' : 's'}: ${x.sent} sent, ${x.queued} waiting, ${x.skipped} skipped.`);
    }
    if (r.request?.status === 'failed') setMsg(r.request.reason);
    load();
  }

  const badge = (st: ReviewRequest['status']) => {
    const map = {
      sent: ['#34d399', 'rgba(52,211,153,0.12)', 'Sent'],
      pending: ['#fbbf24', 'rgba(251,191,36,0.12)', 'Waiting'],
      skipped: ['#a1a1aa', '#1b1c22', 'Skipped'],
      failed: ['#f87171', 'rgba(248,113,113,0.12)', 'Failed'],
    } as const;
    const [c, bg, l] = map[st];
    return <span style={{ color: c, background: bg, borderRadius: 999, padding: '2px 9px', fontSize: 11, fontWeight: 600 }}>{l}</span>;
  };

  return (
    <div style={{ background: '#0d0e11', border: '1px solid #25262d', borderRadius: 14, padding: '18px 20px', marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
        <b style={{ fontSize: 15, color: '#f4f4f5' }}>Automatic review requests</b>
        <span style={{ fontSize: 12, color: '#8b8d98' }}>after each job marked complete in Jobber · on/off in Social → Automations</span>
        <button
          type="button"
          onClick={() => post({ action: 'check-now' }, 'check')}
          disabled={busy === 'check'}
          style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: 999, background: '#f4f4f5', color: '#0d0e11', border: 0, fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 0 }}
        >
          {busy === 'check' ? 'Checking…' : 'Check Jobber now'}
        </button>
      </div>
      {!canEmail && (
        <div style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', borderRadius: 10, padding: '10px 12px', fontSize: 13, margin: '10px 0' }}>
          Waiting on one setup step: verify your domain in Resend and set <b>QUOTE_FROM_EMAIL</b> in Vercel. Until then emails can only reach you, not customers — requests wait here.
        </div>
      )}
      {msg && <div style={{ fontSize: 13, color: '#d4d4d8', margin: '8px 0' }}>{msg}</div>}
      {reqs === null ? (
        <div style={{ fontSize: 13, color: '#8b8d98', padding: '10px 0' }}>Loading…</div>
      ) : reqs.length === 0 ? (
        <div style={{ fontSize: 13, color: '#8b8d98', padding: '10px 0' }}>Nothing yet. The first requests appear the morning after a job is marked complete.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {reqs.map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid #1b1c22', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#f4f4f5' }}>{r.clientName}</div>
                <div style={{ fontSize: 12, color: '#8b8d98' }}>
                  {r.service} · done {new Date(r.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {r.sentAt ? ` · sent ${new Date(r.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                  {r.reason ? ` · ${r.reason}` : ''}
                </div>
              </div>
              {badge(r.status)}
              {(r.status === 'pending' || r.status === 'failed') && (
                <>
                  <button type="button" disabled={!!busy || !canEmail} onClick={() => post({ id: r.id, action: 'send' }, r.id)} style={{ padding: '6px 12px', borderRadius: 999, background: '#f4f4f5', color: '#0d0e11', border: 0, fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 0 }}>
                    {busy === r.id ? 'Sending…' : 'Send'}
                  </button>
                  <button type="button" disabled={!!busy} onClick={() => post({ id: r.id, action: 'skip' }, r.id + 's')} style={{ padding: '6px 12px', borderRadius: 999, background: '#0d0e11', color: '#d4d4d8', border: '1px solid #25262d', fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 0 }}>
                    Skip
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
