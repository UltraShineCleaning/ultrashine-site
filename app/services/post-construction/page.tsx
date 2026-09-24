import type { Metadata } from 'next';
import ServicePage, { type ServiceData } from '../_components/ServicePage';

export const metadata: Metadata = {
  title: { absolute: 'Post-Construction Cleaning Boca Raton, FL · Ultra Shine' },
  description:
    'Post-construction and renovation cleanup in Boca Raton, Fort Lauderdale + South Florida. Fine-dust removal, sticker + paint speck removal, move-in ready finish. Custom quote in 1 hour.',
  alternates: {
    canonical: 'https://ultrashinecleaningfl.com/services/post-construction',
  },
};

const data: ServiceData = {
  slug: 'post-construction',
  name: 'Post-Construction',
  number: '05',
  heroImage: '/images/service_postconstruction.jpg',
  // SEO: had "construction" but not "post-construction cleaning". One char
  // longer than before, so the line count is unchanged.
  headline: 'Post-construction cleaning, dust to _done_.',
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
      // Replaced 2026-09-24. "Construction debris removal (small)" is covered in
      // the FAQ, and the guarantee applies site-wide. These two are where dust
      // actually hides on a new build — and what separates a real final clean
      // from a wipe-down.
      'Door tops, frames + crown molding',
      'Stairs, treads, balusters + handrail',
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
      q: 'Where does construction dust actually hide?',
      a: "Everywhere air moves and everywhere it settles. The places a rushed clean skips: the tops of door frames and the top edge of every door, crown molding and the tops of upper cabinets, recessed light trims, ceiling fan blades, every AC vent and return grille, window and sliding-door tracks, inside every drawer and cabinet box, stair treads, balusters and the handrail, baseboard tops and shoe molding, outlet and switch plates, closet shelves and rods, shower-door channels, and behind and under the appliances. Drywall dust is fine enough to hang in the air and keep settling for days after the last trade leaves, and the AC pulls it through the returns and blows it back out. That's why we work top to bottom, and why a touch-up the day before move-in is worth it.",
    },
    {
      q: 'Why does it cost more than a deep clean?',
      a: "Because it's a different amount of work. A deep clean removes buildup from a home people live in. After construction, every surface in the house carries a film of fine dust, including the inside of cabinets, closets and drawers nobody has opened yet, plus stickers, protective film, paint specks and grout haze on brand-new finishes that scratch if they're cleaned the wrong way. On a large new build it's typically two to three times the hours of a deep clean. Our price follows your square footage, floors and bathrooms, so you pay for the house you actually have, not a flat rate built around an average one.",
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
