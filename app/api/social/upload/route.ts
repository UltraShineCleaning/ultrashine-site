import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { isAdmin } from '../../../_lib/adminAuth';

/**
 * POST /api/social/upload — lets the dashboard upload photos/videos straight
 * from the phone to Vercel Blob (the file never passes through our function,
 * so size limits and function time don't apply).
 *
 * Meta fetches the media from these public URLs when it publishes; the
 * publisher deletes videos right after, photos after two weeks.
 *
 * Env: BLOB_READ_WRITE_TOKEN (added automatically when Tiago connects a Blob
 * store to the project in Vercel → Storage).
 */
export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;

  // Only a signed-in admin can get an upload token. (The "upload completed"
  // callback comes from Vercel itself, signed, without our cookie.)
  if (body.type === 'blob.generate-client-token' && !isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Storage is not set up yet: connect a Blob store in Vercel → Storage.' }, { status: 500 });
  }

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith('social/')) throw new Error('Bad path');
        return {
          allowedContentTypes: ['image/jpeg', 'video/mp4', 'video/quicktime'],
          maximumSizeInBytes: 300 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        /* nothing to do — the dashboard saves the URL on the post */
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
