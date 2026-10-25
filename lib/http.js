const buckets = new Map();

// Per-process abuse guard. Add an upstream rate limit for multi-instance hosting.
export function rateLimited(key, limit, windowMs, now = Date.now()) {
  for (const [id, bucket] of buckets) if (bucket.until <= now) buckets.delete(id);
  const bucket = buckets.get(key) || { count: 0, until: now + windowMs };
  if (!buckets.has(key) && buckets.size >= 10000) return true;
  bucket.count++;
  buckets.set(key, bucket);
  return bucket.count > limit;
}

export function sameOrigin(request) {
  const origin = request.headers.get('origin');
  return origin === new URL(request.url).origin && request.headers.get('sec-fetch-site') !== 'cross-site';
}

export function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function readJson(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new Error('Expected JSON');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing body');
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 32768) { await reader.cancel(); throw new Error('Body too large'); }
    chunks.push(Buffer.from(value));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
