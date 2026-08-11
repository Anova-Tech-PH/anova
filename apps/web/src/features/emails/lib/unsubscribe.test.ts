// @vitest-environment node
import { describe, it, expect } from "vitest";
import { generateUnsubscribeToken, verifyUnsubscribeToken } from "./unsubscribe";

describe("Unsubscribe Tokens", () => {
  it("generates a token and verifies it back to original payload", async () => {
    const payload = { email: "test@example.com", contactListId: "list-1" };
    const token = await generateUnsubscribeToken(payload);

    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(10);

    const verified = await verifyUnsubscribeToken(token);
    expect(verified.email).toBe("test@example.com");
    expect(verified.contactListId).toBe("list-1");
  });

  it("generates a token with registrationId", async () => {
    const payload = { email: "bob@test.com", registrationId: "reg-1" };
    const token = await generateUnsubscribeToken(payload);
    const verified = await verifyUnsubscribeToken(token);

    expect(verified.email).toBe("bob@test.com");
    expect(verified.registrationId).toBe("reg-1");
  });

  it("rejects an invalid token", async () => {
    await expect(verifyUnsubscribeToken("garbage-token")).rejects.toThrow();
  });
});
