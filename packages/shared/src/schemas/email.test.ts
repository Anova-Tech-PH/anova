import { describe, it, expect } from "vitest";
import { createEmailTemplateSchema, sendBroadcastSchema, createAutomationSchema } from "./email";

const uuid = "00000000-0000-0000-0000-000000000001";

describe("createEmailTemplateSchema", () => {
  const valid = { organization_id: uuid, name: "Welcome", subject: "Hello", body_html: "<p>Hi</p>" };

  it("accepts valid template", () => {
    const result = createEmailTemplateSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.type).toBe("transactional");
  });

  it("rejects empty name", () => {
    expect(createEmailTemplateSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("rejects empty body_html", () => {
    expect(createEmailTemplateSchema.safeParse({ ...valid, body_html: "" }).success).toBe(false);
  });

  it("rejects invalid type", () => {
    expect(createEmailTemplateSchema.safeParse({ ...valid, type: "promo" }).success).toBe(false);
  });
});

describe("sendBroadcastSchema", () => {
  const valid = { event_id: uuid, subject: "News", body_html: "<p>Update</p>" };

  it("accepts valid broadcast", () => {
    expect(sendBroadcastSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts broadcast with filters", () => {
    const result = sendBroadcastSchema.safeParse({
      ...valid,
      filters: { statuses: ["confirmed"], checked_in: true },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status filter", () => {
    expect(
      sendBroadcastSchema.safeParse({ ...valid, filters: { statuses: ["invalid"] } }).success
    ).toBe(false);
  });
});

describe("createAutomationSchema", () => {
  const valid = { event_id: uuid, trigger: "on_registration", template_id: uuid };

  it("accepts valid automation", () => {
    const result = createAutomationSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.enabled).toBe(true);
  });

  it("rejects invalid trigger", () => {
    expect(createAutomationSchema.safeParse({ ...valid, trigger: "on_delete" }).success).toBe(false);
  });

  it("rejects missing template_id", () => {
    expect(createAutomationSchema.safeParse({ event_id: uuid, trigger: "on_registration" }).success).toBe(false);
  });
});
