# Observations from Tiago's Site Walkthrough Video
**Date:** May 14, 2026
**Source:** Screen Recording 2026-05-14 at 9.53.26 PM.mov (67 sec, 3260×1730)
**URL recorded:** https://ultrashine-site.vercel.app (the new Next.js site)

---

## ✅ What's already working in the new Next.js site

1. **Hero** — full-bleed kitchen photo, navy gradient, "A home that *shines*. Without lifting a *finger*." with Fraunces italic accents in blush. CTA buttons (Request Quote / View Services) render cleanly.
2. **Trust strip** — 4 navy badges (Fully Insured, Background-Checked, 4.9 Google, 13 Cities Served).
3. **Services section** — 5 cards laid out exactly as legacy: Regular Cleaning wide on top + 3-card row (Deep, Move-In/Out, Commercial) + Post-Construction below.
4. **How It Works** — eyebrow + Fraunces "Three simple steps to a *spotless* home" + 3 numbered steps (01 Connect, 02 Schedule, 03 Enjoy The Sparkle) with JetBrains Mono numbers in blush.
5. **Why Ultra Shine** — 4 feature cards (Eco+Pet-Safe, Trained+Vetted, Satisfaction Guaranteed, Flexible Scheduling).
6. **Reviews marquee** — navy section with gold ★★★★★, "What our *clients* say", scrolling testimonials with cream cards on left-blush border.
7. **Service Areas** — left column with city tags (Boca, Delray, Boynton, Lake Worth, West Palm, Wellington, Parkland under Palm Beach County · Coral Springs, Fort Lauderdale, Coconut Creek, Deerfield, Pompano, Margate under Broward County) + right column AI-generated woman in Ultra Shine polo with "Your local team, at your door *tomorrow*."
8. **"Done right. Or done again." Promise** — navy section, sparkle ✦ ornament top-right, 3 pillars (No excuses · No hassle · No fees).
9. **FAQ accordion** — bathroom photo on left, 9 questions on right that expand on click.
10. **Final CTA** — "A cleaner home, *without the stress*." with REQUEST YOUR FREE QUOTE button.
11. **Footer** — 4 columns, brand top-left, Boca Raton · South Florida tagline.

---

## 🔧 Things to fix / build (next sprints)

### URGENT (do first, in order)
1. **Service pages 404** — Clicking any service card goes to `/services/regular-cleaning` etc., which don't exist yet. Need to build 5 pages:
   - `/services/regular-cleaning`
   - `/services/deep-cleaning`
   - `/services/move-in-out`
   - `/services/commercial`
   - `/services/post-construction`
   - Each follows the same page structure (per HANDOFF Section 8).
2. **Quote form is a stub** — Currently shows "Form is being upgraded" placeholder. Need to build the real 6-section form (Service Type, Frequency, Home Size, Service Area, Add-Ons, Your Info) per HANDOFF, with NO PRICING (Rule 5A) and email-on-submit via Resend.com.
3. **Footer links text-only** — Footer "Services" column points to /services/* (which don't exist yet) and Company column points to /about, /work-for-us (also don't exist yet). Wire these once pages are built.

### MEDIUM PRIORITY
4. **About page** — `/about/` — Tiago + Francine founder story, 2018 CT, 2021 FL move, husband-wife.
5. **Work For Us page** — `/work-for-us/` — cleaner recruiting form.
6. **AI-generated woman in Areas section** — swap for real photo when polos arrive (per HANDOFF Rule 5C, no AI faces of Tiago/Francine — but a real team member or real client would be ideal).
7. **Replace placeholder photos** — Some service card photos are stock; swap in real ones from cleans when available.

### PHASE 2 (after all static pages exist)
8. **3D scroll effects** — GSAP + ScrollTrigger + Three.js OR Framer Motion + React Three Fiber. The HANDOFF references "the cool stuff" — this is what the Next.js conversion was for.
9. **Admin dashboard** at `/admin` — login-gated via Supabase Auth or Clerk, with the panels we mocked in `dashboard.html` (Cleanings, Revenue, Team & Payroll, Forms & Leads).
10. **Jobber GraphQL integration** — pull real jobs/clients/revenue into the dashboard (api.getjobber.com via OAuth 2.0).
11. **Google Places API** — pull real Google reviews into the marquee (currently hard-coded).
12. **Meta Graph API** — pull real Instagram feed into a "@ultrashinecleaning" social section.
13. **Bilingual support** — English/Spanish toggle (Boca has large Spanish-speaking market).
14. **13 city landing pages** — `/areas/boca-raton/`, `/areas/delray-beach/`, etc. (SEO).

### MOOD/POLISH (nice-to-have)
15. **Service card hover states** — slight lift + shadow when hovering. Already in CSS but could be more polished.
16. **Mobile responsive QA** — 1024px and 640px breakpoints exist but haven't been tested on actual phone.
17. **Footer cleanup** — last frame showed footer is a bit cramped at the bottom.

---

## Brand DNA confirmation (new site matches legacy)

✅ Fraunces serif headlines with italic accents in blush
✅ Outfit body text
✅ JetBrains Mono numerics
✅ Navy `#1F3F77` / Cream `#F4ECDB` / Blush `#D9B5A8` / Gold `#C9A961` / Sage `#7DB39B`
✅ Sparkle ✦ ornaments (used sparingly per brand rules)
✅ NO pricing displayed
✅ NO client count claims
✅ "13 Cities Served" / "Palm Beach + Broward" framing
✅ Round corners (10/16/24)

---

## Conclusion

The new Next.js site successfully ports the entire legacy homepage with brand fidelity. The biggest remaining gap is the 5 service pages + the real quote form. Once those exist, we're at full parity with the existing Wix site, plus the new stack supports the 3D scroll + dashboard + bilingual + API integrations that the Wix site couldn't do.
