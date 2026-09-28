import { Resend } from 'resend';
import { getJSON, mgetJSON, setJSON, setOnce, zadd, zrevrange } from '../kv';
import { listConvs } from '../social/store';
import type { Conversation } from '../social/types';
import { STAGE_LABEL, STAGES, type LeadRecord, type Stage } from './types';

/**
 * Lead records in Redis: `lead:{id}` (JSON) + the `leads` sorted set (by time).
 *
 * Three ways a lead gets here:
 *  1. The quote / work-for-us forms save the full details the moment they arrive.
 *  2. Older requests (from before this existed) are read back once from the
 *     office email Resend still holds — same text the forms have always sent.
 *  3. Instagram / Facebook conversations the automations tagged "lead".
 * The id of a form lead is the Resend email id, the same id the Insights quote
 * log uses, so nothing is ever counted twice.
 */

const KEY = (id: string) => `lead:${id}`;
const INDEX = 'leads';
const TTL = 400 * 86_400;

export async function getLead(id: string): Promise<LeadRecord | null> {
  return getJSON<LeadRecord>(KEY(id));
}

export async function saveLead(l: LeadRecord): Promise<LeadRecord> {
  await setJSON(KEY(l.id), l, TTL);
  await zadd(INDEX, l.at, l.id);
  return l;
}

export async function listLeads(limit = 300): Promise<LeadRecord[]> {
  const ids = await zrevrange(INDEX, 0, limit - 1);
  return (await mgetJSON<LeadRecord>(ids.map(KEY))).filter((l): l is LeadRecord => !!l);
}

export async function updateLead(id: string, patch: { stage?: string; ownerNotes?: string }, now = Date.now()): Promise<LeadRecord | null> {
  const l = await getLead(id);
  if (!l) return null;
  if (patch.stage && STAGES.includes(patch.stage as Stage) && patch.stage !== l.stage) {
    const stage = patch.stage as Stage;
    l.stage = stage;
    l.stageAt = now;
    if (stage !== 'new' && !l.contactedAt) l.contactedAt = now;
    l.history = [...(l.history ?? []), { at: now, text: `Moved to ${STAGE_LABEL[stage]}` }].slice(-40);
  }
  if (typeof patch.ownerNotes === 'string') l.ownerNotes = patch.ownerNotes.slice(0, 2000);
  return saveLead(l);
}

/* ------------------------------------------------------------ from forms */

const clean = (s?: string | null) => {
  const v = (s ?? '').trim();
  return v && v !== '—' && !/^— ?not provided ?—$/i.test(v) ? v : undefined;
};
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export type QuoteForm = {
  service?: string; frequency?: string; bedrooms?: number; bathrooms?: number; sqft?: number; floors?: number;
  street?: string; city?: string; zip?: string; addOns?: string[]; notes?: string; heardFrom?: string;
  contact?: { first?: string; last?: string; phone?: string; email?: string };
};

export function leadFromQuote(id: string, p: QuoteForm, estimate: string | null, emailed: boolean, now = Date.now()): LeadRecord {
  const c = p.contact ?? {};
  const history = [{ at: now, text: 'Quote request received' }];
  if (emailed) history.push({ at: now, text: 'Office email sent' });
  return {
    id, kind: 'quote', at: now, origin: 'form',
    name: [c.first, c.last].map((x) => x?.trim()).filter(Boolean).join(' ') || 'New lead',
    phone: clean(c.phone), email: clean(c.email),
    service: clean(p.service), frequency: clean(p.frequency), estimate: estimate ?? undefined,
    bedrooms: num(p.bedrooms), bathrooms: num(p.bathrooms), sqft: num(p.sqft), floors: num(p.floors),
    street: clean(p.street), city: clean(p.city), zip: clean(p.zip),
    addOns: Array.isArray(p.addOns) ? p.addOns.filter((a) => typeof a === 'string').slice(0, 20) : [],
    notes: clean(p.notes), heardFrom: clean(p.heardFrom),
    stage: 'new', stageAt: now, history,
  };
}

export type ApplicationForm = {
  contact?: { first?: string; last?: string; phone?: string; email?: string };
  city?: string; language?: string; experience?: string; ownTransport?: boolean; usAuthorized?: boolean;
  availableDays?: string[]; notes?: string;
};

export function leadFromApplication(id: string, p: ApplicationForm, now = Date.now()): LeadRecord {
  const c = p.contact ?? {};
  return {
    id, kind: 'application', at: now, origin: 'form',
    name: [c.first, c.last].map((x) => x?.trim()).filter(Boolean).join(' ') || 'New applicant',
    phone: clean(c.phone), email: clean(c.email), city: clean(p.city),
    language: clean(p.language), experience: clean(p.experience),
    ownTransport: typeof p.ownTransport === 'boolean' ? p.ownTransport : null,
    usAuthorized: typeof p.usAuthorized === 'boolean' ? p.usAuthorized : null,
    availableDays: Array.isArray(p.availableDays) ? p.availableDays.slice(0, 7) : [],
    notes: clean(p.notes),
    stage: 'new', stageAt: now, history: [{ at: now, text: 'Application received' }],
  };
}

/* ------------------------------------------- read back from older emails */

/** One labelled line, e.g. "Phone:     (954) 555-0142". */
function field(text: string, label: string): string | undefined {
  const m = text.match(new RegExp(`^\\s*${label}:\\s*(.+)$`, 'mi'));
  return clean(m?.[1]);
}

/** The office email the quote form sends (renderText in app/api/quote/route.ts). */
export function parseQuoteText(text: string) {
  const out: Partial<LeadRecord> = {};
  out.phone = field(text, 'Phone');
  out.email = field(text, 'Email');
  out.service = field(text, 'Service');
  out.frequency = field(text, 'Frequency');
  const bp = field(text, 'Ballpark');
  if (bp && bp.startsWith('$')) out.estimate = bp.replace(/\s*←.*$/, '').trim();
  const home = field(text, 'Home');
  if (home) {
    const n = (re: RegExp) => {
      const v = home.match(re)?.[1]?.replace(/,/g, '');
      return v ? num(v) : undefined;
    };
    out.bedrooms = n(/([\d.]+)\s*BR/i);
    out.bathrooms = n(/([\d.]+)\s*BA/i);
    out.sqft = n(/([\d,]+)\s*sqft/i);
    out.floors = n(/([\d.]+)\s*floor/i);
  }
  out.street = field(text, 'Address');
  const loc = field(text, 'Location');
  if (loc) {
    const m = loc.match(/^(.*?)(?:,\s*(?:FL\s*)?(\d{5}))?$/);
    out.city = clean(m?.[1]);
    out.zip = m?.[2];
  }
  const adds = text.match(/Add-Ons \(\d+\):\n([\s\S]*?)\n\s*Subtotal/);
  if (adds) {
    out.addOns = adds[1]
      .split('\n')
      .map((x) => x.replace(/^\s*·\s*/, '').replace(/\s{2,}.*$/, '').trim())
      .filter((x) => x && x !== 'None');
  }
  out.notes = field(text, 'Notes');
  out.heardFrom = field(text, 'Heard via');
  return out;
}

/** The office email the work-for-us form sends. */
export function parseApplicationText(text: string) {
  const yes = (v?: string) => (v ? /^y/i.test(v) : null);
  return {
    phone: field(text, 'Phone'),
    email: field(text, 'Email'),
    city: field(text, 'City'),
    language: field(text, 'Languages'),
    experience: field(text, 'Experience'),
    ownTransport: yes(field(text, 'Own transport')),
    usAuthorized: yes(field(text, 'US authorized')),
    availableDays: field(text, 'Available')?.split(/\s*,\s*/).filter(Boolean) ?? [],
    notes: field(text, 'Notes'),
  } satisfies Partial<LeadRecord>;
}

function nameCityFromSubject(subject: string, prefix: RegExp) {
  const parts = subject.replace(prefix, '').split(/\s*·\s*/);
  const city = parts[1] && !/^unspecified/i.test(parts[1]) ? parts[1] : undefined;
  return { name: parts[0] || 'New lead', city };
}

async function backfillFromResend(maxReads: number): Promise<number> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return 0;
  const resend = new Resend(apiKey);
  const res: any = await resend.emails.list({ limit: 100 });
  const rows: any[] = res?.data?.data ?? res?.data ?? [];
  let added = 0;
  for (const e of rows) {
    if (added >= maxReads) break;
    const subject: string = e?.subject ?? '';
    const isQuote = /^New Quote/i.test(subject);
    const isApp = /^New Cleaner Application/i.test(subject);
    if ((!isQuote && !isApp) || !e.id) continue;
    if (await getLead(String(e.id))) continue;
    const at = e.created_at ? new Date(e.created_at).getTime() : Date.now();
    const { name, city } = nameCityFromSubject(subject, isQuote ? /^New Quote\s*·\s*/i : /^New Cleaner Application\s*·\s*/i);
    let text = '';
    try {
      const full: any = await resend.emails.get(String(e.id));
      text = full?.data?.text ?? '';
    } catch {
      /* keep the subject-only record */
    }
    added++;
    const base: LeadRecord = {
      id: String(e.id), kind: isQuote ? 'quote' : 'application', at, origin: 'email', name, city,
      stage: 'new', stageAt: at, history: [{ at, text: isQuote ? 'Quote request received' : 'Application received' }],
    };
    const details = text ? (isQuote ? parseQuoteText(text) : parseApplicationText(text)) : {};
    // Leads older than 2 weeks were almost certainly handled already — don't flag them as "New".
    if (Date.now() - at > 14 * 86_400_000) base.stage = 'contacted';
    await saveLead({ ...base, ...Object.fromEntries(Object.entries(details).filter(([, v]) => v !== undefined)), city: details.city ?? city });
  }
  return added;
}

/** Keep one lead per Instagram / Facebook conversation the automations tagged as a lead. */
export async function syncSocial(convs: Conversation[]): Promise<number> {
  let n = 0;
  for (const c of convs.filter((x) => x.tags?.includes('lead'))) {
    const id = `soc_${c.key.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    const firstIn = c.messages.find((m) => m.dir === 'in');
    const lastIn = [...c.messages].reverse().find((m) => m.dir === 'in');
    const existing = await getLead(id);
    const name = c.name ? (c.platform === 'instagram' && !c.name.includes(' ') ? `@${c.name}` : c.name) : c.platform === 'instagram' ? 'Instagram user' : 'Facebook user';
    if (existing) {
      if (existing.lastMessage !== lastIn?.text || existing.name !== name) {
        await saveLead({ ...existing, name, lastMessage: lastIn?.text, city: existing.city ?? c.city });
      }
      continue;
    }
    const at = firstIn?.at ?? c.lastInboundAt;
    await saveLead({
      id, kind: 'social', at, origin: 'social', name, platform: c.platform, convKey: c.key,
      lastMessage: lastIn?.text, city: c.city,
      stage: c.quoteSubmittedAt ? 'contacted' : 'new', stageAt: at,
      history: [{ at, text: `Messaged on ${c.platform === 'instagram' ? 'Instagram' : 'Facebook'}` }],
    });
    n++;
  }
  return n;
}

/** Called when the Leads tab loads. Cheap: the email read-back runs at most every 5 minutes. */
export async function syncLeads(force = false): Promise<void> {
  try {
    if (force || (await setOnce('leads:synced', '1', 300))) await backfillFromResend(25);
  } catch {
    /* Resend down — try next time */
  }
  try {
    await syncSocial(await listConvs(200));
  } catch {
    /* no Redis — nothing to sync */
  }
}
