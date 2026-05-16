import { NextResponse } from 'next/server';
import { Resend } from 'resend';

/**
 * POST /api/quote
 *
 * Receives quote-form submissions from /quote, formats them into a
 * readable email, and sends to contact@ultrashinecleaningfl.com via Resend.
 *
 * Environment:
 *   RESEND_API_KEY — set in Vercel project env (do NOT commit)
 */

const TO_EMAIL = 'contact@ultrashinecleaningfl.com';

// Until the user verifies ultrashinecleaningfl.com at resend.com (adds DNS
// records), we send FROM Resend's free verified sender. After verification,
// swap this to 'Ultra Shine Quotes <quotes@ultrashinecleaningfl.com>'.
const FROM_EMAIL = 'Ultra Shine Quote Bot <onboarding@resend.dev>';

type QuotePayload = {
  service?: string;
  frequency?: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  city?: string;
  zip?: string;
  addOns?: string[];
  contact?: {
    first?: string;
    last?: string;
    phone?: string;
    email?: string;
  };
  notes?: string;
  submittedAt?: string;
};

function renderHtml(p: QuotePayload): string {
  const c = p.contact ?? {};
  const fullName = [c.first, c.last].filter(Boolean).join(' ') || '—';
  const addOns = p.addOns?.length ? p.addOns.join(', ') : 'None';
  const notes = p.notes?.trim() || '—';
  const subText = (s?: string) => (s && s.trim()) || '—';

  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#F4ECDB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#15294C;">
  <div style="max-width:640px;margin:0 auto;padding:40px 28px;">
    <h1 style="font-family:Georgia,serif;font-weight:300;font-size:30px;letter-spacing:-0.5px;margin:0 0 6px;color:#15294C;">
      New Quote Request
    </h1>
    <p style="margin:0 0 28px;font-size:13px;color:#1F3F77;opacity:0.7;letter-spacing:0.06em;text-transform:uppercase;">
      ${fullName} · ${subText(c.phone)} · ${subText(p.city)}
    </p>

    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;border:1px solid rgba(31,63,119,0.12);">
      <tr><td style="padding:14px 22px;background:#15294C;color:#F4ECDB;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;">Contact</td></tr>
      <tr><td style="padding:18px 22px;font-size:15px;line-height:1.7;border-bottom:1px solid rgba(31,63,119,0.08);">
        <strong>Name:</strong> ${fullName}<br/>
        <strong>Phone:</strong> <a href="tel:${subText(c.phone)}" style="color:#1F3F77;">${subText(c.phone)}</a><br/>
        <strong>Email:</strong> ${c.email ? `<a href="mailto:${c.email}" style="color:#1F3F77;">${c.email}</a>` : '—'}
      </td></tr>

      <tr><td style="padding:14px 22px;background:#15294C;color:#F4ECDB;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;">Service Requested</td></tr>
      <tr><td style="padding:18px 22px;font-size:15px;line-height:1.7;border-bottom:1px solid rgba(31,63,119,0.08);">
        <strong>Service:</strong> ${subText(p.service)}<br/>
        <strong>Frequency:</strong> ${subText(p.frequency)}<br/>
        <strong>Add-Ons:</strong> ${addOns}
      </td></tr>

      <tr><td style="padding:14px 22px;background:#15294C;color:#F4ECDB;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;">Home</td></tr>
      <tr><td style="padding:18px 22px;font-size:15px;line-height:1.7;border-bottom:1px solid rgba(31,63,119,0.08);">
        <strong>Bedrooms:</strong> ${p.bedrooms ?? '—'}<br/>
        <strong>Bathrooms:</strong> ${p.bathrooms ?? '—'}<br/>
        <strong>Square feet:</strong> ${p.sqft?.toLocaleString() ?? '—'}<br/>
        <strong>City:</strong> ${subText(p.city)}<br/>
        <strong>Zip:</strong> ${subText(p.zip)}
      </td></tr>

      <tr><td style="padding:14px 22px;background:#15294C;color:#F4ECDB;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;">Notes</td></tr>
      <tr><td style="padding:18px 22px;font-size:15px;line-height:1.7;white-space:pre-wrap;">${notes}</td></tr>
    </table>

    <p style="margin:24px 0 0;font-size:12px;color:#1F3F77;opacity:0.55;">
      Submitted ${p.submittedAt ? new Date(p.submittedAt).toLocaleString('en-US', { timeZone: 'America/New_York', timeZoneName: 'short' }) : new Date().toLocaleString('en-US', { timeZone: 'America/New_York', timeZoneName: 'short' })}<br/>
      Sent via ultrashinecleaningfl.com/quote
    </p>
  </div>
</body>
</html>`;
}

function renderText(p: QuotePayload): string {
  const c = p.contact ?? {};
  const fullName = [c.first, c.last].filter(Boolean).join(' ') || '—';
  return [
    'NEW QUOTE REQUEST — ultrashinecleaningfl.com',
    '',
    `Name:      ${fullName}`,
    `Phone:     ${c.phone || '—'}`,
    `Email:     ${c.email || '—'}`,
    '',
    `Service:   ${p.service || '—'}`,
    `Frequency: ${p.frequency || '—'}`,
    `Add-Ons:   ${p.addOns?.length ? p.addOns.join(', ') : 'None'}`,
    '',
    `Home:      ${p.bedrooms ?? '—'} BR / ${p.bathrooms ?? '—'} BA / ${p.sqft?.toLocaleString() ?? '—'} sqft`,
    `City:      ${p.city || '—'} ${p.zip || ''}`,
    '',
    `Notes:     ${p.notes?.trim() || '—'}`,
    '',
    `Submitted: ${p.submittedAt || new Date().toISOString()}`,
  ].join('\n');
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as QuotePayload;
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.warn('[quote] RESEND_API_KEY not set — submission logged but no email sent:', body);
      // Still return 200 so the user gets the success state; we'll see it in logs.
      return NextResponse.json({ ok: true, emailed: false }, { status: 200 });
    }

    const resend = new Resend(apiKey);
    const c = body.contact ?? {};
    const fullName = [c.first, c.last].filter(Boolean).join(' ') || 'New lead';

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      // Reply-to the customer's email if they gave one — so you can reply directly
      replyTo: c.email || undefined,
      subject: `New Quote · ${fullName} · ${body.city || 'unspecified city'}`,
      html: renderHtml(body),
      text: renderText(body),
    });

    if (error) {
      console.error('[quote] Resend error:', error);
      // Still return 200 — user already saw success, lead is in our logs.
      return NextResponse.json({ ok: true, emailed: false, error: error.message }, { status: 200 });
    }

    console.log('[quote] sent', { id: data?.id, to: TO_EMAIL, from: fullName });
    return NextResponse.json({ ok: true, emailed: true, id: data?.id }, { status: 200 });
  } catch (err) {
    console.error('[quote] handler error', err);
    return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400 });
  }
}
