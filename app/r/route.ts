import { NextResponse } from 'next/server';
import { GOOGLE_REVIEW_FORM_URL, GOOGLE_REVIEW_FORM_URL_IOS } from '../_lib/google-reviews';

export const dynamic = 'force-dynamic';

/**
 * ultrashinecleaningfl.com/r — the short "leave us a review" link on every
 * button, QR code, email and DM. Sends the customer straight into Google's
 * write-a-review box: iPhones/iPads to Google's own Business Profile review
 * link, everything else (Android, computers) to the Place-ID review link.
 * Both are defined, with their sources, in app/_lib/google-reviews.ts.
 */
export function GET(req: Request) {
  const ua = req.headers.get('user-agent') || '';
  // iPadOS reports itself as a Mac, so "Macintosh" + touch-era "Mobile" counts too.
  const apple = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua));
  const res = NextResponse.redirect(apple ? GOOGLE_REVIEW_FORM_URL_IOS : GOOGLE_REVIEW_FORM_URL, 302);
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
