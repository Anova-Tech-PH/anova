import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { TopicComposer } from "./topic-composer";

vi.mock("@/features/discussion-topics/actions", () => ({
  createTopic: vi.fn(),
  updateTopic: vi.fn(),
}));

vi.mock("@attendly/ui/components", async () => {
  const actual = await vi.importActual<Record<string, unknown>>(
    "@attendly/ui/components"
  );
  return {
    ...actual,
    ModalOverlay: ({
      children,
      onClose,
    }: {
      children: React.ReactNode;
      onClose?: () => void;
    }) => (
      <div data-testid="modal-overlay" onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}>
        {children}
      </div>
    ),
  };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const defaultProps = {
  eventId: "evt-1",
  open: true,
  onClose: vi.fn(),
};

describe("TopicComposer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders modal when open=true", () => {
    render(<TopicComposer {...defaultProps} />);
    expect(screen.getByTestId("modal-overlay")).toBeInTheDocument();
    expect(screen.getByText("New Topic")).toBeInTheDocument();
  });

  it("does not render when open=false", () => {
    render(<TopicComposer {...defaultProps} open={false} />);
    expect(screen.queryByTestId("modal-overlay")).not.toBeInTheDocument();
  });

  it("renders title input", () => {
    render(<TopicComposer {...defaultProps} />);
    expect(screen.getByPlaceholderText(/topic title/i)).toBeInTheDocument();
  });

  it("renders description textarea", () => {
    render(<TopicComposer {...defaultProps} />);
    expect(
      screen.getByPlaceholderText(/add a question or description/i)
    ).toBeInTheDocument();
  });

  it("Create button is disabled when title is empty", () => {
    render(<TopicComposer {...defaultProps} />);
    const createBtn = screen.getByRole("button", { name: /create/i });
    expect(createBtn).toBeDisabled();
  });

  it("Create button is enabled when title has text", async () => {
    const user = userEvent.setup();
    render(<TopicComposer {...defaultProps} />);

    await user.type(screen.getByPlaceholderText(/topic title/i), "My Topic");

    const createBtn = screen.getByRole("button", { name: /create/i });
    expect(createBtn).not.toBeDisabled();
  });

  it("Cancel button calls onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<TopicComposer {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("pre-fills form when editing (draft prop)", () => {
    const draft = {
      id: "topic-1",
      event_id: "evt-1",
      created_by: "user-1",
      title: "Existing Topic",
      description: "Some description",
      is_built_in: false,
      built_in_key: null,
      is_visible: true,
      sort_order: 0,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    };

    render(<TopicComposer {...defaultProps} draft={draft} />);
    expect(screen.getByText("Edit Topic")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/topic title/i)).toHaveValue(
      "Existing Topic"
    );
    expect(
      screen.getByPlaceholderText(/add a question or description/i)
    ).toHaveValue("Some description");
  });
});
