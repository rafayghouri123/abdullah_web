import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession } from '../../../../../lib/auth.js';
import { setEnquiryResolved } from '../../../../../lib/db.js';
import { json, readJson, sameOrigin } from '../../../../../lib/http.js';

export const runtime = 'nodejs';

export async function PATCH(request, { params }) {
  if (!verifySession((await cookies()).get(SESSION_COOKIE)?.value)) return json({ error: 'Your session has expired. Please sign in again.' }, 401);
  if (!sameOrigin(request)) return json({ error: 'Invalid request origin.' }, 403);
  const { id } = await params;
  if (!/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > 9223372036854775807n) return json({ error: 'Invalid enquiry.' }, 400);
  let input;
  try { input = await readJson(request); } catch { return json({ error: 'Invalid status update.' }, 400); }
  if (typeof input?.resolved !== 'boolean') return json({ error: 'Choose a valid enquiry status.' }, 400);
  try {
    const row = await setEnquiryResolved(id, input.resolved);
    if (!row) return json({ error: 'This enquiry no longer exists.' }, 404);
    return json({ id: String(row.id), resolvedAt: row.resolved_at });
  } catch {
    return json({ error: 'The status could not be saved. Please try again.' }, 503);
  }
}
