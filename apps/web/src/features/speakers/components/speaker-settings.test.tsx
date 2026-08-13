import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpeakerSettings } from "./speaker-settings";

vi.mock("../settings-actions", () => ({
  saveSpeakerFormSettings: vi.fn(),
}));

vi.mock("../settings-constants", () => ({
  DEFAULT_SPEAKER_FIELDS: [
    { field_key: "name", label: "Full Name", included: true, required: true, is_custom: false, field_type: "text", sort_order: 0, organizer_only: false },
    { field_key: "email", label: "Email", included: true, required: true, is_custom: false, field_type: "text", sort_order: 1, organizer_only: true },
    { field_key: "bio", label: "Biography", included: true, required: false, is_custom: false, field_type: "textarea", sort_order: 4, organizer_only: false },
  ],
}));

describe("SpeakerSettings", () => {
  const defaultProps = {
    eventId: "e1",
    initialSettings: null,
    initialFields: [],
  };

  it("renders all three sections", () => {
    render(<SpeakerSettings {...defaultProps} />);
    expect(screen.getByText("Speaker Form Email")).toBeInTheDocument();
    expect(screen.getByText("Speaker Form")).toBeInTheDocument();
    expect(screen.getByText("Additional Settings")).toBeInTheDocument();
  });

  it("renders email subject and body inputs", () => {
    render(<SpeakerSettings {...defaultProps} />);
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email body/i)).toBeInTheDocument();
  });

  it("renders field table with Include and Required columns", () => {
    render(<SpeakerSettings {...defaultProps} />);
    expect(screen.getByText("Field")).toBeInTheDocument();
    expect(screen.getByText("Include")).toBeInTheDocument();
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("renders default fields when no initialFields provided", () => {
    render(<SpeakerSettings {...defaultProps} />);
    expect(screen.getByText("Full Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Biography")).toBeInTheDocument();
  });

  it("renders notification preference radios", () => {
    render(<SpeakerSettings {...defaultProps} />);
    expect(screen.getByLabelText(/every.*update/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/daily.*summary/i)).toBeInTheDocument();
  });

  it("renders save and cancel buttons", () => {
    render(<SpeakerSettings {...defaultProps} />);
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("loads initial settings into form", () => {
    render(
      <SpeakerSettings
        eventId="e1"
        initialSettings={{
          email_subject: "Custom subject",
          email_body: "Custom body",
          notification_preference: "daily_summary",
          send_reminder_email: false,
        }}
        initialFields={[
          { field_key: "name", label: "Full Name", included: true, required: true, is_custom: false, field_type: "text", sort_order: 0, organizer_only: false },
        ]}
      />
    );
    expect(screen.getByLabelText(/subject/i)).toHaveValue("Custom subject");
    expect(screen.getByLabelText(/email body/i)).toHaveValue("Custom body");
  });
});
