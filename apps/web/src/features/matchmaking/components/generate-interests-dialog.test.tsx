import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { GenerateInterestsDialog } from "./generate-interests-dialog";

const mockGenerateInterests = vi.fn();
const mockCreateInterest = vi.fn();

vi.mock("@/features/matchmaking/actions", () => ({
  generateInterests: (...args: unknown[]) => mockGenerateInterests(...args),
  createInterest: (...args: unknown[]) => mockCreateInterest(...args),
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

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const defaultProps = {
  eventId: "evt-1",
  open: true,
  onClose: vi.fn(),
};

describe("GenerateInterestsDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateInterests.mockResolvedValue([
      "Artificial Intelligence",
      "Sustainability",
      "Leadership",
    ]);
    mockCreateInterest.mockResolvedValue(undefined);
  });

  it("renders modal when open", () => {
    render(<GenerateInterestsDialog {...defaultProps} />);
    expect(screen.getByTestId("modal-overlay")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<GenerateInterestsDialog {...defaultProps} open={false} />);
    expect(screen.queryByTestId("modal-overlay")).not.toBeInTheDocument();
  });

  it("shows loading/generating state initially", () => {
    render(<GenerateInterestsDialog {...defaultProps} />);
    expect(screen.getByText(/generating interests/i)).toBeInTheDocument();
  });

  it("after generation completes, shows interest suggestions as checkboxes", async () => {
    render(<GenerateInterestsDialog {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByLabelText("Artificial Intelligence")
      ).toBeInTheDocument();
    });

    expect(screen.getByLabelText("Sustainability")).toBeInTheDocument();
    expect(screen.getByLabelText("Leadership")).toBeInTheDocument();
  });

  it("all checkboxes are checked by default", async () => {
    render(<GenerateInterestsDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Artificial Intelligence")).toBeChecked();
    });

    expect(screen.getByLabelText("Sustainability")).toBeChecked();
    expect(screen.getByLabelText("Leadership")).toBeChecked();
  });

  it("Add Selected button is present after generation", async () => {
    render(<GenerateInterestsDialog {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /add selected/i })
      ).toBeInTheDocument();
    });
  });

  it("Cancel button is present", () => {
    render(<GenerateInterestsDialog {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /cancel/i })
    ).toBeInTheDocument();
  });

  it("Cancel button calls onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<GenerateInterestsDialog {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("user can uncheck interests", async () => {
    const user = userEvent.setup();
    render(<GenerateInterestsDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Sustainability")).toBeChecked();
    });

    await user.click(screen.getByLabelText("Sustainability"));
    expect(screen.getByLabelText("Sustainability")).not.toBeChecked();
  });

  it("shows error state with retry option if generation fails", async () => {
    mockGenerateInterests.mockRejectedValueOnce(new Error("API error"));

    render(<GenerateInterestsDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/failed to generate/i)).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /retry/i })
    ).toBeInTheDocument();
  });

  it("retry button re-calls generateInterests", async () => {
    const user = userEvent.setup();
    mockGenerateInterests
      .mockRejectedValueOnce(new Error("API error"))
      .mockResolvedValueOnce(["Data Science"]);

    render(<GenerateInterestsDialog {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /retry/i })
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByLabelText("Data Science")).toBeInTheDocument();
    });

    expect(mockGenerateInterests).toHaveBeenCalledTimes(2);
  });

  it("Add Selected calls createInterest for each checked interest and closes", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<GenerateInterestsDialog {...defaultProps} onClose={onClose} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /add selected/i })
      ).toBeInTheDocument();
    });

    // Uncheck one interest
    await user.click(screen.getByLabelText("Leadership"));

    await user.click(screen.getByRole("button", { name: /add selected/i }));

    await waitFor(() => {
      expect(mockCreateInterest).toHaveBeenCalledTimes(2);
    });

    expect(mockCreateInterest).toHaveBeenCalledWith("evt-1", {
      name: "Artificial Intelligence",
    });
    expect(mockCreateInterest).toHaveBeenCalledWith("evt-1", {
      name: "Sustainability",
    });
    expect(onClose).toHaveBeenCalled();
  });
});
