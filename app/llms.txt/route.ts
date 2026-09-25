import { CITIES } from '../areas/_data/cities';
import { POSTS } from '../blog/_data/posts';

/**
 * GET /llms.txt
 *
 * WHAT THIS IS
 * ------------
 * `llms.txt` is to AI answer engines what `sitemap.xml` is to Google: one clean,
 * plain-language map of the site, served at a predictable path. ChatGPT Search,
 * Perplexity, Claude and Google's AI Overviews increasingly answer "who cleans
 * houses in Boca Raton" directly instead of returning ten blue links. When they
 * do, they cite whichever sources they could read and understand most easily.
 *
 * WHY IT MATTERS HERE
 * -------------------
 * Every page on this site is rendered by Next.js and wrapped in navigation,
 * scroll animations and styling. A crawler has to strip all of that to find the
 * three facts that matter: what we do, where we do it, how to get a quote. This
 * file hands those over directly, in markdown, with no markup to wade through.
 *
 * It costs nothing, cannot hurt traditional SEO, and is the one genuine gap the
 * site had in AI-search readiness. robots.txt already permits AI crawlers (it
 * allows `*`), which is deliberate — being cited by an AI answer is free
 * distribution to exactly the person looking to book a cleaner.
 *
 * WHY A ROUTE AND NOT A STATIC FILE
 * ---------------------------------
 * It reads CITIES and POSTS from the same modules that feed sitemap.ts, so a new
 * city or blog post appears here automatically. A hand-written public/llms.txt
 * would drift the moment anything changed, which is the failure mode this repo
 * keeps paying for — two sources for one fact.
 *
 * Format follows the llmstxt.org convention: H1 name, blockquote summary, then
 * link sections with one-line descriptions.
 */

const BASE = 'https://ultrashinecleaningfl.com';

const SERVICES: { slug: string; name: string; desc: string }[] = [
  {
    slug: 'regular-cleaning',
    name: 'Regular House Cleaning',
    desc: 'Weekly, bi-weekly or monthly recurring house cleaning. The same trained team every visit.',
  },
  {
    slug: 'deep-cleaning',
    name: 'Deep Cleaning',
    desc: 'Every-90-day reset. Inside oven and fridge, baseboards hand-wiped, grout scrubbed, ceiling fans and vents.',
  },
  {
    slug: 'move-in-out',
    name: 'Move-In / Move-Out Cleaning',
    desc: 'Landlord-grade turnover cleaning aimed at getting a full security deposit back. Also used for Airbnb and vacation rental changeovers.',
  },
  {
    slug: 'commercial',
    name: 'Commercial + Office Cleaning',
    desc: 'After-hours offices, medical and dental suites, salons and boutique retail. COI on file, flat per-visit rate, paid after each visit.',
  },
  {
    slug: 'post-construction',
    name: 'Post-Construction Cleanup',
    desc: 'Fine drywall dust, paint specks, sticker residue and grout haze after a build or renovation.',
  },
];

export function GET(): Response {
  const cityLines = CITIES.map(
    (c) => `- [${c.name} house cleaning](${BASE}/areas/${c.slug}): ${c.vibe}`,
  ).join('\n');

  const serviceLines = SERVICES.map(
    (s) => `- [${s.name}](${BASE}/services/${s.slug}): ${s.desc}`,
  ).join('\n');

  const postLines = POSTS.map(
    (p) => `- [${p.title}](${BASE}/blog/${p.slug}): ${p.excerpt}`,
  ).join('\n');

  const body = `# Ultra Shine Cleaning

> A family-owned house cleaning company based in Boca Raton, Florida, serving ${CITIES.length} cities across Palm Beach and Broward County. Founded by Tiago and Francine Rena in Connecticut in 2018 and moved to South Florida in 2021. Fully insured and bonded, every cleaner background-checked, and the same team returns to your home each visit rather than rotating strangers through it.

Ultra Shine is a residential and commercial cleaning service. People also search for this kind of business as a maid service, house cleaners, or apartment and condo cleaning. It is a service-area business: there is no storefront, crews travel to the customer.

Key facts:
- Rating: 5.0 stars on Google.
- Service area: Palm Beach County and Broward County, Florida.
- Based in: Boca Raton, FL.
- Phone: (561) 583-6694
- Email: contact@ultrashinecleaningfl.com
- Hours: Monday to Friday 7am to 5pm, Saturday 8am to 12pm, closed Sunday.
- Quotes: free, no obligation, returned within one hour. Every home is quoted after an in-person walkthrough rather than from a flat-rate price list.
- Insurance: comprehensive general liability, bonded through a licensed surety. Certificate of Insurance available on request.

## Services

${serviceLines}

## Service areas

${cityLines}

## Answers to common questions

- [Frequently asked questions](${BASE}/faq): 27 answers covering cost, scheduling, who enters your home, supplies, pets, gated communities, apartments and condos, and vacation rental turnovers.
- [Why we don't list flat prices](${BASE}/pricing-philosophy): why a 2,000 sq ft Boca condo and a 4,500 sq ft Parkland home cannot honestly share one published rate.
- [Cleaning cost calculator](${BASE}/cleaning-time-estimator): a few quick questions including square footage and floors, returns a ballpark price range and time estimate. No email required.

## Guides

${postLines}

## About and contact

- [About Ultra Shine Cleaning](${BASE}/about): how a husband-and-wife business went from a Connecticut basement to ${CITIES.length} South Florida cities.
- [Reviews](${BASE}/reviews): verified customer reviews from Google and HomeAdvisor.
- [Request a free quote](${BASE}/quote): the fastest way to get a price. Returned within one hour.
- [Cleaning jobs](${BASE}/work-for-us): we hire cleaners across Palm Beach and Broward.
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
