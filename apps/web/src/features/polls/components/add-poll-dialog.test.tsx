import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddPollDialog } from "./add-poll-dialog";
import { createPoll } from "../actions";

// Mock the createPoll server action
vi.mock("../actions", () => ({
  createPoll: vi.fn().mockResolvedValue({ id: "new-poll" }),
}));

describe("AddPollDialog", () => {
  const defaultProps = {
    eventId: "event-1",
    sessionId: "session-1",
  };

  beforeEach(() => {
    vi.mocked(createPoll).mockClear();
  });

  it("renders Add a poll button", () => {
    render(<AddPollDialog {...defaultProps} />);
    expect(screen.getByText("Add a poll")).toBeInTheDocument();
  });

  it("opens dialog with question and option fields when clicked", async () => {
    const user = userEvent.setup();
    render(<AddPollDialog {...defaultProps} />);
    await user.click(screen.getByText("Add a poll"));

    expect(screen.getByText("New Poll")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ask a question...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Option 1")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Option 2")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("adds a new option when Add option is clicked", async () => {
    const user = userEvent.setup();
    render(<AddPollDialog {...defaultProps} />);
    await user.click(screen.getByText("Add a poll"));
    await user.click(screen.getByText("Add option"));

    expect(screen.getByPlaceholderText("Option 3")).toBeInTheDocument();
  });

  it("removes an option when trash icon is clicked (only if more than 2)", async () => {
    const user = userEvent.setup();
    render(<AddPollDialog {...defaultProps} />);
    await user.click(screen.getByText("Add a poll"));
    // Add third option
    await user.click(screen.getByText("Add option"));
    expect(screen.getByPlaceholderText("Option 3")).toBeInTheDocument();

    // Remove buttons should now exist (3 options > 2)
    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    expect(removeButtons.length).toBe(3);

    // Click first remove button
    await user.click(removeButtons[0]);
    // Should be back to 2 options
    const inputs = screen.getAllByPlaceholderText(/^Option \d$/);
    expect(inputs.length).toBe(2);
  });

  it("calls createPoll with question, options, sessionId when submitted", async () => {
    const user = userEvent.setup();
    render(<AddPollDialog {...defaultProps} />);
    await user.click(screen.getByText("Add a poll"));

    await user.type(screen.getByPlaceholderText("Ask a question..."), "What is your favorite color?");
    await user.type(screen.getByPlaceholderText("Option 1"), "Red");
    await user.type(screen.getByPlaceholderText("Option 2"), "Blue");

    await user.click(screen.getByText("Add poll"));

    expect(createPoll).toHaveBeenCalledWith("event-1", expect.objectContaining({
      question: "What is your favorite color?",
      options: expect.arrayContaining([
        expect.objectContaining({ text: "Red" }),
        expect.objectContaining({ text: "Blue" }),
      ]),
      session_id: "session-1",
      open_time_mode: "now",
    }));
  });

  it("shows validation error when question is empty", async () => {
    const user = userEvent.setup();
    render(<AddPollDialog {...defaultProps} />);
    await user.click(screen.getByText("Add a poll"));
    await user.click(screen.getByText("Add poll"));

    // createPoll should not have been called
    expect(createPoll).not.toHaveBeenCalled();
  });

  it("shows validation error when fewer than 2 options filled", async () => {
    const user = userEvent.setup();
    render(<AddPollDialog {...defaultProps} />);
    await user.click(screen.getByText("Add a poll"));

    await user.type(screen.getByPlaceholderText("Ask a question..."), "A question");
    await user.type(screen.getByPlaceholderText("Option 1"), "Only one");
    // Option 2 left empty

    await user.click(screen.getByText("Add poll"));

    expect(createPoll).not.toHaveBeenCalled();
  });

  it("closes dialog and resets form after successful submit", async () => {
    const user = userEvent.setup();
    render(<AddPollDialog {...defaultProps} />);
    await user.click(screen.getByText("Add a poll"));

    await user.type(screen.getByPlaceholderText("Ask a question..."), "Test Q");
    await user.type(screen.getByPlaceholderText("Option 1"), "A");
    await user.type(screen.getByPlaceholderText("Option 2"), "B");
    await user.click(screen.getByText("Add poll"));

    // Dialog should close
    expect(screen.queryByText("New Poll")).not.toBeInTheDocument();

    // Re-open — form should be reset
    await user.click(screen.getByText("Add a poll"));
    expect(screen.getByPlaceholderText("Ask a question...")).toHaveValue("");
  });
});
