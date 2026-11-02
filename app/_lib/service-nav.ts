/** The five services, in menu order: used by the desktop Services dropdown and the phone menu. */
export const SERVICE_NAV = [
  { href: '/services/regular-cleaning', name: 'Regular Cleaning', blurb: 'Weekly, bi-weekly or monthly. Same crew every visit.', icon: 'regular' },
  { href: '/services/deep-cleaning', name: 'Deep Cleaning', blurb: 'Top-to-bottom reset. Baseboards, grout, fans.', icon: 'deep' },
  { href: '/services/move-in-out', name: 'Move-In / Move-Out', blurb: 'Empty-home detail clean, built for your deposit.', icon: 'move' },
  { href: '/services/post-construction', name: 'Post-Construction', blurb: 'Drywall dust, stickers, paint specks. Move-in ready.', icon: 'post' },
  { href: '/services/commercial', name: 'Commercial', blurb: 'Offices, retail and clinics, after hours.', icon: 'commercial' },
] as const;
