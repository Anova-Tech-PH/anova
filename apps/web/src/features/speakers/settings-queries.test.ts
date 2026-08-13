import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockOrder = vi.fn();

const mockFrom = vi.fn(() => ({
  select: mockSelect,
}));

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

import { getSpeakerFormSettings, getSpeakerFormFields } from "./settings-queries";

describe("getSpeakerFormSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
  });

  it("returns settings for an event", async () => {
    const settings = {
      id: "s1",
      event_id: "e1",
      email_subject: "Subject",
      email_body: "Body",
      notification_preference: "every_update",
      send_reminder_email: false,
    };
    mockSingle.mockResolvedValue({ data: settings, error: null });

    const result = await getSpeakerFormSettings("e1");

    expect(mockFrom).toHaveBeenCalledWith("speaker_form_settings");
    expect(mockEq).toHaveBeenCalledWith("event_id", "e1");
    expect(result).toEqual(settings);
  });

  it("returns null when no settings exist", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { code: "PGRST116", message: "not found" } });

    const result = await getSpeakerFormSettings("e1");
    expect(result).toBeNull();
  });
});

describe("getSpeakerFormFields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ order: mockOrder });
  });

  it("returns fields ordered by sort_order", async () => {
    const fields = [
      { id: "f1", field_key: "name", label: "Full Name", included: true, required: true, sort_order: 0 },
      { id: "f2", field_key: "email", label: "Email", included: true, required: true, sort_order: 1 },
    ];
    mockOrder.mockResolvedValue({ data: fields, error: null });

    const result = await getSpeakerFormFields("e1");

    expect(mockFrom).toHaveBeenCalledWith("speaker_form_fields");
    expect(mockEq).toHaveBeenCalledWith("event_id", "e1");
    expect(result).toEqual(fields);
  });

  it("throws on error", async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: "db error" } });

    await expect(getSpeakerFormFields("e1")).rejects.toThrow("db error");
  });
});
