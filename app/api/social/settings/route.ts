import { NextResponse } from 'next/server';
import { denyUnlessAdmin } from '../../../_lib/social/guard';
import { getSettings, saveSettings } from '../../../_lib/social/store';
import { DEFAULT_SETTINGS, type AutomationSettings } from '../../../_lib/social/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const deny = denyUnlessAdmin();
  if (deny) return deny;
  return NextResponse.json({ settings: await getSettings(), defaults: DEFAULT_SETTINGS });
}

/** PUT — saves the Automations tab. Only known fields, with sane limits. */
export async function PUT(req: Request) {
  const deny = denyUnlessAdmin();
  if (deny) return deny;
  const b = (await req.json().catch(() => ({}))) as Partial<AutomationSettings>;
  const s = await getSettings();
  const txt = (v: unknown, max = 600) => (typeof v === 'string' ? v.slice(0, max) : undefined);
  const on = (v: unknown) => (typeof v === 'boolean' ? v : undefined);
  const put = <T extends object>(target: T, patch: Partial<T>) => {
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) (target as any)[k] = v;
  };
  if (b.priceReply) put(s.priceReply, { on: on(b.priceReply.on), text: txt(b.priceReply.text) });
  if (b.quoteComment)
    put(s.quoteComment, {
      on: on(b.quoteComment.on),
      keyword: txt(b.quoteComment.keyword, 30)?.trim(),
      dmText: txt(b.quoteComment.dmText),
      publicReply: txt(b.quoteComment.publicReply, 200),
    });
  if (b.afterHours) put(s.afterHours, { on: on(b.afterHours.on), text: txt(b.afterHours.text) });
  if (b.leadTag) put(s.leadTag, { on: on(b.leadTag.on) });
  if (b.followUp) {
    const h = Number(b.followUp.afterHours);
    put(s.followUp, { on: on(b.followUp.on), text: txt(b.followUp.text), afterHours: h >= 1 && h <= 20 ? h : undefined });
  }
  if (b.reviewRequests)
    put(s.reviewRequests, {
      on: on(b.reviewRequests.on),
      mode: b.reviewRequests.mode === 'ask' || b.reviewRequests.mode === 'auto' ? b.reviewRequests.mode : undefined,
    });
  await saveSettings(s);
  return NextResponse.json({ settings: s });
}
