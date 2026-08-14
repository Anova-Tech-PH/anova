import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { GroupComposer } from "./group-composer";

vi.mock("@/features/social-groups/actions", () => ({
  createGroup: vi.fn(),
  updateGroup: vi.fn(),
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

describe("GroupComposer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders modal when open=true", () => {
    render(<GroupComposer {...defaultProps} />);
    expect(screen.getByTestId("modal-overlay")).toBeInTheDocument();
    expect(screen.getByText("New Group")).toBeInTheDocument();
  });

  it("does not render when open=false", () => {
    render(<GroupComposer {...defaultProps} open={false} />);
    expect(screen.queryByTestId("modal-overlay")).not.toBeInTheDocument();
  });

  it("renders title input", () => {
    render(<GroupComposer {...defaultProps} />);
    expect(screen.getByPlaceholderText(/group name/i)).toBeInTheDocument();
  });

  it("renders description textarea", () => {
    render(<GroupComposer {...defaultProps} />);
    expect(
      screen.getByPlaceholderText(/describe the group/i)
    ).toBeInTheDocument();
  });

  it("renders prompt textarea", () => {
    render(<GroupComposer {...defaultProps} />);
    expect(
      screen.getByPlaceholderText(/ask a question/i)
    ).toBeInTheDocument();
  });

  it("Create button is disabled when title is empty", () => {
    render(<GroupComposer {...defaultProps} />);
    const createBtn = screen.getByRole("button", { name: /create/i });
    expect(createBtn).toBeDisabled();
  });

  it("Create button is enabled when title has text", async () => {
    const user = userEvent.setup();
    render(<GroupComposer {...defaultProps} />);

    await user.type(screen.getByPlaceholderText(/group name/i), "My Group");

    const createBtn = screen.getByRole("button", { name: /create/i });
    expect(createBtn).not.toBeDisabled();
  });

  it("Cancel button calls onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<GroupComposer {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("pre-fills form when editing (draft prop)", () => {
    const draft = {
      id: "group-1",
      event_id: "evt-1",
      created_by: "user-1",
      title: "Existing Group",
      description: "Some description",
      prompt: "What's your experience?",
      is_visible: true,
      sort_order: 0,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    };

    render(<GroupComposer {...defaultProps} draft={draft} />);
    expect(screen.getByText("Edit Group")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/group name/i)).toHaveValue(
      "Existing Group"
    );
    expect(
      screen.getByPlaceholderText(/describe the group/i)
    ).toHaveValue("Some description");
    expect(
      screen.getByPlaceholderText(/ask a question/i)
    ).toHaveValue("What's your experience?");
  });
});
