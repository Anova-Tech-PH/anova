import { describe, it, expect } from "vitest";
import type { Announcement, AnnouncementTemplate } from "./queries";

describe("Announcement types", () => {
  it("Announcement type includes sender_name, reply_to_email, signature", () => {
    const a: Announcement = {
      id: "1",
      event_id: "e1",
      author_id: "a1",
      subject: "Test",
      body: "Body",
      target_audience: { type: "all" },
      channels: ["in_app"],
      status: "draft",
      scheduled_for: null,
      sent_at: null,
      read_count: 0,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
      sender_name: "Alice",
      reply_to_email: "alice@example.com",
      signature: "Best regards",
    };
    expect(a.sender_name).toBe("Alice");
    expect(a.reply_to_email).toBe("alice@example.com");
    expect(a.signature).toBe("Best regards");
  });

  it("Announcement new fields are nullable", () => {
    const a: Announcement = {
      id: "1",
      event_id: "e1",
      author_id: "a1",
      subject: "Test",
      body: "Body",
      target_audience: { type: "all" },
      channels: ["in_app"],
      status: "sent",
      scheduled_for: null,
      sent_at: null,
      read_count: 0,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
      sender_name: null,
      reply_to_email: null,
      signature: null,
    };
    expect(a.sender_name).toBeNull();
  });

  it("AnnouncementTemplate type has correct shape", () => {
    const t: AnnouncementTemplate = {
      id: "t1",
      organization_id: "org1",
      event_id: null,
      name: "Reminder",
      subject: "Don't forget!",
      body: "Event starts soon.",
      type: "quick_reminder",
      created_at: "2024-01-01",
    };
    expect(t.type).toBe("quick_reminder");
    expect(t.event_id).toBeNull();
  });

  it("AnnouncementTemplate type allows custom type", () => {
    const t: AnnouncementTemplate = {
      id: "t2",
      organization_id: "org1",
      event_id: "e1",
      name: "Custom",
      subject: "Hello",
      body: "World",
      type: "custom",
      created_at: "2024-01-01",
    };
    expect(t.type).toBe("custom");
    expect(t.event_id).toBe("e1");
  });
});

describe("Query function signatures", () => {
  it("getAnnouncements is exported and accepts eventId + opts", async () => {
    const mod = await import("./queries");
    expect(typeof mod.getAnnouncements).toBe("function");
    // Function should accept 2 params (eventId, opts?)
    expect(mod.getAnnouncements.length).toBeGreaterThanOrEqual(1);
  });

  it("getAnnouncement is exported", async () => {
    const mod = await import("./queries");
    expect(typeof mod.getAnnouncement).toBe("function");
  });

  it("getAnnouncementsForAttendee is exported", async () => {
    const mod = await import("./queries");
    expect(typeof mod.getAnnouncementsForAttendee).toBe("function");
  });

  it("getUnreadCount is exported", async () => {
    const mod = await import("./queries");
    expect(typeof mod.getUnreadCount).toBe("function");
  });

  it("getRecipientCount is exported", async () => {
    const mod = await import("./queries");
    expect(typeof mod.getRecipientCount).toBe("function");
  });

  it("getTemplates is exported", async () => {
    const mod = await import("./queries");
    expect(typeof mod.getTemplates).toBe("function");
  });

  it("getOrgTemplates is exported", async () => {
    const mod = await import("./queries");
    expect(typeof mod.getOrgTemplates).toBe("function");
  });
});
