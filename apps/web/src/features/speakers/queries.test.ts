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

describe("Speaker Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSpeakersByEvent", () => {
    it("returns speakers ordered by sort_order then name", async () => {
      const speakers = [
        { id: "spk-1", name: "Alice", sort_order: 1 },
        { id: "spk-2", name: "Bob", sort_order: 2 },
      ];
      mockFrom.mockReturnValue(createQueryMock({ data: speakers, error: null }));

      const { getSpeakersByEvent } = await import("./queries");
      const result = await getSpeakersByEvent("evt-1");

      expect(result).toHaveLength(2);
      expect(result![0]).toHaveProperty("name", "Alice");
      expect(mockFrom).toHaveBeenCalledWith("speakers");
    });
  });

  describe("getSpeakerById", () => {
    it("returns speaker with sessions", async () => {
      const speaker = {
        id: "spk-1",
        name: "Jane",
        session_speakers: [
          {
            sessions: {
              id: "sess-1",
              title: "Keynote",
              start_time: "2026-01-01T09:00:00Z",
              end_time: "2026-01-01T10:00:00Z",
              location: "Main Hall",
              type: "keynote",
              tracks: { name: "Main", color: "#000" },
            },
          },
        ],
      };
      mockFrom.mockReturnValue(createQueryMock({ data: speaker, error: null }));

      const { getSpeakerById } = await import("./queries");
      const result = await getSpeakerById("spk-1");

      expect(result).toHaveProperty("name", "Jane");
      expect(result.session_speakers).toHaveLength(1);
      expect(result.session_speakers[0].sessions).toHaveProperty("title", "Keynote");
    });

    it("throws on not found", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: { message: "Row not found" } })
      );

      const { getSpeakerById } = await import("./queries");
      await expect(getSpeakerById("nonexistent")).rejects.toThrow("Row not found");
    });
  });
});
