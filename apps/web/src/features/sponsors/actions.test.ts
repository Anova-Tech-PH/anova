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

describe("Sponsor Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSponsor", () => {
    it("creates sponsor and revalidates", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: { id: "sp-1", name: "Acme Corp" }, error: null })
      );

      const { createSponsor } = await import("./actions");
      const result = await createSponsor("evt-1", { name: "Acme Corp" });

      expect(result).toHaveProperty("name", "Acme Corp");
      expect(mockFrom).toHaveBeenCalledWith("sponsors");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/sponsors");
    });

    it("throws on error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "Insert failed" } })
      );

      const { createSponsor } = await import("./actions");
      await expect(createSponsor("evt-1", { name: "Test" })).rejects.toThrow("Insert failed");
    });
  });

  describe("updateSponsor", () => {
    it("updates sponsor and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateSponsor } = await import("./actions");
      await updateSponsor("evt-1", "sp-1", { name: "Updated Corp" });

      expect(mockFrom).toHaveBeenCalledWith("sponsors");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/sponsors");
    });
  });

  describe("deleteSponsor", () => {
    it("deletes sponsor and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { deleteSponsor } = await import("./actions");
      await deleteSponsor("evt-1", "sp-1");

      expect(mockFrom).toHaveBeenCalledWith("sponsors");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/sponsors");
    });
  });

  describe("bulkImportSponsors", () => {
    it("bulk imports multiple sponsors", async () => {
      const importedSponsors = [
        { id: "sp-10", name: "Alpha Inc" },
        { id: "sp-11", name: "Beta LLC" },
      ];
      mockFrom.mockReturnValue(
        createQueryMock({ data: importedSponsors, error: null })
      );

      const { bulkImportSponsors } = await import("./actions");
      const result = await bulkImportSponsors("evt-1", [
        { name: "Alpha Inc", website_url: "https://alpha.com" },
        { name: "Beta LLC", contact_email: "info@beta.com" },
      ]);

      expect(result).toHaveLength(2);
      expect(result![0]).toHaveProperty("name", "Alpha Inc");
      expect(mockFrom).toHaveBeenCalledWith("sponsors");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/sponsors");
    });

    it("throws on empty array", async () => {
      const { bulkImportSponsors } = await import("./actions");

      await expect(bulkImportSponsors("evt-1", [])).rejects.toThrow(
        "No sponsors to import"
      );
    });

    it("throws when exceeding 500 limit", async () => {
      const { bulkImportSponsors } = await import("./actions");

      const rows = Array.from({ length: 501 }, (_, i) => ({ name: `Sponsor ${i}` }));
      await expect(bulkImportSponsors("evt-1", rows)).rejects.toThrow(
        "Cannot import more than 500 sponsors at once"
      );
    });
  });

  describe("createSponsorDocument", () => {
    it("creates document and revalidates", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: { id: "doc-1", title: "Brochure" }, error: null })
      );

      const { createSponsorDocument } = await import("./actions");
      const result = await createSponsorDocument("sp-1", "evt-1", {
        title: "Brochure",
        file_url: "https://example.com/brochure.pdf",
        file_type: "application/pdf",
      });

      expect(result).toHaveProperty("title", "Brochure");
      expect(mockFrom).toHaveBeenCalledWith("sponsor_documents");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/sponsors");
    });
  });

  describe("submitLead", () => {
    it("submits lead with authenticated user", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: { id: "lead-1", name: "Jane", email: "jane@test.com" },
          error: null,
        })
      );

      const { submitLead } = await import("./actions");
      const result = await submitLead("sp-1", "evt-1", {
        name: "Jane",
        email: "jane@test.com",
        company: "TestCo",
      });

      expect(result).toHaveProperty("name", "Jane");
      expect(mockFrom).toHaveBeenCalledWith("sponsor_leads");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/sponsors");
    });

    it("throws when not authenticated", async () => {
      mockAuth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: "No session" } });

      const { submitLead } = await import("./actions");
      await expect(
        submitLead("sp-1", "evt-1", { name: "Jane", email: "jane@test.com" })
      ).rejects.toThrow("Not authenticated");
    });
  });
});
