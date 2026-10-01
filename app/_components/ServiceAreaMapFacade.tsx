'use client';

import { useState, type ReactNode } from 'react';
import styles from './ServiceAreaMap.module.css';

/**
 * Shows our drawn map (children) and only loads the live Google map when
 * someone taps "Open the live map". Until then: zero requests to Google.
 */
export default function ServiceAreaMapFacade({ embedUrl, children }: { embedUrl: string; children: ReactNode }) {
  const [live, setLive] = useState(false);
  return (
    <div className={styles.mapWrap}>
      {children}
      {live ? (
        <iframe
          title="Ultra Shine Cleaning service area — Palm Beach + Broward County, Florida"
          src={embedUrl}
          className={styles.mapIframe}
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <button type="button" className={styles.liveBtn} onClick={() => setLive(true)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          Open the live map
        </button>
      )}
    </div>
  );
}
