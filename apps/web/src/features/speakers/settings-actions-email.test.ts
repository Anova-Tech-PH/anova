import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockNot = vi.fn();

const mockFrom = vi.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
}));

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("../emails/lib/send-email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  substituteVariables: vi.fn((template: string, vars: Record<string, string>) =>
    template.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => vars[key] ?? "")
  ),
}));

vi.mock("react-dom/server", () => ({
  renderToStaticMarkup: vi.fn(() => "<html>test</html>"),
}));

vi.mock("../emails/lib/templates/speaker-form-invitation", () => ({
  SpeakerFormInvitation: vi.fn(() => null),
}));

import { sendSpeakerFormInvitation } from "./settings-actions";
import { sendEmail } from "../emails/lib/send-email";

const mockSendEmail = vi.mocked(sendEmail);

describe("sendSpeakerFormInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendEmail.mockResolvedValue(undefined as any);
  });

  it("generates a token and sends an email", async () => {
    // Mock event lookup
    mockSelect.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({ single: mockSingle });
    mockSingle.mockResolvedValueOnce({
      data: { organization_id: "org1", title: "My Event" },
      error: null,
    });

    // Mock speaker lookup
    mockSelect.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({ single: mockSingle });
    mockSingle.mockResolvedValueOnce({
      data: { id: "sp1", name: "Alice", email: "alice@test.com" },
      error: null,
    });

    // Mock settings lookup
    mockSelect.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({ single: mockSingle });
    mockSingle.mockResolvedValueOnce({
      data: { email_subject: "Hi {{speaker_name}}", email_body: "Link: {{form_link}}" },
      error: null,
    });

    // Mock token insert
    const mockInsertSelect = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { token: "abc123" },
        error: null,
      }),
    });
    mockInsert.mockReturnValueOnce({ select: mockInsertSelect });

    await sendSpeakerFormInvitation("e1", "sp1");

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org1",
        eventId: "e1",
        to: { email: "alice@test.com", name: "Alice" },
      })
    );
  });

  it("throws if speaker has no email", async () => {
    // Mock event lookup
    mockSelect.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({ single: mockSingle });
    mockSingle.mockResolvedValueOnce({
      data: { organization_id: "org1", title: "My Event" },
      error: null,
    });

    // Mock speaker lookup — no email
    mockSelect.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockReturnValueOnce({ single: mockSingle });
    mockSingle.mockResolvedValueOnce({
      data: { id: "sp1", name: "Alice", email: null },
      error: null,
    });

    await expect(sendSpeakerFormInvitation("e1", "sp1")).rejects.toThrow(
      "Speaker does not have an email address"
    );
  });
});
