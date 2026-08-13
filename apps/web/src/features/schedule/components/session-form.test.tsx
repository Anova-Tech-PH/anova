import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock RichTextEditor since TipTap needs full DOM
vi.mock("@/shared/components/rich-text-editor", () => ({
  RichTextEditor: ({
    content,
    onChange,
    placeholder,
  }: {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
  }) => (
    <div data-testid="rich-text-editor" data-placeholder={placeholder}>
      <textarea
        aria-label="rich-text-editor"
        value={content}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  ),
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock server actions
vi.mock("@/features/speakers/actions", () => ({
  createSpeaker: vi.fn(),
}));
vi.mock("@/features/documents/actions", () => ({
  createDocument: vi.fn(),
}));
vi.mock("@/features/polls/actions", () => ({
  createPoll: vi.fn(),
}));
vi.mock("@attendly/ui/supabase/client", () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.com/file.pdf" } })),
      })),
    },
  })),
}));

import { SessionForm } from "./session-form";

const defaultProps = {
  eventId: "evt-1",
  tracks: [{ id: "t1", name: "Main Stage", color: "#3b82f6" }],
  speakers: [{ id: "sp1", name: "Jane Doe" }],
  rooms: ["Main Hall", "Room A", "Room B"],
  onSubmit: vi.fn().mockResolvedValue(undefined),
  onCancel: vi.fn(),
};

function switchToTab(tabName: string) {
  fireEvent.click(screen.getByRole("tab", { name: new RegExp(tabName, "i") }));
}

describe("SessionForm", () => {
  describe("Tab navigation", () => {
    it("renders all four tabs", () => {
      render(<SessionForm {...defaultProps} />);
      expect(screen.getByRole("tab", { name: /details/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /speakers/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /documents/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /live polling/i })).toBeInTheDocument();
    });

    it("defaults to Details tab", () => {
      render(<SessionForm {...defaultProps} />);
      expect(screen.getByRole("tab", { name: /details/i })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByText("Title *")).toBeInTheDocument();
    });

    it("switches to Speakers tab on click", () => {
      render(<SessionForm {...defaultProps} />);
      switchToTab("Speakers");
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    it("switches to Documents tab on click", () => {
      render(<SessionForm {...defaultProps} />);
      switchToTab("Documents");
      expect(screen.getByText(/attach documents/i)).toBeInTheDocument();
    });

    it("switches to Live Polling tab on click", () => {
      render(<SessionForm {...defaultProps} />);
      switchToTab("Live Polling");
      expect(screen.getByText(/capture your audience/i)).toBeInTheDocument();
    });
  });

  describe("Details tab", () => {
    it("renders title field", () => {
      render(<SessionForm {...defaultProps} />);
      expect(screen.getByText("Title *")).toBeInTheDocument();
    });

    it("renders type dropdown", () => {
      render(<SessionForm {...defaultProps} />);
      expect(screen.getByText("Type")).toBeInTheDocument();
    });

    it("renders Room label", () => {
      render(<SessionForm {...defaultProps} />);
      expect(screen.getByText("Room")).toBeInTheDocument();
    });

    it("renders rich text editor for description", () => {
      render(<SessionForm {...defaultProps} />);
      expect(screen.getByTestId("rich-text-editor")).toBeInTheDocument();
    });

    it("renders Sponsors Coming soon placeholder", () => {
      render(<SessionForm {...defaultProps} />);
      expect(screen.getByText("Sponsors")).toBeInTheDocument();
      expect(screen.getByText("Coming soon")).toBeInTheDocument();
    });
  });

  describe("Room dropdown", () => {
    it("renders room options from rooms prop", () => {
      render(<SessionForm {...defaultProps} />);
      const roomSelect = screen.getByLabelText("Room") as HTMLSelectElement;
      expect(roomSelect).toBeInTheDocument();
      expect(screen.getByText("Main Hall")).toBeInTheDocument();
      expect(screen.getByText("Room A")).toBeInTheDocument();
      expect(screen.getByText("Room B")).toBeInTheDocument();
    });

    it("includes a 'No room' default option", () => {
      render(<SessionForm {...defaultProps} />);
      expect(screen.getByText("No room")).toBeInTheDocument();
    });

    it("includes a 'Custom...' option", () => {
      render(<SessionForm {...defaultProps} />);
      expect(screen.getByText("Custom...")).toBeInTheDocument();
    });

    it("shows text input when Custom is selected", () => {
      render(<SessionForm {...defaultProps} />);
      const roomSelect = screen.getByLabelText("Room") as HTMLSelectElement;
      fireEvent.change(roomSelect, { target: { value: "__custom__" } });
      expect(screen.getByPlaceholderText("Enter room name")).toBeInTheDocument();
    });

    it("falls back to text input when no rooms provided", () => {
      render(<SessionForm {...defaultProps} rooms={[]} />);
      expect(screen.getByPlaceholderText("e.g. Main Hall, Room A")).toBeInTheDocument();
    });
  });

  describe("Track pills (multi-select)", () => {
    it("renders track pills instead of a dropdown", () => {
      render(<SessionForm {...defaultProps} />);
      // Should NOT have a <select> for tracks
      expect(screen.queryByLabelText("Track")).not.toBeInTheDocument();
      // Should render track name as a clickable button
      expect(screen.getByRole("button", { name: /main stage/i })).toBeInTheDocument();
    });

    it("renders label 'Tracks' (plural)", () => {
      render(<SessionForm {...defaultProps} />);
      expect(screen.getByText("Tracks")).toBeInTheDocument();
    });

    it("toggles track selection on click", () => {
      render(
        <SessionForm
          {...defaultProps}
          tracks={[
            { id: "t1", name: "Main Stage", color: "#3b82f6" },
            { id: "t2", name: "Workshop", color: "#10b981" },
          ]}
        />
      );
      const mainStageBtn = screen.getByRole("button", { name: /main stage/i });
      const workshopBtn = screen.getByRole("button", { name: /workshop/i });

      // Click to select Main Stage
      fireEvent.click(mainStageBtn);
      expect(mainStageBtn).toHaveStyle({ backgroundColor: "#3b82f6" });

      // Click to select Workshop too
      fireEvent.click(workshopBtn);
      expect(workshopBtn).toHaveStyle({ backgroundColor: "#10b981" });

      // Click Main Stage again to deselect
      fireEvent.click(mainStageBtn);
      expect(mainStageBtn).not.toHaveStyle({ backgroundColor: "#3b82f6" });
    });

    it("pre-selects tracks from session.track_ids", () => {
      render(
        <SessionForm
          {...defaultProps}
          tracks={[
            { id: "t1", name: "Main Stage", color: "#3b82f6" },
            { id: "t2", name: "Workshop", color: "#10b981" },
          ]}
          session={{
            id: "s1", title: "Test", description: "", type: "talk",
            date: "2026-09-11", start_time: "09:00", end_time: "10:00",
            location: "", track_ids: ["t1", "t2"], speaker_ids: [],
            enable_check_in: false, rsvp_enabled: false, capacity: null,
          }}
        />
      );
      const mainStageBtn = screen.getByRole("button", { name: /main stage/i });
      const workshopBtn = screen.getByRole("button", { name: /workshop/i });
      expect(mainStageBtn).toHaveStyle({ backgroundColor: "#3b82f6" });
      expect(workshopBtn).toHaveStyle({ backgroundColor: "#10b981" });
    });

    it("does not render track pills when no tracks provided", () => {
      render(<SessionForm {...defaultProps} tracks={[]} />);
      expect(screen.queryByText("Tracks")).not.toBeInTheDocument();
    });
  });

  describe("Separate date + time fields", () => {
    it("renders a Date field", () => {
      render(<SessionForm {...defaultProps} />);
      expect(screen.getByLabelText("Date *")).toBeInTheDocument();
    });

    it("renders Start Time and End Time fields", () => {
      render(<SessionForm {...defaultProps} />);
      expect(screen.getByLabelText("Start time *")).toBeInTheDocument();
      expect(screen.getByLabelText("End time *")).toBeInTheDocument();
    });

    it("date field uses type=date", () => {
      render(<SessionForm {...defaultProps} />);
      const dateInput = screen.getByLabelText("Date *") as HTMLInputElement;
      expect(dateInput.type).toBe("date");
    });

    it("time fields use type=time", () => {
      render(<SessionForm {...defaultProps} />);
      const startTime = screen.getByLabelText("Start time *") as HTMLInputElement;
      const endTime = screen.getByLabelText("End time *") as HTMLInputElement;
      expect(startTime.type).toBe("time");
      expect(endTime.type).toBe("time");
    });
  });

  describe("Speakers tab", () => {
    it("renders existing speakers as toggle chips", () => {
      render(<SessionForm {...defaultProps} />);
      switchToTab("Speakers");
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    it("shows Add Speaker button", () => {
      render(<SessionForm {...defaultProps} />);
      switchToTab("Speakers");
      expect(screen.getByRole("button", { name: /add speaker/i })).toBeInTheDocument();
    });

    it("shows inline form when Add Speaker is clicked", () => {
      render(<SessionForm {...defaultProps} />);
      switchToTab("Speakers");
      fireEvent.click(screen.getByRole("button", { name: /add speaker/i }));
      expect(screen.getByPlaceholderText("Full name")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Position or job title")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Company or affiliation")).toBeInTheDocument();
    });

    it("hides speakers for break type", () => {
      render(
        <SessionForm
          {...defaultProps}
          session={{
            id: "s1", title: "Coffee", description: "", type: "break",
            date: "2026-09-11", start_time: "10:00", end_time: "10:30",
            location: "", track_ids: [], speaker_ids: [],
            enable_check_in: false, rsvp_enabled: false, capacity: null,
          }}
        />
      );
      switchToTab("Speakers");
      expect(screen.getByText(/break sessions don.t have speakers/i)).toBeInTheDocument();
    });

    it("shows tab count badge when speakers selected", () => {
      render(
        <SessionForm
          {...defaultProps}
          session={{
            id: "s1", title: "Test", description: "", type: "talk",
            date: "2026-09-11", start_time: "09:00", end_time: "10:00",
            location: "", track_ids: [], speaker_ids: ["sp1"],
            enable_check_in: false, rsvp_enabled: false, capacity: null,
          }}
        />
      );
      const speakersTab = screen.getByRole("tab", { name: /speakers/i });
      expect(speakersTab.textContent).toContain("1");
    });
  });

  describe("Documents tab", () => {
    const docsProps = {
      ...defaultProps,
      eventDocuments: [
        { id: "d1", title: "Slide Deck" },
        { id: "d2", title: "Handout PDF" },
      ],
    };

    it("renders document list with checkboxes", () => {
      render(<SessionForm {...docsProps} />);
      switchToTab("Documents");
      expect(screen.getByText("Slide Deck")).toBeInTheDocument();
      expect(screen.getByText("Handout PDF")).toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: "Slide Deck" })).toBeInTheDocument();
    });

    it("shows Add Document button", () => {
      render(<SessionForm {...docsProps} />);
      switchToTab("Documents");
      expect(screen.getByRole("button", { name: /add document/i })).toBeInTheDocument();
    });

    it("shows inline form when Add Document is clicked", () => {
      render(<SessionForm {...docsProps} />);
      switchToTab("Documents");
      fireEvent.click(screen.getByRole("button", { name: /add document/i }));
      expect(screen.getByPlaceholderText("Document title")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("https://...")).toBeInTheDocument();
    });

    it("shows URL/Upload mode toggle in add document form", () => {
      render(<SessionForm {...docsProps} />);
      switchToTab("Documents");
      fireEvent.click(screen.getByRole("button", { name: /add document/i }));
      expect(screen.getByRole("button", { name: /^url$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^upload$/i })).toBeInTheDocument();
    });

    it("shows file input when Upload mode is selected", () => {
      render(<SessionForm {...docsProps} />);
      switchToTab("Documents");
      fireEvent.click(screen.getByRole("button", { name: /add document/i }));
      fireEvent.click(screen.getByRole("button", { name: /^upload$/i }));
      expect(screen.getByText(/click to upload/i)).toBeInTheDocument();
      expect(screen.getByText(/pdf, doc, ppt/i)).toBeInTheDocument();
      expect(screen.getByText(/file will be saved automatically/i)).toBeInTheDocument();
    });

    it("defaults to URL mode in add document form", () => {
      render(<SessionForm {...docsProps} />);
      switchToTab("Documents");
      fireEvent.click(screen.getByRole("button", { name: /add document/i }));
      expect(screen.getByPlaceholderText("https://...")).toBeInTheDocument();
    });

    it("shows empty state when no documents exist", () => {
      render(<SessionForm {...defaultProps} eventDocuments={[]} />);
      switchToTab("Documents");
      expect(screen.getByText(/no documents yet/i)).toBeInTheDocument();
    });

    it("pre-checks documents linked to session", () => {
      render(
        <SessionForm
          {...docsProps}
          session={{
            id: "s1", title: "Test", description: "", type: "talk",
            date: "2026-09-11", start_time: "09:00", end_time: "10:00",
            location: "", track_ids: [], speaker_ids: [],
            enable_check_in: false, rsvp_enabled: false, capacity: null,
            document_ids: ["d1"],
          }}
        />
      );
      switchToTab("Documents");
      const slideCheckbox = screen.getByRole("checkbox", { name: "Slide Deck" }) as HTMLInputElement;
      expect(slideCheckbox.checked).toBe(true);
      const handoutCheckbox = screen.getByRole("checkbox", { name: "Handout PDF" }) as HTMLInputElement;
      expect(handoutCheckbox.checked).toBe(false);
    });
  });

  describe("Live Polling tab", () => {
    const pollProps = {
      ...defaultProps,
      eventPolls: [
        { id: "p1", question: "Favorite language?" },
        { id: "p2", question: "Best framework?" },
      ],
    };

    it("renders poll list with checkboxes", () => {
      render(<SessionForm {...pollProps} />);
      switchToTab("Live Polling");
      expect(screen.getByText("Favorite language?")).toBeInTheDocument();
      expect(screen.getByText("Best framework?")).toBeInTheDocument();
      expect(screen.getByRole("checkbox", { name: "Favorite language?" })).toBeInTheDocument();
    });

    it("shows Add Poll button", () => {
      render(<SessionForm {...pollProps} />);
      switchToTab("Live Polling");
      expect(screen.getByRole("button", { name: /add poll/i })).toBeInTheDocument();
    });

    it("shows inline form when Add Poll is clicked", () => {
      render(<SessionForm {...pollProps} />);
      switchToTab("Live Polling");
      fireEvent.click(screen.getByRole("button", { name: /add poll/i }));
      expect(screen.getByPlaceholderText("What would you like to ask?")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Option 1")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Option 2")).toBeInTheDocument();
    });

    it("shows Advanced options toggle in add poll form", () => {
      render(<SessionForm {...pollProps} />);
      switchToTab("Live Polling");
      fireEvent.click(screen.getByRole("button", { name: /add poll/i }));
      expect(screen.getByRole("button", { name: /advanced options/i })).toBeInTheDocument();
    });

    it("hides config options by default, shows when Advanced is clicked", () => {
      render(<SessionForm {...pollProps} />);
      switchToTab("Live Polling");
      fireEvent.click(screen.getByRole("button", { name: /add poll/i }));
      expect(screen.queryByRole("radio", { name: /prompt the poll/i })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /advanced options/i }));
      expect(screen.getByRole("radio", { name: /prompt the poll/i })).toBeInTheDocument();
    });

    it("shows prompt attendee radio options in add poll form", () => {
      render(<SessionForm {...pollProps} />);
      switchToTab("Live Polling");
      fireEvent.click(screen.getByRole("button", { name: /add poll/i }));
      fireEvent.click(screen.getByRole("button", { name: /advanced options/i }));
      expect(screen.getByRole("radio", { name: /prompt the poll/i })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /do not prompt/i })).toBeInTheDocument();
    });

    it("defaults prompt attendee to enabled", () => {
      render(<SessionForm {...pollProps} />);
      switchToTab("Live Polling");
      fireEvent.click(screen.getByRole("button", { name: /add poll/i }));
      fireEvent.click(screen.getByRole("button", { name: /advanced options/i }));
      const promptRadio = screen.getByRole("radio", { name: /prompt the poll/i }) as HTMLInputElement;
      expect(promptRadio.checked).toBe(true);
    });

    it("shows anonymous response checkbox in add poll form", () => {
      render(<SessionForm {...pollProps} />);
      switchToTab("Live Polling");
      fireEvent.click(screen.getByRole("button", { name: /add poll/i }));
      fireEvent.click(screen.getByRole("button", { name: /advanced options/i }));
      expect(screen.getByRole("checkbox", { name: /anonymous/i })).toBeInTheDocument();
    });

    it("shows Open Time radio options in add poll form", () => {
      render(<SessionForm {...pollProps} />);
      switchToTab("Live Polling");
      fireEvent.click(screen.getByRole("button", { name: /add poll/i }));
      fireEvent.click(screen.getByRole("button", { name: /advanced options/i }));
      expect(screen.getByRole("radio", { name: /open now/i })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /open a specific time before/i })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /schedule open date/i })).toBeInTheDocument();
    });

    it("defaults Open Time to 'Open now'", () => {
      render(<SessionForm {...pollProps} />);
      switchToTab("Live Polling");
      fireEvent.click(screen.getByRole("button", { name: /add poll/i }));
      fireEvent.click(screen.getByRole("button", { name: /advanced options/i }));
      const openNowRadio = screen.getByRole("radio", { name: /open now/i }) as HTMLInputElement;
      expect(openNowRadio.checked).toBe(true);
    });

    it("shows Days/Hours/Minutes inputs when 'before session' is selected", () => {
      render(<SessionForm {...pollProps} />);
      switchToTab("Live Polling");
      fireEvent.click(screen.getByRole("button", { name: /add poll/i }));
      fireEvent.click(screen.getByRole("button", { name: /advanced options/i }));
      fireEvent.click(screen.getByRole("radio", { name: /open a specific time before/i }));
      expect(screen.getByLabelText("Days")).toBeInTheDocument();
      expect(screen.getByLabelText("Hours")).toBeInTheDocument();
      expect(screen.getByLabelText("Minutes")).toBeInTheDocument();
    });

    it("shows date/time inputs when 'Schedule open date' is selected", () => {
      render(<SessionForm {...pollProps} />);
      switchToTab("Live Polling");
      fireEvent.click(screen.getByRole("button", { name: /add poll/i }));
      fireEvent.click(screen.getByRole("button", { name: /advanced options/i }));
      fireEvent.click(screen.getByRole("radio", { name: /schedule open date/i }));
      expect(screen.getByLabelText("Open date")).toBeInTheDocument();
      expect(screen.getByLabelText("Open time")).toBeInTheDocument();
    });

    it("shows poll result visibility radio options in add poll form", () => {
      render(<SessionForm {...pollProps} />);
      switchToTab("Live Polling");
      fireEvent.click(screen.getByRole("button", { name: /add poll/i }));
      fireEvent.click(screen.getByRole("button", { name: /advanced options/i }));
      expect(screen.getByRole("radio", { name: /everyone who answered$/i })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /after poll is closed/i })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /only organizers/i })).toBeInTheDocument();
    });

    it("shows empty state when no polls exist", () => {
      render(<SessionForm {...defaultProps} eventPolls={[]} />);
      switchToTab("Live Polling");
      expect(screen.getByText(/no polls yet/i)).toBeInTheDocument();
    });

    it("pre-checks polls linked to session", () => {
      render(
        <SessionForm
          {...pollProps}
          session={{
            id: "s1", title: "Test", description: "", type: "talk",
            date: "2026-09-11", start_time: "09:00", end_time: "10:00",
            location: "", track_ids: [], speaker_ids: [],
            enable_check_in: false, rsvp_enabled: false, capacity: null,
            poll_ids: ["p2"],
          }}
        />
      );
      switchToTab("Live Polling");
      const poll1 = screen.getByRole("checkbox", { name: "Favorite language?" }) as HTMLInputElement;
      expect(poll1.checked).toBe(false);
      const poll2 = screen.getByRole("checkbox", { name: "Best framework?" }) as HTMLInputElement;
      expect(poll2.checked).toBe(true);
    });
  });

  describe("Auto-default time from previous session", () => {
    it("pre-fills date, start time, and end time from defaults prop", () => {
      render(
        <SessionForm
          {...defaultProps}
          defaults={{ date: "2026-11-01", start_time: "15:30", end_time: "16:30" }}
        />
      );
      const dateInput = screen.getByLabelText("Date *") as HTMLInputElement;
      const startInput = screen.getByLabelText("Start time *") as HTMLInputElement;
      const endInput = screen.getByLabelText("End time *") as HTMLInputElement;
      expect(dateInput.value).toBe("2026-11-01");
      expect(startInput.value).toBe("15:30");
      expect(endInput.value).toBe("16:30");
    });

    it("does not pre-fill when no defaults provided", () => {
      render(<SessionForm {...defaultProps} />);
      const dateInput = screen.getByLabelText("Date *") as HTMLInputElement;
      const startInput = screen.getByLabelText("Start time *") as HTMLInputElement;
      expect(dateInput.value).toBe("");
      expect(startInput.value).toBe("");
    });

    it("ignores defaults when editing an existing session", () => {
      render(
        <SessionForm
          {...defaultProps}
          defaults={{ date: "2026-11-01", start_time: "15:30", end_time: "16:30" }}
          session={{
            id: "s1", title: "Existing", description: "", type: "talk",
            date: "2026-09-11", start_time: "09:00", end_time: "10:00",
            location: "", track_ids: [], speaker_ids: [],
            enable_check_in: false, rsvp_enabled: false, capacity: null,
          }}
        />
      );
      const dateInput = screen.getByLabelText("Date *") as HTMLInputElement;
      const startInput = screen.getByLabelText("Start time *") as HTMLInputElement;
      expect(dateInput.value).toBe("2026-09-11");
      expect(startInput.value).toBe("09:00");
    });
  });

  describe("Submit button", () => {
    it("renders Add Session button for new session", () => {
      render(<SessionForm {...defaultProps} />);
      const submitBtn = screen.getByRole("button", { name: "Add Session" });
      expect(submitBtn).toBeInTheDocument();
    });

    it("renders Update button for editing session", () => {
      render(
        <SessionForm
          {...defaultProps}
          session={{
            id: "s1", title: "Test", description: "", type: "talk",
            date: "2026-09-11", start_time: "09:00", end_time: "10:00",
            location: "Room A", track_ids: [], speaker_ids: [],
            enable_check_in: false, rsvp_enabled: false, capacity: null,
          }}
        />
      );
      expect(screen.getByText("Update")).toBeInTheDocument();
    });

    it("is visible from any tab", () => {
      render(<SessionForm {...defaultProps} />);
      // Check on Details tab
      expect(screen.getByRole("button", { name: "Add Session" })).toBeInTheDocument();
      // Switch to Speakers tab
      switchToTab("Speakers");
      expect(screen.getByRole("button", { name: "Add Session" })).toBeInTheDocument();
      // Switch to Documents tab
      switchToTab("Documents");
      expect(screen.getByRole("button", { name: "Add Session" })).toBeInTheDocument();
    });
  });
});
