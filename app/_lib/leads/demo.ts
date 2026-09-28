import type { LeadRecord } from './types';

/** Sample leads for local screenshots + tests only (INSIGHTS_DEMO=1, never in production). */
export function demoLeads(now = Date.now()): LeadRecord[] {
  const H = 3600_000;
  const D = 86_400_000;
  const base = (id: string, at: number, extra: Partial<LeadRecord>): LeadRecord => ({
    id, kind: 'quote', at, name: 'Lead', stage: 'new', stageAt: at, origin: 'form',
    history: [{ at, text: 'Quote request received' }, { at, text: 'Office email sent' }], ...extra,
  });
  return [
    base('q1', now - 65 * 60_000, {
      name: 'Walter Pasache', phone: '9545550142', email: 'walter@example.com', service: 'Deep Cleaning', frequency: 'One-time',
      estimate: '$320 – $390', bedrooms: 3, bathrooms: 2, sqft: 1800, floors: 1, street: '1234 NE 5th St', city: 'Pompano Beach', zip: '33060',
      addOns: ['Inside oven', 'Inside fridge'], notes: 'We have a dog. Friday mornings work best for us.', heardFrom: 'Google Search',
    }),
    { id: 'soc_ig_1', kind: 'social', at: now - 3 * H, name: '@jess.boca', platform: 'instagram', convKey: 'instagram:1',
      lastMessage: 'How much for a move-out clean in Boca?', stage: 'new', stageAt: now - 3 * H, origin: 'social',
      history: [{ at: now - 3 * H, text: 'Messaged on Instagram' }] },
    base('q2', now - 3 * D, {
      name: 'Laura Mendes', phone: '5615550188', email: 'laura@example.com', service: 'Regular Cleaning', frequency: 'Bi-weekly',
      estimate: '$190 – $230', bedrooms: 4, bathrooms: 3, sqft: 2600, city: 'Delray Beach', heardFrom: 'Instagram',
      stage: 'contacted', stageAt: now - 3 * D + 40 * 60_000, contactedAt: now - 3 * D + 40 * 60_000,
    }),
    { id: 'soc_fb_3', kind: 'social', at: now - 5 * D, name: 'KevinDuarte', platform: 'facebook', convKey: 'facebook:3',
      lastMessage: 'price for 2 bed?', city: 'Coconut Creek', stage: 'quoted', stageAt: now - 4 * D, contactedAt: now - 5 * D + 25 * 60_000, origin: 'social',
      history: [{ at: now - 5 * D, text: 'Messaged on Facebook' }, { at: now - 4 * D, text: 'Moved to Quoted' }] },
    base('q3', now - 8 * D, {
      name: 'Megan Turner', phone: '9545550111', service: 'Deep Cleaning', estimate: '$300 – $360', bedrooms: 3, bathrooms: 2, city: 'Lighthouse Point',
      heardFrom: 'Google Search', stage: 'booked', stageAt: now - 7 * D, contactedAt: now - 8 * D + 30 * 60_000,
    }),
    base('q4', now - 11 * D, {
      name: 'Janet Ross', service: 'Post-Construction Cleaning', estimate: '$650 – $800', sqft: 2400, city: 'Parkland', heardFrom: 'Referral',
      stage: 'lost', stageAt: now - 9 * D, contactedAt: now - 11 * D + 90 * 60_000, ownerNotes: 'Went with the builder’s crew.',
    }),
    { id: 'a1', kind: 'application', at: now - 4 * D, name: 'Rosa Cardenas', phone: '5615550170', email: 'rosa@example.com', city: 'Boynton Beach',
      language: 'English, Spanish', experience: '3 years', ownTransport: true, usAuthorized: true, availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      stage: 'new', stageAt: now - 4 * D, origin: 'form', history: [{ at: now - 4 * D, text: 'Application received' }] },
    { id: 'a2', kind: 'application', at: now - 8 * D, name: 'Daniela Moura', phone: '9545550133', city: 'Deerfield Beach',
      language: 'Portuguese, English', experience: '1 year', ownTransport: true, usAuthorized: true, availableDays: ['Mon', 'Wed', 'Fri', 'Sat'],
      stage: 'contacted', stageAt: now - 7 * D, origin: 'form', history: [] },
    { id: 'a3', kind: 'application', at: now - 11 * D, name: 'Keisha Brown', email: 'keisha@example.com', city: 'Pompano Beach',
      language: 'English', experience: '5+ years', ownTransport: false, usAuthorized: true, availableDays: ['Tue', 'Thu', 'Sat'],
      stage: 'new', stageAt: now - 11 * D, origin: 'email', history: [] },
  ];
}
