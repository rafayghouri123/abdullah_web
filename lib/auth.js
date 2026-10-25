import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'mobin_admin_session';
export const SESSION_SECONDS = 60 * 60 * 8;

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

export function authConfigured() {
  return Boolean(process.env.ADMIN_USERNAME && /^[a-f0-9]{32}:[a-f0-9]{128}$/.test(process.env.ADMIN_PASSWORD_HASH || '') && process.env.ADMIN_SESSION_SECRET?.length >= 32);
}

export function verifyCredentials(username, password) {
  if (!authConfigured() || typeof username !== 'string' || typeof password !== 'string' || password.length > 256) return false;
  const [salt, expected] = process.env.ADMIN_PASSWORD_HASH.split(':');
  const valid = timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(expected, 'hex'));
  return valid && username === process.env.ADMIN_USERNAME;
}

function signature(payload) {
  // Rotating either the password or session secret invalidates existing sessions.
  return createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(`${payload}.${process.env.ADMIN_PASSWORD_HASH}`).digest('base64url');
}

export function createSession(now = Date.now()) {
  if (!authConfigured()) throw new Error('Admin authentication is not configured');
  const payload = Buffer.from(JSON.stringify({ user: process.env.ADMIN_USERNAME, exp: Math.floor(now / 1000) + SESSION_SECONDS, nonce: randomBytes(16).toString('hex') })).toString('base64url');
  return `${payload}.${signature(payload)}`;
}

export function verifySession(token, now = Date.now()) {
  if (!authConfigured() || typeof token !== 'string' || token.length > 2048) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [payload, signed] = parts;
    const expected = Buffer.from(signature(payload));
    const actual = Buffer.from(signed);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.user === process.env.ADMIN_USERNAME && Number.isInteger(data.exp) && data.exp > Math.floor(now / 1000);
  } catch { return false; }
}
