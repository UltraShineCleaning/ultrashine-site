'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';

export default function AdminLogin() {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pw.trim() || submitting) return;
    setSubmitting(true);
    setErr(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        router.push('/admin');
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setErr(data?.error || 'Wrong password. Try again.');
      }
    } catch {
      setErr('Network error. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.loginSpark}>✦</div>
        <h1 className={styles.loginTitle}>
          Ultra Shine <em>Dashboard</em>
        </h1>
        <p className={styles.loginSub}>Private — for Tiago + Francine only</p>

        <form onSubmit={onSubmit}>
          <input
            type="password"
            className={styles.loginInput}
            placeholder="Password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoFocus
            autoComplete="current-password"
          />
          <button type="submit" className={styles.loginBtn} disabled={!pw.trim() || submitting}>
            {submitting ? 'Checking…' : 'Sign in'}
          </button>
        </form>

        {err && <p className={styles.loginError}>{err}</p>}
      </div>
    </main>
  );
}
