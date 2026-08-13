import { describe, it, expect, vi, beforeEach } from "vitest";

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

describe("Document Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getEventDocuments", () => {
    it("returns event-level documents ordered by sort_order", async () => {
      const docs = [
        { id: "doc-1", title: "Slides", type: "file", session_id: null },
        { id: "doc-2", title: "Guide", type: "file", session_id: null },
      ];
      mockFrom.mockReturnValue(createQueryMock({ data: docs, error: null }));

      const { getEventDocuments } = await import("./queries");
      const result = await getEventDocuments("evt-1");

      expect(mockFrom).toHaveBeenCalledWith("event_documents");
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe("Slides");
    });

    it("throws on error", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "DB error" } })
      );

      const { getEventDocuments } = await import("./queries");
      await expect(getEventDocuments("evt-1")).rejects.toThrow("DB error");
    });
  });

  describe("getSessionDocuments", () => {
    it("returns documents for a specific session", async () => {
      const docs = [{ id: "doc-3", title: "Session Notes", session_id: "sess-1" }];
      mockFrom.mockReturnValue(createQueryMock({ data: docs, error: null }));

      const { getSessionDocuments } = await import("./queries");
      const result = await getSessionDocuments("sess-1");

      expect(mockFrom).toHaveBeenCalledWith("event_documents");
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Session Notes");
    });
  });

  describe("getAllDocumentsByEvent", () => {
    it("returns all documents with session info", async () => {
      const docs = [
        { id: "doc-1", title: "Slides", session: null },
        { id: "doc-2", title: "Notes", session: { id: "s1", title: "Keynote" } },
      ];
      mockFrom.mockReturnValue(createQueryMock({ data: docs, error: null }));

      const { getAllDocumentsByEvent } = await import("./queries");
      const result = await getAllDocumentsByEvent("evt-1");

      expect(result).toHaveLength(2);
      expect(result[1].session?.title).toBe("Keynote");
    });
  });

  describe("getDocumentDownloadStats", () => {
    it("returns documents with download counts", async () => {
      const docs = [
        { id: "doc-1", title: "Slides", document_downloads: [{ id: "d1" }, { id: "d2" }] },
        { id: "doc-2", title: "Guide", document_downloads: [] },
      ];
      mockFrom.mockReturnValue(createQueryMock({ data: docs, error: null }));

      const { getDocumentDownloadStats } = await import("./queries");
      const result = await getDocumentDownloadStats("evt-1");

      expect(result[0].download_count).toBe(2);
      expect(result[1].download_count).toBe(0);
    });
  });
});
