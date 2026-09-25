/**
 * The "how was your cleaning?" email — ONE template, used by both the
 * manual button in the Reviews tab and the automatic after-job request.
 *
 * Contains a button (opens Google's review form on a phone or computer)
 * and a QR code of the same link for people reading on a computer who'd
 * rather review from their phone.
 */

export const GOOGLE_REVIEW_URL = 'https://maps.app.goo.gl/EGeuJViEFazQQe579';
export const REVIEW_PAGE_URL = 'https://ultrashinecleaningfl.com/leave-a-review';
export const REVIEW_QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=12&color=002C98&bgcolor=FFFFFF&data=${encodeURIComponent(
  GOOGLE_REVIEW_URL,
)}`;

/** Sender for emails to CUSTOMERS. Resend's shared onboarding@resend.dev address only
 *  delivers to the account owner, so customer emails need the verified domain. */
export function customerFromAddress(): string | null {
  const v = process.env.REVIEW_FROM_EMAIL?.trim() || process.env.QUOTE_FROM_EMAIL?.trim();
  return v || null;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function reviewEmailSubject(name: string): string {
  const first = name.trim().split(/\s+/)[0] || 'there';
  return `${first}, how was your Ultra Shine cleaning?`;
}

export function reviewEmailHtml(name: string, service?: string): string {
  const firstName = esc(name.trim().split(/\s+/)[0] || 'there');
  const serviceText = service && service.trim() ? `your <strong>${esc(service.trim())}</strong>` : 'your recent cleaning';

  return `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"></head>
  <body style="margin:0;padding:0;background:#F5F7FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#262626;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#F5F7FA;padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#FFFFFF;border-radius:14px;box-shadow:0 4px 16px rgba(0,44,152,0.06);overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg,#002C98 0%,#1C61F0 100%);padding:36px 32px;text-align:center;">
              <div style="font-size:11px;letter-spacing:0.32em;color:#5E8FFF;font-weight:500;text-transform:uppercase;margin-bottom:10px;">FROM THE ULTRA SHINE TEAM</div>
              <div style="font-size:28px;font-weight:800;color:#FFFFFF;letter-spacing:-0.02em;line-height:1.1;">Thank you, ${firstName}.</div>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 36px 20px;">
              <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Hi ${firstName},</p>
              <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">
                Thank you for trusting Ultra Shine Cleaning with ${serviceText}.
                We hope your home felt as good to come back to as we&rsquo;d hoped.
              </p>
              <p style="margin:0 0 26px;font-size:16px;line-height:1.6;">
                If we got it right, would you mind taking 60 seconds to share that on Google? Honest reviews are how small family-owned businesses like ours grow &mdash; and your words help neighbors decide to give us a try.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center" style="padding:4px 0 22px;">
                  <a href="${GOOGLE_REVIEW_URL}" style="display:inline-block;padding:18px 36px;background:linear-gradient(135deg,#1C61F0 0%,#002C98 100%);color:#FFFFFF;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;border-radius:999px;box-shadow:0 8px 24px rgba(0,44,152,0.30);">
                    <span style="color:#FFC857;">&starf;&starf;&starf;&starf;&starf;</span>&nbsp;&nbsp;Leave a Google Review&nbsp;&nbsp;&rarr;
                  </a>
                </td></tr>
                <tr><td align="center" style="padding:6px 0 4px;">
                  <img src="${REVIEW_QR_URL}" width="150" height="150" alt="QR code to leave a Google review" style="display:block;border:1px solid #EAF1FF;border-radius:12px;" />
                  <div style="font-size:12px;color:#5A5F6B;margin-top:8px;">Reading this on a computer? Scan with your phone camera.</div>
                </td></tr>
              </table>
              <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#5A5F6B;text-align:center;">
                If something wasn&rsquo;t perfect, please tell us first &mdash;
                reply to this email or text <a href="tel:5615836694" style="color:#1C61F0;text-decoration:none;font-weight:600;">(561) 583-6694</a>.
                Our 100% satisfaction guarantee means we&rsquo;ll come back free until you&rsquo;re happy.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 36px 36px;border-top:1px solid #EAF1FF;">
              <p style="margin:0;font-size:15px;line-height:1.6;">
                With gratitude,<br/>
                <strong style="color:#002C98;">The Ultra Shine Cleaning team</strong><br/>
                <span style="color:#5A5F6B;font-size:13px;">Ultra Shine Cleaning &middot; Boca Raton, FL</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#002C98;padding:18px;text-align:center;">
              <a href="https://ultrashinecleaningfl.com" style="color:#FFFFFF;text-decoration:none;font-size:11px;letter-spacing:0.24em;text-transform:uppercase;opacity:0.7;">ultrashinecleaningfl.com</a>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function reviewEmailText(name: string, service?: string): string {
  const first = name.trim().split(/\s+/)[0] || 'there';
  return [
    `Hi ${first},`,
    '',
    `Thank you for trusting Ultra Shine Cleaning with ${service?.trim() || 'your recent cleaning'}.`,
    'If we got it right, would you mind taking 60 seconds to share that on Google?',
    '',
    GOOGLE_REVIEW_URL,
    '',
    "If something wasn't perfect, please tell us first — reply here or text (561) 583-6694.",
    '',
    'With gratitude,',
    'The Ultra Shine Cleaning team',
  ].join('\n');
}
