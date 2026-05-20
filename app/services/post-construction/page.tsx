import type { Metadata } from 'next';
import ServicePage, { type ServiceData } from '../_components/ServicePage';

export const metadata: Metadata = {
  title: 'Post-Construction Cleaning · Ultra Shine Cleaning',
  description:
    'Post-construction + renovation cleanup in Boca Raton + South Florida. Fine-dust removal, sticker + paint speck removal, move-in ready finish. Custom quote in 1 hour.',
};

const data: ServiceData = {
  slug: 'post-construction',
  name: 'Post-Construction',
  number: '05',
  heroImage: '/images/service_postconstruction.jpg',
  headline: 'From _construction_ dust to move-in ready.',
  subheadline:
    'Post-construction + renovation cleanup across Palm Beach + Broward — drywall dust, paint specks, stickers, debris. We turn a finished build into a home you can actually move into.',
  included: {
    kitchen: [
      'Cabinet exteriors + interiors',
      'Inside drawers + soft-close hardware',
      'Appliance stickers + protective film',
      'Backsplash grout cleaned',
      'Counters polished (sealed if stone)',
      'Sink, faucet, garbage disposal',
    ],
    bathrooms: [
      'Tile + grout fully cleaned',
      'Shower glass film + protective stickers',
      'Toilet wax-ring area + base',
      'Vanity drawers + cabinet interiors',
      'Mirror + light fixtures detailed',
      'Floor tile + grout + caulk lines',
    ],
    livingBedrooms: [
      'All baseboards + door frames',
      'Inside windows + tracks + sills',
      'Closet shelving + cubbies + rods',
      'Outlet covers + switch plates',
      'Air vent grilles + HVAC returns',
      'Wall scuff + paint speck removal',
    ],
    wholeHome: [
      'Fine-dust vacuum on every surface',
      'Floor finish (engineered hardwood, LVP, tile)',
      'Light fixtures + ceiling fans + bulbs',
      'Sticker + tape residue everywhere',
      'Construction debris removal (small)',
      'Move-in ready guarantee',
    ],
  },
  scenarios: [
    {
      title: 'New construction handover',
      body: "Your builder finished punch list. The home is technically done but covered in fine drywall dust + sticker residue. We make it actually move-in ready before your closing or first night.",
    },
    {
      title: 'Major renovation',
      body: "Kitchen remodel, bathroom gut, addition. Construction is done but the dust traveled into every room. We do whole-home post-reno so you can use the space immediately.",
    },
    {
      title: 'Flip / pre-listing',
      body: "Investor or flipper finishing a property for market. We do the final post-construction so the home shows immaculate to buyers + photographs flawlessly.",
    },
    {
      title: 'Builder / GC partner',
      body: "We work with several local GCs as their post-construction specialist. Need a recurring partner? Contact us — we're set up for repeat builder accounts.",
    },
  ],
  differs: {
    regularLabel: 'Deep Clean',
    thisLabel: 'Post-Construction',
    regularItems: [
      'Standard household dust + grime',
      'Inside oven, fridge, dishwasher',
      'Baseboards + door frames',
      'Grout scrubbed',
      'Done in lived-in home',
    ],
    thisItems: [
      'Everything in Deep, PLUS:',
      'Fine drywall + construction dust',
      'Sticker + protective film removal',
      'Paint speck + grout haze cleanup',
      'Fine-dust vacuuming + sealed waste containment',
      'Empty home, contractor-grade finish',
    ],
  },
  faq: [
    {
      q: 'How is this different from a deep clean?',
      a: "Deep cleans handle household dust + buildup. Post-construction handles drywall dust (which is much finer + harder to remove), paint specks, sticker residue, grout haze, and protective film on appliances. We vacuum every surface and use specific products that don't damage new finishes.",
    },
    {
      q: 'How long does it take?',
      a: "Every site is different — square footage, dust severity, sticker quantity, finish materials, debris volume all change the timing. Post-construction is the most variable of all our services. We give you a precise estimate when we walk through your space.",
    },
    {
      q: 'When should I book — before or after my final inspection?',
      a: "After. We're the LAST trade in the home before you move in. If we clean before the inspector + punch list, the dust comes back. Book us 1-3 days before your move-in date.",
    },
    {
      q: "Will you damage my new finishes?",
      a: "No. We use products specifically formulated for new construction (won't strip new paint, won't damage sealed stone, won't cloud new shower glass). Our team is trained on contractor-grade procedures.",
    },
    {
      q: 'Do you work with builders + GCs?',
      a: "Yes. Several local builders + GCs use us as their go-to post-construction partner. Net-30 invoicing, COI on file, discount for repeat work. Contact us for builder pricing.",
    },
    {
      q: 'Do you remove construction debris?',
      a: "Small debris (sticker scraps, packaging, sawdust) — yes, included. Large debris (drywall scraps, lumber, fixtures) is your contractor's responsibility — they should haul that off before we arrive.",
    },
  ],
  ctaKeyword: 'POST',
};

export default function PostConstructionPage() {
  return <ServicePage data={data} />;
}
