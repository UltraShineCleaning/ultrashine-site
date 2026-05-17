import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Resend } from 'resend';

/**
 * POST /api/admin/send-review-request
 *
 * Admin-only endpoint. Sends a personalized "How was your cleaning?"
 * email to a customer with a one-click button to /leave-a-review.
 *
 * Tiago calls this from the /admin dashboard after each completed job.
 * One click → one customer asked for a review → eventual Google review.
 *
 * Why this matters: reviews (especially with city + service in the text)
 * are the #1 ranking signal for local pack. Every review compounds.
 *
 * Auth: requires the same admin cookie as /admin pages.
 * Body: { name: string, email: string, service?: string }
 * Env:  RESEND_API_KEY (already configured in Vercel)
 */

const COOKIE_NAME = 'us_admin';
const FROM_EMAIL = 'Ultra Shine Cleaning <onboarding@resend.dev>';
const REVIEW_URL = 'https://ultrashinecleaningfl.com/leave-a-review';

function renderHtml(name: string, service?: string): string {
  const firstName = name.trim().split(/\s+/)[0] || name;
  const serviceText = service && service.trim()
    ? `your <strong>${service.trim()}</strong>`
    : 'your recent cleaning';

  return `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"></head>
  <body style="margin:0;padding:0;background:#F5F7FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#262626;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#F5F7FA;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#FFFFFF;border-radius:14px;box-shadow:0 4px 16px rgba(0,44,152,0.06);overflow:hidden;">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#002C98 0%,#1C61F0 100%);padding:36px 32px;text-align:center;">
                <div style="font-size:11px;letter-spacing:0.32em;color:#5E8FFF;font-weight:500;text-transform:uppercase;margin-bottom:10px;">FROM TIAGO + FRANCINE</div>
                <div style="font-size:28px;font-weight:800;color:#FFFFFF;letter-spacing:-0.02em;line-height:1.1;">Thank you, ${firstName}.</div>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:36px 36px 28px;">
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#262626;">
                  Hi ${firstName},
                </p>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#262626;">
                  Thank you for trusting Ultra Shine Cleaning with ${serviceText}.
                  We hope your home felt as good to come back to as we&rsquo;d hoped.
                </p>
                <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#262626;">
                  If we got it right, would you mind taking 60 seconds to share that on Google? Honest reviews are how small family-owned businesses like ours grow &mdash; and your words help neighbors decide to give us a try.
                </p>

                <!-- Big CTA -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td align="center" style="padding:8px 0 24px;">
                      <a href="${REVIEW_URL}" style="display:inline-block;padding:18px 36px;background:linear-gradient(135deg,#1C61F0 0%,#002C98 100%);color:#FFFFFF;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;border-radius:999px;box-shadow:0 8px 24px rgba(0,44,152,0.30);">
                        <span style="color:#FFC857;">&starf;&starf;&starf;&starf;&starf;</span>&nbsp;&nbsp;Leave a Google Review&nbsp;&nbsp;&rarr;
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#5A5F6B;text-align:center;">
                  If something wasn&rsquo;t perfect, please tell us first &mdash;
                  reply to this email or text <a href="tel:5615836694" style="color:#1C61F0;text-decoration:none;font-weight:600;">(561) 583-6694</a>.
                  Our 100% satisfaction guarantee means we&rsquo;ll come back free until you&rsquo;re happy.
                </p>
              </td>
            </tr>

            <!-- Sign-off -->
            <tr>
              <td style="padding:0 36px 36px;border-top:1px solid #EAF1FF;padding-top:24px;">
                <p style="margin:0;font-size:15px;line-height:1.6;color:#262626;">
                  With gratitude,<br/>
                  <strong style="color:#002C98;">Tiago + Francine Rena</strong><br/>
                  <span style="color:#5A5F6B;font-size:13px;">Ultra Shine Cleaning &middot; Boca Raton, FL</span>
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#002C98;padding:18px;text-align:center;">
                <a href="https://ultrashinecleaningfl.com" style="color:#FFFFFF;text-decoration:none;font-size:11px;letter-spacing:0.24em;text-transform:uppercase;opacity:0.7;">ultrashinecleaningfl.com</a>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function POST(req: Request) {
  // Auth check — same cookie pattern as /admin pages
  const cookie = cookies().get(COOKIE_NAME)?.value;
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || cookie !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
  }

  let body: { name?: string; email?: string; service?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = (body.name || '').trim();
  const email = (body.email || '').trim();
  const service = (body.service || '').trim() || undefined;

  if (!name || !email) {
    return NextResponse.json({ error: 'Name + email required' }, { status: 400 });
  }
  // Basic email shape check
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  const firstName = name.split(/\s+/)[0];
  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      replyTo: 'contact@ultrashinecleaningfl.com',
      subject: `${firstName}, how was your Ultra Shine cleaning?`,
      html: renderHtml(name, service),
      // Tag so we can later filter in Resend dashboard or /admin
      tags: [{ name: 'type', value: 'review-request' }],
    });

    if (error) {
      return NextResponse.json({ error: error.message || 'Send failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Unexpected error' },
      { status: 500 },
    );
  }
}
