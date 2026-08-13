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

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

describe("Document Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createDocument", () => {
    it("inserts a document and revalidates", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: { id: "doc-1", title: "Slides", type: "file" },
          error: null,
        })
      );

      const { createDocument } = await import("./actions");
      const result = await createDocument("evt-1", {
        title: "Slides",
        type: "file",
        file_url: "https://example.com/slides.pdf",
        file_type: "application/pdf",
      });

      expect(result).toHaveProperty("id", "doc-1");
      expect(mockFrom).toHaveBeenCalledWith("event_documents");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/documents");
    });

    it("throws on error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "Insert failed" } })
      );

      const { createDocument } = await import("./actions");
      await expect(
        createDocument("evt-1", { title: "Test", type: "file" })
      ).rejects.toThrow("Insert failed");
    });
  });

  describe("updateDocument", () => {
    it("updates document and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateDocument } = await import("./actions");
      await updateDocument("evt-1", "doc-1", { title: "Updated Title" });

      expect(mockFrom).toHaveBeenCalledWith("event_documents");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/documents");
    });
  });

  describe("deleteDocument", () => {
    it("deletes document and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { deleteDocument } = await import("./actions");
      await deleteDocument("evt-1", "doc-1");

      expect(mockFrom).toHaveBeenCalledWith("event_documents");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/documents");
    });
  });

  describe("trackDownload", () => {
    it("inserts download record", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { trackDownload } = await import("./actions");
      await trackDownload("doc-1", "user-1");

      expect(mockFrom).toHaveBeenCalledWith("document_downloads");
    });

    it("throws on error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "Track failed" } })
      );

      const { trackDownload } = await import("./actions");
      await expect(trackDownload("doc-1", "user-1")).rejects.toThrow("Track failed");
    });
  });
});
