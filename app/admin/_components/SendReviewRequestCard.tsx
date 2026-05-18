'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './SendReviewRequestCard.module.css';

/**
 * Client component — admin-only review request form.
 *
 * Wired into /admin. Tiago types in a customer's name + email after a
 * completed cleaning, hits Send, and the customer gets a personalized
 * "How was your cleaning?" email with a big button to /leave-a-review.
 *
 * Why this lives in /admin: it requires the admin auth cookie. The
 * underlying API (/api/admin/send-review-request) checks the cookie
 * server-side so an unauthed visitor can't hit the endpoint.
 *
 * One click per job → one customer asked → one potential Google review.
 * The multiplier on Tiago's "I can get reviews" intent.
 */

type Status =
  | { state: 'idle' }
  | { state: 'sending' }
  | { state: 'success'; message: string }
  | { state: 'error'; message: string };

export default function SendReviewRequestCard() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [service, setService] = useState('');
  const [status, setStatus] = useState<Status>({ state: 'idle' });

  // Pre-fill from URL params (?prefill_name=Sandra+P.) — fired when Tiago
  // clicks "Send Review →" next to a lead row. We pre-fill the name so he
  // only has to type the email.
  const searchParams = useSearchParams();
  useEffect(() => {
    const prefillName = searchParams.get('prefill_name');
    if (prefillName) {
      setName(prefillName);
      // Auto-focus the email field next, since name's already filled
      requestAnimationFrame(() => {
        const emailInput = document.querySelector<HTMLInputElement>(
          'input[type="email"]',
        );
        emailInput?.focus();
      });
    }
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status.state === 'sending') return;
    if (!name.trim() || !email.trim()) {
      setStatus({ state: 'error', message: 'Name + email required.' });
      return;
    }

    setStatus({ state: 'sending' });
    try {
      const res = await fetch('/api/admin/send-review-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          service: service.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({
          state: 'error',
          message: data?.error || `Send failed (${res.status})`,
        });
        return;
      }

      setStatus({
        state: 'success',
        message: `Review request sent to ${name.split(/\s+/)[0]}. Email queued in Resend.`,
      });
      // Clear form for next customer
      setName('');
      setEmail('');
      setService('');
    } catch (err: any) {
      setStatus({
        state: 'error',
        message: err?.message || 'Network error. Try again.',
      });
    }
  }

  const sending = status.state === 'sending';

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardIcon}>✦</div>
        <div>
          <div className={styles.cardLabel}>REVIEW COLLECTION · MANUAL TRIGGER</div>
          <div className={styles.cardTitle}>Send a review request</div>
        </div>
      </div>

      <p className={styles.cardBody}>
        After a job, type in the customer&rsquo;s name + email and hit Send.
        They&rsquo;ll get a warm, branded email asking them to leave a Google
        review &mdash; with one big button straight to{' '}
        <a href="/leave-a-review" target="_blank" rel="noopener noreferrer">
          /leave-a-review
        </a>
        . Reviews compound &mdash; every one moves you up in local search.
      </p>

      <form onSubmit={onSubmit} className={styles.form}>
        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Customer name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sandra Patel"
              autoComplete="off"
              required
              className={styles.input}
              disabled={sending}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Email address</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sandra@email.com"
              autoComplete="off"
              required
              className={styles.input}
              disabled={sending}
            />
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            Service performed <span className={styles.optional}>(optional)</span>
          </span>
          <input
            type="text"
            value={service}
            onChange={(e) => setService(e.target.value)}
            placeholder="Deep Cleaning · Boca Raton"
            autoComplete="off"
            className={styles.input}
            disabled={sending}
          />
        </label>

        <div className={styles.actions}>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={sending}
          >
            {sending ? 'Sending…' : 'Send Review Request →'}
          </button>

          {status.state === 'success' && (
            <span className={`${styles.feedback} ${styles.feedbackSuccess}`}>
              ✓ {status.message}
            </span>
          )}
          {status.state === 'error' && (
            <span className={`${styles.feedback} ${styles.feedbackError}`}>
              ✗ {status.message}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
