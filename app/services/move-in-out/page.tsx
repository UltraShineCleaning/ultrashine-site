import type { Metadata } from 'next';
import ServicePage, { type ServiceData } from '../_components/ServicePage';

export const metadata: Metadata = {
  title: 'Move-In / Move-Out Cleaning · Ultra Shine Cleaning',
  description:
    'Landlord-grade move-in / move-out cleaning across Boca Raton + South Florida. Get your full deposit back. Background-checked team, fully insured. Custom quote in 1 hour.',
};

const data: ServiceData = {
  slug: 'move-in-out',
  name: 'Move-In / Out',
  number: '03',
  heroImage: '/images/service_movein_boxes.jpg',
  headline: 'Get your _full_ deposit back.',
  subheadline:
    'Landlord-grade move-in or move-out cleaning across Palm Beach + Broward — every appliance interior, every cabinet, every wall scuff. Most clients walk away with 100% of their security deposit.',
  included: {
    kitchen: [
      'Oven interior + drip pans + racks',
      'Fridge interior + freezer + drawers',
      'Dishwasher interior + filter',
      'Microwave interior + exterior',
      'Inside + outside ALL cabinets + drawers',
      'Range hood degrease + filter',
    ],
    bathrooms: [
      'Toilet base + behind toilet detailed',
      'Shower glass restored',
      'Grout + tile scrubbed',
      'Vanity drawers + cabinet interiors',
      'Mirror + light fixtures polished',
      'Floor scrubbed + grout treated',
    ],
    livingBedrooms: [
      'All baseboards hand-wiped',
      'All door frames + doors',
      'Closet shelving + cubbies',
      'Window tracks + sills',
      'Air vents + return grilles',
      'Wall scuff spot-clean (saves paint cost)',
    ],
    wholeHome: [
      'Every floor deep mopped',
      'All blinds dusted (slat by slat)',
      'Every light switch + doorknob',
      'Cobweb sweep top-to-bottom',
      'Inside windows polished',
      '100% landlord-ready guarantee',
    ],
  },
  scenarios: [
    {
      title: "You're moving OUT",
      body: "Get your security deposit back in full. We do the level of clean landlords expect — no excuses, no negotiations, just spotless. Schedule for the day before keys turn over.",
    },
    {
      title: "You're moving IN",
      body: "The previous tenant cleaned. Their definition of clean isn't yours. Book a move-in clean before you unpack — start fresh in a home that's actually yours.",
    },
    {
      title: 'Selling your home',
      body: "Listed homes show better when spotless. We deep-clean before your first showing so it photographs + walks-through immaculate. Pairs well with staging.",
    },
    {
      title: 'Vacation rental turnover',
      body: 'Airbnb / VRBO between guests? We do quick-turn rental cleanings on tight deadlines. Most owners book us recurring for every changeover.',
    },
  ],
  differs: {
    regularLabel: 'Deep Clean',
    thisLabel: 'Move-In / Out',
    regularItems: [
      'Inside oven, fridge, dishwasher',
      'Baseboards + door frames',
      'Light fixtures + ceiling fans',
      'Grout scrubbed',
      'Done WITH your stuff in place',
    ],
    thisItems: [
      'Everything in Deep, PLUS:',
      'Inside ALL cabinets + drawers',
      'Wall scuff spot-cleaning',
      'Closet shelving + window tracks',
      'Done in EMPTY home (faster + more thorough)',
      'Landlord-grade documented finish',
    ],
  },
  faq: [
    {
      q: 'When should I book?',
      a: "Schedule the move-out clean for the day after your stuff is out (so we can clean an empty home). For move-in, schedule the day before you unpack so the home is fresh when your boxes arrive.",
    },
    {
      q: "Will the home be empty when you arrive?",
      a: "Yes for move-out — your stuff should already be moved. We can't deep-clean cabinets if they're full. For move-in, we work with whatever's there (usually empty since you haven't moved in yet).",
    },
    {
      q: "How long does it take?",
      a: "8-12 hours for a 3-bedroom home with team of 3. Move-in/out is more thorough than a normal deep clean (cabinet interiors, wall scuffs, etc.) so it takes longer.",
    },
    {
      q: "Do you provide a checklist for the landlord?",
      a: "Yes. We document with before/after photos and provide an itemized list of what was done. Hand it to your landlord at checkout — most landlords accept our documentation as deposit-back proof.",
    },
    {
      q: "What if the landlord still withholds the deposit?",
      a: "We've never had this happen with proper documentation, but if it does — we provide written documentation of our work, photos, and our team can speak to the landlord directly. Our work is guaranteed.",
    },
    {
      q: "Can you also clean the carpets?",
      a: "We do cleaning, not carpet shampooing. We can recommend a trusted carpet partner who works with us — they offer a discount when bundled with our move-in/out clean.",
    },
  ],
  ctaKeyword: 'MOVE',
};

export default function MoveInOutPage() {
  return <ServicePage data={data} />;
}
