import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Supabase server client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  storage: {
    from: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

// Helper to build chainable query mocks
function chainable(overrides: Record<string, unknown> = {}) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "insert", "delete", "update", "eq", "single", "range", "order", "in"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  Object.assign(chain, overrides);
  return chain;
}

import { uploadPhoto, deletePhoto, togglePhotoLike } from "./actions";

describe("uploadPhoto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const formData = new FormData();
    formData.append("file", new File(["test"], "photo.jpg", { type: "image/jpeg" }));

    await expect(uploadPhoto("event-1", formData)).rejects.toThrow("Not authenticated");
  });

  it("throws if no file is provided", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const formData = new FormData();

    await expect(uploadPhoto("event-1", formData)).rejects.toThrow("No file provided");
  });

  it("uploads file to storage and inserts a photo record", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    mockSupabase.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: "https://storage.example.com/photo.jpg" },
      }),
    });

    const insertChain = chainable({ insert: vi.fn().mockReturnValue({ error: null }) });
    mockSupabase.from.mockReturnValue(insertChain);

    const formData = new FormData();
    formData.append("file", new File(["test"], "photo.jpg", { type: "image/jpeg" }));
    formData.append("caption", "Test caption");

    await uploadPhoto("event-1", formData);

    expect(mockSupabase.storage.from).toHaveBeenCalledWith("attendee-photos");
    expect(mockSupabase.from).toHaveBeenCalledWith("event_photos");
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_id: "event-1",
        user_id: "user-1",
        image_url: "https://storage.example.com/photo.jpg",
        media_type: "photo",
        caption: "Test caption",
      })
    );
  });

  it("sets media_type to video for video files", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    mockSupabase.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: "https://storage.example.com/video.mp4" },
      }),
    });

    const insertChain = chainable({ insert: vi.fn().mockReturnValue({ error: null }) });
    mockSupabase.from.mockReturnValue(insertChain);

    const formData = new FormData();
    formData.append("file", new File(["test"], "video.mp4", { type: "video/mp4" }));

    await uploadPhoto("event-1", formData);

    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ media_type: "video" })
    );
  });
});

describe("deletePhoto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(deletePhoto("photo-1")).rejects.toThrow("Not authenticated");
  });

  it("deletes the photo record", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const deleteChain = chainable();
    deleteChain.eq = vi.fn().mockReturnValue({ error: null });
    const deleteFn = vi.fn().mockReturnValue(deleteChain);
    mockSupabase.from.mockReturnValue({ delete: deleteFn });

    await deletePhoto("photo-1");

    expect(mockSupabase.from).toHaveBeenCalledWith("event_photos");
    expect(deleteFn).toHaveBeenCalled();
    expect(deleteChain.eq).toHaveBeenCalledWith("id", "photo-1");
  });
});

describe("togglePhotoLike", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if user is not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    await expect(togglePhotoLike("photo-1")).rejects.toThrow("Not authenticated");
  });

  it("removes like when already liked", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    // First call: select to check existing like
    const selectChain: Record<string, unknown> = {};
    selectChain.select = vi.fn().mockReturnValue(selectChain);
    selectChain.eq = vi.fn().mockReturnValue(selectChain);
    selectChain.single = vi.fn().mockResolvedValue({ data: { user_id: "user-1" } });

    // Second call: delete the like
    const deleteChain: Record<string, unknown> = {};
    deleteChain.delete = vi.fn().mockReturnValue(deleteChain);
    deleteChain.eq = vi.fn().mockImplementation(() => deleteChain);
    // Final .eq returns the result
    let deleteEqCount = 0;
    deleteChain.eq = vi.fn().mockImplementation(() => {
      deleteEqCount++;
      if (deleteEqCount >= 2) return Promise.resolve({ error: null });
      return deleteChain;
    });

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return selectChain;
      return { delete: () => deleteChain };
    });

    await togglePhotoLike("photo-1");

    expect(mockSupabase.from).toHaveBeenCalledWith("photo_likes");
  });

  it("adds like when not yet liked", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    // First call: select to check existing like — not found
    const selectChain: Record<string, unknown> = {};
    selectChain.select = vi.fn().mockReturnValue(selectChain);
    selectChain.eq = vi.fn().mockReturnValue(selectChain);
    selectChain.single = vi.fn().mockResolvedValue({ data: null });

    // Second call: insert the like
    const insertFn = vi.fn().mockReturnValue({ error: null });

    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return selectChain;
      return { insert: insertFn };
    });

    await togglePhotoLike("photo-1");

    expect(insertFn).toHaveBeenCalledWith({
      user_id: "user-1",
      photo_id: "photo-1",
    });
  });
});
