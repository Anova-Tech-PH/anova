import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { InterestComposer } from "./interest-composer";

vi.mock("@/features/matchmaking/actions", () => ({
  createInterest: vi.fn(),
  updateInterest: vi.fn(),
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
  draft: null,
};

describe("InterestComposer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders modal when open=true", () => {
    render(<InterestComposer {...defaultProps} />);
    expect(screen.getByTestId("modal-overlay")).toBeInTheDocument();
    expect(screen.getByText("New Interest")).toBeInTheDocument();
  });

  it("does not render when open=false", () => {
    render(<InterestComposer {...defaultProps} open={false} />);
    expect(screen.queryByTestId("modal-overlay")).not.toBeInTheDocument();
  });

  it("renders name input with placeholder", () => {
    render(<InterestComposer {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("Interest name")
    ).toBeInTheDocument();
  });

  it("shows character count 0/30", () => {
    render(<InterestComposer {...defaultProps} />);
    expect(screen.getByText("0/30")).toBeInTheDocument();
  });

  it("Create button is disabled when name is empty", () => {
    render(<InterestComposer {...defaultProps} />);
    const createBtn = screen.getByRole("button", { name: /create/i });
    expect(createBtn).toBeDisabled();
  });

  it("Create button is enabled when name has text", async () => {
    const user = userEvent.setup();
    render(<InterestComposer {...defaultProps} />);

    await user.type(
      screen.getByPlaceholderText("Interest name"),
      "AI"
    );

    const createBtn = screen.getByRole("button", { name: /create/i });
    expect(createBtn).not.toBeDisabled();
  });

  it("updates character count as user types", async () => {
    const user = userEvent.setup();
    render(<InterestComposer {...defaultProps} />);

    await user.type(
      screen.getByPlaceholderText("Interest name"),
      "Hello"
    );

    expect(screen.getByText("5/30")).toBeInTheDocument();
  });

  it("pre-fills name and shows Edit Interest title when editing", () => {
    const draft = { id: "int-1", name: "Sustainability" };
    render(<InterestComposer {...defaultProps} draft={draft} />);
    expect(screen.getByText("Edit Interest")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Interest name")).toHaveValue(
      "Sustainability"
    );
  });

  it("Cancel button calls onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<InterestComposer {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
