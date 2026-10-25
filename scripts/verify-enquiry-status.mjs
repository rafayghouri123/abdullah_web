// Explicit live integration check; creates and removes only its own test row.
// Run against this project's local server: node scripts/verify-enquiry-status.mjs
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';
import { createSession, SESSION_COOKIE } from '../lib/auth.js';
import { saveEnquiry } from '../lib/db.js';

nextEnv.loadEnvConfig(process.cwd());
const base = 'http://localhost:4175';
const sql = neon(process.env.DATABASE_URL);
const marker = `Status verification ${randomUUID()}`;
const cookie = `${SESSION_COOKIE}=${createSession()}`;
let id;
const patch = (body, session = cookie, origin = base, target = id) => fetch(`${base}/api/admin/enquiries/${target}`, {
  method: 'PATCH', headers: { 'Content-Type': 'application/json', origin, cookie: session }, body: JSON.stringify(body),
});
try {
  id = String((await saveEnquiry({ fullName: marker, email: 'status-test@example.com', type: 'General enquiry', message: 'Temporary verification of enquiry resolve and reopen controls.' })).id);
  assert.equal((await patch({ resolved: true }, '')).status, 401);
  assert.equal((await patch({ resolved: true }, cookie + 'tampered')).status, 401);
  assert.equal((await patch({ resolved: true }, cookie, 'https://other.example')).status, 403);
  assert.equal((await patch({ resolved: 'true' })).status, 400);
  assert.equal((await patch({ resolved: true }, cookie, base, 'invalid')).status, 400);
  assert.equal((await patch({ resolved: true }, cookie, base, '9223372036854775807')).status, 404);
  const [open] = await sql`SELECT resolved_at FROM contact_enquiries WHERE id = ${id}`;
  assert.equal(open.resolved_at, null, 'Rejected requests must not update the row');
  let response = await patch({ resolved: true });
  assert.equal(response.status, 200);
  const resolved = await response.json();
  assert.ok(resolved.resolvedAt);
  const [saved] = await sql`SELECT resolved_at FROM contact_enquiries WHERE id = ${id}`;
  assert.equal(new Date(saved.resolved_at).toISOString(), new Date(resolved.resolvedAt).toISOString());
  const repeated = await (await patch({ resolved: true })).json();
  assert.equal(repeated.resolvedAt, resolved.resolvedAt, 'Repeated requests preserve resolution time');
  let html = await (await fetch(`${base}/admin`, { headers: { cookie } })).text();
  assert.ok(html.includes(`Reopen enquiry #${id}`), 'A reload must show the resolved state');
  response = await patch({ resolved: false });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).resolvedAt, null);
  const [reopened] = await sql`SELECT resolved_at FROM contact_enquiries WHERE id = ${id}`;
  assert.equal(reopened.resolved_at, null);
  html = await (await fetch(`${base}/admin`, { headers: { cookie } })).text();
  assert.ok(html.includes(`Mark as resolved enquiry #${id}`), 'Reopening persists after reload');
  console.log('PASS: auth, origin, validation, missing enquiry, resolve, persistence, idempotency, reload and reopen.');
} finally {
  if (id) {
    await sql`DELETE FROM contact_enquiries WHERE id = ${id} AND full_name = ${marker} AND email = ${'status-test@example.com'}`;
    console.log('Removed temporary verification enquiry.');
  }
}
