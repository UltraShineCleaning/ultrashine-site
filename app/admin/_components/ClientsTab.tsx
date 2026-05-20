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

type TypeFilter = 'all' | 'individuals' | 'companies';

export default function ClientsTab({ clients, error }: Props) {
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [cityFilter, setCityFilter] = useState<string | null>(null);

  // ---- Extract unique cities from the client list ----
  // Sorted alphabetically + counts how many clients per city, so the
  // chip can show e.g. "Boca Raton · 18". Cities with no clients are
  // omitted automatically (we build from the actual data).
  const cityList = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of clients) {
      if (!c.city) continue;
      const key = c.city.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([city, count]) => ({ city, count }));
  }, [clients]);

  // ---- Apply ALL active filters: type + city + search query ----
  const filtered = useMemo(() => {
    let list = clients;

    // Type filter (individuals vs companies)
    if (typeFilter === 'individuals') list = list.filter((c) => !c.isCompany);
    else if (typeFilter === 'companies') list = list.filter((c) => c.isCompany);

    // City filter (exact match on the normalized city string)
    if (cityFilter) list = list.filter((c) => c.city?.trim() === cityFilter);

    // Free-text search across multiple fields
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => {
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
    }

    return list;
  }, [clients, query, typeFilter, cityFilter]);

  const companyCount = clients.filter((c) => c.isCompany).length;
  const individualCount = clients.length - companyCount;

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
      {/* ===== TYPE FILTER CHIPS ===== */}
      <div className={styles.filterRow}>
        <span className={styles.filterLabel}>SHOW</span>
        <button
          type="button"
          onClick={() => setTypeFilter('all')}
          className={`${styles.filterChip} ${typeFilter === 'all' ? styles.filterChipActive : ''}`}
        >
          All <span className={styles.chipCount}>{clients.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setTypeFilter('individuals')}
          className={`${styles.filterChip} ${typeFilter === 'individuals' ? styles.filterChipActive : ''}`}
        >
          Individuals <span className={styles.chipCount}>{individualCount}</span>
        </button>
        <button
          type="button"
          onClick={() => setTypeFilter('companies')}
          className={`${styles.filterChip} ${typeFilter === 'companies' ? styles.filterChipActive : ''}`}
        >
          Companies <span className={styles.chipCount}>{companyCount}</span>
        </button>
      </div>

      {/* ===== CITY FILTER CHIPS =====
          Dynamic — only shows cities that actually have clients, with
          per-city client counts. Click a city to filter; click again to
          clear. Lets Tiago instantly see "who's in Boca Raton"
          vs "who's in Delray". */}
      {cityList.length > 0 && (
        <div className={styles.filterRow}>
          <span className={styles.filterLabel}>CITY</span>
          <button
            type="button"
            onClick={() => setCityFilter(null)}
            className={`${styles.filterChip} ${cityFilter === null ? styles.filterChipActive : ''}`}
          >
            All cities
          </button>
          {cityList.map(({ city, count }) => (
            <button
              key={city}
              type="button"
              onClick={() => setCityFilter(cityFilter === city ? null : city)}
              className={`${styles.filterChip} ${cityFilter === city ? styles.filterChipActive : ''}`}
            >
              {city} <span className={styles.chipCount}>{count}</span>
            </button>
          ))}
        </div>
      )}

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
