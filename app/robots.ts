import type { MetadataRoute } from 'next';

/**
 * Auto-generates /robots.txt.
 * Allows everything except the API + Next.js internals,
 * and points crawlers at the sitemap.
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
