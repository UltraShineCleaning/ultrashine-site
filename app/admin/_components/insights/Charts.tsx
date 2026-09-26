'use client';

import { useEffect, useId, useState } from 'react';
import s from '../InsightsTab.module.css';

/**
 * The chart pieces of the Insights tab — plain SVG, no chart library, so
 * nothing extra ships to the browser. Hover text lives in `data-tip` (plain
 * text; first line bold) and one tooltip in InsightsTab reads it. It is never
 * set as HTML, because some of it (search terms, client names) comes from
 * outside.
 */

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
export const money = (n: number) => '$' + fmt(n);
export const moneyK = (n: number) => (Math.abs(n) >= 1000 ? `$${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}k` : money(n));

/** Flips to true one frame after mount, so rings animate from empty. */
function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setM(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  return m;
}

export function Ring(props: { pct: number; color: string; size?: number; sw?: number; big: string; small?: string; tip?: string; track?: string }) {
  const { pct, color, size = 120, sw = 11, big, small, tip, track = '#1b1c22' } = props;
  const id = useId().replace(/:/g, '');
  const mounted = useMounted();
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, Number.isFinite(pct) ? pct : 0));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} data-tip={tip}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity=".55" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={sw} />
      <circle
        className={s.arc}
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={`url(#g${id})`}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={mounted ? c * (1 - p) : c}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text className={s.ringBig} x="50%" y={small ? '47%' : '53%'} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: size / 5.3 }}>
        {big}
      </text>
      {small && (
        <text className={s.ringSmall} x="50%" y="66%" textAnchor="middle">
          {small}
        </text>
      )}
    </svg>
  );
}

export type DonutSeg = { label: string; value: number; color: string };

export function Donut(props: { segs: DonutSeg[]; size?: number; sw?: number; center?: string; sub?: string; fmtv?: (n: number) => string; column?: boolean }) {
  const { segs, size = 136, sw = 18, center, sub = 'total', fmtv = fmt, column } = props;
  const [hl, setHl] = useState<number | null>(null);
  const tot = segs.reduce((a, x) => a + x.value, 0);
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const gap = segs.length > 1 ? 3 : 0;
  let off = 0;
  const pct = (v: number) => (tot ? Math.round((v / tot) * 100) : 0);
  return (
    <div className={`${s.dwrap} ${column ? s.dcol : ''}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {tot === 0 && <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1b1c22" strokeWidth={sw} />}
        {segs.map((x, i) => {
          const len = tot ? (x.value / tot) * c : 0;
          const el = (
            <circle
              key={x.label}
              className={s.arc}
              data-tip={`${x.label}\n${fmtv(x.value)} (${pct(x.value)}%)`}
              onMouseEnter={() => setHl(i)}
              onMouseLeave={() => setHl(null)}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={x.color}
              strokeWidth={hl === i ? sw + 5 : sw}
              opacity={hl == null || hl === i ? 1 : 0.25}
              strokeDasharray={`${Math.max(len - gap, 0.1)} ${c}`}
              strokeDashoffset={-off}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          off += len;
          return el;
        })}
        <text className={s.ringBig} x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: size / 6.4 }}>
          {center ?? fmtv(tot)}
        </text>
        <text className={s.ringSmall} x="50%" y="63%" textAnchor="middle">
          {sub}
        </text>
      </svg>
      <div className={s.dl}>
        {segs.map((x, i) => (
          <div key={x.label} className={hl === i ? s.dlHl : undefined} onMouseEnter={() => setHl(i)} onMouseLeave={() => setHl(null)}>
            <i style={{ background: x.color }} />
            <span>{x.label}</span>
            <b className={s.num}>{fmtv(x.value)}</b>
            <em>{pct(x.value)}%</em>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Spark({ data, color }: { data: number[]; color: string }) {
  const id = useId().replace(/:/g, '');
  const w = 200;
  const h = 44;
  if (data.length < 2) return <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" />;
  const mx = Math.max(...data);
  const mn = Math.min(...data);
  const X = (i: number) => (i * w) / (data.length - 1);
  const Y = (v: number) => h - 4 - ((v - mn) / (mx - mn || 1)) * (h - 10);
  const d = data.map((v, i) => (i ? `C${(X(i - 1) + X(i)) / 2} ${Y(data[i - 1])} ${(X(i - 1) + X(i)) / 2} ${Y(v)} ${X(i)} ${Y(v)}` : `M0 ${Y(v)}`)).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`s${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".4" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w} ${h} L0 ${h}Z`} fill={`url(#s${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Smooth line/area chart with a hover column per point. */
export function Area(props: {
  series: number[][];
  labels: string[];
  colors: string[];
  names: string[];
  w?: number;
  h?: number;
  fill?: boolean;
  dashSecond?: boolean;
  zero?: boolean;
  yLabels?: boolean;
  fmtv?: (n: number) => string;
}) {
  const { series, labels, colors, names, w = 760, h = 230, fill = true, dashSecond = true, zero = true, yLabels = true, fmtv = fmt } = props;
  const id = useId().replace(/:/g, '');
  const n = series[0]?.length ?? 0;
  if (n < 2) return <div className={s.empty}>Not enough days yet to draw a line — it fills in as numbers come in.</div>;
  const pad = { l: yLabels ? 40 : 4, r: 8, t: 10, b: 24 };
  const W = w - pad.l - pad.r;
  const H = h - pad.t - pad.b;
  const all = series.flat();
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const mn = zero ? Math.min(0, lo) : lo - (hi - lo || 1) * 0.25;
  const mx = zero ? (hi || 1) * 1.12 : hi + (hi - lo || 1) * 0.2;
  const X = (i: number) => pad.l + (i * W) / (n - 1);
  const Y = (v: number) => pad.t + H - ((v - mn) / (mx - mn || 1)) * H;
  const smooth = (d: number[]) =>
    d.map((v, i) => (i ? `C${(X(i - 1) + X(i)) / 2} ${Y(d[i - 1])} ${(X(i - 1) + X(i)) / 2} ${Y(v)} ${X(i)} ${Y(v)}` : `M${X(0)} ${Y(v)}`)).join(' ');
  const step = Math.ceil(n / (w < 400 ? 4 : 8));
  const colW = W / (n - 1);
  return (
    <svg className={s.chart} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={`a${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={colors[0]} stopOpacity=".35" />
          <stop offset="1" stopColor={colors[0]} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((g) => {
        const v = mn + ((mx - mn) * g) / 4;
        return (
          <g key={g}>
            <line x1={pad.l} x2={w - pad.r} y1={Y(v)} y2={Y(v)} stroke="rgba(255,255,255,.05)" />
            {yLabels && (
              <text x={pad.l - 8} y={Y(v) + 3} textAnchor="end" fontSize="10" fill="#5b5d68">
                {fmtv(v).replace('$', '')}
              </text>
            )}
          </g>
        );
      })}
      {labels.map((l, i) =>
        i % step === 0 || (i === n - 1 && i % step >= step / 2) ? (
          <text key={i} x={X(i)} y={h - 6} textAnchor="middle" fontSize="10" fill="#5b5d68">
            {l}
          </text>
        ) : null,
      )}
      {series
        .map((d, k) => ({ d, k }))
        .reverse()
        .map(({ d, k }) => (
          <g key={k}>
            {k === 0 && fill && <path d={`${smooth(d)} L${X(n - 1)} ${pad.t + H} L${X(0)} ${pad.t + H}Z`} fill={`url(#a${id})`} />}
            <path d={smooth(d)} fill="none" stroke={colors[k]} strokeWidth={k ? 1.6 : 2.4} strokeDasharray={k && dashSecond ? '4 5' : undefined} strokeLinecap="round" />
          </g>
        ))}
      {Array.from({ length: n }, (_, i) => (
        <g key={i} className={s.col} data-tip={`${labels[i]}\n${series.map((d, k) => `${names[k]}: ${fmtv(d[i])}`).join('\n')}`}>
          <rect x={X(i) - colW / 2} y={pad.t} width={colW} height={H} fill="transparent" />
          <line x1={X(i)} x2={X(i)} y1={pad.t} y2={pad.t + H} stroke="rgba(255,255,255,.25)" />
          {series.map((d, k) => (
            <circle key={k} cx={X(i)} cy={Y(d[i])} r="4.5" fill={colors[k]} stroke="#0d0e11" strokeWidth="2" />
          ))}
        </g>
      ))}
    </svg>
  );
}

/** Stacked bars: paid (solid) + not-paid-yet (faint), with an optional dashed goal line. */
export function Bars(props: { bars: { label: string; paid: number; unpaid: number }[]; goal: number | null; w?: number; h?: number }) {
  const { bars, goal, w = 760, h = 230 } = props;
  const id = useId().replace(/:/g, '');
  const n = bars.length;
  if (!n) return null;
  const pad = { l: 44, r: 8, t: 14, b: 24 };
  const W = w - pad.l - pad.r;
  const H = h - pad.t - pad.b;
  const mx = Math.max(goal ?? 0, ...bars.map((b) => b.paid + b.unpaid), 1) * 1.12;
  const Y = (v: number) => pad.t + H - (v / mx) * H;
  const bw = (W / n) * (n > 20 ? 0.7 : 0.58);
  const step = Math.ceil(n / 8);
  return (
    <svg className={s.chart} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={`b${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#34d399" stopOpacity=".55" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((g) => {
        const v = (mx * g) / 4;
        return (
          <g key={g}>
            <line x1={pad.l} x2={w - pad.r} y1={Y(v)} y2={Y(v)} stroke="rgba(255,255,255,.05)" />
            <text x={pad.l - 8} y={Y(v) + 3} textAnchor="end" fontSize="10" fill="#5b5d68">
              {moneyK(v).replace('$', '')}
            </text>
          </g>
        );
      })}
      {bars.map((b, i) => {
        const x = pad.l + (i * W) / n + (W / n - bw) / 2;
        const rx = Math.min(7, bw / 2);
        return (
          <g key={i}>
            <g className={s.barr} data-tip={`${b.label}\nPaid ${money(b.paid)}${b.unpaid ? `\nNot paid yet ${money(b.unpaid)}` : ''}`}>
              <rect x={x} y={pad.t} width={bw} height={H} fill="transparent" />
              {b.unpaid > 0 && <rect x={x} y={Y(b.paid + b.unpaid)} width={bw} height={pad.t + H - Y(b.paid + b.unpaid)} rx={rx} fill="rgba(52,211,153,.28)" />}
              {b.paid > 0 && <rect x={x} y={Y(b.paid)} width={bw} height={pad.t + H - Y(b.paid)} rx={rx} fill={`url(#b${id})`} />}
            </g>
            {i % step === 0 && (
              <text x={x + bw / 2} y={h - 6} textAnchor="middle" fontSize="10" fill="#5b5d68">
                {b.label}
              </text>
            )}
          </g>
        );
      })}
      {goal != null && goal > 0 && (
        <g>
          <line x1={pad.l} x2={w - pad.r} y1={Y(goal)} y2={Y(goal)} stroke="#8b8d98" strokeDasharray="5 5" />
          <text x={w - pad.r} y={Y(goal) - 6} textAnchor="end" fontSize="10.5" fill="#8b8d98">
            goal {moneyK(goal)}
          </text>
        </g>
      )}
    </svg>
  );
}

/** Half-circle: average Google position, 30 on the left → 1st on the right. */
export function Gauge({ value, prev }: { value: number; prev: number | null }) {
  const mounted = useMounted();
  const id = useId().replace(/:/g, '');
  const w = 220;
  const h = 150;
  const r = 88;
  const cx = w / 2;
  const cy = 112;
  const a = Math.PI * r;
  const p = 1 - Math.min(Math.max(value, 1), 30) / 30;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} data-tip={`Average position ${value}${prev != null ? `\nPrevious period ${prev}` : ''}`}>
      <defs>
        <linearGradient id={`gg${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#f87171" />
          <stop offset=".55" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#34d399" />
        </linearGradient>
      </defs>
      <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#1b1c22" strokeWidth="16" strokeLinecap="round" />
      <path
        className={s.arc}
        d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke={`url(#gg${id})`}
        strokeWidth="16"
        strokeLinecap="round"
        strokeDasharray={a}
        strokeDashoffset={mounted ? a * (1 - p) : a}
      />
      <text className={s.ringBig} x={cx} y={cy - 18} textAnchor="middle" style={{ fontSize: 34 }}>
        {value}
      </text>
      <text className={s.ringSmall} x={cx - r} y={cy + 30} textAnchor="middle">
        30
      </text>
      <text className={s.ringSmall} x={cx + r} y={cy + 30} textAnchor="middle">
        1st
      </text>
    </svg>
  );
}

/** Concentric 3/4 arcs, one per item, longest = biggest. */
export function Radial({ items }: { items: { label: string; value: number; color: string }[] }) {
  const size = 170;
  const cx = size / 2;
  const mx = Math.max(1, ...items.map((i) => i.value));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {items.map((it, k) => {
        const r = 74 - k * 18;
        const c = 2 * Math.PI * r;
        return (
          <g key={it.label}>
            <circle cx={cx} cy={cx} r={r} fill="none" stroke="#1b1c22" strokeWidth="12" strokeDasharray={`${c * 0.75} ${c}`} transform={`rotate(135 ${cx} ${cx})`} strokeLinecap="round" />
            <circle
              data-tip={`${it.label}\n${fmt(it.value)} average reach`}
              cx={cx}
              cy={cx}
              r={r}
              fill="none"
              stroke={it.color}
              strokeWidth="12"
              strokeDasharray={`${(it.value / mx) * c * 0.75} ${c}`}
              transform={`rotate(135 ${cx} ${cx})`}
              strokeLinecap="round"
            />
          </g>
        );
      })}
    </svg>
  );
}

export function VBars({ items, color }: { items: { label: string; value: number }[]; color: string }) {
  const w = 300;
  const h = 150;
  const bw = w / Math.max(1, items.length);
  const mx = Math.max(1, ...items.map((i) => i.value));
  return (
    <svg className={s.chart} viewBox={`0 0 ${w} ${h}`}>
      {items.map((a, i) => {
        const bh = (a.value / mx) * 100;
        return (
          <g key={a.label}>
            <g className={s.barr} data-tip={`${a.label}\n${a.value}%`}>
              <rect x={i * bw + 7} y={122 - bh} width={bw - 14} height={bh} rx="7" fill={color} fillOpacity={(0.3 + a.value / 45).toFixed(2)} />
            </g>
            <text x={i * bw + bw / 2} y="142" textAnchor="middle" fontSize="10" fill="#8b8d98">
              {a.label}
            </text>
            <text x={i * bw + bw / 2} y={116 - bh} textAnchor="middle" fontSize="10" fill="#d4d4d8">
              {a.value}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const FUN_COLORS = ['#4d7cff', '#6b72ff', '#8b6cf5', '#a78bfa', '#34d399'];

/** The flowing funnel (desktop) + a stacked list (phones). Steps with no data are skipped. */
export function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  if (steps.length < 2) return <div className={s.empty}>The path fills in as each source is connected.</div>;
  const fw = 1100;
  const cy = 100;
  const mxh = 150;
  const sw = fw / steps.length;
  const top = Math.max(1, steps[0].value);
  const hts = steps.map((x) => Math.max(14, Math.pow(Math.max(x.value, 0) / top, 0.33) * mxh));
  const col = (i: number) => FUN_COLORS[Math.min(i + (5 - steps.length), 4)];
  return (
    <>
      <svg className={s.funnel} viewBox={`0 0 ${fw} 230`}>
        <defs>
          {steps.map((_, i) => (
            <linearGradient key={i} id={`fg${i}`} x1="0" x2="1">
              <stop offset="0" stopColor={col(i)} stopOpacity=".85" />
              <stop offset="1" stopColor={col(i + 1)} stopOpacity=".6" />
            </linearGradient>
          ))}
        </defs>
        {steps.map((x, i) => {
          const x0 = i * sw + 2;
          const x1 = (i + 1) * sw - 2;
          const h0 = hts[i];
          const h1 = i < steps.length - 1 ? hts[i + 1] : hts[i] * 0.8;
          const pc = i && steps[i - 1].value ? Math.round((x.value / steps[i - 1].value) * 100) : null;
          return (
            <g key={x.label}>
              <path
                data-tip={`${x.label}\n${fmt(x.value)}`}
                d={`M${x0} ${cy - h0 / 2} C${x0 + sw * 0.5} ${cy - h0 / 2} ${x1 - sw * 0.5} ${cy - h1 / 2} ${x1} ${cy - h1 / 2} L${x1} ${cy + h1 / 2} C${x1 - sw * 0.5} ${cy + h1 / 2} ${x0 + sw * 0.5} ${cy + h0 / 2} ${x0} ${cy + h0 / 2}Z`}
                fill={`url(#fg${i})`}
              />
              <text x={x0 + 10} y={cy + mxh / 2 + 26} fontSize="22" fontWeight="600" fill="#fff">
                {fmt(x.value)}
              </text>
              <text x={x0 + 10} y={cy + mxh / 2 + 44} fontSize="12" fill="#8b8d98">
                {x.label}
              </text>
              {pc != null && (
                <g>
                  <rect x={x0 - 26} y={cy - 11} width="52" height="22" rx="11" fill="#fff" />
                  <text x={x0} y={cy + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#000">
                    {pc}%
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <div className={s.funList}>
        {steps.map((x, i) => (
          <div key={x.label} className={s.fr}>
            <span className={s.mut}>
              {x.label}
              {i > 0 && steps[i - 1].value ? <span style={{ color: '#fff' }}> · {Math.round((x.value / steps[i - 1].value) * 100)}%</span> : null}
            </span>
            <b className={s.num}>{fmt(x.value)}</b>
            <div className={s.fbar}>
              <i style={{ width: `${Math.max(3, (hts[i] / mxh) * 100)}%`, background: col(i) }} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hourName = (h: number) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;

export function Heatmap({ grid }: { grid: number[][] }) {
  const mx = Math.max(1, ...grid.flat());
  return (
    <div className={s.hm}>
      <div />
      {Array.from({ length: 16 }, (_, i) => i + 6).map((h) => (
        <div key={h} className={s.hh}>
          {h % 3 === 0 ? `${h % 12 || 12}${h < 12 ? 'a' : 'p'}` : ''}
        </div>
      ))}
      {grid.map((row, d) => (
        <div key={d} style={{ display: 'contents' }}>
          <div className={s.hl}>{DAYS[d]}</div>
          {row.map((n, i) => {
            const v = n / mx;
            return (
              <div
                key={i}
                className={s.hc}
                data-tip={`${DAYS[d]} ${hourName(i + 6)}\n${n} request${n === 1 ? '' : 's'}`}
                style={{ background: n === 0 ? '#1b1c22' : `rgba(251,191,36,${(0.18 + v * 0.82).toFixed(2)})` }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
