import type { MetadataRoute } from 'next';
import { CITIES } from './areas/_data/cities';

/**
 * Auto-generates /sitemap.xml from all routes the site exposes.
 * Pulls city list from app/areas/_data/cities.ts — add a city there,
 * it auto-appears here on next build.
 *
 * Submit this URL to Google Search Console once after deploy:
 *   https://ultrashinecleaningfl.com/sitemap.xml
 */

const BASE = 'https://ultrashinecleaningfl.com';

const SERVICES = [
  'regular-cleaning',
  'deep-cleaning',
  'move-in-out',
  'commercial',
  'post-construction',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Top-level pages
  const core: MetadataRoute.Sitemap = [
    {
      url: `${BASE}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE}/quote`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${BASE}/work-for-us`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE}/areas`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE}/reviews`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.75,
    },
  ];

  // Service pages
  const services: MetadataRoute.Sitemap = SERVICES.map((slug) => ({
    url: `${BASE}/services/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.85,
  }));

  // City landing pages
  const cities: MetadataRoute.Sitemap = CITIES.map((city) => ({
    url: `${BASE}/areas/${city.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [...core, ...services, ...cities];
}
