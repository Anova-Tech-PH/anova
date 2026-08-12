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

describe("Website Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateWebsiteConfig", () => {
    it("merges config and revalidates", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) {
          return createQueryMock({
            data: {
              website_config: {
                enabled: false,
                sections: [],
                theme: { primary_color: "#0ea5e9", font: "Inter" },
                custom_css: "",
              },
            },
            error: null,
          });
        }
        return createQueryMock({ data: null, error: null });
      });

      const { updateWebsiteConfig } = await import("./actions");
      await updateWebsiteConfig("evt-1", { enabled: true });

      expect(mockFrom).toHaveBeenCalledWith("events");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/website");
    });
  });

  describe("toggleWebsite", () => {
    it("toggles enabled and revalidates", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) {
          return createQueryMock({
            data: {
              website_config: {
                enabled: false,
                sections: [],
                theme: { primary_color: "#0ea5e9", font: "Inter" },
                custom_css: "",
              },
            },
            error: null,
          });
        }
        return createQueryMock({ data: null, error: null });
      });

      const { toggleWebsite } = await import("./actions");
      await toggleWebsite("evt-1", true);

      expect(mockFrom).toHaveBeenCalledWith("events");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/website");
    });
  });

  describe("updateSection", () => {
    it("updates a section by index and revalidates", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) {
          return createQueryMock({
            data: {
              website_config: {
                enabled: false,
                sections: [
                  { type: "hero", visible: true, content: { headline: "", subtitle: "" } },
                ],
                theme: { primary_color: "#0ea5e9", font: "Inter" },
                custom_css: "",
              },
            },
            error: null,
          });
        }
        return createQueryMock({ data: null, error: null });
      });

      const { updateSection } = await import("./actions");
      await updateSection("evt-1", 0, {
        type: "hero",
        visible: true,
        content: { headline: "Welcome", subtitle: "To the event" },
      });

      expect(mockFrom).toHaveBeenCalledWith("events");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/website");
    });
  });

  describe("reorderSections", () => {
    it("reorders sections to match given order", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1) {
          return createQueryMock({
            data: {
              website_config: {
                enabled: false,
                sections: [
                  { type: "hero", visible: true, content: {} },
                  { type: "about", visible: true, content: {} },
                ],
                theme: { primary_color: "#0ea5e9", font: "Inter" },
                custom_css: "",
              },
            },
            error: null,
          });
        }
        return createQueryMock({ data: null, error: null });
      });

      const { reorderSections } = await import("./actions");
      await reorderSections("evt-1", ["about", "hero"]);

      expect(mockFrom).toHaveBeenCalledWith("events");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/website");
    });
  });
});
