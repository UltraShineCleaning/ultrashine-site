import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import {
  QUOTE_ADD_ONS,
  QUOTE_FREQ_KEYS,
  QUOTE_SERVICE_KEYS,
  addOnIncluded,
  computeQuoteBallpark,
  formatRange,
  type QuoteAddOnKey,
  type QuoteServiceKey,
} from '../../_lib/quoteBallpark';
import type { Frequency } from '../../_lib/estimate';

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
// Sender address. Set QUOTE_FROM_EMAIL in Vercel once the domain is verified
// in Resend — e.g. "Ultra Shine Quote Bot <quotes@ultrashinecleaningfl.com>".
// Until then this falls back to Resend's shared sandbox domain, which delivers
// but carries the spam reputation of every other developer testing on it.
const FROM_EMAIL =
  process.env.QUOTE_FROM_EMAIL?.trim() || 'Ultra Shine Quote Bot <onboarding@resend.dev>';

// The add-on table is shared with the /quote page — one source, so the email
// can never price an add-on differently from what the customer was shown.
const ADDON_PRICES: Record<string, { display: string; lowEstimate: number; highEstimate: number }> =
  Object.fromEntries(
    QUOTE_ADD_ONS.map((a) => [
      a.name,
      { display: a.label.replace(/^\+/, ''), lowEstimate: a.low, highEstimate: a.high },
    ]),
  );

type QuotePayload = {
  service?: string;
  frequency?: string;
  serviceKey?: string;
  frequencyKey?: string;
  addOnKeys?: string[];
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  floors?: number;
  street?: string;
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
  /** Marketing attribution — "Google Search" / "Instagram" / "Referral" etc. */
  heardFrom?: string;
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

/** Validated service key, or null for old clients that didn't send one. */
function serviceKeyOf(p: QuotePayload): QuoteServiceKey | null {
  return QUOTE_SERVICE_KEYS.includes(p.serviceKey as QuoteServiceKey)
    ? (p.serviceKey as QuoteServiceKey)
    : null;
}

/** Name of an add-on the chosen service already includes. */
function isIncludedName(name: string, service: QuoteServiceKey | null): boolean {
  if (!service) return false;
  const a = QUOTE_ADD_ONS.find((x) => x.name === name);
  return !!a && addOnIncluded(a, service);
}

/**
 * The ballpark the customer saw on /quote — RECOMPUTED here from their
 * choices with the same function the page uses. A price sent by the browser
 * is never trusted. Null for Commercial, or if the page was an old version
 * that didn't send the keys.
 */
function ballparkFor(p: QuotePayload): string | null {
  const service = serviceKeyOf(p);
  if (!service) return null;
  const frequency = QUOTE_FREQ_KEYS.includes(p.frequencyKey as Frequency)
    ? (p.frequencyKey as Frequency)
    : 'one';
  const validKeys = new Set(QUOTE_ADD_ONS.map((a) => a.key));
  const addOns = (Array.isArray(p.addOnKeys) ? p.addOnKeys : []).filter(
    (k): k is QuoteAddOnKey => validKeys.has(k as QuoteAddOnKey),
  );
  const b = computeQuoteBallpark({
    service,
    frequency,
    bedrooms: Number(p.bedrooms),
    bathrooms: Number(p.bathrooms),
    sqft: Number(p.sqft),
    floors: Number(p.floors) || 1,
    addOns,
  });
  return b ? formatRange(b) : null;
}

function calcAddOnTotals(
  addOns: string[],
  service: QuoteServiceKey | null,
): { lines: { name: string; price: string }[]; min: number; max: number; hasVariable: boolean } {
  const lines = addOns.map((name) => ({
    name,
    price: isIncludedName(name, service) ? 'Included' : ADDON_PRICES[name]?.display ?? '—',
  }));
  let min = 0;
  let max = 0;
  let hasVariable = false;
  for (const name of addOns) {
    const p = ADDON_PRICES[name];
    if (!p) continue;
    if (isIncludedName(name, service)) continue;
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
  const { lines, min, max, hasVariable } = calcAddOnTotals(addOnsList, serviceKeyOf(p));
  const ballpark = ballparkFor(p);
  const notes = p.notes?.trim() || '—';
  const submitted = p.submittedAt
    ? new Date(p.submittedAt).toLocaleString('en-US', { timeZone: 'America/New_York', timeZoneName: 'short' })
    : new Date().toLocaleString('en-US', { timeZone: 'America/New_York', timeZoneName: 'short' });

  const addOnsBlock = addOnsList.length
    ? `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:6px;">
        ${lines
          .map(
            (l) => `<tr>
              <td style="padding:6px 0;font-size:14px;color:#002C98;">${l.name}</td>
              <td style="padding:6px 0;font-size:14px;color:#1C61F0;text-align:right;font-family:'Courier New',monospace;">${l.price}</td>
            </tr>`
          )
          .join('')}
        <tr><td colspan="2" style="border-top:1px solid rgba(28, 97, 240,0.15);padding-top:10px;margin-top:6px;"></td></tr>
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#1C61F0;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">Add-On Subtotal</td>
          <td style="padding:8px 0;font-size:14px;color:#002C98;text-align:right;font-family:'Courier New',monospace;font-weight:700;">
            ${min === 0 && max === 0 ? 'Depends on count' : `$${min}–$${max}${hasVariable ? '+' : ''}`}
          </td>
        </tr>
        ${hasVariable ? `<tr><td colspan="2" style="padding:4px 0;font-size:11px;color:#1C61F0;opacity:0.7;">+ per-window / per-cabinet items quoted after walkthrough</td></tr>` : ''}
      </table>`
    : `<div style="padding:8px 0;font-size:14px;color:#1C61F0;opacity:0.7;">None selected</div>`;

  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#002C98;">
  <div style="max-width:640px;margin:0 auto;padding:36px 24px 60px;">

    <!-- HEADER -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td>
          <div style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#1C61F0;opacity:0.7;margin-bottom:6px;">New Quote Lead</div>
          <h1 style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;font-weight:300;font-size:32px;letter-spacing:-0.5px;margin:0 0 4px;color:#002C98;line-height:1.1;">
            ${fullName}
          </h1>
          <div style="font-size:14px;color:#1C61F0;opacity:0.85;">
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
            <a href="tel:${phoneDigits}" style="display:block;background:#002C98;color:#FFFFFF;padding:14px 6px;border-radius:10px;text-align:center;text-decoration:none;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">
              📞 Call
            </a>
          </td>
          <td width="33%" style="padding:0 3px;">
            <a href="sms:${phoneDigits}" style="display:block;background:#1C61F0;color:#FFFFFF;padding:14px 6px;border-radius:10px;text-align:center;text-decoration:none;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">
              💬 Text
            </a>
          </td>` : ''}
        ${c.email ? `
          <td width="33%" style="padding-left:6px;">
            <a href="mailto:${c.email}" style="display:block;background:#1C61F0;color:#002C98;padding:14px 6px;border-radius:10px;text-align:center;text-decoration:none;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">
              ✉ Email
            </a>
          </td>` : ''}
      </tr>
    </table>

    <!-- MAIN CARD -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;border:1px solid rgba(28, 97, 240,0.12);box-shadow:0 4px 16px rgba(28, 97, 240,0.06);">

      <!-- CONTACT -->
      <tr><td style="padding:14px 22px;background:#002C98;color:#FFFFFF;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;font-weight:600;">Contact</td></tr>
      <tr><td style="padding:18px 22px;font-size:14px;line-height:1.8;border-bottom:1px solid rgba(28, 97, 240,0.08);">
        <strong style="color:#002C98;">${fullName}</strong><br/>
        ${phoneDigits ? `<a href="tel:${phoneDigits}" style="color:#1C61F0;text-decoration:none;font-family:'Courier New',monospace;">${phoneDisplay}</a><br/>` : ''}
        ${c.email ? `<a href="mailto:${c.email}" style="color:#1C61F0;text-decoration:none;">${c.email}</a>` : ''}
      </td></tr>

      <!-- SERVICE -->
      <tr><td style="padding:14px 22px;background:#002C98;color:#FFFFFF;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;font-weight:600;">Service</td></tr>
      <tr><td style="padding:18px 22px;font-size:14px;line-height:1.8;border-bottom:1px solid rgba(28, 97, 240,0.08);">
        <strong>Type:</strong> ${p.service || '—'}<br/>
        <strong>Frequency:</strong> ${p.frequency || '—'}
      </td></tr>

      <!-- BALLPARK THE CUSTOMER SAW -->
      <tr><td style="padding:14px 22px;background:#002C98;color:#FFFFFF;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;font-weight:600;">Ballpark shown to customer</td></tr>
      <tr><td style="padding:18px 22px;border-bottom:1px solid rgba(28, 97, 240,0.08);">
        <div style="font-size:26px;font-weight:700;color:#002C98;font-family:'Courier New',monospace;">${ballpark ?? 'None — commercial, quoted after walkthrough'}</div>
        ${ballpark ? `<div style="font-size:12px;color:#1C61F0;opacity:0.75;margin-top:4px;">Same formula as the estimator. Includes selected add-ons; per-window / per-cabinet items not included. Confirm at walkthrough.</div>` : ''}
      </td></tr>

      <!-- ADD-ONS WITH PRICES -->
      <tr><td style="padding:14px 22px;background:#002C98;color:#FFFFFF;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;font-weight:600;">
        Add-Ons${addOnsList.length ? ` (${addOnsList.length})` : ''}
      </td></tr>
      <tr><td style="padding:18px 22px;border-bottom:1px solid rgba(28, 97, 240,0.08);">
        ${addOnsBlock}
      </td></tr>

      <!-- HOME -->
      <tr><td style="padding:14px 22px;background:#002C98;color:#FFFFFF;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;font-weight:600;">Home</td></tr>
      <tr><td style="padding:18px 22px;font-size:14px;line-height:1.8;border-bottom:1px solid rgba(28, 97, 240,0.08);">
        <strong>${p.bedrooms ?? '—'}</strong> bed &nbsp;·&nbsp;
        <strong>${p.bathrooms ?? '—'}</strong> bath &nbsp;·&nbsp;
        <strong>${p.sqft?.toLocaleString() ?? '—'}</strong> sq ft${p.floors ? ` &nbsp;·&nbsp; <strong>${p.floors >= 3 ? '3+' : p.floors}</strong> floor${p.floors > 1 ? 's' : ''}` : ''}<br/>
        ${p.street ? `<a href="https://maps.google.com/?q=${encodeURIComponent([p.street, p.city, p.zip ? `FL ${p.zip}` : ''].filter(Boolean).join(', '))}" style="color:#002C98;font-weight:600;text-decoration:none;border-bottom:1px solid rgba(28,97,240,0.35);">${p.street}</a><br/>` : ''}${p.city || '—'}${p.zip ? `, FL ${p.zip}` : ''}
      </td></tr>

      <!-- NOTES -->
      <tr><td style="padding:14px 22px;background:#002C98;color:#FFFFFF;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;font-weight:600;">Notes</td></tr>
      <tr><td style="padding:18px 22px;font-size:14px;line-height:1.65;white-space:pre-wrap;color:${notes === '—' ? '#1C61F0' : '#002C98'};opacity:${notes === '—' ? '0.55' : '1'};">${notes}</td></tr>

      <!-- ATTRIBUTION (free marketing tracking) -->
      <tr><td style="padding:14px 22px;background:#EAF1FF;color:#002C98;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;font-weight:600;border-top:1px solid #FFFFFF;">📊 Heard about us via</td></tr>
      <tr><td style="padding:14px 22px;font-size:14px;color:${p.heardFrom ? '#002C98' : '#5A5F6B'};font-weight:${p.heardFrom ? '600' : '400'};opacity:${p.heardFrom ? '1' : '0.7'};">${p.heardFrom?.trim() || 'Not provided'}</td></tr>

    </table>

    <!-- FOOTER -->
    <div style="margin-top:22px;font-size:11px;color:#1C61F0;opacity:0.55;text-align:center;line-height:1.6;">
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
  const { lines, min, max, hasVariable } = calcAddOnTotals(addOns, serviceKeyOf(p));
  const ballpark = ballparkFor(p);
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
    `Ballpark:  ${ballpark ?? '— (commercial / walkthrough)'}   ← what the customer saw`,
    '',
    `Add-Ons (${addOns.length}):`,
    ...(addOns.length
      ? lines.map((l) => `  · ${l.name.padEnd(20)} ${l.price}`)
      : ['  None']),
    `  Subtotal: ${addOnTotal}`,
    '',
    `Home:      ${p.bedrooms ?? '—'} BR / ${p.bathrooms ?? '—'} BA / ${p.sqft?.toLocaleString() ?? '—'} sqft / ${p.floors ?? 1} floor(s)`,
    `Address:   ${p.street || '—'}`,
    `Location:  ${p.city || '—'}${p.zip ? `, FL ${p.zip}` : ''}`,
    '',
    `Notes:     ${p.notes?.trim() || '—'}`,
    `Heard via: ${p.heardFrom?.trim() || '— not provided —'}`,
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
