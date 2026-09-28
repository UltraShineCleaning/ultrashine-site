/**
 * One reading of the notification emails our routes send to the office —
 * the Leads tab and Home both use it, so a lead is counted the same way everywhere.
 *
 * Subjects, as sent:
 *   "New Quote · {name} · {city}"                 (/api/quote)
 *   "New Cleaner Application · {name} · {city}"   (/api/apply)
 *   "New lead on Instagram|Facebook · {name}"     (social automations → notifyLead)
 */
export type LeadKind = 'quote' | 'application' | 'social' | 'other';

export type Lead = {
  id: string;
  kind: LeadKind;
  subject: string;
  name: string;
  city?: string;
  /** Instagram / Facebook for social leads. */
  platform?: string;
  at: number;
  to: string;
  lastEvent?: string;
};

export function parseLeadEmail(email: any): Lead {
  const subject: string = email?.subject ?? '';
  const at = email?.created_at ? new Date(email.created_at).getTime() : Date.now();
  const to = Array.isArray(email?.to) ? email.to[0] : email?.to ?? '';
  let kind: LeadKind = 'other';
  let name = 'Unknown';
  let city: string | undefined;
  let platform: string | undefined;

  if (/^New Quote/i.test(subject)) {
    kind = 'quote';
    const parts = subject.replace(/^New Quote\s*·\s*/i, '').split(/\s*·\s*/);
    name = parts[0] || 'Unknown';
    city = parts[1] && parts[1] !== 'unspecified city' ? parts[1] : undefined;
  } else if (/^New lead on (Instagram|Facebook)/i.test(subject)) {
    kind = 'social';
    const m = subject.match(/^New lead on (Instagram|Facebook)\s*·\s*(.*)$/i);
    platform = m?.[1];
    name = m?.[2] || 'Someone';
  } else if (/^New Cleaner Application/i.test(subject)) {
    kind = 'application';
    const parts = subject.replace(/^New Cleaner Application\s*·\s*/i, '').split(/\s*·\s*/);
    name = parts[0] || 'Unknown';
    city = parts[1];
  }
  return { id: String(email?.id ?? ''), kind, subject, name, city, platform, at, to, lastEvent: email?.last_event };
}
