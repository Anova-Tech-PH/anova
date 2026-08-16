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

describe("Poll Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  describe("createPoll", () => {
    it("creates poll with options", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: { id: "poll-1", question: "Yes or No?", status: "draft" },
          error: null,
        })
      );

      const { createPoll } = await import("./actions");
      const result = await createPoll("evt-1", {
        question: "Yes or No?",
        options: [
          { id: "a", text: "Yes" },
          { id: "b", text: "No" },
        ],
      });

      expect(result).toHaveProperty("id", "poll-1");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/polls");
    });
  });

  describe("openPoll", () => {
    it("changes status to open", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { openPoll } = await import("./actions");
      await openPoll("evt-1", "poll-1");

      expect(mockFrom).toHaveBeenCalledWith("live_polls");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/polls");
    });
  });

  describe("closePoll", () => {
    it("changes status to closed", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { closePoll } = await import("./actions");
      await closePoll("evt-1", "poll-1");

      expect(mockFrom).toHaveBeenCalledWith("live_polls");
    });
  });

  describe("togglePollResults", () => {
    it("toggles show_results", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { togglePollResults } = await import("./actions");
      await togglePollResults("evt-1", "poll-1", true);

      expect(mockFrom).toHaveBeenCalledWith("live_polls");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/polls");
    });
  });

  describe("votePoll", () => {
    it("records vote via upsert", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { votePoll } = await import("./actions");
      await votePoll("poll-1", "a");

      expect(mockFrom).toHaveBeenCalledWith("live_poll_votes");
    });

    it("allows changing vote (upsert)", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { votePoll } = await import("./actions");
      await votePoll("poll-1", "b"); // change from 'a' to 'b'

      expect(mockFrom).toHaveBeenCalledWith("live_poll_votes");
    });
  });

  describe("deletePoll", () => {
    it("deletes poll and revalidates", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { deletePoll } = await import("./actions");
      await deletePoll("evt-1", "poll-1");

      expect(mockFrom).toHaveBeenCalledWith("live_polls");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/polls");
    });
  });

  describe("createPoll with answer_type", () => {
    it("creates star_rating poll with no options", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: { id: "poll-2", question: "Rate this session", status: "draft", answer_type: "star_rating" },
          error: null,
        })
      );

      const { createPoll } = await import("./actions");
      const result = await createPoll("evt-1", {
        question: "Rate this session",
        options: [],
        answer_type: "star_rating",
      });

      expect(result).toHaveProperty("answer_type", "star_rating");
    });
  });

  describe("voteRating", () => {
    it("records star rating vote", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { voteRating } = await import("./actions");
      await voteRating("poll-1", 4);

      expect(mockFrom).toHaveBeenCalledWith("live_poll_votes");
    });
  });

  describe("voteText", () => {
    it("records text response vote", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { voteText } = await import("./actions");
      await voteText("poll-1", "Great session!");

      expect(mockFrom).toHaveBeenCalledWith("live_poll_votes");
    });
  });

  describe("voteCheckbox", () => {
    it("records checkbox votes (multiple options)", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { voteCheckbox } = await import("./actions");
      await voteCheckbox("poll-1", ["opt-a", "opt-c"]);

      expect(mockFrom).toHaveBeenCalledWith("live_poll_votes");
    });
  });
});
