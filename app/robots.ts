import type { MetadataRoute } from 'next';

/**
 * Auto-generates /robots.txt.
 * Allows everything except the API + Next.js internals,
 * and points crawlers at the sitemap.
 *
 * AI CRAWLERS ARE DELIBERATELY ALLOWED. The `*` rule covers GPTBot, ClaudeBot,
 * PerplexityBot, Google-Extended and the rest, and that is the intent: when
 * someone asks an AI assistant who cleans houses in Boca Raton, we want to be
 * one of the sources it can read and cite. Blocking them would trade away free
 * distribution to a customer who is already asking to hire someone.
 *
 * See also /llms.txt (app/llms.txt/route.ts) — the plain-markdown site summary
 * those crawlers read most easily.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/_next/'],
    },
    sitemap: 'https://ultrashinecleaningfl.com/sitemap.xml',
    host: 'https://ultrashinecleaningfl.com',
  };
}
