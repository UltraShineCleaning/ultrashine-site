/**
 * The business's public profiles, in ONE place: footer icons, the phone menu, the
 * "5.0 on Google" chips and the sameAs list in the site schema all read from here.
 *
 * An empty string = that icon is hidden (never link to a page we haven't confirmed).
 * TODO(owner): paste the exact Instagram + Facebook page links below.
 */
export const GOOGLE_PROFILE_URL = 'https://maps.app.goo.gl/EGeuJViEFazQQe579';
export const INSTAGRAM_URL = 'https://www.instagram.com/ultrashinecleaning/';
export const FACEBOOK_URL = '';

export type SocialLink = { key: 'instagram' | 'facebook' | 'google'; label: string; href: string };

export const SOCIAL_LINKS: SocialLink[] = (
  [
    { key: 'instagram', label: 'Ultra Shine Cleaning on Instagram', href: INSTAGRAM_URL },
    { key: 'facebook', label: 'Ultra Shine Cleaning on Facebook', href: FACEBOOK_URL },
    { key: 'google', label: 'Ultra Shine Cleaning reviews on Google', href: GOOGLE_PROFILE_URL },
  ] as SocialLink[]
).filter((l) => !!l.href);
