/**
 * Single source of truth for all 13 city landing pages.
 * To add a city: append an entry below and a static page is generated
 * at /areas/{slug} on the next build.
 */

export type CityData = {
  slug: string;
  name: string;
  county: 'Palm Beach' | 'Broward';
  /** Short hero subline — sets the local vibe */
  vibe: string;
  /** Longer intro paragraph for the body — unique per city for SEO */
  intro: string;
  /** 3 reasons we're a good fit for THIS city specifically */
  whyHere: string[];
  /** Notable neighborhoods / zip codes / landmarks in this city we serve */
  areas: string[];
  /** Hero image (path under /public/images/) */
  heroImage: string;
};

export const CITIES: CityData[] = [
  // ===== PALM BEACH COUNTY =====
  {
    slug: 'boca-raton',
    name: 'Boca Raton',
    county: 'Palm Beach',
    vibe: 'Our home city. Boca was where Ultra Shine started its Florida chapter — we know every gated community, every estate corridor, every condo tower.',
    intro:
      "Boca Raton homes range from beachfront condos at the Boca Beach Club to estates in St. Andrews and the Sanctuary, plus thousands of family homes throughout Boca West, Camino Real, and Royal Palm. We service all of them — same standard, same team, same precision. Most of our recurring clients live in Boca, and our crews are based here, which means faster scheduling and shorter response times than companies based 30 minutes away.",
    whyHere: [
      'Local team based in Boca — fastest scheduling in the area',
      'Familiarity with high-end finishes (Sub-Zero, Wolf, marble) common in Boca homes',
      'HOA + gate-code experience for Royal Palm, St. Andrews, Boca West, Polo Club',
    ],
    areas: [
      'Boca West', 'St. Andrews', 'The Sanctuary', 'Royal Palm Yacht & Country Club',
      'Camino Real', 'Boca Bath & Tennis', 'Polo Club', 'Mizner Park / Downtown',
      'Boca Pointe', 'Boca Grove', 'Sunrise Lake', '33428 / 33432 / 33433 / 33486 / 33496',
    ],
    heroImage: '/images/flow_hero_kitchen.jpg',
  },
  {
    slug: 'delray-beach',
    name: 'Delray Beach',
    county: 'Palm Beach',
    vibe: 'From the Atlantic Avenue lifestyle to the quiet Hammocks — we clean Delray homes from downtown lofts to coastal estates.',
    intro:
      "Delray has one of the most distinct mixes in South Florida — walkable downtown condos on Atlantic Avenue, golf-course estates in Hammock Reserve and Mizner Country Club, and coastal homes along Ocean Boulevard. Whether you're a downtown professional with a Pineapple Grove condo or a family in Stone Creek Ranch, our team handles the cleaning with the same care.",
    whyHere: [
      'Familiar with Delray downtown condo turnover schedules',
      'Coastal-home expertise (salt-air buildup, sliding-door tracks, sandy entryways)',
      'Available for Stone Creek Ranch, Mizner Country Club, Hammock Reserve estate work',
    ],
    areas: [
      'Atlantic Avenue / Pineapple Grove', 'Delray Beach (East)', 'Lake Ida',
      'Hammock Reserve', 'Stone Creek Ranch', 'Mizner Country Club', 'Polo Trace',
      'Seven Bridges', 'Addison Reserve', '33444 / 33445 / 33446 / 33483 / 33484',
    ],
    heroImage: '/images/flow_living_room_navy.jpg',
  },
  {
    slug: 'boynton-beach',
    name: 'Boynton Beach',
    county: 'Palm Beach',
    vibe: 'Family-oriented, mix of single-family homes + active-adult communities. Quiet, recurring, reliable cleaning is what Boynton calls for.',
    intro:
      "Boynton Beach is mostly residential — Valencia communities (Valencia Cove, Valencia Reserve, Valencia Pointe), family neighborhoods in Hunters Run and Indian Spring, plus the newer developments off Boynton Beach Boulevard. Recurring weekly or bi-weekly maintenance is what most Boynton clients book — and that's exactly what we're built for.",
    whyHere: [
      'Recurring-route expertise for Valencia + active-adult communities',
      'Bonded, insured, background-checked — required for most HOAs here',
      'Flexible scheduling around seasonal residents + snowbird turnovers',
    ],
    areas: [
      'Valencia Cove', 'Valencia Reserve', 'Valencia Pointe', 'Indian Spring',
      'Hunters Run', 'Quail Ridge', 'Aberdeen', 'The Estates at Boynton Waters',
      '33426 / 33435 / 33436 / 33437 / 33472 / 33473',
    ],
    heroImage: '/images/flow_bathroom_sunset.jpg',
  },
  {
    slug: 'lake-worth',
    name: 'Lake Worth',
    county: 'Palm Beach',
    vibe: 'Historic charm meets casual coastal living — bungalows, beach cottages, modern condos. We clean them all.',
    intro:
      "Lake Worth (officially Lake Worth Beach) has one of the most architecturally diverse housing stocks in the area — historic bungalows in the College Park district, modern downtown condos, beachfront homes east of Dixie, and family neighborhoods west of I-95. The character of each home is different; the standard of clean we bring is identical.",
    whyHere: [
      'Experience with older historic homes (tile floors, plaster walls, vintage fixtures)',
      'Beachfront condo cleaning (salt-air windows, balcony sliders)',
      'Family-home weekly maintenance west of I-95',
    ],
    areas: [
      'College Park', 'Downtown Lake Worth', 'South Palm Park',
      'Lake Worth Beach', 'Lakeside Gardens', 'Bryant Park', 'Lake Worth Towers',
      '33460 / 33461 / 33462 / 33463 / 33467',
    ],
    heroImage: '/images/flow_living_areas.jpg',
  },
  {
    slug: 'west-palm-beach',
    name: 'West Palm Beach',
    county: 'Palm Beach',
    vibe: 'The heart of Palm Beach County — historic downtown, El Cid, the Northwood District, plus the entire western corridor.',
    intro:
      "West Palm Beach covers a lot of ground — from CityPlace + Clematis Street downtown lofts to the historic El Cid + Flamingo Park neighborhoods, west to the Bear Lakes + Ibis country clubs. Our team works across all of it. Whether you have a 2,000 sq ft townhouse near downtown or a 6,000 sq ft estate in Bear Lakes, our checklist scales with your home.",
    whyHere: [
      'Comfortable across the full spectrum — downtown lofts to BallenIsles estates',
      'Historic-home experience (El Cid, Flamingo Park, Old Northwood)',
      'Country club + gated-community vetted (BallenIsles, Bear Lakes, Ibis)',
    ],
    areas: [
      'Downtown / CityPlace / Clematis', 'El Cid', 'Flamingo Park',
      'Old Northwood', 'Northwood', 'Bear Lakes', 'BallenIsles', 'Ibis',
      'The Acreage', '33401 / 33405 / 33406 / 33407 / 33409 / 33411 / 33412 / 33414',
    ],
    heroImage: '/images/flow_hand_marble.jpg',
  },
  {
    slug: 'wellington',
    name: 'Wellington',
    county: 'Palm Beach',
    vibe: 'Equestrian estate country + family neighborhoods. Polo season is intense — your home should be one less thing to think about.',
    intro:
      "Wellington has a unique cleaning market — equestrian estates in Palm Beach Polo + Grand Prix Village that see a lot of seasonal traffic, plus quiet family neighborhoods in Olympia, Versailles, Black Diamond, and Binks Forest. Our crews come in regularly during polo + WEF season (January–April) when most of your social calendar lives here.",
    whyHere: [
      'Polo-season turnover experience — quick, thorough, discreet',
      'Estate-scale home capacity (6,000+ sq ft, multiple crews)',
      'Same crew every visit so they learn your specific home',
    ],
    areas: [
      'Palm Beach Polo', 'Grand Prix Village', 'Versailles', 'Olympia',
      'Black Diamond', 'Binks Forest', 'Aero Club', 'Isles at Wellington',
      'Mayacoo Lakes', '33414 / 33449 / 33470',
    ],
    heroImage: '/images/flow_living_room_navy.jpg',
  },
  {
    slug: 'parkland',
    name: 'Parkland',
    county: 'Broward',
    vibe: 'Family-focused, top-rated schools, gated communities. Parkland homes are big, busy, and worth doing right.',
    intro:
      "Parkland is one of the most family-oriented cities in South Florida — large homes in Heron Bay, Parkland Bay, Parkland Golf & Country Club, MiraLago, and Cypress Cay. School pickups, after-school sports, weekend events — your home shouldn't be on the to-do list. Weekly maintenance keeps it consistently company-ready.",
    whyHere: [
      'Family-home weekly maintenance is our most-booked Parkland service',
      'HOA + gate-code experience for Heron Bay, MiraLago, Parkland Golf',
      'Kid + pet safe products — required by most Parkland families',
    ],
    areas: [
      'Heron Bay', 'Parkland Bay', 'Parkland Golf & Country Club', 'MiraLago',
      'Cypress Cay', 'Cypress Head', 'The Estates of Parkland',
      'Parkland Reserve', '33067 / 33076',
    ],
    heroImage: '/images/flow_hero_kitchen.jpg',
  },
  // ===== BROWARD COUNTY =====
  {
    slug: 'coral-springs',
    name: 'Coral Springs',
    county: 'Broward',
    vibe: 'Established neighborhoods + young families. Coral Springs is built on routines — and recurring cleaning fits right in.',
    intro:
      "Coral Springs has a steady mix of single-family homes, townhouses, and active-family neighborhoods — Eagle Trace, Heron Bay, Whispering Woods, Country Club Estates. Most of our Coral Springs clients book bi-weekly, which is the perfect rhythm for homes with kids, pets, and full social schedules.",
    whyHere: [
      'Bi-weekly recurring schedule — the cadence Coral Springs families prefer',
      'Vetted, English- and Spanish-speaking team',
      'Pet-safe products available for households with dogs + cats',
    ],
    areas: [
      'Eagle Trace', 'Whispering Woods', 'Country Club Estates',
      'Cypress Glen', 'Forest Hills', 'Kensington', 'Royal Palms',
      'Wyndham Lakes', '33065 / 33067 / 33071 / 33075 / 33076',
    ],
    heroImage: '/images/flow_living_areas.jpg',
  },
  {
    slug: 'fort-lauderdale',
    name: 'Fort Lauderdale',
    county: 'Broward',
    vibe: 'Yacht life, downtown high-rises, beach condos, Las Olas estates. Fort Lauderdale is dense, varied, and demands precision.',
    intro:
      "Fort Lauderdale is the busiest cleaning market in Broward — Las Olas estates, Rio Vista waterfront homes, downtown condos (Sole, Las Olas River House), Galt Ocean Mile high-rises, Sailboat Bend bungalows. Each of these is a different cleaning challenge. Our team handles them all with proper protocols for high-rise buildings, salt-air windows, and yacht-club homes.",
    whyHere: [
      'High-rise + concierge-building experience (loading dock + service elevator)',
      'Yacht / waterfront home expertise (salt-air, marine humidity)',
      'COI on file for buildings that require named insured certificates',
    ],
    areas: [
      'Las Olas', 'Rio Vista', 'Victoria Park', 'Coral Ridge', 'Sailboat Bend',
      'Harbor Beach', 'Bay Colony', 'Galt Ocean Mile', 'Downtown / Flagler Village',
      'Imperial Point', '33301 / 33304 / 33305 / 33308 / 33311 / 33312 / 33316',
    ],
    heroImage: '/images/flow_bathroom_sunset.jpg',
  },
  {
    slug: 'coconut-creek',
    name: 'Coconut Creek',
    county: 'Broward',
    vibe: 'Quiet, leafy, established. Coconut Creek is one of our most consistent recurring markets.',
    intro:
      "Coconut Creek is exactly what its name suggests — quiet, green, mature. Wynmoor, Township, Hillsboro Lakes, Banyan Trails. Many of our Coconut Creek clients have been with us for years on the same bi-weekly schedule with the same crew. It's the kind of routine work we built the business around.",
    whyHere: [
      'Long-term recurring book — most Coconut Creek clients book bi-weekly',
      'Familiar with Wynmoor + age-restricted community access protocols',
      'Quiet operation — we don\'t play music or talk loudly',
    ],
    areas: [
      'Wynmoor', 'Township', 'Hillsboro Lakes', 'Banyan Trails',
      'The Forest', 'Banyan Springs', 'Centura Parc',
      'Winston Park', '33063 / 33066 / 33073 / 33076 / 33093 / 33097',
    ],
    heroImage: '/images/flow_living_room_navy.jpg',
  },
  {
    slug: 'deerfield-beach',
    name: 'Deerfield Beach',
    county: 'Broward',
    vibe: 'Coastal communities + golf neighborhoods. From the beach pier to Deer Creek, we serve all of Deerfield.',
    intro:
      "Deerfield Beach has two distinct sides — the east, where Hillsboro Beach + the Pier corridor + Cove neighborhoods sit on the water, and the west, where Deer Creek, Century Village, and the country club communities cluster. We service both with the same standard. East-side clients tend to book deep cleans before guests; west-side clients tend to book recurring weekly/bi-weekly.",
    whyHere: [
      'Coastal-home expertise (salt-air, sliders, lanai cleaning)',
      'Golf community + age-restricted access experience (Century Village, Deer Creek)',
      'Available for vacation rental + Airbnb turnovers in the Cove + Pier area',
    ],
    areas: [
      'The Cove', 'Hillsboro Beach', 'Riverglen', 'Deer Creek',
      'Century Village', 'Crystal Lake', 'Waterways',
      'Independence Bay', '33064 / 33065 / 33441 / 33442',
    ],
    heroImage: '/images/flow_hand_marble.jpg',
  },
  {
    slug: 'pompano-beach',
    name: 'Pompano Beach',
    county: 'Broward',
    vibe: 'Waterfront living + beachside homes. From the marina to the inland golf neighborhoods.',
    intro:
      "Pompano Beach has grown fast — waterfront homes along the Intracoastal, beach-side condos in the Galt Mile + Atlantic Avenue area, plus newer family neighborhoods like Pompano Isles, Cypress Bend, and Heron Bay (Pompano section). Our team services all of them on schedules that fit your routine — including same-day deep cleans for short-notice guest arrivals.",
    whyHere: [
      'Waterfront + dock-side home expertise (salt air, sliding tracks)',
      'Beach-condo turnovers on Galt Ocean Mile / Atlantic',
      'Same-day deep cleans available for short-notice guest arrivals',
    ],
    areas: [
      'Pompano Isles', 'Cypress Bend', 'Harbor Village', 'Palm Aire',
      'Cresthaven', 'Leisureville', 'Pompano Beach Highlands',
      'The Reserve at Pompano Beach', '33060 / 33062 / 33063 / 33064 / 33069',
    ],
    heroImage: '/images/flow_living_areas.jpg',
  },
  {
    slug: 'margate',
    name: 'Margate',
    county: 'Broward',
    vibe: 'Established suburban neighborhoods + condos. Margate is steady, recurring, family-oriented work — our bread and butter.',
    intro:
      "Margate is a quieter market — established single-family neighborhoods (Holiday Springs, Carolina Estates, Coral Gate, Oriole Margate), condo communities (Carolina Club, Coral Gate, Cypress Run), and townhouse developments. Most clients book bi-weekly maintenance. We've been serving Margate consistently for years — many of our clients started with one-time cleans and converted to recurring.",
    whyHere: [
      'Bi-weekly recurring schedule with same crew every visit',
      'Vetted, bonded team — required by most Margate HOAs',
      'Flexible scheduling for snowbird turnovers (Nov–May)',
    ],
    areas: [
      'Holiday Springs', 'Carolina Estates', 'Coral Gate', 'Oriole Margate',
      'Carolina Club', 'Cypress Run', 'Banyan Lakes',
      'Holiday Lakes', '33063 / 33068 / 33073 / 33093',
    ],
    heroImage: '/images/flow_bathroom_sunset.jpg',
  },
];

export function getCity(slug: string): CityData | undefined {
  return CITIES.find((c) => c.slug === slug);
}
