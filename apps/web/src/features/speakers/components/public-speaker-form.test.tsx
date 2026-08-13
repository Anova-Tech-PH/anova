import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PublicSpeakerForm } from "./public-speaker-form";

vi.mock("../public-form-actions", () => ({
  submitSpeakerForm: vi.fn(),
}));

vi.mock("@/shared/components/image-upload", () => ({
  ImageUpload: ({ label }: { label: string }) => <div data-testid="image-upload">{label}</div>,
}));

const mockSpeaker = {
  id: "sp1",
  name: "Alice",
  email: "alice@test.com",
  title: "CTO",
  company: "Acme",
  bio: "A bio",
  photo: null,
  linkedin_url: null,
  twitter_handle: null,
  website_url: null,
};

const mockFields = [
  { field_key: "name", label: "Full Name", included: true, required: true, is_custom: false, field_type: "text", sort_order: 0, organizer_only: false },
  { field_key: "bio", label: "Biography", included: true, required: false, is_custom: false, field_type: "textarea", sort_order: 1, organizer_only: false },
  { field_key: "photo", label: "Profile Picture", included: true, required: false, is_custom: false, field_type: "image", sort_order: 2, organizer_only: false },
];

describe("PublicSpeakerForm", () => {
  it("renders event name and speaker greeting", () => {
    render(
      <PublicSpeakerForm token="abc123" speaker={mockSpeaker} eventName="Tech Conf" fields={mockFields} />
    );
    expect(screen.getByText("Tech Conf")).toBeInTheDocument();
    expect(screen.getByText(/alice/i)).toBeInTheDocument();
  });

  it("renders only included non-organizer-only fields", () => {
    render(
      <PublicSpeakerForm token="abc123" speaker={mockSpeaker} eventName="Tech Conf" fields={mockFields} />
    );
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/biography/i)).toBeInTheDocument();
    expect(screen.getByTestId("image-upload")).toBeInTheDocument();
  });

  it("marks required fields with asterisk", () => {
    render(
      <PublicSpeakerForm token="abc123" speaker={mockSpeaker} eventName="Tech Conf" fields={mockFields} />
    );
    const nameLabel = screen.getByText((content) => content.includes("Full Name") && content.includes("*"));
    expect(nameLabel).toBeInTheDocument();
  });

  it("pre-fills speaker data", () => {
    render(
      <PublicSpeakerForm token="abc123" speaker={mockSpeaker} eventName="Tech Conf" fields={mockFields} />
    );
    expect(screen.getByLabelText(/full name/i)).toHaveValue("Alice");
    expect(screen.getByLabelText(/biography/i)).toHaveValue("A bio");
  });

  it("renders submit button", () => {
    render(
      <PublicSpeakerForm token="abc123" speaker={mockSpeaker} eventName="Tech Conf" fields={mockFields} />
    );
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });
});
