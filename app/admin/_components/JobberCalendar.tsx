'use client';

import { useMemo, useState } from 'react';
import type { JobberVisit } from '../../_lib/jobberClient';
import styles from './JobberCalendar.module.css';

/**
 * JobberCalendar — month-grid view of upcoming visits.
 *
 * Renders a Sun→Sat 6-row grid for the currently-displayed month.
 * Each day cell shows:
 *   - The day number
 *   - A small badge with visit count (if >0)
 *   - The first 2 client names so you can scan-read the day
 *   - "+N more" if there are extras
 * Clicking a day cell selects it; the panel BELOW the calendar then
 * lists every visit for that day with full client/address/time detail.
 *
 * "Today" is highlighted with a darker border. Days outside the current
 * month (the grid's leading/trailing fillers) render dimmed. Prev/Next
 * arrows step the month view; "Today" button jumps back to current.
 *
 * Data is passed in from the server-rendered JobberDashboard as
 * `allVisits` (already normalized + sorted earliest-first).
 */

type Props = {
  allVisits: JobberVisit[];
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Compare two dates by local Y/M/D (ignore time of day) */
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function JobberCalendar({ allVisits }: Props) {
  // Track which month is currently displayed. State holds the first-of-month.
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Selected day for the inline detail panel. Defaults to today if today
  // has visits, otherwise the first day with visits in view, otherwise null.
  const today = useMemo(() => new Date(), []);
  const [selectedDay, setSelectedDay] = useState<Date>(today);
  // Visit popover state — when a chip is clicked, we open a floating
  // detail popup like Jobber does. null = no popover open.
  const [popoverVisit, setPopoverVisit] = useState<JobberVisit | null>(null);

  // ---- Bucket visits by YYYY-MM-DD for O(1) lookup per cell ----
  const visitsByDay = useMemo(() => {
    const map = new Map<string, JobberVisit[]>();
    for (const v of allVisits) {
      if (!v.startAt) continue;
      const d = new Date(v.startAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }
    return map;
  }, [allVisits]);

  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

  // ---- Build the 6-row grid for the viewMonth ----
  const cells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    // Sun=0, Mon=1, ... — how many filler cells we need before day 1
    const leadDays = firstOfMonth.getDay();
    // Start cell = day before month-start that lands on Sunday
    const gridStart = new Date(year, month, 1 - leadDays);
    // Always render 6 weeks = 42 cells for consistent layout
    const cellList: Array<{ date: Date; inMonth: boolean }> = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      cellList.push({ date: d, inMonth: d.getMonth() === month });
    }
    return cellList;
  }, [viewMonth]);

  const goPrev = () =>
    setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNext = () =>
    setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday = () => {
    const d = new Date();
    setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setSelectedDay(d);
  };

  const selectedVisits = visitsByDay.get(dayKey(selectedDay)) ?? [];

  const fmtTime = (iso: string | null) => {
    if (!iso) return 'Time TBD';
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Total visits in the current month (for the header summary).
  // Use Array.from to avoid iterator-target TS issues on older lib configs.
  const visitsInViewMonth = useMemo(() => {
    let n = 0;
    Array.from(visitsByDay.entries()).forEach(([key, list]) => {
      const parts = key.split('-').map((s: string) => parseInt(s, 10));
      const y = parts[0];
      const m = parts[1];
      if (y === viewMonth.getFullYear() && m === viewMonth.getMonth()) {
        n += list.length;
      }
    });
    return n;
  }, [visitsByDay, viewMonth]);

  return (
    <div className={styles.wrap}>
      {/* ===== CALENDAR HEADER ===== */}
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>UPCOMING VISITS · MONTH VIEW</div>
          <h3 className={styles.monthTitle}>
            {MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
          </h3>
          <div className={styles.subSummary}>
            {visitsInViewMonth === 0
              ? 'No visits scheduled in this month'
              : `${visitsInViewMonth} visit${visitsInViewMonth === 1 ? '' : 's'} this month`}
          </div>
        </div>
        <div className={styles.controls}>
          <button type="button" onClick={goPrev} className={styles.navBtn} aria-label="Previous month">‹</button>
          <button type="button" onClick={goToday} className={styles.todayBtn}>Today</button>
          <button type="button" onClick={goNext} className={styles.navBtn} aria-label="Next month">›</button>
        </div>
      </div>

      {/* ===== DAY-OF-WEEK HEADER ROW ===== */}
      <div className={styles.dowRow}>
        {DOW.map((d) => (
          <div key={d} className={styles.dowCell}>{d}</div>
        ))}
      </div>

      {/* ===== 6-ROW CALENDAR GRID =====
          Jobber-style — each visit shows as a small horizontal bar with
          time + client name. Past visits are struck-through, upcoming
          are colored. Day cells are tall enough to comfortably show
          4-5 visit bars; anything more shows "+N more". */}
      <div className={styles.grid}>
        {cells.map(({ date, inMonth }, i) => {
          const visits = visitsByDay.get(dayKey(date)) ?? [];
          // Sort by start time so the day reads top→bottom chronologically
          const sortedVisits = [...visits].sort((a, b) =>
            (a.startAt ?? '').localeCompare(b.startAt ?? ''),
          );
          const isToday = sameDay(date, today);
          const isSelected = sameDay(date, selectedDay);
          const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const visibleVisits = sortedVisits.slice(0, 5);
          const overflow = sortedVisits.length - visibleVisits.length;
          const cellClass = [
            styles.cell,
            !inMonth && styles.cellOutside,
            isToday && styles.cellToday,
            isSelected && styles.cellSelected,
            isPast && styles.cellPast,
            visits.length > 0 && styles.cellHasVisits,
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedDay(date)}
              className={cellClass}
            >
              <div className={styles.cellTop}>
                <span className={styles.cellDay}>{date.getDate()}</span>
                {visits.length > 0 && (
                  <span className={styles.cellCount}>
                    {visits.length} {visits.length === 1 ? 'visit' : 'visits'}
                  </span>
                )}
              </div>
              <div className={styles.cellVisits}>
                {visibleVisits.map((v) => {
                  const visitDate = v.startAt ? new Date(v.startAt) : null;
                  // Treat completed-flag OR past start time as "past" for
                  // strikethrough purposes (matches Jobber's behavior of
                  // striking through finished visits regardless of date).
                  const visitIsPast =
                    v.completed || (visitDate ? visitDate < new Date() : false);
                  const time = visitDate
                    ? visitDate.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: false,
                      })
                    : '—';
                  // Jobber-style label. Skip the title suffix when (1) it's
                  // generic "Cleaning Service" or (2) it matches the client
                  // name (Jobber often sets the title to the client name
                  // itself, which produced "Will Bordelon - Will Bordelon").
                  const titleIsRedundant =
                    !v.title ||
                    v.title === 'Cleaning Service' ||
                    v.title.toLowerCase().trim() === v.clientName.toLowerCase().trim();
                  const label = titleIsRedundant
                    ? v.clientName
                    : `${v.clientName} · ${v.title}`;
                  return (
                    <div
                      key={v.id}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        // Stop the click from also triggering the day-cell button
                        // (which would otherwise change selectedDay).
                        e.stopPropagation();
                        setSelectedDay(date);
                        setPopoverVisit(v);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedDay(date);
                          setPopoverVisit(v);
                        }
                      }}
                      className={`${styles.visitBar} ${visitIsPast ? styles.visitBarPast : ''}`}
                      title={`${time} ${label}${v.team.length ? ' · ' + v.team.join(' + ') : ''}${v.address ? ' · ' + v.address : ''}`}
                    >
                      <span className={styles.visitTime}>{time}</span>
                      <span className={styles.visitName}>{label}</span>
                    </div>
                  );
                })}
                {overflow > 0 && (
                  <div className={styles.visitOverflow}>+{overflow} more</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ===== SELECTED-DAY DETAIL PANEL ===== */}
      <div className={styles.detailPanel}>
        <div className={styles.detailHeader}>
          <div>
            <div className={styles.detailEyebrow}>
              {sameDay(selectedDay, today)
                ? 'TODAY'
                : selectedDay.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()}
            </div>
            <h4 className={styles.detailTitle}>
              {selectedDay.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </h4>
          </div>
          <div className={styles.detailCount}>
            {selectedVisits.length === 0
              ? 'Nothing scheduled'
              : `${selectedVisits.length} visit${selectedVisits.length === 1 ? '' : 's'}`}
          </div>
        </div>

        {selectedVisits.length === 0 ? (
          <div className={styles.detailEmpty}>
            No visits on this day. Click another date or use the arrows to
            navigate.
          </div>
        ) : (
          <div className={styles.detailList}>
            {selectedVisits
              .sort((a, b) => (a.startAt ?? '').localeCompare(b.startAt ?? ''))
              .map((v) => (
                <div key={v.id} className={`${styles.visit} ${v.completed ? styles.visitCompleted : ''}`}>
                  <div className={styles.detailTime}>{fmtTime(v.startAt)}</div>
                  <div className={styles.visitMain}>
                    <div className={styles.visitClient}>{v.clientName}</div>
                    <div className={styles.visitDetailTitle}>{v.title}</div>
                    {v.address && <div className={styles.visitAddr}>{v.address}</div>}
                  </div>
                  <div className={styles.visitTeam}>
                    {v.team.length === 0 ? (
                      <span className={styles.teamUnassigned}>● Unassigned</span>
                    ) : (
                      <>
                        <div className={styles.teamLabel}>TEAM</div>
                        <div className={styles.teamMembers}>
                          {v.team.map((name) => (
                            <span key={name} className={styles.teamChip}>{name}</span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ===== VISIT POPOVER =====
          Floats over the calendar when a chip is clicked. Matches Jobber's
          visit popup pattern. Click backdrop or × button to dismiss. */}
      {popoverVisit && (
        <div
          className={styles.popoverBackdrop}
          onClick={() => setPopoverVisit(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={styles.popoverCard}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPopoverVisit(null)}
              className={styles.popoverClose}
              aria-label="Close visit details"
            >
              ×
            </button>

            <div className={styles.popoverHeader}>
              <div className={styles.popoverEyebrow}>
                {popoverVisit.startAt
                  ? new Date(popoverVisit.startAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Scheduled visit'}
              </div>
              <h3 className={styles.popoverTitle}>{popoverVisit.clientName}</h3>
              <div className={styles.popoverSubtitle}>{popoverVisit.title}</div>
            </div>

            <div className={styles.popoverGrid}>
              <div>
                <div className={styles.popoverLabel}>TIME</div>
                <div className={styles.popoverValue}>
                  {popoverVisit.startAt
                    ? new Date(popoverVisit.startAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : 'TBD'}
                  {popoverVisit.endAt && (
                    <>
                      {' – '}
                      {new Date(popoverVisit.endAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </>
                  )}
                </div>
              </div>
              <div>
                <div className={styles.popoverLabel}>STATUS</div>
                <div className={styles.popoverValue}>
                  {popoverVisit.completed ? (
                    <span style={{ color: '#166534' }}>✓ Completed</span>
                  ) : (
                    <span style={{ color: '#374151' }}>● Scheduled</span>
                  )}
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div className={styles.popoverLabel}>LOCATION</div>
                <div className={styles.popoverValue}>
                  {popoverVisit.address ?? <em style={{ color: '#9ca3af' }}>No address on file</em>}
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div className={styles.popoverLabel}>TEAM</div>
                <div className={styles.popoverValue}>
                  {popoverVisit.team.length === 0 ? (
                    <span className={styles.teamUnassigned}>● Unassigned</span>
                  ) : (
                    <div className={styles.teamMembers} style={{ justifyContent: 'flex-start' }}>
                      {popoverVisit.team.map((name) => (
                        <span key={name} className={styles.teamChip}>{name}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.popoverActions}>
              <a
                href={`https://secure.getjobber.com/work_orders`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.popoverPrimary}
              >
                Open in Jobber →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
