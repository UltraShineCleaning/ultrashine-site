import styles from './ServiceAreaMap.module.css';

/**
 * Our own drawn map of the 13 cities (2026-10-01, speed pass).
 *
 * Replaces the always-on Google Maps iframe, which on phones pulled ~25 extra
 * requests and ~700 KB of Google's map code the moment someone scrolled near
 * "Where we clean", and made that part of the page stutter. This is a few KB
 * of inline SVG drawn from the real coordinates, so it paints instantly and
 * never loads anything. The live Google map is still one tap away
 * (ServiceAreaMapFacade loads it only when asked).
 *
 * Positions: simple equirectangular projection, longitude scaled by
 * cos(26.4°) ≈ 0.896 so distances look right at this latitude. The coastline
 * is a hand-traced line through real beach points from West Palm Beach to Fort
 * Lauderdale. It's an illustration, not a navigation map.
 */

const LON0 = -80.48;
const LAT0 = 26.8;
const K = 1000;
const CX = 0.896;
const P = (lat: number, lon: number) => [+((lon - LON0) * CX * K).toFixed(1), +((LAT0 - lat) * K).toFixed(1)] as const;

const COAST: [number, number][] = [
  [27.0, -80.05], [26.9, -80.035], [26.8, -80.032], [26.7, -80.034], [26.62, -80.036], [26.53, -80.044],
  [26.46, -80.058], [26.4, -80.066], [26.35, -80.072], [26.32, -80.076], [26.23, -80.086], [26.16, -80.097],
  [26.12, -80.103], [26.05, -80.108], [25.9, -80.12],
];

type Side = 'l' | 'r' | 'tr';
/** slug → [lat, lon, where the label sits]. Slugs match app/areas/_data/cities.ts. */
export const CITY_GEO: Record<string, [number, number, Side]> = {
  'west-palm-beach': [26.715, -80.053, 'l'],
  'lake-worth': [26.617, -80.072, 'l'],
  wellington: [26.659, -80.241, 'l'],
  'boynton-beach': [26.525, -80.066, 'l'],
  'delray-beach': [26.461, -80.073, 'l'],
  'boca-raton': [26.368, -80.128, 'l'],
  'deerfield-beach': [26.318, -80.1, 'r'],
  parkland: [26.31, -80.237, 'l'],
  'coconut-creek': [26.252, -80.179, 'tr'],
  'coral-springs': [26.271, -80.271, 'l'],
  margate: [26.245, -80.206, 'l'],
  'pompano-beach': [26.238, -80.125, 'r'],
  'fort-lauderdale': [26.122, -80.137, 'l'],
};

export default function ServiceAreaIllustration({ cities }: { cities: { slug: string; name: string }[] }) {
  const pts = COAST.map(([a, b]) => P(a, b));
  const land =
    `M -1500 -800 L ${pts[0][0]} -800 ` + pts.map(([x, y]) => `L ${x} ${y}`).join(' ') + ` L ${pts[pts.length - 1][0]} 1600 L -1500 1600 Z`;
  const [W] = P(26, -79.95);
  const H = P(26.06, 0)[1];
  const [sx, sy] = P(26.6, -80.012);
  const placed = cities.filter((c) => CITY_GEO[c.slug]);

  return (
    <svg
      className={styles.illus}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Map of the ${placed.length} cities we clean in Palm Beach and Broward County, Florida, based in Boca Raton`}
    >
      <defs>
        <radialGradient id="usAreaGlow">
          <stop offset="0" stopColor="#5E8FFF" stopOpacity=".22" />
          <stop offset="1" stopColor="#5E8FFF" stopOpacity="0" />
        </radialGradient>
        <pattern id="usAreaDots" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.2" fill="#C9DAFF" />
        </pattern>
      </defs>
      <rect x="-1500" y="-800" width="4000" height="2400" fill="#EAF1FF" />
      <rect x="-1500" y="-800" width="4000" height="2400" fill="url(#usAreaDots)" />
      <path d={land} fill="#FFFFFF" />
      <polyline points={pts.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke="#BFD3FF" strokeWidth="3" />
      <text transform={`translate(${sx} ${sy}) rotate(90)`} textAnchor="middle" className={styles.sea}>
        ATLANTIC OCEAN
      </text>
      <g fill="url(#usAreaGlow)">
        {placed.map((c) => {
          const [x, y] = P(CITY_GEO[c.slug][0], CITY_GEO[c.slug][1]);
          return <circle key={c.slug} cx={x} cy={y} r="62" />;
        })}
      </g>
      {placed.map((c) => {
        const [lat, lon, side] = CITY_GEO[c.slug];
        const [x, y] = P(lat, lon);
        const home = c.slug === 'boca-raton';
        const [dx, dy, anchor]: [number, number, 'start' | 'end'] =
          side === 'r' ? [14, 6, 'start'] : side === 'tr' ? [10, -16, 'start'] : [home ? -22 : -14, 6, 'end'];
        return (
          <g key={c.slug}>
            {home ? (
              <>
                <circle cx={x} cy={y} r="22" fill="#1C61F0" opacity=".14" />
                <circle cx={x} cy={y} r="11" fill="#1C61F0" stroke="#fff" strokeWidth="4" />
              </>
            ) : (
              <circle cx={x} cy={y} r="7" fill="#1C61F0" stroke="#fff" strokeWidth="3" />
            )}
            <text x={x + dx} y={y + dy} textAnchor={anchor} className={home ? `${styles.lbl} ${styles.lblHome}` : styles.lbl}>
              {c.name}
            </text>
            {home && (
              <text x={x + dx} y={y + dy + 20} textAnchor={anchor} className={styles.lblSub}>
                our home base
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
