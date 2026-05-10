# Ultra Shine Cleaning — Master Project Handoff (v2)
Last updated: May 9, 2026 (end of infrastructure phase)
Status: Site LIVE. Infrastructure complete. Ready to build remaining pages.

---

## 0. HOW TO READ THIS DOC

This is the source of truth. Every rule, every decision, every next step is here. Read top to bottom on first attach. After that, reference specific sections.

If anything in conversation contradicts this doc, the doc wins. If the user asks for something that violates a rule here, gently confirm before proceeding.

---

## 1. RESPONSE FORMAT RULES (NON-NEGOTIABLE)

These are the user's hard rules for how Claude responds. Break these and the user gets frustrated fast.

### 1A. Every terminal command goes in a strict format
- A header line: PASTE THIS ON TERMINAL arrow Step N colon short description
- A "What this does" paragraph in 8th-grade reading level explaining what the command does and what to expect (does it update files? push to GitHub? take 30 seconds? pop up a browser? what does success look like?)
- The actual command(s) inside a fenced code block
- An END PASTE marker line
- One short tail sentence describing what comes next

The "what this does" paragraph is mandatory and must be plain language a non-developer would understand. Not "this initializes a git remote" but "this tells your Mac which GitHub repo to push code to."

### 1B. Terminal-only for file operations
The user does NOT download files manually. Does NOT drag-and-drop. Does NOT move folders by hand. EVERYTHING happens through terminal commands. If Claude needs to put a file on the user's Mac, write it directly via heredoc into the right folder. Don't say click the download link — write the file via terminal.

### 1C. Read user's pasted terminal output carefully
The user pastes raw terminal output back. Read every line. Look for:
- Error messages (denied, error, fatal, command not found, no such file)
- Success indicators (commit hashes, "main to main", Building, Published)
- Account names (by AkinioOS vs by UltraShineCleaning) — these matter
- File listings (confirm what's actually present on disk)

Don't assume — actually read what came back. Multiple times in past sessions Claude pattern-matched to "should be fine" instead of looking at literal output. That wastes hours.

### 1D. Step-by-step, one decision at a time
The user prefers small focused steps over big batched plans. Don't send 10 commands at once and ask did it work. Send 1-3 commands with clear stop points and ask for the output before proceeding.

### 1E. If user asks the same thing twice, stop and rethink
If the user pastes the same error twice, STOP. The previous fix didn't work. Diagnose differently. Don't loop.

### 1F. Honest acknowledgement when stuck
If Claude has been at the same problem for 3+ tries, acknowledge it, give the user options (keep trying / pivot / pause), and let them choose.

### 1G. Avoid embedded triple-backticks in heredocs
When writing files via heredoc, do NOT put triple backticks inside the heredoc content (it breaks the shell parser). Use plain text descriptions or indented code instead.

---

## 2. USER COMMUNICATION STYLE

- Tiago types fast, lots of typos, run-on sentences. Don't correct typos. Don't ask did you mean X — just understand and move forward.
- He's energetic, urgent, business-owner-mode. Wants execution + visual mockups, not planning sessions.
- He'll sometimes ask multiple questions in one message — answer all of them, in order, in a numbered list.
- He LOVES the dashboard mockup vibe (dark mode, sidebar nav). He REJECTED typography-only carousels as boring. Wants 3D feel and photos.
- He wants distinct designs per page (no template recycling) but cohesive brand DNA across pages.
- He's building for next few years where competitors will have to upgrade. Aim high on design quality.
- He runs another business too (AkinioOS) — that's separate, don't confuse the two.

---

## 3. LIVE STACK (current state, all working)

- Live site: https://ultra-shine-cleaning.netlify.app — Free forever, Netlify Hobby tier
- GitHub repo: https://github.com/UltraShineCleaning/ultrashine-site — Public, owned by UltraShineCleaning
- Netlify dashboard: https://app.netlify.com/projects/ultra-shine-cleaning — Auto-deploys from GitHub main branch
- Local source: /Volumes/DevDrive/ULTRASHINE_OS/04_WEBSITE/ultrashine-site/ — git-tracked, push triggers Netlify
- Real domain: ultrashinecleaningfl.com — Still on Wix. DNS swap is LAST step.
- Governance docs: /Volumes/DevDrive/ULTRASHINE_OS/00_GOVERNANCE/ — this handoff lives here

### Git history (latest commits, newest first)
- 0c5bae4 — Infrastructure complete: live site, GitHub-Netlify auto-deploy. Ready for service pages.
- 842eb6f — Test linked auto-deploy
- c85f416 — Test Netlify auto-deploy via GitHub
- eaefa84 — Remove vercel.json — Vercel handles static sites without config
- 3a82dff — Add minimal vercel.json with explicit rewrites for index.html
- 5de2437 — Fix 404: remove vercel.json, let Vercel auto-detect static site
- 5897b75 — Homepage rebuild v2: marquee, mobile responsive, rounded cards, FAQ image + answers, hover states, dot grid bg
- 8a7a7dc — Initial commit — Ultra Shine site v1

### Workflow going forward
1. Claude writes new files directly to the local source folder via terminal heredocs.
2. User runs: cd to the project folder, then git add dot, then git commit with message, then git push.
3. Netlify auto-deploys in ~30 sec.
4. User confirms by visiting the live URL.

### Git auth (locked in for this folder)
- Remote URL hardcoded with username: https://UltraShineCleaning at github.com slash UltraShineCleaning slash ultrashine-site dot git
- Folder-specific git config: user.name UltraShineCleaning, user.email Contact at Ultrashinecleaningfl.com
- macOS keychain has Personal Access Token saved for github.com/UltraShineCleaning. Pushes are silent.
- Global gh CLI shows AkinioOS as active — that's fine, doesn't affect this folder because the remote URL has the username embedded.
- AkinioOS work in a separate folder uses its own credentials — fully isolated.

### Things that are broken in global git config but harmless
- credential.helper is set to osxkeychain (good, simple Mac default)
- No URL-specific credential overrides remain (we cleaned them up)
- Do NOT run "gh auth setup-git" again — it adds a broken credential helper line that crashes pushes

---

## 4. BRAND SYSTEM (LOCKED — DO NOT CHANGE)

### Colors (CSS custom properties used in code)
- navy: #1F3F77
- navy-deep: #15294C
- navy-soft: #2A4F8F
- cream: #F4ECDB
- cream-2: #EFE5D0
- blush: #D9B5A8
- gold: #C9A961
- sage: #7DB39B

### Typography
- Fraunces (display serif, opsz 144 SOFT 50/100, italic for emphasis on key words)
- Outfit (sans UI, weights 200-700)
- JetBrains Mono (numerics, e.g. step numbers 01 02 03)
- NEVER Inter

### Border radius
- r-sm: 10px (form inputs, small buttons)
- r-md: 16px (cards, mid-size elements)
- r-lg: 24px (hero photos, big feature cards)

### Aesthetic principles
- Editorial luxury / magazine-quality (not corporate)
- Photo-led (every section has a strong image)
- Sparkle ornaments (✦ icon, used sparingly for emphasis)
- Dot grid background pattern on cream sections (radial-gradient, 1px dots, rgba(31,63,119,0.05) opacity, 28px spacing)
- Italic Fraunces words highlight emotion (a home that shines, without lifting a finger)
- Round corners everywhere (no sharp 90 degree edges)

### Logo files (in public/images/)
- logo_white_tight.png — primary, used on dark navy backgrounds
- logo_navy_tight.png — used on cream backgrounds
- logo_navy_deep_tight.png — backup
- All 294x149px, cropped from original 500x500.

### Brand voice
- Confident but warm. Premium without being snobby.
- Uses contractions (won't, we're, it's).
- Em dashes for emphasis.
- Uses South Florida and Palm Beach + Broward — NEVER the area or your region.
- Says team not staff. Says homes not properties. Says your space sometimes.

---

## 5. ABSOLUTE BUSINESS RULES (NEVER VIOLATE)

### 5A. NO PRICING ANYWHERE on the public site
Cleaning prices vary based on house size, condition, level of mess, pet hair, etc. Tiago and Francine MUST see the house first (or get full info via quote form) before quoting. Never put dollar amounts on any public page. Quote form gathers home info, owner contacts back with custom quote.

WRONG: Starting at $189. From $99. $50/hr.
RIGHT: Custom quote within 1 hour. Tailored to your home. Request your free quote.

### 5B. NEVER reveal client count
Makes business look small.

WRONG: 42+ clients served. 100+ happy customers.
RIGHT: 13 Cities Served. South Florida's Premier Cleaning Service. Trusted across Palm Beach + Broward. 8 Years Trusted.

### 5C. NO AI-generated faces of real people
Especially not Tiago or Francine. Uncanny valley. The user explicitly rejected this.

WRONG: AI photo of Tiago in a polo holding a clipboard.
RIGHT: Real photos when custom polos arrive. Stock/Pexels photos of cleaning scenes (gloves, surfaces, products) where face is not visible. AI marketing imagery without faces.

### 5D. Brand voice rules
- Boca Raton not Boca in formal copy (informal Boca OK in testimonials)
- Palm Beach County + Broward County or Palm Beach + Broward — both fine
- Cleaning capitalized as a service category (Deep Cleaning) but lowercase as activity (we'll deep clean your home)
- Use ✦ (sparkle) NOT ⭐ (star) for ornaments. Stars are reserved for review ratings.

---

## 6. WHAT'S BUILT (current state of the live site)

### Homepage at / (file: index.html, ~44KB, 12 sections)
1. Sticky nav — logo (clickable home), 5 menu links (Services, Areas, About, Reviews, FAQ), phone (clickable tel: link), GET QUOTE CTA button
2. Hero — full-bleed kitchen photo, navy gradient overlay, READY WHEN YOU ARE eyebrow, headline "A home that shines. Without lifting a finger." (with shines and finger in italic), body paragraph, dual CTA (Get Quote / View Services)
3. Trust strip — 4 navy badges: Fully Insured & Bonded / Background-Checked Every Team Member / 4.9 star on Google Verified Reviews / Palm Beach + Broward Serving 13 Cities
4. Services section — eyebrow WHAT WE OFFER, headline "Five services, one standard." (standard italic), 5 image cards: Regular Cleaning (wide hero), Deep Cleaning, Move In/Out, Commercial, Post-Construction. NOT YET LINKED to detail pages — placeholder.
5. How It Works — eyebrow HOW IT WORKS, headline "Three simple steps to a spotless home." (spotless italic), 3 numbered steps: 01 Connect / 02 Schedule / 03 Enjoy The Sparkle
6. Why Ultra Shine — eyebrow WHY ULTRA SHINE, headline "Built on detail. Trusted on results." (detail italic), 4 feature cards: Eco-Friendly Pet-Safe / Trained Vetted Background-Checked / Satisfaction Guarantee / Flexible Scheduling
7. Reviews marquee — eyebrow TRUSTED ACROSS SOUTH FLORIDA, headline "What our clients say." (clients italic), 5 gold stars, 4.9 star GOOGLE RATING text. 8 testimonials infinite horizontal scroll, 60s loop, pause on hover.
8. Service Areas — eyebrow WHERE WE SERVE, headline "Across South Florida's finest neighborhoods." (finest italic), split layout: city tags left + photo of woman in polo right (currently AI-generated, swap when real available)
9. Done Right Promise — eyebrow THE PROMISE, headline "Done right. Or done again." (right and again italic), navy bg, 3 pillars: No excuses / No hassle / No fees
10. FAQ — eyebrow COMMON QUESTIONS, headline "Answers, before you ask." (you ask italic), bathroom photo on left with overlay tag, 8 accordion items with real Wix answers
11. Final CTA — eyebrow READY WHEN YOU ARE, headline "A cleaner home, without the stress." (stress italic), navy gradient + sparkle ornaments
12. Footer — 4 columns: Brand+address, Services, Company, Contact

### Quote form at /quote/ (file: quote/index.html, ~24KB)
- Split layout: brand panel left + 6-section form right
- 6 form sections: 01 Service Type / 02 Frequency / 03 Home Size / 04 Service Area / 05 Add-Ons / 06 Your Info
- IMPORTANT: Currently shows price estimate ($165-$195) and per-add-on prices — VIOLATES Rule 5A. Must be removed and replaced with "Custom quote within 1 hour" messaging.
- Mobile responsive (1024px tablet, 640px mobile)

### Image library (public/images/, 19 files)
- Logos (6 variants)
- Service-specific: service_deep_cleaning.jpg, service_movein_boxes.jpg, service_commercial_office.jpg, service_postconstruction.jpg
- General: hero_kitchen.jpg, bathroom.jpg, bedroom.jpg, living_room.jpg, team_action.jpg, team_van.jpg, plus 3 wix_marketing_realistic JPEGs

---

## 7. KNOWN ISSUES (deferred, not blocking)

1. Quote form has pricing displayed — violates Rule 5A. Remove "$165-$195" estimate panel and per-add-on prices ($40, $60, $80, $35). Replace with checkmarks only and "Custom quote within 1 hour" messaging.
2. Quote form mobile overflow at 390px — "8 YEARS TRUSTED" stat-strip column slightly cuts off
3. Service cards on homepage have no links — divs not anchor tags. Wire up when service pages exist.
4. Footer links text-only, no anchor tags. Wire up after pages built.
5. AI-generated woman in polo on Areas section — swap for real photo when polos arrive.

---

## 8. ROADMAP — NEXT STEPS IN ORDER

### Phase 1 — Static content pages (CURRENT PHASE)

Build order (do exactly this sequence):
1. NEXT: Deep Cleaning page — /services/deep-cleaning/ (start here next session)
2. Move-In/Out page — /services/move-in-out/
3. Commercial page — /services/commercial/
4. Post-Construction page — /services/post-construction/
5. Regular Cleaning page — /services/regular-cleaning/
6. Wire up homepage service cards to link to the 5 service pages
7. Fix quote form — remove pricing per Rule 5A, fix mobile overflow
8. About page — /about/ (Tiago + Francine founder story, 2018 CT, 2021 FL move, husband-wife)
9. Work For Us page — /work-for-us/ (cleaner recruiting)
10. Wire up footer links
11. 13 city landing pages — /areas/boca-raton/ etc. (SEO, one per city)

### Each service page must follow this structure (don't deviate)
- Sticky nav (same as homepage, Services link gets active state with blush underline visible)
- Breadcrumb strip below nav: Services / [Service Name] (small, navy on cream)
- Hero — service-specific imagery, navy gradient overlay, eyebrow SERVICE NO. 02 etc, headline with Fraunces italic emphasis, subheadline, dual CTA (Get Quote / See What's Included scroll-link)
- Trust strip — same 4 badges as homepage (consistency)
- "What's Included" section — 4-column grid by category (Kitchen / Bathrooms / Living + Bedrooms / Whole Home), ~24 specific items pulled from Wix scope
- "When You Need This Service" — 4 scenario cards with sparkle icons (different scenarios per service)
- "How [Service] Differs from Regular Cleaning" — split-pane visual or sentence-level callouts
- FAQ — 6 questions SPECIFIC to this service (NOT same as homepage FAQ)
  - For Deep Cleaning: How long does it take? / Do I need to prep? / How often should I deep clean? / Will harsh chemicals damage surfaces? / What if I have pets? / Can I just deep-clean one room?
- Final CTA — navy gradient with sparkle ornaments, "Book Your [Service]" button to /quote/?service=deep
- Same footer as homepage
- Mobile responsive (1024px tablet, 640px mobile breakpoints)
- NO PRICING anywhere

### Phase 2 — Next.js conversion (after all Phase 1 pages done)
This is where the cool stuff lives.
- Convert static HTML to Next.js 14+ app router
- Add 3D scroll effects per the reference videos user has (GSAP + ScrollTrigger + Three.js, OR Framer Motion + React Three Fiber)
- Admin dashboard at /admin (login-gated via Supabase Auth or Clerk):
  - Sidebar nav: Workspace / Operations / Finance / Marketing
  - KPI row: Jobs this week, revenue MTD, new leads, completion rate
  - Revenue chart (line, last 12 weeks)
  - Operations: cleaner schedule grid, individual cleaner pages
  - Finance: bank reconciliation upload, future earnings forecast
  - Marketing: lead source attribution, content calendar
- Quote form actually emails Tiago on submit (Resend.com API)
- Jobber GraphQL API integration at api.getjobber.com via OAuth 2.0
- Google Places API — pull real reviews into marquee
- Meta Graph API — pull real Instagram feed
- Bilingual support (English/Spanish) — Boca has large Spanish-speaking market
- Search/filter for cities (when 13 city pages exist)

### Phase 3 — Domain swap (LAST step)
1. Wix dashboard, Domain settings, DNS records
2. Find A record (currently points to Wix IP)
3. Change to Netlify load balancer IP (Netlify provides exact value in dashboard under Domain Management)
4. Find/add CNAME for www pointing to ultra-shine-cleaning.netlify.app
5. Wait 5-30 min for DNS propagation
6. Visit ultrashinecleaningfl.com — should now show new site
7. Wix subscription stays until expires (just leave it)
8. SSL auto-provisions on Netlify (Let's Encrypt)

---

## 9. EXACT NEXT SESSION OPENING

When the new chat starts, Claude should:
1. Read this entire handoff doc top to bottom.
2. Acknowledge: "Handoff doc loaded. Site is live at ultra-shine-cleaning.netlify.app. Last commit was 0c5bae4 Infrastructure complete. Next up per the roadmap: Deep Cleaning service page at /services/deep-cleaning/."
3. Confirm the brand DNA, NO PRICING rule, terminal-only file ops rule.
4. Ask the user IF they have reference videos/photos to share (for 3D scroll vision and/or page imagery), but ONLY ask for these — don't ask what should we build next or what color do you want or should I use Pexels or your library. All of those answers are in this doc.
5. Once user confirms or uploads reference materials, START BUILDING the Deep Cleaning page directly via terminal heredoc.
6. After file is written, send the git commit + push command in one block.
7. After push succeeds (Netlify auto-deploys ~30 sec), give user the URL to test.
8. Iterate on user feedback. Then move to Move-In/Out next.

### What NOT to ask the new user
- Should I show pricing? — NO, never, see Rule 5A
- What colors should I use? — Brand colors locked, see Section 4
- Should I use AI library or Pexels? — Mix; service photos already in public/images/
- Want to modify build settings on Netlify? — No, infrastructure done
- Should we use Vercel or Netlify? — Netlify, decision made
- What page should we build next? — Deep Cleaning, see Section 8
- Do you want mobile responsive? — Yes always, see Section 8

### What to confirm at session start
- I have reference videos/photos to upload, want me to share them? — YES, accept and use
- Want me to start building Deep Cleaning page now? — YES, proceed
- User changes mind about a rule — confirm in writing, then proceed

---

## 10. BUSINESS DETAILS (always-true facts)

- Business: Ultra Shine Cleaning
- Address: Boca Raton, FL 33428
- Founded: 2018 in Connecticut, moved to Florida 2021
- Owners: Tiago Rena + Francine Rena (husband-wife, both active in business)
- Phone: (561) 583-6694
- Email: Contact at Ultrashinecleaningfl.com
- Domain: ultrashinecleaningfl.com (currently Wix, moves to Netlify in Phase 3)
- Services: Regular Cleaning, Deep Cleaning, Move-In/Out, Commercial, Post-Construction
- Service area (13 cities total):
  - Palm Beach County: Boca Raton, Delray Beach, Boynton Beach, Lake Worth, West Palm Beach, Wellington, Parkland
  - Broward County: Coral Springs, Fort Lauderdale, Coconut Creek, Deerfield Beach, Pompano, Margate
- Google Business Profile: approved May 4, 2026, currently 4.9 stars
- Insurance: Fully insured and bonded
- Background checks: Every team member
- Payment: Credit/debit via invoice link, Zelle, Venmo (NO cash, NO checks)

---

## 11. LOCAL FOLDER STRUCTURE

/Volumes/DevDrive/ULTRASHINE_OS/
- 00_GOVERNANCE/HANDOFF_2026-05-09.md (this file)
- 01_PRODUCT/
- 02_OPERATIONS/
- 03_MARKETING/
- 04_WEBSITE/ultrashine-site/ (LIVE site, git repo, Netlify auto-deploy)
  - .git/
  - .gitignore
  - README.md
  - HANDOFF.md (copy of this doc)
  - index.html (homepage)
  - public/images/ (19 image files)
  - quote/index.html (quote form)
  - services/ (to be created next session: deep-cleaning, move-in-out, commercial, post-construction, regular-cleaning)
- 04_WIX/ (old Wix site backup)
- 05_LIBRARY/photography/ (real photos when available)
- _ARCHIVE/

/Volumes/DevDrive/SHARED_SKILLS/ (reusable across projects)
- gsap-skills/ (for Phase 2 3D scroll)
- claude-seo/
- marketingskills/

/Volumes/DevDrive/AKINIO_OS/ (SEPARATE business, do not touch)

---

## 12. TOOLS / SKILLS user has access to

- macOS (Apple Silicon, terminal user, zsh shell)
- DevDrive external SSD mounted at /Volumes/DevDrive/
- Homebrew for package management
- gh CLI (GitHub) installed and authed for both AkinioOS + UltraShineCleaning
- Vercel CLI installed (not used — Vercel project abandoned, see Section 13)
- Node.js + npm (installed via Homebrew)
- Git (locked to UltraShineCleaning for this folder)
- Browser: Chrome (uses Safari for AkinioOS work — separate session)
- Editor: Sublime Text
- Canva account with brand kit ID kADeGgvCopc

---

## 13. WHAT WE TRIED THAT DIDN'T WORK (don't repeat)

- Vercel deployment: spent ~6 hours on this. Project at vercel.com/contact-8079s-projects/ultrashine-site kept returning 404 NOT_FOUND despite Ready status. Tried removing vercel.json, adding vercel.json with rewrites, deleting + re-importing, creating new project name usc-live, switching teams, disabling Deployment Protection. Nothing worked. ROOT CAUSE never definitively identified — appeared to be account-level routing issue specific to that team. DECISION: abandoned Vercel, moved to Netlify. Do not try to revive Vercel without strong reason.
- Drag-drop manual deploys to Netlify: works but slow and tedious. Upgraded to GitHub auto-deploy.
- Global gh CLI account switching: caused git pushes to use AkinioOS even after switching. Solution: hardcoded UltraShineCleaning into the remote URL for THIS folder only. Don't touch the global gh active account.
- gh auth setup-git: set credential.helper to a broken value that crashed pushes. Fixed by manually setting helper to osxkeychain. Don't run gh auth setup-git again.

---

## 14. END OF HANDOFF

This is the source of truth. Built across one long session on May 7-9, 2026 going from Wix-only to live production stack. User has earned a real win — keep momentum, keep quality high, build the Deep Cleaning page next session and ship it.

— Claude, May 9, 2026
