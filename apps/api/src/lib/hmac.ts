import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verifies a GitHub Webhook SHA-256 HMAC signature (x-hub-signature-256 header).
 * Uses timingSafeEqual to prevent timing attacks.
 */
export function verifyGitHubSignature(
  payload: Buffer,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature || !signature.startsWith('sha256=') || !secret) {
    return false;
  }

  const expected = `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
  const expectedBuf = Buffer.from(expected);
  const sigBuf = Buffer.from(signature);

  if (expectedBuf.length !== sigBuf.length) {
    return false;
  }

  try {
    return timingSafeEqual(expectedBuf, sigBuf);
  } catch {
    return false;
  }
}
