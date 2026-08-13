import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpsert = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();

const mockFrom = vi.fn(() => ({
  upsert: mockUpsert,
  insert: mockInsert,
  delete: mockDelete,
}));

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { saveSpeakerFormSettings } from "./settings-actions";
import { DEFAULT_SPEAKER_FIELDS } from "./settings-constants";

describe("saveSpeakerFormSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockReturnValue({ error: null });
    mockDelete.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ error: null });
    mockInsert.mockReturnValue({ error: null });
  });

  it("upserts settings with correct data", async () => {
    await saveSpeakerFormSettings("e1", {
      emailSubject: "Test Subject",
      emailBody: "Test Body",
      notificationPreference: "daily_summary",
      fields: DEFAULT_SPEAKER_FIELDS,
    });

    expect(mockFrom).toHaveBeenCalledWith("speaker_form_settings");
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_id: "e1",
        email_subject: "Test Subject",
        email_body: "Test Body",
        notification_preference: "daily_summary",
      }),
      { onConflict: "event_id" }
    );
  });

  it("deletes existing fields and re-inserts", async () => {
    await saveSpeakerFormSettings("e1", {
      emailSubject: "S",
      emailBody: "B",
      notificationPreference: "every_update",
      fields: DEFAULT_SPEAKER_FIELDS,
    });

    // Should delete existing fields
    expect(mockFrom).toHaveBeenCalledWith("speaker_form_fields");
    expect(mockDelete).toHaveBeenCalled();

    // Should insert new fields
    expect(mockInsert).toHaveBeenCalled();
  });

  it("throws on settings upsert error", async () => {
    mockUpsert.mockReturnValue({ error: { message: "upsert failed" } });

    await expect(
      saveSpeakerFormSettings("e1", {
        emailSubject: "S",
        emailBody: "B",
        notificationPreference: "every_update",
        fields: DEFAULT_SPEAKER_FIELDS,
      })
    ).rejects.toThrow("upsert failed");
  });

  it("exports DEFAULT_SPEAKER_FIELDS with 9 standard fields", () => {
    expect(DEFAULT_SPEAKER_FIELDS).toHaveLength(9);
    expect(DEFAULT_SPEAKER_FIELDS[0]).toEqual(
      expect.objectContaining({ field_key: "name", required: true })
    );
    expect(DEFAULT_SPEAKER_FIELDS[1]).toEqual(
      expect.objectContaining({ field_key: "email", required: true, organizer_only: true })
    );
  });
});
