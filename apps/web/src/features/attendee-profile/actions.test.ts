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
  getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
};

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom, auth: mockAuth })),
}));

describe("Attendee Profile Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  describe("updateProfile", () => {
    it("upserts profile data and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateProfile } = await import("./actions");
      await updateProfile("event-1", {
        display_name: "John Doe",
        title: "Engineer",
        company: "Acme",
        location: "NYC",
        bio: "Hello world",
        is_visible_in_directory: true,
      });

      expect(mockFrom).toHaveBeenCalledWith("attendee_profiles");
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });

    it("throws when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const { updateProfile } = await import("./actions");
      await expect(
        updateProfile("event-1", { display_name: "X" })
      ).rejects.toThrow("Not authenticated");
    });

    it("throws on database error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "DB error" } })
      );

      const { updateProfile } = await import("./actions");
      await expect(
        updateProfile("event-1", { display_name: "X" })
      ).rejects.toThrow();
    });
  });

  describe("toggleAttendeeBookmark", () => {
    it("adds bookmark when not already bookmarked", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1)
          return createQueryMock({ data: null, error: { code: "PGRST116" } });
        return createQueryMock({ data: null, error: null });
      });

      const { toggleAttendeeBookmark } = await import("./actions");
      await toggleAttendeeBookmark("event-1", "target-user-1");

      expect(mockFrom).toHaveBeenCalledWith("attendee_bookmarks");
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });

    it("removes bookmark when already bookmarked", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1)
          return createQueryMock({ data: { user_id: "user-1" }, error: null });
        return createQueryMock({ data: null, error: null });
      });

      const { toggleAttendeeBookmark } = await import("./actions");
      await toggleAttendeeBookmark("event-1", "target-user-1");

      expect(revalidatePath).toHaveBeenCalledWith("/");
    });

    it("throws when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const { toggleAttendeeBookmark } = await import("./actions");
      await expect(
        toggleAttendeeBookmark("event-1", "target-user-1")
      ).rejects.toThrow("Not authenticated");
    });
  });

  describe("saveAttendeeNote", () => {
    it("upserts note and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { saveAttendeeNote } = await import("./actions");
      await saveAttendeeNote("target-user-1", "Great talk about AI");

      expect(mockFrom).toHaveBeenCalledWith("attendee_notes");
      expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("throws when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const { saveAttendeeNote } = await import("./actions");
      await expect(
        saveAttendeeNote("target-user-1", "note")
      ).rejects.toThrow("Not authenticated");
    });
  });

  describe("updateProfileInterests", () => {
    it("deletes existing interests and inserts new ones", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateProfileInterests } = await import("./actions");
      await updateProfileInterests("event-1", ["interest-1", "interest-2"]);

      expect(mockFrom).toHaveBeenCalledWith("attendee_interests");
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });

    it("only deletes when interest list is empty", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateProfileInterests } = await import("./actions");
      await updateProfileInterests("event-1", []);

      expect(mockFrom).toHaveBeenCalledWith("attendee_interests");
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });

    it("throws when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

      const { updateProfileInterests } = await import("./actions");
      await expect(
        updateProfileInterests("event-1", ["interest-1"])
      ).rejects.toThrow("Not authenticated");
    });
  });

  describe("addAffiliation", () => {
    it("inserts an affiliation for the current user", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: { id: "aff-1" }, error: null })
      );

      const { addAffiliation } = await import("./actions");
      await addAffiliation("event-1", {
        organization: "Acme Corp",
        role: "Engineer",
        start_date: "2024-01",
        end_date: null,
      });

      expect(mockFrom).toHaveBeenCalledWith("attendee_affiliations");
    });

    it("throws when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const { addAffiliation } = await import("./actions");
      await expect(
        addAffiliation("event-1", { organization: "Test" })
      ).rejects.toThrow("Not authenticated");
    });
  });

  describe("removeAffiliation", () => {
    it("deletes an affiliation owned by current user", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: null })
      );

      const { removeAffiliation } = await import("./actions");
      await removeAffiliation("aff-1");

      expect(mockFrom).toHaveBeenCalledWith("attendee_affiliations");
    });
  });

  describe("addEducation", () => {
    it("inserts an education entry for the current user", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: { id: "edu-1" }, error: null })
      );

      const { addEducation } = await import("./actions");
      await addEducation("event-1", {
        school: "MIT",
        degree: "BS",
        field_of_study: "CS",
        start_year: 2018,
        end_year: 2022,
      });

      expect(mockFrom).toHaveBeenCalledWith("attendee_education");
    });
  });

  describe("removeEducation", () => {
    it("deletes an education entry owned by current user", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: null })
      );

      const { removeEducation } = await import("./actions");
      await removeEducation("edu-1");

      expect(mockFrom).toHaveBeenCalledWith("attendee_education");
    });
  });

  describe("updateProfileLinks", () => {
    it("updates the links JSONB column", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: null })
      );

      const { updateProfileLinks } = await import("./actions");
      await updateProfileLinks("event-1", [
        { type: "linkedin", url: "https://linkedin.com/in/test" },
      ]);

      expect(mockFrom).toHaveBeenCalledWith("attendee_profiles");
    });

    it("rejects links without https/http", async () => {
      const { updateProfileLinks } = await import("./actions");
      await expect(
        updateProfileLinks("event-1", [
          { type: "website", url: "not-a-url" },
        ])
      ).rejects.toThrow();
    });
  });
});
