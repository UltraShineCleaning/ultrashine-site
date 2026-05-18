/**
 * Single source of truth for blog posts.
 *
 * To add a post: append a new entry below. Pages auto-generate at build:
 *   /blog/{slug}
 *
 * Why TS data + HTML strings (not MDX):
 *   - Zero new dependencies
 *   - Server-rendered, fast, SEO-friendly
 *   - Easy to ship posts via simple PR without learning MDX
 *   - When the blog grows past ~20 posts, migrate to MDX/CMS
 *
 * SEO + content guidelines for each post:
 *   - Titles include high-intent keywords (city + service)
 *   - Excerpts become meta descriptions (~150 chars ideal)
 *   - Body has H2 + H3 hierarchy, internal links, city + service mentions
 *   - 2–3 inline images per post (figure + figcaption supported)
 *   - All posts get Article + BreadcrumbList JSON-LD automatically
 */

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  publishedAt: string; // ISO yyyy-mm-dd
  readingMinutes: number;
  coverImage: string;
  tags: string[];
  /**
   * HTML body — supports <p>, <h2>, <h3>, <ul>/<ol>/<li>, <strong>, <a>,
   * <figure><img/><figcaption/></figure>. The article CSS styles all of these.
   */
  bodyHtml: string;
};

/* ============ INLINE IMAGE HELPER ============
   Tiny helper so each post stays readable. Used like:
     ${img('/images/flow_bathroom_sunset.jpg', 'Bathroom after Ultra Shine deep clean')}
   Produces a figure with caption styled by /blog/[slug]/page.module.css.
*/
function img(src: string, caption: string): string {
  return `<figure class="bodyFigure">
    <img src="${src}" alt="${caption.replace(/"/g, '&quot;')}" loading="lazy" />
    <figcaption>${caption}</figcaption>
  </figure>`;
}

export const POSTS: BlogPost[] = [
  // ============ POST 1 — Humidity / Deep clean cadence ============
  {
    slug: 'how-often-deep-clean-boca-raton-humidity',
    title:
      'How Often Should You Deep Clean Your Home in Boca Raton’s Humid Climate?',
    excerpt:
      'The standard "every 3 months" deep cleaning advice misses what humidity does to South Florida homes. Here’s the real Boca Raton schedule.',
    author: 'Tiago Rena',
    publishedAt: '2026-05-17',
    readingMinutes: 5,
    coverImage: '/images/flow_hand_marble.jpg',
    tags: ['Deep Cleaning', 'Boca Raton', 'Florida Living'],
    bodyHtml: `
      <p>If you Google "how often should I deep clean my house," every article gives you the same answer: <strong>every three months</strong>. That guidance comes from northern-climate cleaning companies. It does not account for what 80% summer humidity does to a Boca Raton home.</p>

      <p>After seven years cleaning houses across Palm Beach and Broward counties, here’s what we actually see &mdash; and the schedule we recommend to our recurring clients.</p>

      <h2>What humidity does to a Florida home</h2>

      <p>Humid air carries moisture into every porous surface. Grout in showers absorbs it. Wood cabinets swell slightly. Painted baseboards trap fine dust against their slightly tacky surface. Air-vent grilles collect a black film faster than dry-climate homes. And mildew &mdash; the early-stage cousin of mold &mdash; starts forming in places you never look: behind toilets, on shower-door tracks, under sink rims.</p>

      ${img('/images/flow_bathroom_sunset.jpg', 'Bathroom grout + shower-door tracks are where Florida humidity hits first.')}

      <p>None of this is dangerous in the short term. But by the 90-day mark, surfaces that look clean to a quick glance are quietly accumulating buildup that a regular weekly clean is not designed to remove.</p>

      <h2>The real Boca Raton deep-cleaning schedule</h2>

      <h3>Every 60&ndash;75 days &mdash; not 90</h3>

      <p>For most Boca Raton, Delray Beach, and Boynton Beach homes &mdash; especially those near the coast where salt air adds another variable &mdash; a deep clean every 60 to 75 days catches mildew, grout discoloration, and vent dust <em>before</em> they become hard to remove.</p>

      <h3>Every 90 days for inland + dry-living households</h3>

      <p>If you live in newer construction inland (Coral Springs, Wellington, parts of Boca West) and your home runs the A/C aggressively year-round, you can stretch to 90 days between deep cleans without seeing real buildup.</p>

      <h3>Every 45 days during rainy season (June&ndash;October)</h3>

      <p>South Florida’s rainy season pushes indoor humidity into the 70&ndash;80% range even with A/C running. During those months, we shorten the deep-clean interval for clients who notice the difference &mdash; you’ll feel it most on bathroom grout and behind toilets.</p>

      ${img('/images/flow_living_room_navy.jpg', 'Living room corner — humidity dust settles in low-traffic spots faster than you’d think.')}

      <h2>What a Boca-specific deep clean covers that a regular clean doesn’t</h2>

      <ul>
        <li><strong>Grout scrub &amp; reset</strong> &mdash; the #1 thing humidity attacks. Done properly, grout goes back to its original color.</li>
        <li><strong>Air-vent grille wipe-down</strong> &mdash; pulls dust + that fine black film from return-air grilles. Improves air quality immediately.</li>
        <li><strong>Behind + under bathroom fixtures</strong> &mdash; toilet bases, sink pedestals, shower-door tracks. Where mildew starts.</li>
        <li><strong>Baseboards + door frames</strong> &mdash; hand-wiped, not just dusted. Removes the slightly tacky humidity buildup.</li>
        <li><strong>Light fixtures, ceiling fans, vents</strong> &mdash; all surfaces above eye level that quietly collect dust.</li>
      </ul>

      <p>Inside oven and inside fridge are available as <a href="/services">add-ons on any service</a> &mdash; they’re not automatically included in a deep clean.</p>

      <h2>Pair it with regular maintenance &mdash; that’s the system</h2>

      <p>The simplest system we recommend to most Boca Raton clients: <a href="/services/regular-cleaning">weekly or bi-weekly regular cleaning</a> for maintenance, plus a <a href="/services/deep-cleaning">deep clean every 60-75 days</a> to reset the baseline. Together, your home stays in a steady state and you never have to think about cleaning again.</p>

      <h2>How to tell it’s time</h2>

      <p>You don’t need a calendar. Walk into your master bathroom and look at the grout in the shower. If it looks even slightly darker than when it was new, or if you see any black specks starting on the shower door tracks &mdash; you’re overdue.</p>

      <p>Other signals: a faint mildew smell when you walk past a bathroom that’s been closed for a few hours. Visible buildup on bathroom-fan grilles. A grayish film on a previously-white toilet base. These are all "you waited too long" markers, not normal household wear.</p>

      <h2>The bottom line</h2>

      <p>If you live in Boca Raton or anywhere in coastal South Florida, the 90-day rule is too long. Plan deep cleans every 60-75 days during normal months and every 45 days during rainy season. Your home will look better, smell better, and the cumulative buildup that takes 4 hours to scrub away will never get a chance to set in.</p>

      <p>Want us to handle the schedule for you? <a href="/quote">Get a free quote in your inbox within an hour</a> &mdash; we’ll walk through your home, recommend the right cadence, and you’ll never have to think about it again.</p>
    `,
  },

  // ============ POST 2 — Move-out cleaning checklist ============
  {
    slug: 'move-out-cleaning-checklist-palm-beach-county-renters',
    title:
      'Move-Out Cleaning Checklist for Palm Beach County Renters: Get Your Full Deposit Back',
    excerpt:
      'Florida landlords return less than 60% of security deposits. Here’s the room-by-room move-out cleaning checklist that gets yours back in full.',
    author: 'Tiago Rena',
    publishedAt: '2026-05-17',
    readingMinutes: 6,
    coverImage: '/images/service_movein_boxes.jpg',
    tags: ['Move-In/Out', 'Palm Beach County', 'Renters'],
    bodyHtml: `
      <p>According to the Florida Department of Business and Professional Regulation, fewer than 60% of Florida renters get their full security deposit back. The number one reason cited by landlords? <strong>"Cleaning condition."</strong> Not damage. Not unpaid rent. Cleaning.</p>

      <p>If you’re moving out of an apartment, condo, or house in Boca Raton, Delray Beach, Boynton Beach, or anywhere in Palm Beach County, here’s the checklist we use on every <a href="/services/move-in-out">move-out cleaning</a> &mdash; the same one that gets our clients their full deposit back.</p>

      <h2>What Florida landlords are actually allowed to deduct for</h2>

      <p>Under Florida Statute 83.49, your landlord can withhold deposit money for unpaid rent, damage beyond normal wear and tear, and cleaning <strong>only if the unit wasn’t returned in the same condition as when you moved in</strong> (minus normal wear).</p>

      <p>"Normal wear" is faded paint, light carpet wear in walk paths, minor scuffs from furniture. "Not normal" is grease buildup on the stove, soap scum in the shower, dust on every blade of the ceiling fan, fingerprints on every light switch, food crumbs in cabinet bottoms. That second list is what move-out cleanings exist to eliminate.</p>

      ${img('/images/flow_hero_kitchen.jpg', 'Kitchen — the #1 area landlords inspect. Inside the oven and behind the fridge are make-or-break.')}

      <h2>The room-by-room move-out checklist</h2>

      <h3>Kitchen (the #1 inspected area)</h3>

      <ul>
        <li>Inside the oven scrubbed (grease + carbon)</li>
        <li>Stovetop and burner caps cleaned, drip pans replaced if needed</li>
        <li>Range hood + filter degreased</li>
        <li>Refrigerator emptied, defrosted, wiped inside and out, behind the fridge cleaned</li>
        <li>Microwave wiped inside, plate washed</li>
        <li>Dishwasher cleaned (run a cycle with a cleaning tablet)</li>
        <li>Inside cabinets + drawers wiped (crumbs, sticky spots, lining replaced if applicable)</li>
        <li>Backsplash + grout cleaned</li>
        <li>Sink + faucet polished, garbage disposal flushed</li>
        <li>Floor swept, mopped, baseboards wiped</li>
      </ul>

      <h3>Bathrooms (the #2 inspected area)</h3>

      <ul>
        <li>Toilet scrubbed inside + outside + base + behind</li>
        <li>Shower/tub scrubbed, soap scum + mildew removed, grout cleaned</li>
        <li>Shower door tracks cleaned (this is where landlords look closely)</li>
        <li>Sink + faucet polished, drain free of hair</li>
        <li>Mirror + medicine cabinet cleaned inside and out</li>
        <li>Floor including behind the toilet</li>
        <li>Exhaust fan grille wiped (a big landlord tell)</li>
      </ul>

      <h3>Bedrooms + living areas</h3>

      <ul>
        <li>Carpets vacuumed (and shampooed if lease requires it)</li>
        <li>Hard floors swept + mopped</li>
        <li>Baseboards hand-wiped</li>
        <li>Window sills + tracks cleaned</li>
        <li>Closet shelves + floor wiped</li>
        <li>Ceiling fans + light fixtures dusted (blades)</li>
        <li>Walls spot-cleaned for marks</li>
        <li>All light switches + outlet plates wiped</li>
      </ul>

      ${img('/images/flow_bathroom_sunset.jpg', 'Shower-door tracks + behind-the-toilet are the two specific spots landlords always check.')}

      <h3>Whole-home detail</h3>

      <ul>
        <li>Vent grilles wiped (return + supply)</li>
        <li>HVAC filter replaced</li>
        <li>Smoke + CO detector batteries checked</li>
        <li>Doors + door frames wiped</li>
        <li>Patio/balcony swept (often forgotten)</li>
        <li>Trash + recycling bins emptied + cleaned</li>
      </ul>

      <h2>What landlords actually inspect first</h2>

      <p>From talking to property managers across Palm Beach County, the same five spots get checked first on every move-out inspection: <strong>inside the oven</strong>, <strong>behind the refrigerator</strong>, <strong>shower-door tracks</strong>, <strong>baseboards</strong>, and <strong>ceiling fan blades</strong>. If those five are clean, the inspection usually passes. If two or more look skipped, deductions start.</p>

      <h2>DIY vs hire a service: the deposit math</h2>

      <p>A 2-bedroom apartment move-out clean done well takes 8&ndash;12 hours of solo work. A professional move-out cleaning typically runs $250&ndash;$500 depending on size and condition. Security deposits in Palm Beach County average $1,500&ndash;$3,500. So unless you’re fully comfortable cleaning at the level a landlord will inspect, hiring it out is almost always net positive.</p>

      <p>(For what it’s worth, we document every move-out clean with before + after photos so if a landlord disputes condition, you have proof.)</p>

      <h2>Pair this with a deep clean if it’s been a while</h2>

      <p>If you’ve been in the unit more than a year and haven’t had a <a href="/services/deep-cleaning">deep cleaning</a>, consider booking that <em>before</em> your move-out clean &mdash; or asking us to combine them. The deep-clean baseline (baseboards, grout, vents, fixtures) is exactly what move-out inspections fail people on.</p>

      <p>Need help? <a href="/quote">Request a free quote for a move-out cleaning</a> &mdash; we’ll walk through your unit, give you a precise number, and get you your full deposit back.</p>
    `,
  },

  // ============ POST 3 — Post-construction cleanup ============
  {
    slug: 'post-construction-cleanup-south-florida',
    title: 'What to Expect from Post-Construction Cleanup in South Florida',
    excerpt:
      'Drywall dust gets everywhere — even in rooms your contractor never entered. Here’s what a real post-construction cleanup looks like.',
    author: 'Tiago Rena',
    publishedAt: '2026-05-17',
    readingMinutes: 5,
    coverImage: '/images/service_postconstruction.jpg',
    tags: ['Post-Construction', 'South Florida', 'Renovation'],
    bodyHtml: `
      <p>The contractor finishes. They sweep up the obvious debris and call the job done. You walk in expecting a clean space &mdash; and instead, there’s a fine layer of dust on every horizontal surface, every blade of every ceiling fan, every shelf inside every cabinet, and somehow inside the refrigerator that wasn’t even moved.</p>

      <p>That’s drywall dust. It gets <em>everywhere</em>. And it’s why <a href="/services/post-construction">post-construction cleanup</a> exists as its own separate service from regular or deep cleaning.</p>

      <h2>The dust no one warns you about</h2>

      <p>Drywall dust is finer than household dust &mdash; almost talc-like. It rides on air currents and settles slowly over days. By the time your contractor leaves, dust has migrated into rooms they never worked in. It’s inside light fixtures. It’s on the top shelf of closets you closed before construction started. It’s in your kitchen cabinets even if you sealed them with plastic.</p>

      ${img('/images/flow_living_areas.jpg', 'A living room post-cleanup — what your home should actually look like after construction.')}

      <p>Removing it is not the same job as regular cleaning. Standard vacuums recirculate the fine particles back into the air. Standard cloths just push the dust around. Post-construction cleanup requires a different toolkit and a different sequence.</p>

      <h2>The three phases of a real post-construction cleanup</h2>

      <h3>Phase 1: Heavy debris + dust removal</h3>

      <p>Before any wiping happens, all loose debris gets vacuumed out using high-suction vacuums with sealed filtration so dust doesn’t blow back into the air. This includes wood shavings, drywall chunks the contractor missed, tile shards, screws, nails. We work top-down: ceiling fans first, then upper cabinets, then mid-level, then floors last.</p>

      <h3>Phase 2: Detail cleaning</h3>

      <p>This is the part most cleaning services skip. Every surface gets wiped with a dampened microfiber &mdash; not dry, because dry just relocates the dust. Inside every cabinet. Inside every drawer. Top of every door frame. Behind every appliance the contractor pulled out. Light fixtures dismantled and washed if needed. Window tracks. Air vent grilles.</p>

      ${img('/images/flow_hand_marble.jpg', 'Detail wipe on countertop edges + ledges — where construction dust hides longest.')}

      <h3>Phase 3: Final polish</h3>

      <p>After phase 2, the home looks clean to most people. Phase 3 is what makes it actually move-in ready: floors deep-mopped (twice if they’re tile, since dust resettles), mirrors and glass polished streak-free, fixtures shined, baseboards re-wiped (because dust resettles during phase 2), and a final walkthrough to catch anything that resettled.</p>

      <p>A 2,500 sq ft renovation in Boca Raton typically takes our team 6&ndash;9 hours across all three phases.</p>

      <h2>Why your renovation contractor recommends a separate cleanup</h2>

      <p>Most good general contractors in South Florida explicitly recommend a third-party post-construction clean &mdash; not because they don’t care, but because it’s a different skillset and a different time commitment. Their cleanup crew is sweeping for safety and basic appearance. They’re not detailing inside drawers or pulling appliances forward.</p>

      <p>Trying to use a regular weekly cleaner for post-construction usually leaves you frustrated. The dust just doesn’t come out with normal-clean methods. You need the right equipment + the right sequence + people who know to check the spots that always get missed.</p>

      <h2>Timing it right</h2>

      <p>Schedule the post-construction clean <strong>after</strong> the final contractor walkthrough and any punch-list items are complete &mdash; not before. If the contractor needs to come back for one more fix, that fix kicks up new dust, and you’ll need to clean again. Get all the construction work finished first.</p>

      <p>For larger renovations (whole-home, kitchen + bath combined), we recommend booking the cleanup the day after construction ends &mdash; that gives dust 12&ndash;18 hours to fully settle so we can get it all on the first pass.</p>

      <h2>What you don’t need to do</h2>

      <ul>
        <li>You don’t need to remove anything yourself (we work around it)</li>
        <li>You don’t need to supply anything &mdash; we bring all equipment and cloths</li>
        <li>You don’t need to be home if you give us key + alarm code</li>
        <li>You don’t need to clean before we arrive (that’s our job)</li>
      </ul>

      <h2>Where we work</h2>

      <p>Our post-construction crews regularly clean renovations across Boca Raton, Delray Beach, Boynton Beach, Lake Worth, West Palm Beach, Wellington, Parkland, Coral Springs, Fort Lauderdale, and the surrounding cities &mdash; <a href="/areas">all 13 areas we serve</a>.</p>

      <p>Just wrapped a renovation? <a href="/quote">Get a free quote for post-construction cleanup</a> &mdash; we’ll walk through your space, give you a precise number, and have it move-in ready in one visit.</p>
    `,
  },

  // ============ POST 4 — 5 spots cleaners miss ============
  {
    slug: '5-spots-your-cleaner-probably-misses',
    title:
      '5 Spots Your Cleaner Probably Misses (And How to Politely Ask Them to Fix It)',
    excerpt:
      'Even great cleaners miss the same 5 spots. Here’s where to check after every visit — and the simple script to ask without sounding picky.',
    author: 'Tiago Rena',
    publishedAt: '2026-05-17',
    readingMinutes: 4,
    coverImage: '/images/bathroom.jpg',
    tags: ['Cleaning Tips', 'How-To', 'Standards'],
    bodyHtml: `
      <p>Even cleaning services we respect tend to miss the same spots. It’s not because the team is sloppy &mdash; it’s because these spots are out of the standard scan-pattern of a 45-minute room clean. They take an extra 30 seconds each, but if no one trained the cleaner to look there, they get skipped every visit until someone says something.</p>

      <p>Here are the five spots to walk-check after any cleaning. Plus the script for how to bring it up without sounding picky &mdash; because that’s usually the harder part.</p>

      <h2>1. Behind the toilet base</h2>

      <p>The visible part of the toilet usually gets cleaned. The 4-inch ring of floor behind the toilet base &mdash; where the porcelain meets the tile &mdash; almost never does. That gap traps dust, hair, and (in humid Florida) early-stage mildew. It looks fine in the mirror but a quick crouch will show it.</p>

      ${img('/images/flow_bathroom_sunset.jpg', 'Behind toilet bases is the #1 missed bathroom spot — humidity makes it worse in Florida homes.')}

      <h2>2. Top edges of door frames</h2>

      <p>Run your finger along the top of any interior door frame. If a cleaner has been there in the last month and you see gray on your finger &mdash; they didn’t reach up there. Most cleaners are eye-level focused. Tops of door frames, tops of cabinets, and tops of picture frames are quietly collecting dust.</p>

      <h2>3. Refrigerator coils + sides</h2>

      <p>Side of the fridge (the inch-wide space between the appliance and the cabinet) and the floor underneath are dust + crumb traps. Coils on the back (or underneath, depending on the model) collect a fuzz of dust that hurts the fridge’s efficiency and adds heat to your kitchen. A real cleaning pulls the fridge forward and gets behind it &mdash; at least quarterly.</p>

      <h2>4. Vent grilles (return + supply)</h2>

      <p>Look up at your ceiling vents. If the slats have a black film, that’s dust trapped by the airflow. Same with bathroom exhaust fans &mdash; the grille catches lint + dust over months. Wiping these is a 60-second job per vent and improves indoor air noticeably, especially in coastal South Florida homes where salt air binds dust.</p>

      ${img('/images/flow_hand_marble.jpg', 'Detail-level cleaning means the wipe touches every surface — not just the visible ones.')}

      <h2>5. Light switch plates + door handles</h2>

      <p>Look at the light switch nearest your kitchen. If it looks grayish around the toggle &mdash; that’s fingerprint oil + grease + dust. Same goes for the door handles you use most often (fridge handle, master bedroom door, oven handle). These are the highest-touch surfaces in your home and they’re wiped less often than the floor.</p>

      <h2>How to ask without sounding picky</h2>

      <p>This is the actual hard part. Most homeowners notice things were missed but don’t want to seem nitpicky. Here’s a script that works:</p>

      <blockquote style="border-left: 3px solid var(--blue); padding: 12px 18px; margin: 22px 0; background: var(--cream-2); border-radius: 6px;">
        <em>"Hey, the clean looked great overall. Quick favor &mdash; could the team double-check behind the toilets and the tops of door frames next time? I noticed those spots are still picking up dust. No rush, just for next visit."</em>
      </blockquote>

      <p>That message does three things: leads with appreciation, names the specific spots so the team knows exactly what to check, and signals no urgency so it doesn’t feel like a complaint. Almost every cleaning service responds well to this. If yours doesn’t &mdash; that’s your answer about whether to keep working with them.</p>

      <h2>How we trained around this</h2>

      <p>When we built Ultra Shine, we made these five spots part of every cleaner’s scan-pattern from day one. Every team member walks the same sequence on every job, top-down, including the spots most other services skip. It’s why our recurring clients across <a href="/areas/boca-raton">Boca Raton</a>, <a href="/areas/delray-beach">Delray Beach</a>, and the rest of Palm Beach + Broward stay with us &mdash; the standard never moves.</p>

      <p>Want a cleaner who doesn’t need a reminder list? <a href="/quote">Get a free quote</a> &mdash; we’ll walk through your home, recommend the right service, and the team will check every spot on this list (plus the rest of them) on every visit.</p>
    `,
  },

  // ============ POST 5 — Verify licensed/bonded/insured ============
  {
    slug: 'verify-cleaning-service-licensed-bonded-insured-florida',
    title:
      'How to Verify a Cleaning Service is Actually Licensed, Bonded, and Insured in Florida',
    excerpt:
      'Every cleaning website says "licensed, bonded, and insured." Half of them aren’t. Here’s the 4-step verification you can do right now.',
    author: 'Tiago Rena',
    publishedAt: '2026-05-17',
    readingMinutes: 5,
    coverImage: '/images/living_room.jpg',
    tags: ['Hiring Guide', 'Trust', 'Florida'],
    bodyHtml: `
      <p>Open any cleaning company’s website in Florida and you’ll see the same three words near the top: "<strong>Licensed, Bonded, and Insured.</strong>" It’s become so standard that it’s lost meaning &mdash; and many companies that advertise it actually aren’t.</p>

      <p>If something goes wrong on a cleaning job &mdash; a broken antique, an injured cleaner, a missing watch &mdash; the difference between hiring a real licensed/bonded/insured company and an uninsured one is the difference between "they fix it" and "you absorb it." Worth verifying before you book.</p>

      <h2>Why this matters more than you think</h2>

      <p>Three things happen on cleaning jobs that put you on the hook if your cleaner isn’t covered:</p>

      <ol>
        <li><strong>Damage to your home</strong> &mdash; a vacuum hits a baseboard, a cloth scratches a marble surface, a heavy mop knocks over a vase. Insurance covers this. No insurance, you absorb it.</li>
        <li><strong>Injury on your property</strong> &mdash; a cleaner slips on a wet floor or falls off a step stool. If they’re not covered by workers’ comp, their medical bills + lost wages can come out of your homeowner’s policy.</li>
        <li><strong>Theft</strong> &mdash; rare, but it happens. "Bonded" means an insurance company will pay you out if a cleaner steals from you and the company won’t make you whole. No bond, no payout.</li>
      </ol>

      ${img('/images/service_commercial_office.jpg', 'Commercial + residential cleaning crews both need full coverage — for your protection and theirs.')}

      <h2>What Florida actually requires</h2>

      <p>Florida does not require house cleaning services to hold a state-level cleaning license &mdash; this varies by city, but most municipalities (including Boca Raton, Delray Beach, Boynton Beach, and Wellington) only require a basic local business tax receipt. That’s the bare minimum.</p>

      <p>So when a cleaning company says "licensed in Florida," they usually mean they have a local business tax receipt &mdash; not a specialized cleaning license. That’s normal and fine, but don’t mistake it for state oversight.</p>

      <h2>The 4-step verification you can do right now</h2>

      <h3>Step 1: Check Sunbiz (Florida business registry)</h3>

      <p>Go to <a href="https://search.sunbiz.org" target="_blank" rel="noopener noreferrer">search.sunbiz.org</a>. Type the company name. If they don’t come up as an Active registered business in Florida, that’s a red flag &mdash; even unincorporated sole proprietors typically register a "doing business as" name.</p>

      <h3>Step 2: Ask for a Certificate of Insurance (COI)</h3>

      <p>Every legitimately insured cleaning service can produce a Certificate of Insurance within 24 hours, with you (or your property) named as a certificate holder. It will show their general liability coverage limits (usually $1M&ndash;$2M) and any workers’ compensation policy. <strong>If they hesitate to send a COI, walk away.</strong></p>

      <h3>Step 3: Verify the bond</h3>

      <p>"Bonded" means a third-party insurer guarantees payment to you (the customer) if an employee steals from you. Ask which surety company issued the bond. You can call that surety company directly to verify the bond is active. Real bonds are usually $5,000&ndash;$25,000 in coverage.</p>

      <h3>Step 4: Confirm employees, not 1099 contractors</h3>

      <p>This is the one most people skip. If a cleaning company classifies its cleaners as 1099 contractors instead of W2 employees, the workers’ comp + general liability often <em>doesn’t cover</em> the cleaner working in your home &mdash; because they’re technically a separate business. Ask directly: "Are your cleaners W2 employees or 1099 contractors?" The answer matters legally.</p>

      ${img('/images/flow_sparkles.jpg', 'When everything checks out — the only thing you should be thinking about is what you’ll do with your free afternoon.')}

      <h2>Red flags to watch for</h2>

      <ul>
        <li>Won’t send a Certificate of Insurance, or sends one with you not named as certificate holder</li>
        <li>Uses 1099 contractors (workers’ comp + liability coverage gaps)</li>
        <li>No business registration found on Sunbiz</li>
        <li>Pays cash only, no invoices</li>
        <li>Different cleaners every visit with no team training (signals high turnover + likely no W2 system)</li>
        <li>Pressure to book before you’ve verified anything</li>
      </ul>

      <h2>How we handle it</h2>

      <p>We’re registered with Sunbiz, hold $2M general liability + workers’ comp on every cleaner, carry a $25,000 surety bond, and employ all cleaners as W2 staff (not 1099). We can send a Certificate of Insurance within an hour of being asked &mdash; just request one when you reach out for a quote, and we’ll include it with your estimate.</p>

      <p>This is also why we run background checks on every team member and use color-coded cloths to prevent cross-contamination. The whole point of a professional cleaning service is that you don’t have to think about the operational risks &mdash; they’re managed.</p>

      <h2>Bottom line</h2>

      <p>Don’t trust the words on the website. Verify before you book. The whole process takes 15 minutes and protects you from the rare-but-real issues that come up on cleaning jobs. Any real cleaning company welcomes the questions &mdash; we wish more clients asked.</p>

      <p>Considering Ultra Shine? <a href="/quote">Get a free quote</a> and we’ll include our COI with the estimate. No verification gymnastics required.</p>
    `,
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}
