import { cookies } from 'next/headers';
import { authConfigured, createSession, SESSION_COOKIE, SESSION_SECONDS, verifyCredentials } from '../../../../lib/auth.js';
import { json, rateLimited, readJson, sameOrigin } from '../../../../lib/http.js';

export const runtime = 'nodejs';

export async function POST(request) {
  if (!sameOrigin(request)) return json({ error: 'Invalid request origin.' }, 403);
  if (rateLimited('admin:login', 15, 15 * 60 * 1000)) return json({ error: 'Too many sign-in attempts. Try again in 15 minutes.' }, 429);
  if (!authConfigured()) return json({ error: 'Admin authentication is not configured.' }, 503);
  let input;
  try { input = await readJson(request); } catch { return json({ error: 'Invalid sign-in request.' }, 400); }
  if (!verifyCredentials(input?.username, input?.password)) return json({ error: 'Incorrect username or password.' }, 401);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, createSession(), { httpOnly: true, secure: new URL(request.url).protocol === 'https:', sameSite: 'strict', path: '/', maxAge: SESSION_SECONDS });
  return json({ success: true });
}
