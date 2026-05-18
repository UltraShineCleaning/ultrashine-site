'use client';

import { useState } from 'react';
import styles from './page.module.css';

/**
 * Client-side copy-to-clipboard button. Used on /jobber-connected to let
 * Tiago grab the refresh token in one click before pasting it into Vercel.
 */
export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the text in case clipboard API blocked
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button onClick={onCopy} className={styles.copyBtn} type="button">
      {copied ? '✓ Copied!' : 'Copy →'}
    </button>
  );
}
