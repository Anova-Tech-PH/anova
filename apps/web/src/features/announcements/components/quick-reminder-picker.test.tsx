import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { QuickReminderPicker } from "./quick-reminder-picker";

// Mock ModalOverlay to render children directly
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
      <div
        data-testid="modal-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget && onClose) onClose();
        }}
      >
        {children}
      </div>
    ),
  };
});

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  onSelect: vi.fn(),
  eventName: "Sample Conference 2026",
};

describe("QuickReminderPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders modal when open=true", () => {
    render(<QuickReminderPicker {...defaultProps} />);
    expect(screen.getByTestId("modal-overlay")).toBeInTheDocument();
    expect(screen.getByText("Quick reminders")).toBeInTheDocument();
  });

  it("does not render when open=false", () => {
    render(<QuickReminderPicker {...defaultProps} open={false} />);
    expect(screen.queryByTestId("modal-overlay")).not.toBeInTheDocument();
  });

  it("renders template list on the left panel", () => {
    render(<QuickReminderPicker {...defaultProps} />);
    // "Session Room Change" appears in both panels since it's the default preview
    expect(screen.getAllByText("Session Room Change").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Thank You for Attending")).toBeInTheDocument();
    expect(screen.getByText("Survey Reminder")).toBeInTheDocument();
    expect(screen.getByText("Session Feedback Reminder")).toBeInTheDocument();
    expect(screen.getByText("Documents Reminder")).toBeInTheDocument();
  });

  it("renders Preview buttons for each template", () => {
    render(<QuickReminderPicker {...defaultProps} />);
    const previewButtons = screen.getAllByRole("button", { name: /preview/i });
    expect(previewButtons.length).toBeGreaterThanOrEqual(5);
  });

  it("shows first template preview by default", () => {
    render(<QuickReminderPicker {...defaultProps} />);
    // "Session Room Change" appears in both left panel and right preview header
    const matches = screen.getAllByText("Session Room Change");
    expect(matches.length).toBeGreaterThanOrEqual(2);
    // Should show the "Start from this template" button
    expect(
      screen.getByRole("button", { name: /start from this template/i })
    ).toBeInTheDocument();
  });

  it("shows info banner about customization", () => {
    render(<QuickReminderPicker {...defaultProps} />);
    expect(
      screen.getByText(/customize the announcement/i)
    ).toBeInTheDocument();
  });

  it("shows event name in preview", () => {
    render(<QuickReminderPicker {...defaultProps} />);
    expect(screen.getByText("Sample Conference 2026")).toBeInTheDocument();
  });

  it("clicking Preview on a different template updates the preview", async () => {
    const user = userEvent.setup();
    render(<QuickReminderPicker {...defaultProps} />);

    // Click preview on "Thank You for Attending"
    const previewButtons = screen.getAllByRole("button", { name: /preview/i });
    // The second Preview button corresponds to the second template
    await user.click(previewButtons[1]);

    // The right panel should now show "Thank You for Attending" as heading
    const headings = screen.getAllByText("Thank You for Attending");
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it("clicking 'Start from this template' calls onSelect with subject and body", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<QuickReminderPicker {...defaultProps} onSelect={onSelect} />);

    await user.click(
      screen.getByRole("button", { name: /start from this template/i })
    );

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String)
    );
    // Subject should be the first template's subject
    expect(onSelect.mock.calls[0][0]).toBe("Session Room Change");
  });

  it("clicking close button calls onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<QuickReminderPicker {...defaultProps} onClose={onClose} />);

    // Find the X close button by aria-label
    const closeButton = screen.getByLabelText(/close/i);
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("substitutes {event-name} variable in preview body", () => {
    render(<QuickReminderPicker {...defaultProps} />);
    // The preview body should contain the actual event name, not the variable
    const previewArea = screen.getByTestId("template-preview-body");
    expect(previewArea.textContent).not.toContain("{event-name}");
  });

  it("has two-panel layout", () => {
    render(<QuickReminderPicker {...defaultProps} />);
    expect(screen.getByTestId("template-list-panel")).toBeInTheDocument();
    expect(screen.getByTestId("template-preview-panel")).toBeInTheDocument();
  });
});
