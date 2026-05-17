/**
 * Single source of truth for blog posts.
 *
 * To add a post: append a new entry below. Pages auto-generate at build:
 *   /blog/{slug}
 *
 * Why TS data + HTML strings (not MDX):
 *   - Zero new dependencies
 *   - Server-rendered, fast, SEO-friendly
 *   - Tiago can ship posts via simple PR without learning MDX
 *   - When the blog grows past ~20 posts, migrate to MDX/CMS
 *
 * SEO notes:
 *   - Titles should naturally include high-intent keywords (city + service)
 *   - Excerpts become meta descriptions (~150 chars ideal)
 *   - All posts get Article JSON-LD automatically on the post page
 */

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  publishedAt: string; // ISO yyyy-mm-dd
  readingMinutes: number;
  coverImage: string;
  tags: string[];
  /** HTML body — paragraphs in <p>, headings in <h2>/<h3>, lists in <ul>/<ol>. */
  bodyHtml: string;
};

export const POSTS: BlogPost[] = [
  {
    slug: 'how-often-deep-clean-boca-raton-humidity',
    title:
      'How Often Should You Deep Clean Your Home in Boca Raton’s Humid Climate?',
    excerpt:
      'The standard "every 3 months" deep cleaning advice misses what humidity does to South Florida homes. Here’s the real Boca Raton schedule.',
    author: 'Tiago Rena',
    publishedAt: '2026-05-17',
    readingMinutes: 4,
    coverImage: '/images/flow_hand_marble.jpg',
    tags: ['Deep Cleaning', 'Boca Raton', 'Florida Living'],
    bodyHtml: `
      <p>If you Google "how often should I deep clean my house," every article gives you the same answer: <strong>every three months</strong>. That guidance comes from northern-climate cleaning companies. It does not account for what 80% summer humidity does to a Boca Raton home.</p>

      <p>After seven years cleaning houses across Palm Beach and Broward counties, here’s what we actually see &mdash; and the schedule we recommend to our recurring clients.</p>

      <h2>What humidity does to a Florida home</h2>

      <p>Humid air carries moisture into every porous surface. Grout in showers absorbs it. Wood cabinets swell slightly. Painted baseboards trap fine dust against their slightly tacky surface. Air-vent grilles collect a black film faster than dry-climate homes. And mildew &mdash; the early-stage cousin of mold &mdash; starts forming in places you never look: behind toilets, on shower-door tracks, under sink rims.</p>

      <p>None of this is dangerous in the short term. But by the 90-day mark, surfaces that look clean to a quick glance are quietly accumulating buildup that a regular weekly clean is not designed to remove.</p>

      <h2>The real Boca Raton deep-cleaning schedule</h2>

      <h3>Every 60&ndash;75 days &mdash; not 90</h3>

      <p>For most Boca Raton, Delray Beach, and Boynton homes &mdash; especially those near the coast where salt air adds another variable &mdash; a deep clean every 60 to 75 days catches mildew, grout discoloration, and vent dust <em>before</em> they become hard to remove.</p>

      <h3>Every 90 days for inland + dry-living households</h3>

      <p>If you live in a newer construction inland (Coral Springs, Wellington, parts of Boca West) and your home runs the A/C aggressively year-round, you can stretch to 90 days between deep cleans without seeing real buildup.</p>

      <h3>Every 45 days during rainy season (June&ndash;October)</h3>

      <p>South Florida’s rainy season pushes indoor humidity into the 70-80% range even with A/C running. During those months, we shorten the deep-clean interval for clients who notice the difference &mdash; you’ll feel it most on bathroom grout and behind toilets.</p>

      <h2>What a Boca-specific deep clean covers that a regular clean doesn’t</h2>

      <ul>
        <li><strong>Grout scrub &amp; reset</strong> &mdash; the #1 thing humidity attacks. Done properly, grout goes back to its original color.</li>
        <li><strong>Air-vent grille wipe-down</strong> &mdash; pulls dust + that fine black film from return-air grilles. Improves air quality immediately.</li>
        <li><strong>Behind + under bathroom fixtures</strong> &mdash; toilet bases, sink pedestals, shower-door tracks. Where mildew starts.</li>
        <li><strong>Inside oven + fridge</strong> &mdash; spills cooked from Florida-summer high-A/C use harden faster.</li>
        <li><strong>Baseboards + door frames</strong> &mdash; hand-wiped, not just dusted. Removes the slightly tacky humidity buildup.</li>
        <li><strong>Light fixtures, ceiling fans, vents</strong> &mdash; all surfaces above eye level that quietly collect dust.</li>
      </ul>

      <h2>Pair it with regular maintenance &mdash; that’s the system</h2>

      <p>The simplest system we recommend to most Boca Raton clients: <a href="/services/regular-cleaning">weekly or bi-weekly regular cleaning</a> for maintenance, plus a <a href="/services/deep-cleaning">deep clean every 60-75 days</a> to reset the baseline. Together that runs you about $300-$600/month for a typical 3-bedroom home, and you never have to think about cleaning again.</p>

      <h2>How to tell it’s time</h2>

      <p>You don’t need a calendar. Walk into your master bathroom and look at the grout in the shower. If it looks even slightly darker than when it was new, or if you see any black specks starting on the shower door tracks &mdash; you’re overdue.</p>

      <p>Other signals: a faint mildew smell when you walk past a bathroom that’s been closed for a few hours. Visible buildup on bathroom-fan grilles. A grayish film on a previously-white toilet base. These are all "you waited too long" markers, not normal household wear.</p>

      <h2>The bottom line</h2>

      <p>If you live in Boca Raton or anywhere in coastal South Florida, the 90-day rule is too long. Plan deep cleans every 60-75 days during normal months and every 45 days during rainy season. Your home will look better, smell better, and the cumulative buildup that takes 4 hours to scrub away will never get a chance to set in.</p>

      <p>Want us to handle the schedule for you? <a href="/quote">Get a free quote in your inbox within an hour</a> &mdash; we’ll walk through your home, recommend the right cadence, and you’ll never have to think about it again.</p>
    `,
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}
