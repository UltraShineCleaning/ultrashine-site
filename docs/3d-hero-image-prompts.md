# 3D Hero Image Prompts — Ultra Shine Cleaning
**For use with: Midjourney v7, DALL-E 3, Imagen 3, Sora (image mode), Flux 1.1 Pro, Google Flow / Nano Banana**

---

# ⭐ TOP PRIORITY — 4-SCENE CONNECTED HOMEPAGE TOUR

These are the 4 images for the homepage's `HeroScrollHome` cinematic scroll-through. They must look like the SAME house, same time of day, same architectural style — so as you scroll you feel like you're walking from room to room.

## How to generate with Google Flow / Nano Banana for perfect continuity

1. **Generate Scene 01 FIRST** using the full descriptive prompt below.
2. **For Scenes 02, 03, and 04**: in Nano Banana, attach Scene 01 as a reference image and say something like *"Now show the [room name] in this same Boca Raton coastal home — same golden-hour lighting, same architectural style, same color palette. [paste Scene 02 prompt]"*
3. Nano Banana is purpose-built for scene continuity — using a reference is the only reliable way to keep the home consistent across all 4 images.
4. If any scene drifts off-style, re-roll with the same reference attached.

## Universal style anchor (mention in EVERY prompt for continuity)
*"Luxury coastal Florida home (Boca Raton aesthetic), golden hour late afternoon, warm directional light streaming through floor-to-ceiling windows, premium real-estate photography meets cinematic 3D render, color palette: warm whites, soft navy accents, marble and brushed gold details, palm silhouettes visible through windows, no people, no text, no logos, photorealistic, 16:9 cinematic"*

---

### 🟦 SCENE 01 — KITCHEN (the establishing shot, generate FIRST)
**Save as:** `hero_scene_01_kitchen.jpg`

```
Wide-angle establishing shot of a luxury coastal Florida kitchen (Boca Raton aesthetic) at golden hour late afternoon, looking from the entry into a chef's kitchen with massive marble island, brushed gold pendant lights, warm white cabinetry, navy lower cabinets, floor-to-ceiling windows on the right showing palm silhouettes and soft sunset glow, polished marble floors reflecting the warm directional light, fresh white orchid in ceramic vase on island, completely spotless and freshly cleaned, no people, no clutter, premium real-estate photography meets cinematic 3D render, color palette warm whites with soft navy accents and brushed gold details, photorealistic, 16:9 cinematic --ar 16:9 --style raw --v 7
```

---

### 🟦 SCENE 02 — LIVING ROOM (continuity from kitchen, generate with Scene 01 attached)
**Save as:** `hero_scene_02_living.jpg`

```
Now show the open-plan living room in this same Boca Raton coastal home, viewed from where the kitchen ends — same golden hour late afternoon, same warm directional light, same architectural style: floor-to-ceiling windows on the right showing palms, marble floors continuing through, navy accent wall behind a low-profile cream linen sofa, brushed gold floor lamp, neutral wool rug, fresh white flowers on a marble coffee table, completely spotless and freshly cleaned, no people, no clutter, premium real-estate photography meets cinematic 3D render, same color palette as the kitchen reference: warm whites, soft navy, brushed gold, photorealistic, 16:9 cinematic --ar 16:9 --style raw --v 7
```

---

### 🟦 SCENE 03 — BATHROOM (intimate detail, generate with Scene 01 or 02 attached)
**Save as:** `hero_scene_03_bathroom.jpg`

```
Now show the primary bathroom in this same Boca Raton coastal home — same golden hour late afternoon light streaming through frosted floor-to-ceiling windows on the right, same architectural style and finishes: white marble walls and floor, brushed gold fixtures, a freestanding deep soaking tub in foreground, navy vanity with marble countertop in background, rolled white towels, single small white orchid on a marble shelf, water droplets catching light on the polished surfaces (freshly cleaned), no people, completely spotless, premium real-estate photography meets cinematic 3D render, same warm white + soft navy + brushed gold palette as the kitchen reference, photorealistic, 16:9 cinematic --ar 16:9 --style raw --v 7
```

---

### 🟦 SCENE 04 — BEDROOM (the final restful destination, generate with Scene 01 attached)
**Save as:** `hero_scene_04_bedroom.jpg`

```
Now show the primary bedroom in this same Boca Raton coastal home — same golden hour late afternoon light streaming through floor-to-ceiling windows on the right showing palm silhouettes, same architectural style and finishes, view from the doorway: a low-profile king bed with crisp white linens and a soft navy throw blanket, marble floors continuing through, brushed gold bedside sconces, single white orchid on the nightstand, navy upholstered headboard, completely spotless and freshly made, no people, premium real-estate photography meets cinematic 3D render, same warm white + soft navy + brushed gold palette as the kitchen reference, photorealistic, 16:9 cinematic --ar 16:9 --style raw --v 7
```

---

### Tips for Google Flow / Nano Banana specifically
- **Reference image is everything.** Without it, the 4 scenes WILL drift in style — different lighting, different palette, different home. Always attach Scene 01.
- **Specify "same" repeatedly** in the prompt. "Same golden hour", "same warm whites", "same architectural style". Redundancy helps the model lock continuity.
- **Re-roll aggressively.** Generate 4 variations of each scene, pick the one that matches Scene 01 most faithfully. The first attempt often drifts.
- **If a scene shows people, faces, or text:** instant re-roll. Add "no people, no faces, no readable text" to the prompt and try again.
- **Aspect ratio:** all 4 must be 16:9 (1920×1080). If Flow won't lock 16:9, generate larger then crop.

When you have all 4 images saved in `/public/images/`, tell me — I'll re-enable the 4-scene scroll-through mode (currently it's in single-scene fallback) and wire them in.

---

# OTHER HERO IMAGE PROMPTS (for non-homepage pages — lower priority)

## Brand DNA (use for ALL prompts)
- Primary palette: bright royal blue (#1C61F0), deep navy (#002C98), soft blue accent (#5E8FFF), warm white
- Mood: premium · clean · warm · trustworthy · NOT cold/sterile/medical
- Style: editorial photography meets cinematic 3D render — Apple product page energy crossed with a high-end real estate listing
- AVOID: cartoonish, neon, cheap stock photo aesthetic, sterile lab vibes, generic cleaning service tropes (no women in maid uniforms holding products and smiling at camera)
- Aspect ratio for ALL hero images: 16:9 (1920×1080) unless noted

---

## 1. HOMEPAGE — Service Area Map area background (subtle, behind the map)
**Use:** behind the ServiceAreaMap section on `/`

```
Aerial 3D render of a stylized South Florida coastline at golden hour, ultra-minimal vector-art style with deep navy ocean meeting bright royal blue suburban grid of palm-lined streets and white modern homes, isometric perspective, soft volumetric haze, subtle map-pin glow markers floating above key neighborhoods, cinematic depth-of-field with foreground bokeh, color palette restricted to #002C98 deep navy, #1C61F0 royal blue, #5E8FFF soft blue, warm cream highlights, premium editorial 3D render aesthetic, no people, no text, no logos, 16:9 cinematic --ar 16:9 --style raw --v 7
```

---

## 2. `/cleaning-time-estimator` — Hero background
**Use:** behind the form on `/cleaning-time-estimator`

```
Abstract 3D render of a luxury home interior dissolving into floating bright-blue particles and soft light rays, navy-deep gradient base, suggestion of a kitchen island and pendant lights emerging from the haze, premium product-launch aesthetic, dreamy cinematic atmosphere, ultra-clean composition with massive negative space in the upper-left third for headline text overlay, color palette #002C98 to #1C61F0 to #5E8FFF, warm gold (#FFC857) accent specks like sparkle, no people, no text, no logos, photorealistic 3D with subtle motion blur, 16:9 --ar 16:9 --style raw --v 7
```

---

## 3. `/quote` — Hero background (left column behind the heading)
**Use:** behind the "Tell us about your space" hero on `/quote`

```
Minimalist 3D scene of a clean modern kitchen at dawn, marble countertop in foreground glowing with morning light, blurred bright blue mid-morning sky through floor-to-ceiling windows, deep navy lower-third gradient for text legibility, suggestion of fresh white linens and a single ceramic vase with eucalyptus, no people no products no clutter, soft volumetric light streaming through windows, Apple product page meets architectural digest aesthetic, color palette #002C98 deep navy, #1C61F0 royal blue, #FFFFFF white, subtle warm cream highlights, 16:9 cinematic editorial render --ar 16:9 --style raw --v 7
```

---

## 4. `/about` — Hero background
**Use:** behind the founder story hero on `/about`

```
3D render of a warm Florida home foyer at dusk, view from inside looking out through open glass doors to a softly lit patio with palm silhouettes, deep navy walls with a single bright royal blue accent piece, white marble floor catching the warm glow, hint of a family-portrait frame on a console table (no faces visible, very abstract), cinematic shallow depth of field, premium real estate photography aesthetic with a 3D-rendered cleanliness, color palette #002C98 navy, #1C61F0 royal blue, warm cream, soft gold ambient light, no people, no text, no logos, 16:9 --ar 16:9 --style raw --v 7
```

---

## 5. `/services` — Hero background
**Use:** behind the "Five services, one standard" hero on `/services`

```
Five floating 3D abstract glass orbs of varying sizes arranged in a flowing diagonal composition, each orb containing a different cleaning scene at miniature scale (a vacuum, a sparkle, a fresh towel, water droplets, sun rays through a window) — but ultra-stylized and minimal, not literal, against a deep navy gradient background dissolving to bright royal blue, ethereal glow around each orb, premium product-launch aesthetic, plenty of negative space, photorealistic 3D render with cinematic lighting, color palette #002C98 to #1C61F0 to #5E8FFF, warm gold (#FFC857) sparkle accents, no people, no text, no logos, 16:9 --ar 16:9 --style raw --v 7
```

---

## 6. `/blog` — Hero background
**Use:** behind the "Cleaning notebook" headline on `/blog`

```
Top-down 3D scene of an editorial flat-lay on a deep navy linen surface, featuring a slim laptop with a glowing bright blue screen (no text visible), a ceramic coffee cup, fresh white flowers in a minimalist vase, a single fountain pen, soft window light from upper-left creating long warm shadows, ultra-clean composition with negative space, premium magazine editorial aesthetic with 3D render polish, color palette #002C98 navy, #1C61F0 royal blue, warm white, soft gold accents, no people, no faces, no readable text, 16:9 --ar 16:9 --style raw --v 7
```

---

## 7. `/areas` — Hero background
**Use:** behind the "13 cities. One promise." hero on `/areas`

```
Top-down 3D isometric render of a stylized South Florida region map dissolving into floating particles, 13 small glowing pins of different sizes scattered across an abstract suburb-meets-coastline landscape, palm-tree silhouettes, ocean strip in lower third, soft sunset gradient sky, premium editorial 3D aesthetic with cinematic depth-of-field, color palette #002C98 deep navy, #1C61F0 royal blue, #5E8FFF soft blue accent, warm gold (#FFC857) for pin glow, no people, no readable text, no real city labels, 16:9 --ar 16:9 --style raw --v 7
```

---

## 8. `/reviews` — Hero background
**Use:** behind the "What our clients say" hero on `/reviews`

```
3D abstract render of five glowing gold five-pointed stars floating in a flowing arc against a deep navy backdrop, each star with soft warm halo glow, subtle royal blue light rays radiating outward, dust particles catching light, premium award-ceremony aesthetic with cinematic depth, ultra-clean composition with negative space, color palette #002C98 navy with warm gold (#FFC857) and subtle royal blue (#1C61F0) highlights, photorealistic 3D render, no people, no text, no logos, 16:9 --ar 16:9 --style raw --v 7
```

---

## 9. `/faq` — Hero background
**Use:** behind the "Frequently asked" hero on `/faq`

```
3D render of a soft cloud-like landscape of overlapping floating speech bubbles in various sizes, all in shades of royal blue and navy, gentle gradient lighting from upper-left, dreamy atmospheric haze, ultra-minimal and editorial, premium product-launch aesthetic, color palette #002C98 deep navy, #1C61F0 royal blue, #5E8FFF soft blue, white accents, no text inside bubbles, no people, no logos, 16:9 --ar 16:9 --style raw --v 7
```

---

## 10. `/leave-a-review` — Hero background
**Use:** behind the "Thank you" hero on `/leave-a-review`

```
3D render of a single oversized gold five-pointed star floating in center frame against a deep navy gradient backdrop, soft warm halo glow radiating outward, subtle particle dust in the surrounding atmosphere, dreamy cinematic lighting with shallow depth-of-field, premium award-ceremony aesthetic, color palette dominantly warm gold (#FFC857) on #002C98 deep navy with subtle royal blue (#1C61F0) light rays, photorealistic 3D render, no people, no text, no logos, 16:9 --ar 16:9 --style raw --v 7
```

---

## File naming convention when you download
Save each as `/public/images/hero_3d_[page].jpg` — e.g.:
- `hero_3d_estimator.jpg`
- `hero_3d_quote.jpg`
- `hero_3d_about.jpg`
- `hero_3d_services.jpg`
- `hero_3d_blog.jpg`
- `hero_3d_areas.jpg`
- `hero_3d_reviews.jpg`
- `hero_3d_faq.jpg`
- `hero_3d_leavereview.jpg`
- `hero_3d_map_area.jpg`

Once they're in `/public/images/`, send me the list of files you generated and I'll wire each into the corresponding hero's CSS background. They'll replace the flat blue gradient currently sitting behind those headlines.

---

## Tips for getting good outputs
1. **Generate 4 variations per prompt** — pick the best one. Tools often nail the vibe on attempt #2 or #3.
2. **For Midjourney**: append `--ar 16:9 --style raw --v 7` (already in prompts). The `--style raw` keeps it photographic, not over-stylized.
3. **For DALL-E 3 / ChatGPT**: paste the prompt as-is — drop the `--ar` flags, just ask for "16:9 aspect ratio" in the conversation.
4. **For Flux 1.1 Pro**: drop the `--` flags, add "16:9 aspect ratio, 1920x1080 resolution" at the end.
5. **Re-roll any output with visible text, faces, or maid-uniform tropes** — those break the editorial aesthetic.
6. **If an image looks too dark for text overlay**: ask the tool to "increase the negative space in the upper third for headline overlay" and regenerate.

---

## Companion brief if you want to generate ONE master hero (highest priority)
If you only have time/budget for one, generate **#2 (the estimator)** first — that's the most-used interactive page and the one with the flattest current hero. It needs visual life the most.
