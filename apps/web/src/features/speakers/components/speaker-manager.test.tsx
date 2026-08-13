import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpeakerManager } from "./speaker-manager";

// Mock actions
vi.mock("../actions", () => ({
  createSpeaker: vi.fn(),
  updateSpeaker: vi.fn(),
  deleteSpeaker: vi.fn(),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock SpeakerForm and SpeakerCsvImport to keep tests focused
vi.mock("./speaker-form", () => ({
  SpeakerForm: () => <div data-testid="speaker-form" />,
}));

vi.mock("./speaker-csv-import", () => ({
  SpeakerCsvImport: () => <div data-testid="speaker-csv-import" />,
}));

const mockSpeakers = [
  {
    id: "s1",
    name: "Alice",
    title: "CTO",
    company: "Acme",
    bio: "Bio",
    photo: "https://example.com/a.jpg",
    email: "alice@test.com",
    linkedin_url: null,
    twitter_handle: null,
    website_url: null,
    is_featured: true,
  },
  {
    id: "s2",
    name: "Bob",
    title: null,
    company: null,
    bio: null,
    photo: null,
    email: "bob@test.com",
    linkedin_url: null,
    twitter_handle: null,
    website_url: null,
    is_featured: false,
  },
  {
    id: "s3",
    name: "Carol",
    title: "VP",
    company: "BigCo",
    bio: "Speaker bio",
    photo: "https://example.com/c.jpg",
    email: null,
    linkedin_url: "https://linkedin.com/in/carol",
    twitter_handle: null,
    website_url: null,
    is_featured: true,
  },
];

describe("SpeakerManager", () => {
  it("renders stat cards with correct counts", () => {
    render(<SpeakerManager eventId="e1" initialSpeakers={mockSpeakers} />);

    // Total Speakers: 3
    expect(screen.getByText("Total Speakers")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    // Complete Profiles (photo + bio + company): Alice and Carol = 2
    expect(screen.getByText("Complete Profiles")).toBeInTheDocument();

    // Featured Speakers: Alice and Carol = 2
    expect(screen.getByText("Featured Speakers")).toBeInTheDocument();

    // Both Complete Profiles and Featured Speakers show "2"
    const twos = screen.getAllByText("2");
    expect(twos.length).toBe(2);
  });

  it("renders toolbar buttons", () => {
    render(<SpeakerManager eventId="e1" initialSpeakers={mockSpeakers} />);

    expect(screen.getByRole("button", { name: /add speaker/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /import csv/i })).toBeInTheDocument();
    expect(screen.getByText(/settings/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /email reminder/i })).toBeInTheDocument();
  });

  it("default view is table", () => {
    render(<SpeakerManager eventId="e1" initialSpeakers={mockSpeakers} />);

    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("renders speaker data in table rows", () => {
    render(<SpeakerManager eventId="e1" initialSpeakers={mockSpeakers} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Carol")).toBeInTheDocument();

    // Check email column
    expect(screen.getByText("alice@test.com")).toBeInTheDocument();
    expect(screen.getByText("bob@test.com")).toBeInTheDocument();
  });
});
