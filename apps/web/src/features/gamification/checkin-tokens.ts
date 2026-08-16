import { createHmac } from "crypto";

const CHECKIN_SECRET = process.env.CHECKIN_HMAC_SECRET ?? "attendly-checkin-secret-change-me";

/**
 * Generate an HMAC-SHA256 token for QR check-in verification.
 */
export function generateCheckinToken(type: string, id: string, eventId: string): string {
  const payload = `${type}:${id}:${eventId}`;
  return createHmac("sha256", CHECKIN_SECRET).update(payload).digest("hex");
}

/**
 * Validate a check-in token against expected values.
 */
export function validateCheckinToken(
  type: string,
  id: string,
  eventId: string,
  token: string
): boolean {
  const expected = generateCheckinToken(type, id, eventId);
  return token === expected;
}
