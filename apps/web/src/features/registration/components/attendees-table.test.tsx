import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AttendeesTable } from "./attendees-table";

const mockReplace = vi.fn();
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, refresh: vi.fn() }),
  usePathname: () => "/events/evt-1/registrations",
  useSearchParams: () => new URLSearchParams(),
}));

const mockAttendees = [
  {
    id: "reg-1",
    name: "John Doe",
    email: "john@test.com",
    title: "Pastor",
    company: "Church Inc",
    category: "Speaker",
    status: "confirmed",
    user_id: "user-1",
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "reg-2",
    name: "Jane Smith",
    email: "jane@test.com",
    title: null,
    company: null,
    category: null,
    status: "confirmed",
    user_id: null,
    created_at: "2025-01-02T00:00:00Z",
  },
];

const defaultProps = {
  eventId: "evt-1",
  attendees: mockAttendees,
  total: 50,
  categories: ["Speaker", "Organizer", "Staff"],
  stats: { total: 50, withEmail: 45, signedIn: 30 },
  page: 1,
  pageSize: 10,
};

describe("AttendeesTable", () => {
  it("renders stats bar with correct numbers", () => {
    render(<AttendeesTable {...defaultProps} />);

    expect(screen.getByText("Total Attendees:")).toBeInTheDocument();
    expect(screen.getByText("With Email:")).toBeInTheDocument();
    expect(screen.getByText("Signed In:")).toBeInTheDocument();
    // Stats values rendered as text
    expect(screen.getByText("50", { selector: "span" })).toBeInTheDocument();
  });

  it("renders action buttons", () => {
    render(<AttendeesTable {...defaultProps} />);

    expect(screen.getByRole("button", { name: /import attendees/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add an attendee/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export attendees/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send announcement/i })).toBeInTheDocument();
  });

  it("renders table with correct column headers", () => {
    render(<AttendeesTable {...defaultProps} />);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Company")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Signed into the event")).toBeInTheDocument();
  });

  it("renders attendee rows with name and email", () => {
    render(<AttendeesTable {...defaultProps} />);

    // Both desktop and mobile views render, so use getAllByText
    expect(screen.getAllByText("John Doe").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("john@test.com").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Jane Smith").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("jane@test.com").length).toBeGreaterThanOrEqual(1);
  });

  it("renders title and company when present, dashes when null", () => {
    render(<AttendeesTable {...defaultProps} />);

    // Desktop table shows title/company
    expect(screen.getAllByText("Pastor").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Church Inc").length).toBeGreaterThanOrEqual(1);
    // Jane has null title/company — should show dashes in desktop table
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it("shows Yes/No for signed-in status based on user_id", () => {
    render(<AttendeesTable {...defaultProps} />);

    // John has user_id → Yes, Jane doesn't → No
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("renders avatar initials from first letter of name", () => {
    render(<AttendeesTable {...defaultProps} />);

    const avatars = screen.getAllByTestId("avatar-initial");
    expect(avatars.length).toBeGreaterThanOrEqual(2);
    expect(avatars[0].textContent).toBe("J");
  });

  it("renders pagination showing item range and total", () => {
    render(<AttendeesTable {...defaultProps} />);

    expect(screen.getByText(/Items 1–10 of 50/)).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(<AttendeesTable {...defaultProps} />);

    expect(
      screen.getByPlaceholderText(/enter name, email, company/i)
    ).toBeInTheDocument();
  });

  it("renders category filter dropdown with options", () => {
    render(<AttendeesTable {...defaultProps} />);

    const select = screen.getByRole("combobox", { name: /category/i });
    expect(select).toBeInTheDocument();
  });

  it("renders empty state when no attendees", () => {
    render(
      <AttendeesTable
        {...defaultProps}
        attendees={[]}
        total={0}
        stats={{ total: 0, withEmail: 0, signedIn: 0 }}
      />
    );

    expect(screen.getByText(/no attendees/i)).toBeInTheDocument();
  });

  it("opens Add Attendee modal when button clicked", async () => {
    const user = userEvent.setup();
    render(<AttendeesTable {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /add an attendee/i }));

    expect(screen.getByRole("heading", { name: "Add Attendee" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("opens Import modal when button clicked", async () => {
    const user = userEvent.setup();
    render(<AttendeesTable {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /import attendees/i }));

    expect(screen.getByText("Import Attendees")).toBeInTheDocument();
  });

  it("Send announcement navigates to announcements page", async () => {
    const user = userEvent.setup();
    render(<AttendeesTable {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /send announcement/i }));

    expect(mockPush).toHaveBeenCalledWith("/events/evt-1/announcements");
  });

  it("search triggers URL update after debounce", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AttendeesTable {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/enter name, email, company/i);
    await user.type(searchInput, "john");
    await vi.advanceTimersByTimeAsync(400);

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("search=john")
    );
    vi.useRealTimers();
  });

  it("category filter triggers URL update", async () => {
    render(<AttendeesTable {...defaultProps} />);

    const select = screen.getByRole("combobox", { name: /category/i });
    await userEvent.selectOptions(select, "Speaker");

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("category=Speaker")
    );
  });

  it("pagination buttons update URL", async () => {
    render(<AttendeesTable {...defaultProps} />);

    const nextBtn = screen.getByLabelText("Next page");
    await userEvent.click(nextBtn);

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("page=2")
    );
  });
});
