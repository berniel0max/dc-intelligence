import { createHmac, timingSafeEqual } from 'crypto';

/** POST body / cookie-backed session; not exposed to the client bundle. */
export const EDIT_COOKIE_NAME = 'dc_edit_session';

const PAYLOAD = 'dc-intelligence-edit-v1';

export function editLockEnabled(): boolean {
  return Boolean(process.env.EDIT_ACCESS_SECRET?.trim());
}

export function editSessionToken(secret: string): string {
  return createHmac('sha256', secret).update(PAYLOAD).digest('base64url');
}

/**
 * When no EDIT_ACCESS_SECRET is set, edits are allowed (useful for local dev).
 * When set, the request must present a valid signed session cookie.
 */
export function verifyEditSession(token: string | undefined): boolean {
  const secret = process.env.EDIT_ACCESS_SECRET?.trim();
  if (!secret) return true;
  if (!token) return false;
  const expected = editSessionToken(secret);
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}
