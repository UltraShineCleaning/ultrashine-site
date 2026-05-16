import { NextResponse } from 'next/server';
import { Resend } from 'resend';

/**
 * POST /api/quote
 * Receives quote-form submissions and emails contact@ultrashinecleaningfl.com
 * via Resend with a fully formatted lead card.
 *
 * Env: RESEND_API_KEY (set in Vercel project env)
 */

const TO_EMAIL = 'contact@ultrashinecleaningfl.com';
// Switch to 'Ultra Shine Quotes <quotes@ultrashinecleaningfl.com>' once the
// domain is verified at resend.com.
const FROM_EMAIL = 'Ultra Shine Quote Bot <onboarding@resend.dev>';

// Keep this in sync with /quote ADD_ONS labels — used for the email totals
const ADDON_PRICES: Record<string, { display: string; lowEstimate: number; highEstimate: number }> = {
  'Inside Oven':       { display: '$40–$60',            lowEstimate: 40,  highEstimate: 60 },
  'Inside Fridge':     { display: '$40–$100',           lowEstimate: 40,  highEstimate: 100 },
  'Inside Windows':    { display: '$5–$10 / window',    lowEstimate: 0,   highEstimate: 0 }, // depends on window count
  'Inside Cabinets':   { display: '$5–$10 / cabinet',   lowEstimate: 0,   highEstimate: 0 }, // depends on cabinet count
  'Laundry Fold':      { display: '$35 up',             lowEstimate: 35,  highEstimate: 70 },
  'Pet-Safe Products': { display: 'Free',               lowEstimate: 0,   highEstimate: 0 },
};

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

function digitsOnly(s?: string): string {
  return (s || '').replace(/\D/g, '');
}

function formatPhone(raw?: string): string {
  const d = digitsOnly(raw);
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d.startsWith('1')) return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return raw || '—';
}

function calcAddOnTotals(addOns: string[]): { lines: { name: string; price: string }[]; min: number; max: number; hasVariable: boolean } {
  const lines = addOns.map((name) => ({
    name,
    price: ADDON_PRICES[name]?.display ?? '—',
  }));
  let min = 0;
  let max = 0;
  let hasVariable = false;
  for (const name of addOns) {
    const p = ADDON_PRICES[name];
    if (!p) continue;
    if (p.lowEstimate === 0 && p.highEstimate === 0 && p.display !== 'Free') hasVariable = true;
    min += p.lowEstimate;
    max += p.highEstimate;
  }
  return { lines, min, max, hasVariable };
}

function renderHtml(p: QuotePayload): string {
  const c = p.contact ?? {};
  const fullName = [c.first, c.last].filter(Boolean).join(' ') || '—';
  const phoneDigits = digitsOnly(c.phone);
  const phoneDisplay = formatPhone(c.phone);
  const addOnsList = p.addOns ?? [];
  const { lines, min, max, hasVariable } = calcAddOnTotals(addOnsList);
  const notes = p.notes?.trim() || '—';
  const submitted = p.submittedAt
    ? new Date(p.submittedAt).toLocaleString('en-US', { timeZone: 'America/New_York', timeZoneName: 'short' })
    : new Date().toLocaleString('en-US', { timeZone: 'America/New_York', timeZoneName: 'short' });

  const addOnsBlock = addOnsList.length
    ? `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:6px;">
        ${lines
          .map(
            (l) => `<tr>
              <td style="padding:6px 0;font-size:14px;color:#15294C;">${l.name}</td>
              <td style="padding:6px 0;font-size:14px;color:#1F3F77;text-align:right;font-family:'Courier New',monospace;">${l.price}</td>
            </tr>`
          )
          .join('')}
        <tr><td colspan="2" style="border-top:1px solid rgba(31,63,119,0.15);padding-top:10px;margin-top:6px;"></td></tr>
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#1F3F77;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">Add-On Subtotal</td>
          <td style="padding:8px 0;font-size:14px;color:#15294C;text-align:right;font-family:'Courier New',monospace;font-weight:700;">
            ${min === 0 && max === 0 ? 'Depends on count' : `$${min}–$${max}${hasVariable ? '+' : ''}`}
          </td>
        </tr>
        ${hasVariable ? `<tr><td colspan="2" style="padding:4px 0;font-size:11px;color:#1F3F77;opacity:0.7;font-style:italic;">+ per-window / per-cabinet items quoted after walkthrough</td></tr>` : ''}
      </table>`
    : `<div style="padding:8px 0;font-size:14px;color:#1F3F77;opacity:0.7;">None selected</div>`;

  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#F4ECDB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#15294C;">
  <div style="max-width:640px;margin:0 auto;padding:36px 24px 60px;">

    <!-- HEADER -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td>
          <div style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#1F3F77;opacity:0.7;margin-bottom:6px;">New Quote Lead</div>
          <h1 style="font-family:Georgia,serif;font-weight:300;font-size:32px;letter-spacing:-0.5px;margin:0 0 4px;color:#15294C;line-height:1.1;">
            ${fullName}
          </h1>
          <div style="font-size:14px;color:#1F3F77;opacity:0.85;">
            ${p.service || '—'} · ${p.city || '—'}${p.zip ? `, ${p.zip}` : ''}
          </div>
        </td>
      </tr>
    </table>

    <!-- QUICK ACTION BUTTONS -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        ${phoneDigits ? `
          <td width="33%" style="padding-right:6px;">
            <a href="tel:${phoneDigits}" style="display:block;background:#15294C;color:#F4ECDB;padding:14px 6px;border-radius:10px;text-align:center;text-decoration:none;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">
              📞 Call
            </a>
          </td>
          <td width="33%" style="padding:0 3px;">
            <a href="sms:${phoneDigits}" style="display:block;background:#1F3F77;color:#F4ECDB;padding:14px 6px;border-radius:10px;text-align:center;text-decoration:none;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">
              💬 Text
            </a>
          </td>` : ''}
        ${c.email ? `
          <td width="33%" style="padding-left:6px;">
            <a href="mailto:${c.email}" style="display:block;background:#D9B5A8;color:#15294C;padding:14px 6px;border-radius:10px;text-align:center;text-decoration:none;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">
              ✉ Email
            </a>
          </td>` : ''}
      </tr>
    </table>

    <!-- MAIN CARD -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;border:1px solid rgba(31,63,119,0.12);box-shadow:0 4px 16px rgba(31,63,119,0.06);">

      <!-- CONTACT -->
      <tr><td style="padding:14px 22px;background:#15294C;color:#F4ECDB;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;font-weight:600;">Contact</td></tr>
      <tr><td style="padding:18px 22px;font-size:14px;line-height:1.8;border-bottom:1px solid rgba(31,63,119,0.08);">
        <strong style="color:#15294C;">${fullName}</strong><br/>
        ${phoneDigits ? `<a href="tel:${phoneDigits}" style="color:#1F3F77;text-decoration:none;font-family:'Courier New',monospace;">${phoneDisplay}</a><br/>` : ''}
        ${c.email ? `<a href="mailto:${c.email}" style="color:#1F3F77;text-decoration:none;">${c.email}</a>` : ''}
      </td></tr>

      <!-- SERVICE -->
      <tr><td style="padding:14px 22px;background:#15294C;color:#F4ECDB;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;font-weight:600;">Service</td></tr>
      <tr><td style="padding:18px 22px;font-size:14px;line-height:1.8;border-bottom:1px solid rgba(31,63,119,0.08);">
        <strong>Type:</strong> ${p.service || '—'}<br/>
        <strong>Frequency:</strong> ${p.frequency || '—'}
      </td></tr>

      <!-- ADD-ONS WITH PRICES -->
      <tr><td style="padding:14px 22px;background:#15294C;color:#F4ECDB;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;font-weight:600;">
        Add-Ons${addOnsList.length ? ` (${addOnsList.length})` : ''}
      </td></tr>
      <tr><td style="padding:18px 22px;border-bottom:1px solid rgba(31,63,119,0.08);">
        ${addOnsBlock}
      </td></tr>

      <!-- HOME -->
      <tr><td style="padding:14px 22px;background:#15294C;color:#F4ECDB;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;font-weight:600;">Home</td></tr>
      <tr><td style="padding:18px 22px;font-size:14px;line-height:1.8;border-bottom:1px solid rgba(31,63,119,0.08);">
        <strong>${p.bedrooms ?? '—'}</strong> bed &nbsp;·&nbsp;
        <strong>${p.bathrooms ?? '—'}</strong> bath &nbsp;·&nbsp;
        <strong>${p.sqft?.toLocaleString() ?? '—'}</strong> sq ft<br/>
        ${p.city || '—'}${p.zip ? `, FL ${p.zip}` : ''}
      </td></tr>

      <!-- NOTES -->
      <tr><td style="padding:14px 22px;background:#15294C;color:#F4ECDB;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;font-weight:600;">Notes</td></tr>
      <tr><td style="padding:18px 22px;font-size:14px;line-height:1.65;white-space:pre-wrap;color:${notes === '—' ? '#1F3F77' : '#15294C'};opacity:${notes === '—' ? '0.55' : '1'};">${notes}</td></tr>

    </table>

    <!-- FOOTER -->
    <div style="margin-top:22px;font-size:11px;color:#1F3F77;opacity:0.55;text-align:center;line-height:1.6;">
      Submitted ${submitted}<br/>
      Sent via ultrashinecleaningfl.com/quote · Reply to this email goes directly to ${c.email || 'the customer'}
    </div>
  </div>
</body>
</html>`;
}

function renderText(p: QuotePayload): string {
  const c = p.contact ?? {};
  const fullName = [c.first, c.last].filter(Boolean).join(' ') || '—';
  const addOns = p.addOns ?? [];
  const { min, max, hasVariable } = calcAddOnTotals(addOns);
  const addOnTotal = addOns.length
    ? min === 0 && max === 0
      ? 'Depends on count'
      : `$${min}–$${max}${hasVariable ? '+' : ''}`
    : '—';

  return [
    `NEW QUOTE LEAD — ${fullName}`,
    `${p.service || '—'} · ${p.city || '—'}${p.zip ? `, ${p.zip}` : ''}`,
    '',
    `Phone:     ${formatPhone(c.phone)}`,
    `Email:     ${c.email || '—'}`,
    '',
    `Service:   ${p.service || '—'}`,
    `Frequency: ${p.frequency || '—'}`,
    '',
    `Add-Ons (${addOns.length}):`,
    ...(addOns.length
      ? addOns.map((name) => `  · ${name.padEnd(20)} ${ADDON_PRICES[name]?.display ?? '—'}`)
      : ['  None']),
    `  Subtotal: ${addOnTotal}`,
    '',
    `Home:      ${p.bedrooms ?? '—'} BR / ${p.bathrooms ?? '—'} BA / ${p.sqft?.toLocaleString() ?? '—'} sqft`,
    `Location:  ${p.city || '—'}${p.zip ? `, FL ${p.zip}` : ''}`,
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
      return NextResponse.json({ ok: true, emailed: false }, { status: 200 });
    }

    const resend = new Resend(apiKey);
    const c = body.contact ?? {};
    const fullName = [c.first, c.last].filter(Boolean).join(' ') || 'New lead';

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      replyTo: c.email || undefined,
      subject: `New Quote · ${fullName} · ${body.city || 'unspecified city'}`,
      html: renderHtml(body),
      text: renderText(body),
    });

    if (error) {
      console.error('[quote] Resend error:', error);
      return NextResponse.json({ ok: true, emailed: false, error: error.message }, { status: 200 });
    }

    console.log('[quote] sent', { id: data?.id, to: TO_EMAIL, from: fullName });
    return NextResponse.json({ ok: true, emailed: true, id: data?.id }, { status: 200 });
  } catch (err) {
    console.error('[quote] handler error', err);
    return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400 });
  }
}
