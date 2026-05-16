import { NextResponse } from 'next/server';

/**
 * POST /api/quote
 *
 * Receives quote-form submissions from /quote.
 * For now: logs the payload server-side so submissions hit Vercel logs.
 * Next step: wire Resend.com to email contact@ultrashinecleaningfl.com on each submit.
 *
 * To wire Resend later:
 *   1. npm install resend
 *   2. Add RESEND_API_KEY to Vercel env
 *   3. Replace the console.log block with the Resend call (see commented block below)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Server-side log — visible in Vercel deployment logs
    console.log('[quote] new submission', JSON.stringify(body, null, 2));

    /* ---- Resend wiring (commented until RESEND_API_KEY is set) ----
    import { Resend } from 'resend';
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Ultra Shine Quote Bot <quotes@ultrashinecleaningfl.com>',
      to: 'contact@ultrashinecleaningfl.com',
      subject: `New Quote Request — ${body.contact?.first} ${body.contact?.last} · ${body.city}`,
      text: JSON.stringify(body, null, 2),
    });
    -------------------------------------------------------------- */

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('[quote] error', err);
    return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400 });
  }
}
