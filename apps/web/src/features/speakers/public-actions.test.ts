import { describe, it, expect, vi, beforeEach } from "vitest";
import { revalidatePath } from "next/cache";

function createQueryMock(result: { data?: unknown; error?: unknown }) {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === "then") return (resolve: (v: unknown) => void) => resolve(result);
      return vi.fn(() => new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

const mockFrom = vi.fn();
const mockAuth = {
  getUser: vi.fn(),
};

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom, auth: mockAuth })),
}));

describe("toggleSpeakerBookmark", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  it("throws when not authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const { toggleSpeakerBookmark } = await import("./public-actions");
    await expect(toggleSpeakerBookmark("evt-1", "spk-1")).rejects.toThrow(
      "Authentication required"
    );
  });

  it("creates bookmark when none exists (returns bookmarked: true)", async () => {
    // First call: select returns no existing bookmark
    mockFrom
      .mockReturnValueOnce(createQueryMock({ data: null, error: { code: "PGRST116" } }))
      // Second call: insert succeeds
      .mockReturnValueOnce(createQueryMock({ data: null, error: null }));

    const { toggleSpeakerBookmark } = await import("./public-actions");
    const result = await toggleSpeakerBookmark("evt-1", "spk-1");

    expect(result).toEqual({ bookmarked: true });
    expect(mockFrom).toHaveBeenCalledWith("speaker_bookmarks");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("removes bookmark when one exists (returns bookmarked: false)", async () => {
    // First call: select returns existing bookmark
    mockFrom
      .mockReturnValueOnce(
        createQueryMock({ data: { user_id: "user-1" }, error: null })
      )
      // Second call: delete
      .mockReturnValueOnce(createQueryMock({ data: null, error: null }));

    const { toggleSpeakerBookmark } = await import("./public-actions");
    const result = await toggleSpeakerBookmark("evt-1", "spk-1");

    expect(result).toEqual({ bookmarked: false });
    expect(mockFrom).toHaveBeenCalledWith("speaker_bookmarks");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("throws on insert error", async () => {
    mockFrom
      .mockReturnValueOnce(createQueryMock({ data: null, error: { code: "PGRST116" } }))
      .mockReturnValueOnce(
        createQueryMock({ data: null, error: { message: "Insert failed" } })
      );

    const { toggleSpeakerBookmark } = await import("./public-actions");
    await expect(toggleSpeakerBookmark("evt-1", "spk-1")).rejects.toThrow(
      "Insert failed"
    );
  });
});

describe("saveSpeakerNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  it("throws when not authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const { saveSpeakerNote } = await import("./public-actions");
    await expect(saveSpeakerNote("spk-1", "Great talk!")).rejects.toThrow(
      "Not authenticated"
    );
  });

  it("upserts note and revalidates", async () => {
    mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

    const { saveSpeakerNote } = await import("./public-actions");
    await saveSpeakerNote("spk-1", "Great talk!");

    expect(mockFrom).toHaveBeenCalledWith("speaker_notes");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("throws on upsert error", async () => {
    mockFrom.mockReturnValue(
      createQueryMock({ data: null, error: { message: "Upsert failed" } })
    );

    const { saveSpeakerNote } = await import("./public-actions");
    await expect(saveSpeakerNote("spk-1", "Note")).rejects.toThrow();
  });
});
