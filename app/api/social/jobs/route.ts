import { NextResponse } from 'next/server';
import { runFollowUp } from '../../../_lib/social/automations';
import { publishPost } from '../../../_lib/social/publisher';
import { verifyQstash, type Job } from '../../../_lib/social/qstash';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/social/jobs — QStash calls this at the exact scheduled minute.
 * Nothing runs unless the Upstash-Signature proves QStash sent this exact body.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyQstash(raw, req.headers.get('upstash-signature'))) {
    return NextResponse.json({ error: 'Bad signature' }, { status: 401 });
  }
  let job: Job;
  try {
    job = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Bad body' }, { status: 400 });
  }

  switch (job.type) {
    case 'publish': {
      const r = await publishPost(job.postId, { version: job.version });
      // 200 even on a publish failure: the failure is recorded + emailed; a QStash retry would double-post.
      return NextResponse.json(r);
    }
    case 'followup':
      return NextResponse.json({ result: await runFollowUp(job.convKey) });
    default:
      return NextResponse.json({ ok: true, ignored: true });
  }
}
