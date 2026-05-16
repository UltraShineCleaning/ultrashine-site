import type { Metadata } from 'next';
import ServicePage, { type ServiceData } from '../_components/ServicePage';

export const metadata: Metadata = {
  title: 'Deep Cleaning · Ultra Shine Cleaning',
  description:
    'Quarterly deep cleaning service in Boca Raton + South Florida. Baseboards hand-wiped, inside oven + fridge, grout scrubbed, ceiling fans + light fixtures, cabinet exteriors. Background-checked team. Custom quote in 1 hour.',
};

const data: ServiceData = {
  slug: 'deep-cleaning',
  name: 'Deep Cleaning',
  number: '02',
  heroImage: '/images/flow_hand_marble.jpg',
  headline: 'The deep _reset_ your home deserves.',
  subheadline:
    'Quarterly deep cleaning in Palm Beach + Broward — the every-90-day rescue that finds the corners regular cleans skip.',
  included: {
    kitchen: [
      'Inside oven + drip pans + range hood filter',
      'Inside fridge + freezer + drawers',
      'Cabinet exteriors + tops + handles polished',
      'Backsplash deep scrub',
      'Stovetop + grates degreased',
      'Sink overflow drain treated',
    ],
    bathrooms: [
      'Grout scrubbed + tile sealed if needed',
      'Shower glass restored (hard water removed)',
      'Toilet base + behind toilet detailed',
      'Vanity drawers + cabinet exteriors',
      'Light fixtures + vents dusted',
      'Mirror polished streak-free',
    ],
    livingBedrooms: [
      'Baseboards + door frames hand-wiped',
      'Ceiling fans + light fixtures dusted',
      'Inside windows + window tracks',
      'Air vent grilles cleaned',
      'Under furniture vacuumed',
      'Mattress vacuum (if requested)',
    ],
    wholeHome: [
      'Floors deep mopped + grout scrubbed',
      'All trim, baseboards, doors',
      'Light switches + doorknobs sanitized',
      'Air vents + return grilles',
      'Cobweb sweep (corners + ceilings)',
      '100% satisfaction or we come back free',
    ],
  },
  scenarios: [
    {
      title: 'First clean ever',
      body: "If we've never been in your home before, we always start with a deep clean. Then your regular maintenance can stay on top of a fully reset baseline.",
    },
    {
      title: 'Once a quarter (every 90 days)',
      body: 'Even with regular cleaning, dust + grime build in spots regular cleans skip. Quarterly deep keeps your home truly pristine year-round.',
    },
    {
      title: 'After visible buildup',
      body: 'Hard water on shower glass. Grease on the range hood. Dust on baseboards. When you can SEE buildup, regular cleaning won\'t cut it — book deep.',
    },
    {
      title: 'Before guests / a season',
      body: 'Holidays, hosting, the in-laws — moments you want everything reset. Book a deep 1-2 weeks before so the home is camera-ready.',
    },
  ],
  differs: {
    regularLabel: 'Regular',
    thisLabel: 'Deep',
    regularItems: [
      'Surfaces dusted',
      'Floors vacuumed + mopped',
      'Bathrooms wiped down',
      'Kitchen counters cleaned',
      'Stovetop wiped',
      '~3-4 hours per visit',
    ],
    thisItems: [
      'Everything in Regular, PLUS:',
      'Baseboards + door frames hand-wiped',
      'Inside oven, fridge, dishwasher',
      'Grout scrubbed + tile reset',
      'Light fixtures, ceiling fans, vents',
      '~6-8 hours per visit',
    ],
  },
  faq: [
    {
      q: 'How long does a deep clean take?',
      a: "Typically 6-8 hours for a 3-bedroom home, with a team of 2-3 cleaners. Larger homes (4-5+ bedrooms) can take a full day. We give you a precise time estimate when we quote your home.",
    },
    {
      q: 'Do I need to prep before you arrive?',
      a: "No. We do all the moving, lifting, and detail work. If you have specific areas you want extra attention on (or skipped), tell us in advance and we'll customize.",
    },
    {
      q: 'How often should I deep clean?',
      a: "We recommend every 90 days (quarterly) on top of regular maintenance cleans. If you don't have regular cleaning, deep clean monthly to stay ahead of buildup.",
    },
    {
      q: 'Will harsh chemicals damage my surfaces?',
      a: "We never use anything that can damage your surfaces. We use Method, Mrs Meyer's, ECOS, and white vinegar — all kid + pet safe. For tougher buildup like hard water and grease, we use targeted (still-safe) cleaners and test on a small area first.",
    },
    {
      q: 'What if I have pets or kids?',
      a: "All our products are pet + kid safe. Tell us about specific allergies or sensitivities in advance and we'll adjust. Our team is also background-checked, bonded, and insured — peace of mind for families.",
    },
    {
      q: 'Can I just deep-clean one room or area?',
      a: "Yes. Some clients book a 'targeted deep' for just kitchen + bathrooms, or just the master suite. Tell us your priority areas in your quote request — custom pricing for partial deep cleans.",
    },
  ],
  ctaKeyword: 'DEEP',
};

export default function DeepCleaningPage() {
  return <ServicePage data={data} />;
}
