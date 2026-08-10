import { describe, it, expect } from "vitest";
import { updateProfileSchema, signUpSchema, loginSchema } from "./user";

describe("updateProfileSchema", () => {
  it("accepts valid profile data", () => {
    const result = updateProfileSchema.safeParse({ full_name: "Alice" });
    expect(result.success).toBe(true);
  });

  it("rejects empty full_name", () => {
    expect(updateProfileSchema.safeParse({ full_name: "" }).success).toBe(false);
  });

  it("rejects bio over 500 chars", () => {
    expect(updateProfileSchema.safeParse({ full_name: "A", bio: "x".repeat(501) }).success).toBe(false);
  });

  it("rejects invalid linkedin_url", () => {
    expect(updateProfileSchema.safeParse({ full_name: "A", linkedin_url: "not-url" }).success).toBe(false);
  });

  it("accepts interests array", () => {
    const result = updateProfileSchema.safeParse({ full_name: "A", interests: ["AI", "Web3"] });
    expect(result.success).toBe(true);
  });

  it("rejects too many interests", () => {
    const interests = Array.from({ length: 21 }, (_, i) => `item${i}`);
    expect(updateProfileSchema.safeParse({ full_name: "A", interests }).success).toBe(false);
  });
});

describe("signUpSchema", () => {
  const valid = { email: "a@test.com", password: "12345678", full_name: "Alice" };

  it("accepts valid signup", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects short password", () => {
    expect(signUpSchema.safeParse({ ...valid, password: "1234567" }).success).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(signUpSchema.safeParse({ ...valid, email: "bad" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid login", () => {
    expect(loginSchema.safeParse({ email: "a@test.com", password: "x" }).success).toBe(true);
  });

  it("rejects empty password", () => {
    expect(loginSchema.safeParse({ email: "a@test.com", password: "" }).success).toBe(false);
  });
});
