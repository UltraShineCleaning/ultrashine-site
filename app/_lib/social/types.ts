/** Shared types for the Social system (admin → Social tab). Safe to import from client components. */

export type Platform = 'instagram' | 'facebook';
export type PostKind = 'POST' | 'CAROUSEL' | 'REEL' | 'STORY';
export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';

export type MediaItem = {
  url: string;
  type: 'image' | 'video';
  /** Vercel Blob pathname, so we can delete it after publishing. */
  pathname?: string;
};

export type PlatformResult = {
  ok: boolean;
  id?: string;
  permalink?: string;
  error?: string;
  at: number;
};

export type SocialPost = {
  id: string;
  kind: PostKind;
  media: MediaItem[];
  caption: string;
  platforms: Platform[];
  /** ms epoch. null = no time yet (draft without a slot). */
  scheduledAt: number | null;
  status: PostStatus;
  createdAt: number;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: number;
  /** "Request changes" note for Claude to pick up in a session. */
  changeNote?: string;
  /** Free text: which job it came from, e.g. "Deep clean · Parkland · Sep 23". */
  jobRef?: string;
  city?: string;
  /** Text burned on top of the image/video in the preview (optional). */
  overlay?: string;
  qstashMessageId?: string;
  results: Partial<Record<Platform, PlatformResult>>;
  history: { at: number; text: string }[];
};

export type ConvMessage = {
  dir: 'in' | 'out';
  text: string;
  at: number;
  /** who sent an outgoing message: 'auto:price', 'auto:followup', 'Tiago', ... */
  by?: string;
};

export type Conversation = {
  key: string; // `${platform}:${userId}`
  platform: Platform;
  userId: string;
  kind: 'dm' | 'comment';
  name?: string;
  lastInboundAt: number;
  lastActivityAt: number;
  messages: ConvMessage[];
  tags: string[]; // 'lead', ...
  refToken?: string;
  quoteSubmittedAt?: number;
  followUp?: { scheduledFor?: number; sentAt?: number; skipped?: string };
  auto?: { priceAt?: number; afterHoursDay?: string };
  city?: string;
};

export type AutomationSettings = {
  priceReply: { on: boolean; text: string };
  quoteComment: { on: boolean; keyword: string; dmText: string; publicReply: string };
  afterHours: { on: boolean; text: string };
  leadTag: { on: boolean };
  followUp: { on: boolean; afterHours: number; text: string };
  reviewRequests: { on: boolean; mode: 'auto' | 'ask' };
};

export const DEFAULT_SETTINGS: AutomationSettings = {
  priceReply: {
    on: true,
    text: 'Hi {first name}! Every home gets its own quote after a quick look. The fastest way is here and we reply within the hour: {quote link}',
  },
  quoteComment: {
    on: true,
    keyword: 'QUOTE',
    dmText: "Here's your link {first name}, takes a minute: {quote link} Any questions, just reply here.",
    publicReply: 'Sent you a DM! 💙',
  },
  afterHours: {
    on: true,
    text: "Thanks for reaching out! We're off for the day and back at 7 AM. Want a quote sooner? {quote link}",
  },
  leadTag: { on: true },
  followUp: {
    on: true,
    afterHours: 3,
    text: "Hi {first name}, just checking you got the link. If it's easier, reply here with your city and the size of your home and we'll send the quote right back. {quote link}",
  },
  reviewRequests: { on: true, mode: 'auto' },
};

export type MetaConnection = {
  pageId: string;
  pageName: string;
  pageToken: string;
  igUserId?: string;
  igUsername?: string;
  connectedAt: number;
  connectedBy?: string;
};

export type ReviewRequest = {
  id: string; // visit id
  clientId: string;
  clientName: string;
  email: string | null;
  service: string;
  completedAt: number;
  status: 'pending' | 'sent' | 'skipped' | 'failed';
  reason?: string;
  sentAt?: number;
};
