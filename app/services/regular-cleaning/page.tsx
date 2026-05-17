import type { Metadata } from 'next';
import ServicePage, { type ServiceData } from '../_components/ServicePage';

export const metadata: Metadata = {
  title: 'Regular Cleaning · Ultra Shine Cleaning',
  description:
    'Weekly, bi-weekly, or monthly house cleaning across Boca Raton + South Florida. Background-checked W2 team, color-coded cloths, 100% satisfaction guarantee. Custom quote in 1 hour.',
};

const data: ServiceData = {
  slug: 'regular-cleaning',
  name: 'Regular Cleaning',
  number: '01',
  heroImage: '/images/flow_living_room_navy.jpg',
  headline: 'The weekly _reset_ that keeps it pristine.',
  subheadline:
    'Weekly, bi-weekly, or monthly maintenance across Palm Beach + Broward — your home stays consistently clean, never spirals into "I need a deep clean" again.',
  included: {
    kitchen: [
      'Counters, sinks, faucets polished',
      'Stovetop wiped (exterior)',
      'Microwave wiped inside + out',
      'Appliance exteriors (fridge, dishwasher)',
      'Floors swept + mopped',
      'Trash emptied + bag replaced',
    ],
    bathrooms: [
      'Toilets cleaned + sanitized',
      'Sinks + counters wiped + polished',
      'Mirrors polished streak-free',
      'Shower + tub wiped down',
      'Floors swept + mopped',
      'Fresh towels folded (if requested)',
    ],
    livingBedrooms: [
      'Beds made (if linens left out)',
      'Surfaces dusted (low + mid level)',
      'Floors vacuumed + mopped',
      'Throw pillows fluffed',
      'Glass tables polished',
      'Trash emptied',
    ],
    wholeHome: [
      'High-traffic floors mopped',
      'Light switches + doorknobs wiped',
      'Cobweb sweep (if visible)',
      'Color-coded cloths (no cross-contamination)',
      'Music optional (we ask first)',
      '100% satisfaction or we come back free',
    ],
  },
  scenarios: [
    {
      title: 'Weekly maintenance',
      body: 'For active households or homes with kids + pets — weekly cleans keep dust, hair, and surface grime under control before they become problems.',
    },
    {
      title: 'Bi-weekly (every other week)',
      body: 'Most popular cadence. Strong balance between cost + cleanliness. Works for most 2-4 person households without small kids/pets.',
    },
    {
      title: 'Monthly check-in',
      body: 'For tidy households + people who already do their own light cleaning. We come in monthly to handle the deeper baseline reset.',
    },
    {
      title: 'After your deep clean',
      body: "Once your home is fully reset by a deep clean, regular maintenance is what keeps it that way. Most clients pair the two.",
    },
  ],
  differs: {
    regularLabel: 'Regular',
    thisLabel: 'Deep (also offered)',
    regularItems: [
      'Surfaces dusted (low + mid)',
      'Floors vacuumed + mopped',
      'Bathrooms wiped down',
      'Kitchen counters + appliances exterior',
      'Beds made if linens out',
      'Ideal for ongoing maintenance',
    ],
    thisItems: [
      'Everything in Regular, PLUS:',
      'Baseboards + door frames hand-wiped',
      'Inside oven, fridge, dishwasher',
      'Grout scrubbed + tile reset',
      'Light fixtures, ceiling fans, vents',
      'Ideal every 90 days as a full reset',
    ],
  },
  faq: [
    {
      q: 'How long does a regular clean take?',
      a: "Every home is different — square footage, layout, number of bathrooms, pets, kids, and lived-in level all change the timing. We give you a precise estimate when we walk through your space for the quote. No two homes get the same number.",
    },
    {
      q: 'Do I need to be home?',
      a: "No. Most clients give us a key code or hide a key. Our team is bonded, insured, and background-checked. Some clients prefer to be home the first time, then leave the key after.",
    },
    {
      q: "What's the difference between weekly and bi-weekly?",
      a: "Weekly is for active households (kids, pets, frequent cooking, lots of foot traffic). Bi-weekly is the most popular — works for most 2-4 person homes. Frequency affects price slightly.",
    },
    {
      q: 'What products do you use?',
      a: "Method, Mrs Meyer's, ECOS, distilled white vinegar, baking soda. All EPA-safe + kid + pet friendly. If you have specific allergies or product preferences, tell us in advance and we'll bring those instead.",
    },
    {
      q: 'Can I skip a week / change my schedule?',
      a: "Yes — text us 24+ hours in advance and we'll reschedule. We're flexible. Just give us a heads up so the team can plan their day.",
    },
    {
      q: 'What if something is missed?',
      a: "Tell us within 24 hours and we send the team back to fix it — at no charge. That's our 100% satisfaction guarantee. We'd rather come back twice than have you unhappy once.",
    },
  ],
  ctaKeyword: 'WEEKLY',
};

export default function RegularCleaningPage() {
  return <ServicePage data={data} />;
}
