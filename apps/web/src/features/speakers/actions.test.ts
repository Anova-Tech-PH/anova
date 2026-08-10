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

describe("Speaker Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSpeaker", () => {
    it("creates speaker and revalidates", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: { id: "spk-1", name: "Jane" }, error: null })
      );

      const { createSpeaker } = await import("./actions");
      const result = await createSpeaker("evt-1", { name: "Jane", title: "CEO" });

      expect(result).toHaveProperty("name", "Jane");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/schedule");
    });
  });

  describe("updateSpeaker", () => {
    it("updates and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateSpeaker } = await import("./actions");
      await updateSpeaker("evt-1", "spk-1", { name: "Updated" });

      expect(mockFrom).toHaveBeenCalledWith("speakers");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/schedule");
    });
  });

  describe("deleteSpeaker", () => {
    it("deletes and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { deleteSpeaker } = await import("./actions");
      await deleteSpeaker("evt-1", "spk-1");

      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/schedule");
    });
  });
});
