'use client';

import { useMemo, useState } from 'react';
import type { JobberClient } from '../../_lib/jobberClient';
import styles from './ClientsTab.module.css';

/**
 * ClientsTab — searchable directory of every active Jobber client.
 *
 * Receives the full client list as a server-rendered prop. The actual
 * search/filter logic runs client-side over that in-memory array so
 * typing in the search box is instant (no per-keystroke API calls).
 *
 * Each row shows the client's name (or company name for businesses),
 * city, and a clickable email + phone (with proper mailto: / tel: links).
 * Clicking a row expands it to show full address + actions (call, email,
 * open in Jobber).
 */

type Props = {
  clients: JobberClient[];
  error?: string;
};

export default function ClientsTab({ clients, error }: Props) {
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter against name/company/email/phone/city — case-insensitive.
  // useMemo so we don't re-filter on unrelated re-renders.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const haystack = [
        c.name,
        c.companyName ?? '',
        c.email ?? '',
        c.phone ?? '',
        c.address ?? '',
        c.city ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [clients, query]);

  if (error) {
    return (
      <div className={styles.errorBox}>
        <div className={styles.errorTitle}>Couldn&apos;t load clients</div>
        <p>{error}</p>
        <p style={{ marginTop: 8, fontSize: 12, color: '#9ca3af' }}>
          This usually means the Jobber connection broke. Check the
          <a href="#jobber" style={{ marginLeft: 4, color: '#374151', fontWeight: 600 }}>Jobber tab</a> for details.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {/* Search bar + total count */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>⌕</span>
          <input
            type="search"
            placeholder="Search by name, company, email, phone, address…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={styles.searchInput}
            autoComplete="off"
            autoCorrect="off"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className={styles.clearBtn}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        <div className={styles.count}>
          {query ? (
            <span>
              <strong>{filtered.length}</strong> of {clients.length} clients
            </span>
          ) : (
            <span>
              <strong>{clients.length}</strong> active client{clients.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </div>

      {/* Empty states */}
      {clients.length === 0 ? (
        <div className={styles.emptyState}>
          <strong>No clients in Jobber yet.</strong>
          <p>
            Once you add clients in Jobber, they&apos;ll show up here for quick lookup.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <strong>No matches for &quot;{query}&quot;</strong>
          <p>Try a different search term, or clear the search to see all clients.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map((c) => {
            const isExpanded = expandedId === c.id;
            return (
              <div
                key={c.id}
                className={`${styles.row} ${isExpanded ? styles.rowExpanded : ''}`}
                onClick={() => setExpandedId(isExpanded ? null : c.id)}
              >
                <div className={styles.rowHeader}>
                  <div className={styles.rowMain}>
                    <div className={styles.rowName}>
                      {c.name}
                      {c.isCompany && c.companyName && c.companyName !== c.name && (
                        <span className={styles.companyTag}>BIZ</span>
                      )}
                    </div>
                    <div className={styles.rowMeta}>
                      {c.city && <span>{c.city}</span>}
                      {c.city && (c.email || c.phone) && <span className={styles.dot}>·</span>}
                      {c.email && (
                        <a
                          href={`mailto:${c.email}`}
                          className={styles.metaLink}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {c.email}
                        </a>
                      )}
                      {c.email && c.phone && <span className={styles.dot}>·</span>}
                      {c.phone && (
                        <a
                          href={`tel:${c.phone.replace(/[^+\d]/g, '')}`}
                          className={styles.metaLink}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {c.phone}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className={styles.rowChevron} aria-hidden>
                    {isExpanded ? '▾' : '›'}
                  </div>
                </div>

                {isExpanded && (
                  <div className={styles.rowExpand}>
                    <div className={styles.expandGrid}>
                      <div>
                        <div className={styles.expandLabel}>FULL ADDRESS</div>
                        <div className={styles.expandValue}>
                          {c.address ? (
                            <>
                              {c.address}
                              {c.city && (
                                <>
                                  <br />
                                  {c.city}
                                </>
                              )}
                            </>
                          ) : (
                            <em style={{ color: '#9ca3af' }}>No address on file</em>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className={styles.expandLabel}>CONTACT</div>
                        <div className={styles.expandValue}>
                          {c.email && (
                            <a href={`mailto:${c.email}`} className={styles.metaLink} onClick={(e) => e.stopPropagation()}>
                              {c.email}
                            </a>
                          )}
                          {c.email && c.phone && <br />}
                          {c.phone && (
                            <a href={`tel:${c.phone.replace(/[^+\d]/g, '')}`} className={styles.metaLink} onClick={(e) => e.stopPropagation()}>
                              {c.phone}
                            </a>
                          )}
                          {!c.email && !c.phone && (
                            <em style={{ color: '#9ca3af' }}>No contact info</em>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={styles.expandActions}>
                      <a
                        href={`https://secure.getjobber.com/clients/${c.id.replace(/^.*:/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className={styles.expandBtn}
                      >
                        Open in Jobber →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
