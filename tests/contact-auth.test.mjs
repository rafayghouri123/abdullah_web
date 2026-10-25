import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { hashPassword, verifyCredentials, createSession, verifySession, SESSION_SECONDS } from '../lib/auth.js';
import { validateEnquiry } from '../lib/enquiries.js';
import { rateLimited, sameOrigin, readJson } from '../lib/http.js';

const enquiry = { fullName: '  Test Sender  ', email: 'sender@example.com', type: 'Sea freight (FCL/LCL)', message: 'Please quote a shipment from Karachi.' };

test('contact validation preserves the message and rejects malformed or oversized input', () => {
  assert.equal(validateEnquiry(enquiry).data.fullName, 'Test Sender');
  for (const input of [null, [], {}, { ...enquiry, email: 'invalid' }, { ...enquiry, type: 'unlisted' }, { ...enquiry, message: 'short' }, { ...enquiry, fullName: 'a'.repeat(121) }, { ...enquiry, message: 'a'.repeat(5001) }, { ...enquiry, email: {} }]) assert.ok(validateEnquiry(input).error);
  const sqlLike = { ...enquiry, message: "Robert'); DROP TABLE contact_enquiries; -- <script>alert(1)</script>" };
  assert.equal(validateEnquiry(sqlLike).data.message, sqlLike.message);
});

test('authentication rejects incorrect credentials, tampered/expired sessions and rotated passwords', () => {
  process.env.ADMIN_USERNAME = 'test-admin';
  const password = randomBytes(20).toString('hex');
  process.env.ADMIN_PASSWORD_HASH = hashPassword(password);
  process.env.ADMIN_SESSION_SECRET = randomBytes(32).toString('hex');
  assert.equal(verifyCredentials('test-admin', password), true);
  assert.equal(verifyCredentials('wrong', password), false);
  assert.equal(verifyCredentials('test-admin', 'incorrect'), false);
  assert.equal(verifyCredentials('test-admin', {}), false);
  const now = Date.now();
  const token = createSession(now);
  assert.equal(verifySession(token, now), true);
  assert.equal(verifySession(token + 'x', now), false);
  assert.equal(verifySession(token + '.extra', now), false);
  assert.equal(verifySession(undefined, now), false);
  assert.equal(verifySession(token, now + SESSION_SECONDS * 1000), false);
  process.env.ADMIN_PASSWORD_HASH = hashPassword('different-test-password');
  assert.equal(verifySession(token, now), false);
  delete process.env.ADMIN_SESSION_SECRET;
  assert.equal(verifySession(token, now), false);
});

test('requests require the website origin and bounded JSON bodies', async () => {
  const request = (body, origin = 'https://example.com') => new Request('https://example.com/api/enquiries', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body });
  assert.equal(sameOrigin(request('{}')), true);
  assert.equal(sameOrigin(request('{}', 'https://evil.example')), false);
  assert.deepEqual(await readJson(request(JSON.stringify(enquiry))), enquiry);
  await assert.rejects(readJson(request('invalid')));
  await assert.rejects(readJson(request(JSON.stringify({ message: 'x'.repeat(33000) }))));
});

test('rate limits reject repeated attempts and expire', () => {
  assert.equal(rateLimited('test', 2, 1000, 0), false);
  assert.equal(rateLimited('test', 2, 1000, 1), false);
  assert.equal(rateLimited('test', 2, 1000, 2), true);
  assert.equal(rateLimited('test', 2, 1000, 1001), false);
});
