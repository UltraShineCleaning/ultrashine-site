# Ultra Shine Cleaning — Website

Production website for ultrashinecleaningfl.com. Static HTML hosted on Vercel.

## Tech Stack
- **Static HTML/CSS** (Phase 1 — current)
- **Next.js + React** (Phase 2 — when we add booking submission, admin dashboard, Jobber integration)
- **Vercel** for hosting (free tier)
- **GitHub** for code storage + auto-deploy on push

## Pages
- `/` — Home page
- `/quote` — Free quote / booking form

## Deployment

This is a static site. Vercel serves the HTML/CSS/images directly. Every push to `main` branch on GitHub triggers an automatic Vercel deployment.

### First-time setup (you do these once)

After unzipping this folder somewhere on your Mac (e.g. `/Volumes/DevDrive/ULTRASHINE_OS/04_WEBSITE/`), open Terminal in that folder and run:

```bash
# 1. Initialize git
git init
git add .
git commit -m "Initial commit — Ultra Shine site v1"

# 2. Create a GitHub repo (you need to create it on github.com first, named e.g. "ultrashine-site")
# Then connect it:
git branch -M main
git remote add origin https://github.com/YOUR-GITHUB-USERNAME/ultrashine-site.git
git push -u origin main

# 3. Connect Vercel
# Go to vercel.com/new, click "Import Git Repository", pick this repo, click Deploy.
# Vercel auto-detects it's a static site and deploys it. ~60 seconds.
# You'll get a URL like ultrashine-site.vercel.app
```

### After that, every change is one command

When I (Claude) update files in this project, you'll run:

```bash
git add .
git commit -m "describe the change"
git push
```

Vercel auto-deploys within 30 seconds. Always.

## Folder structure

```
ultrashine-site/
├── index.html          ← Home page
├── quote/
│   └── index.html      ← Quote/booking form
├── public/
│   └── images/         ← All images, logos
└── README.md           ← This file
```

## Phase 2 (after this is live)

When we're ready to:
- Make the booking form actually submit
- Wire it up to Jobber (your CRM)
- Add the admin dashboard at `/admin`
- Add automated email confirmations
- Connect Instagram + Google Business APIs

… we convert this static site to a full Next.js project. Same URL, same Vercel hosting — just upgraded behind the scenes.

## Brand
- **Logo:** `public/images/logo_white_tight.png` (white, on dark backgrounds), `logo_navy_tight.png` (navy, on cream backgrounds)
- **Colors:**
  - Navy: `#1F3F77` (primary)
  - Navy deep: `#15294C` (darkest)
  - Cream: `#F4ECDB` (background, light text)
  - Blush: `#D9B5A8` (accent — italics, sparkles, highlight)
  - Gold: `#C9A961` (stars, awards)
- **Fonts:** Fraunces (serif, headlines + italics), Outfit (sans, UI), JetBrains Mono (numerics)

## Domain cutover (last step, after site is fully built)

Currently `ultrashinecleaningfl.com` points to Wix. When we're ready to switch:
1. Get the Vercel-provided DNS records (A + CNAME)
2. Log into wherever the domain is registered (probably Wix)
3. Paste those records into the DNS settings
4. Wait ~10 minutes for propagation
5. ultrashinecleaningfl.com now serves this site
6. Old Wix is unhooked (still exists at its Wix subdomain, but the .com points here now)

Zero downtime. We never touch DNS until we're 100% ready.
