import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '../../../../lib/auth.js';
import { sameOrigin } from '../../../../lib/http.js';

export async function POST(request) {
  if (!sameOrigin(request)) return new Response('Invalid request origin', { status: 403 });
  (await cookies()).set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'strict', secure: new URL(request.url).protocol === 'https:', path: '/', maxAge: 0 });
  return new Response(null, { status: 303, headers: { Location: '/admin', 'Cache-Control': 'no-store' } });
}
