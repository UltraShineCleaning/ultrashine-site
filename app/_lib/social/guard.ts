import { NextResponse } from 'next/server';
import { isAdmin } from '../adminAuth';

/** Every Social API route starts with this. Returns a 401 response, or null when the caller is signed in. */
export function denyUnlessAdmin(): NextResponse | null {
  return isAdmin() ? null : NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/** Until Tiago and Francine have separate logins, approvals are recorded as the shared admin. */
export const ACTOR = 'Tiago or Francine';
