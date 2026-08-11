import { SignJWT, jwtVerify } from "jose";

type UnsubscribePayload = {
  email: string;
  contactListId?: string;
  registrationId?: string;
};

const RAW_SECRET = new TextEncoder().encode(
  process.env.UNSUBSCRIBE_SECRET || "attendly-unsub-dev-secret-min-32-chars!"
);

async function getSecret(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    RAW_SECRET,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function generateUnsubscribeToken(
  payload: UnsubscribePayload
): Promise<string> {
  const secret = await getSecret();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("365d")
    .sign(secret);
}

export async function verifyUnsubscribeToken(
  token: string
): Promise<UnsubscribePayload> {
  const secret = await getSecret();
  const { payload } = await jwtVerify(token, secret);
  return {
    email: payload.email as string,
    contactListId: payload.contactListId as string | undefined,
    registrationId: payload.registrationId as string | undefined,
  };
}
