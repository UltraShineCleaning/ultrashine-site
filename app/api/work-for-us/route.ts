import { NextResponse } from 'next/server';
import { Resend } from 'resend';

/**
 * POST /api/work-for-us
 * Receives cleaner-application submissions and emails contact@ultrashinecleaningfl.com.
 * Same Resend setup as /api/quote.
 */

const TO_EMAIL = 'contact@ultrashinecleaningfl.com';
const FROM_EMAIL = 'Ultra Shine Hiring <onboarding@resend.dev>';

type ApplicationPayload = {
  contact?: {
    first?: string;
    last?: string;
    phone?: string;
    email?: string;
  };
  city?: string;
  language?: string;
  experience?: string;
  ownTransport?: boolean;
  usAuthorized?: boolean;
  availableDays?: string[];
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

function yesNo(b?: boolean): string {
  return b === true ? 'Yes' : b === false ? 'No' : '—';
}

function renderHtml(p: ApplicationPayload): string {
  const c = p.contact ?? {};
  const fullName = [c.first, c.last].filter(Boolean).join(' ') || '—';
  const phoneDigits = digitsOnly(c.phone);
  const phoneDisplay = formatPhone(c.phone);
  const days = p.availableDays?.length ? p.availableDays.join(' · ') : 'Not specified';
  const notes = p.notes?.trim() || '—';
  const submitted = p.submittedAt
    ? new Date(p.submittedAt).toLocaleString('en-US', { timeZone: 'America/New_York', timeZoneName: 'short' })
    : new Date().toLocaleString('en-US', { timeZone: 'America/New_York', timeZoneName: 'short' });

  // Flag any obvious blocker
  const transportFlag = p.ownTransport === false ? '⚠ No own transport' : '';
  const authFlag = p.usAuthorized === false ? '⚠ Not US-authorized' : '';
  const flags = [transportFlag, authFlag].filter(Boolean).join(' &nbsp; · &nbsp; ');

  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#002C98;">
  <div style="max-width:640px;margin:0 auto;padding:36px 24px 60px;">

    <!-- HEADER -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">
      <tr>
        <td>
          <div style="font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#1C61F0;opacity:0.7;margin-bottom:6px;">New Cleaner Application</div>
          <h1 style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;font-weight:300;font-size:32px;letter-spacing:-0.5px;margin:0 0 4px;color:#002C98;line-height:1.1;">
            ${fullName}
          </h1>
          <div style="font-size:14px;color:#1C61F0;opacity:0.85;">
            ${p.city || '—'} · ${p.experience || '—'}
          </div>
          ${flags ? `<div style="margin-top:10px;padding:8px 12px;background:#FFE6E0;border-left:3px solid #B83A3A;border-radius:6px;font-size:13px;color:#B83A3A;">${flags}</div>` : ''}
        </td>
      </tr>
    </table>

    <!-- QUICK ACTIONS -->
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

      <tr><td style="padding:14px 22px;background:#002C98;color:#FFFFFF;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;font-weight:600;">Contact</td></tr>
      <tr><td style="padding:18px 22px;font-size:14px;line-height:1.8;border-bottom:1px solid rgba(28, 97, 240,0.08);">
        <strong>${fullName}</strong><br/>
        ${phoneDigits ? `<a href="tel:${phoneDigits}" style="color:#1C61F0;text-decoration:none;font-family:'Courier New',monospace;">${phoneDisplay}</a><br/>` : ''}
        ${c.email ? `<a href="mailto:${c.email}" style="color:#1C61F0;text-decoration:none;">${c.email}</a><br/>` : ''}
        ${p.city ? `Lives in: <strong>${p.city}</strong>` : ''}
      </td></tr>

      <tr><td style="padding:14px 22px;background:#002C98;color:#FFFFFF;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;font-weight:600;">Background</td></tr>
      <tr><td style="padding:18px 22px;font-size:14px;line-height:1.8;border-bottom:1px solid rgba(28, 97, 240,0.08);">
        <strong>Experience:</strong> ${p.experience || '—'}<br/>
        <strong>Languages:</strong> ${p.language || '—'}
      </td></tr>

      <tr><td style="padding:14px 22px;background:#002C98;color:#FFFFFF;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;font-weight:600;">Qualifications</td></tr>
      <tr><td style="padding:18px 22px;font-size:14px;line-height:1.8;border-bottom:1px solid rgba(28, 97, 240,0.08);">
        <strong>Own transportation:</strong> <span style="color:${p.ownTransport ? '#1C61F0' : '#B83A3A'};">${yesNo(p.ownTransport)}</span><br/>
        <strong>US authorized:</strong> <span style="color:${p.usAuthorized ? '#1C61F0' : '#B83A3A'};">${yesNo(p.usAuthorized)}</span><br/>
        <strong>Available days:</strong> ${days}
      </td></tr>

      <tr><td style="padding:14px 22px;background:#002C98;color:#FFFFFF;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;font-weight:600;">Notes</td></tr>
      <tr><td style="padding:18px 22px;font-size:14px;line-height:1.65;white-space:pre-wrap;color:${notes === '—' ? '#1C61F0' : '#002C98'};opacity:${notes === '—' ? '0.55' : '1'};">${notes}</td></tr>

    </table>

    <div style="margin-top:22px;font-size:11px;color:#1C61F0;opacity:0.55;text-align:center;line-height:1.6;">
      Submitted ${submitted}<br/>
      Sent via ultrashinecleaningfl.com/work-for-us · Reply goes directly to ${c.email || 'the applicant'}
    </div>
  </div>
</body>
</html>`;
}

function renderText(p: ApplicationPayload): string {
  const c = p.contact ?? {};
  const fullName = [c.first, c.last].filter(Boolean).join(' ') || '—';
  return [
    `NEW CLEANER APPLICATION — ${fullName}`,
    `${p.city || '—'} · ${p.experience || '—'}`,
    '',
    `Phone:       ${formatPhone(c.phone)}`,
    `Email:       ${c.email || '—'}`,
    `City:        ${p.city || '—'}`,
    '',
    `Languages:   ${p.language || '—'}`,
    `Experience:  ${p.experience || '—'}`,
    `Own transport:  ${yesNo(p.ownTransport)}`,
    `US authorized: ${yesNo(p.usAuthorized)}`,
    `Available:   ${p.availableDays?.length ? p.availableDays.join(', ') : '—'}`,
    '',
    `Notes:       ${p.notes?.trim() || '—'}`,
    '',
    `Submitted: ${p.submittedAt || new Date().toISOString()}`,
  ].join('\n');
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ApplicationPayload;
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.warn('[work-for-us] RESEND_API_KEY not set — submission logged but no email sent:', body);
      return NextResponse.json({ ok: true, emailed: false }, { status: 200 });
    }

    const resend = new Resend(apiKey);
    const c = body.contact ?? {};
    const fullName = [c.first, c.last].filter(Boolean).join(' ') || 'New applicant';

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      replyTo: c.email || undefined,
      subject: `New Cleaner Application · ${fullName} · ${body.city || 'unspecified'}`,
      html: renderHtml(body),
      text: renderText(body),
    });

    if (error) {
      console.error('[work-for-us] Resend error:', error);
      return NextResponse.json({ ok: true, emailed: false, error: error.message }, { status: 200 });
    }

    console.log('[work-for-us] sent', { id: data?.id, to: TO_EMAIL, from: fullName });
    return NextResponse.json({ ok: true, emailed: true, id: data?.id }, { status: 200 });
  } catch (err) {
    console.error('[work-for-us] handler error', err);
    return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400 });
  }
}
