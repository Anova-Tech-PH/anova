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

describe("Template Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  describe("saveAsTemplate", () => {
    it("saves event as template", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1)
          return createQueryMock({
            data: {
              id: "evt-1",
              organization_id: "org-1",
              title: "Conf",
              description: "Desc",
              timezone: "UTC",
              venue_name: null,
              venue_address: null,
              is_virtual: false,
              virtual_url: null,
              cover_image: null,
              require_approval: false,
              theme: null,
              settings: null,
            },
            error: null,
          });
        if (callIdx === 2) return createQueryMock({ data: { role: "editor" }, error: null });
        if (callIdx === 3) return createQueryMock({ data: [], error: null }); // ticket_types
        if (callIdx === 4) return createQueryMock({ data: [], error: null }); // tracks
        if (callIdx === 5) return createQueryMock({ data: [], error: null }); // custom_fields
        return createQueryMock({ data: { id: "tpl-1" }, error: null });
      });

      const { saveAsTemplate } = await import("./actions");
      const result = await saveAsTemplate("evt-1", "My Template");

      expect(result).toEqual({ id: "tpl-1" });
      expect(revalidatePath).toHaveBeenCalledWith("/events/new");
    });

    it("throws if not org member", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1)
          return createQueryMock({
            data: { id: "evt-1", organization_id: "org-1" },
            error: null,
          });
        return createQueryMock({ data: null, error: { code: "PGRST116" } });
      });

      const { saveAsTemplate } = await import("./actions");
      await expect(saveAsTemplate("evt-1", "T")).rejects.toThrow("Not a member");
    });
  });

  describe("deleteTemplate", () => {
    it("deletes and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { deleteTemplate } = await import("./actions");
      await deleteTemplate("tpl-1");

      expect(mockFrom).toHaveBeenCalledWith("event_templates");
      expect(revalidatePath).toHaveBeenCalledWith("/events/new");
    });
  });

  describe("createEventFromTemplate", () => {
    it("creates event from template", async () => {
      let callIdx = 0;
      mockFrom.mockImplementation(() => {
        callIdx++;
        if (callIdx === 1)
          return createQueryMock({
            data: {
              id: "tpl-1",
              organization_id: "org-1",
              template_data: {
                title: "Base",
                description: "Desc",
                timezone: "UTC",
                venue_name: null,
                venue_address: null,
                is_virtual: false,
                virtual_url: null,
                cover_image: null,
                require_approval: false,
                theme: null,
                settings: null,
                ticket_types: [],
                tracks: [],
                custom_fields: [],
              },
            },
            error: null,
          });
        if (callIdx === 2) return createQueryMock({ data: { role: "editor" }, error: null });
        return createQueryMock({ data: { id: "new-evt" }, error: null });
      });

      const { createEventFromTemplate } = await import("./actions");
      const result = await createEventFromTemplate("tpl-1", {
        title: "New Event",
        slug: "new-event",
        start_date: "2026-10-01",
        end_date: "2026-10-02",
      });

      expect(result).toEqual({ id: "new-evt" });
      expect(revalidatePath).toHaveBeenCalledWith("/events");
    });
  });
});
