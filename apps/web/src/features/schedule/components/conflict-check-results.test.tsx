import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConflictCheckResults } from "./conflict-check-results";
import type { Conflict } from "../conflict-check";

describe("ConflictCheckResults", () => {
  it("shows no-conflicts message when array is empty", () => {
    render(<ConflictCheckResults conflicts={[]} />);
    expect(screen.getByText("No Conflicts Found")).toBeInTheDocument();
    expect(
      screen.getByText("All sessions are clear of scheduling conflicts.")
    ).toBeInTheDocument();
  });

  it("shows conflict count summary", () => {
    const conflicts: Conflict[] = [
      {
        type: "room",
        sessionIds: ["s1", "s2"],
        sessionTitles: ["Talk A", "Talk B"],
        detail: "Room A",
      },
      {
        type: "speaker",
        sessionIds: ["s1", "s3"],
        sessionTitles: ["Talk A", "Talk C"],
        detail: "Speaker X",
      },
    ];
    render(<ConflictCheckResults conflicts={conflicts} />);
    expect(screen.getByText("2 conflicts detected")).toBeInTheDocument();
  });

  it("shows singular conflict text for one conflict", () => {
    const conflicts: Conflict[] = [
      {
        type: "room",
        sessionIds: ["s1", "s2"],
        sessionTitles: ["Talk A", "Talk B"],
        detail: "Room A",
      },
    ];
    render(<ConflictCheckResults conflicts={conflicts} />);
    expect(screen.getByText("1 conflict detected")).toBeInTheDocument();
  });

  it("renders stat cards with correct counts per type", () => {
    const conflicts: Conflict[] = [
      {
        type: "room",
        sessionIds: ["s1", "s2"],
        sessionTitles: ["Talk A", "Talk B"],
        detail: "Room A",
      },
      {
        type: "room",
        sessionIds: ["s3", "s4"],
        sessionTitles: ["Talk C", "Talk D"],
        detail: "Room B",
      },
      {
        type: "speaker",
        sessionIds: ["s1", "s3"],
        sessionTitles: ["Talk A", "Talk C"],
        detail: "Speaker X",
      },
    ];
    render(<ConflictCheckResults conflicts={conflicts} />);
    expect(screen.getByText("Room conflicts")).toBeInTheDocument();
    expect(screen.getByText("Speaker conflicts")).toBeInTheDocument();
    expect(screen.getByText("Track conflicts")).toBeInTheDocument();
  });

  it("renders session titles and detail for each conflict", () => {
    const conflicts: Conflict[] = [
      {
        type: "speaker",
        sessionIds: ["s1", "s2"],
        sessionTitles: ["Keynote", "Workshop"],
        detail: "Dr. Smith",
      },
    ];
    render(<ConflictCheckResults conflicts={conflicts} />);
    expect(screen.getByText("Keynote")).toBeInTheDocument();
    expect(screen.getByText("Workshop")).toBeInTheDocument();
    expect(screen.getByText("Dr. Smith")).toBeInTheDocument();
    expect(screen.getByText("conflicts with")).toBeInTheDocument();
  });

  it("renders correct badge labels per conflict type", () => {
    const conflicts: Conflict[] = [
      {
        type: "room",
        sessionIds: ["s1", "s2"],
        sessionTitles: ["A", "B"],
        detail: "Room 1",
      },
      {
        type: "speaker",
        sessionIds: ["s3", "s4"],
        sessionTitles: ["C", "D"],
        detail: "Speaker 1",
      },
      {
        type: "track",
        sessionIds: ["s5", "s6"],
        sessionTitles: ["E", "F"],
        detail: "Track 1",
      },
    ];
    render(<ConflictCheckResults conflicts={conflicts} />);
    expect(screen.getByText("Room Conflict")).toBeInTheDocument();
    expect(screen.getByText("Speaker Conflict")).toBeInTheDocument();
    expect(screen.getByText("Track Conflict")).toBeInTheDocument();
  });
});
