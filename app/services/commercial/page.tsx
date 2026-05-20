import type { Metadata } from 'next';
import ServicePage, { type ServiceData } from '../_components/ServicePage';

export const metadata: Metadata = {
  title: 'Commercial Office Cleaning · Ultra Shine Cleaning',
  description:
    'Commercial + office cleaning across Boca Raton + South Florida. After-hours service, custom schedules, COI on file, background-checked W2 team. Custom quote in 1 hour.',
};

const data: ServiceData = {
  slug: 'commercial',
  name: 'Commercial',
  number: '04',
  heroImage: '/images/service_commercial_office.jpg',
  headline: 'Offices that _stay_ presentable.',
  subheadline:
    'After-hours commercial cleaning across Palm Beach + Broward — offices, medical suites, salons, boutique retail. Your team walks into a fresh space every morning, no exceptions.',
  included: {
    kitchen: [
      'Break room counters + sink',
      'Coffee station + microwave',
      'Fridge exterior + handles',
      'Dishwasher loaded + run (if requested)',
      'Floor swept + mopped',
      'Trash + recycling emptied',
    ],
    bathrooms: [
      'Toilets sanitized (every stall)',
      'Sinks, counters, mirrors polished',
      'Soap + paper restock (you supply)',
      'Floor scrubbed + grout treated',
      'Touch points (handles, dispensers)',
      'High-touch sanitizer wipe-down',
    ],
    livingBedrooms: [
      'Desks wiped (we work around papers)',
      'Reception + lobby reset',
      'Conference room ready for AM',
      'Carpets vacuumed',
      'Glass partitions polished',
      'All trash emptied + relined',
    ],
    wholeHome: [
      'All hard floors swept + mopped',
      'Light switches + door handles',
      'Cobweb sweep (corners + ceilings)',
      'Window-front glass spot-cleaned',
      'Color-coded cloths (no cross-contam)',
      'COI emailed to property mgmt',
    ],
  },
  scenarios: [
    {
      title: 'After-hours nightly',
      body: 'Most popular for busy offices + medical practices. We arrive after 6pm, finish before 7am. Your team never sees us, just walks into a fresh space every morning.',
    },
    {
      title: 'Weekly / bi-weekly',
      body: 'For smaller offices, salons, boutique retail. We come in 1-2x per week on a fixed schedule. Predictable invoice, predictable result.',
    },
    {
      title: 'Medical + dental suites',
      body: 'We follow OSHA-aware protocols for clinical settings — no cross-contamination between rooms, EPA-registered disinfectants, sharps-area procedures. Ask for our medical checklist.',
    },
    {
      title: 'Move-out / lease-end',
      body: "Vacating an office space? We do landlord-grade commercial move-outs so you get your build-out deposit back. Coordinate with your facilities team.",
    },
  ],
  differs: {
    regularLabel: 'Residential',
    thisLabel: 'Commercial',
    regularItems: [
      'Daytime appointments',
      'Homeowner present (or key)',
      'Standard residential checklist',
      'No COI required',
      'Invoice per visit',
    ],
    thisItems: [
      'Everything in Residential, PLUS:',
      'After-hours / night service',
      'COI on file (named insured)',
      'OSHA-aware protocols available',
      'Net-30 invoicing for businesses',
      'Property mgmt coordination',
    ],
  },
  faq: [
    {
      q: 'Can you clean after our office closes?',
      a: "Yes. Most of our commercial accounts are after-hours (after 6pm or before 7am). We have a key + alarm code on file, lock up when finished. Your team never sees us.",
    },
    {
      q: 'Do you provide a Certificate of Insurance?',
      a: "Yes. We carry $2M general liability + workers comp + bonding. We email a COI naming your business + property management as additional insured before our first visit. No charge.",
    },
    {
      q: 'How are you priced for commercial?',
      a: "Per visit, based on square footage, frequency, and scope. We tour your space, give you a flat per-visit rate, and lock it in. No surprise charges — if scope changes you'll see a quote first.",
    },
    {
      q: 'Do you handle medical or dental offices?',
      a: "Yes. We follow strict no-cross-contamination protocols between exam rooms, use EPA-registered disinfectants, and have specific procedures for sharps-area clean-down. Ask for our medical checklist.",
    },
    {
      q: 'What about supplies — soap, paper, trash bags?',
      a: "You supply consumables (toilet paper, paper towels, hand soap, trash bags) — we restock them as part of every visit. Cleaning chemicals + equipment we always bring.",
    },
    {
      q: 'How do we get billed?',
      a: "Net-30 invoicing for established commercial accounts (after first visit). New accounts pay first visit by card, then move to net-30. We send digital invoices monthly via QuickBooks.",
    },
  ],
  ctaKeyword: 'OFFICE',
};

export default function CommercialPage() {
  return <ServicePage data={data} />;
}
