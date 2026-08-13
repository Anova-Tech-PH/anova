import { describe, it, expect } from "vitest";
import { sessionsToCSV, type SessionForExport } from "./csv-export";

const baseSessions: SessionForExport[] = [
  {
    title: "Intro to TypeScript",
    description: "Learn TS basics",
    type: "talk",
    start_time: "2026-09-15T09:00:00Z",
    end_time: "2026-09-15T10:00:00Z",
    location: "Room 101",
    session_tracks: [{ tracks: { name: "Frontend" } }],
    session_speakers: [
      { speakers: { name: "Alice Smith" } },
      { speakers: { name: "Bob Jones" } },
    ],
  },
  {
    title: "Lunch Break",
    description: null,
    type: "break",
    start_time: "2026-09-15T12:00:00Z",
    end_time: "2026-09-15T13:00:00Z",
    location: null,
    session_tracks: [],
    session_speakers: [],
  },
];

describe("sessionsToCSV", () => {
  it("converts sessions to CSV with correct headers", () => {
    const csv = sessionsToCSV(baseSessions);
    const lines = csv.split("\n");

    expect(lines[0]).toBe("title,description,type,track,start_time,end_time,location,speakers");
    expect(lines[1]).toContain("Intro to TypeScript");
    expect(lines[1]).toContain("Alice Smith;Bob Jones");
    expect(lines[1]).toContain("Frontend");
  });

  it("handles sessions with no speakers", () => {
    const csv = sessionsToCSV(baseSessions);
    const lines = csv.split("\n");

    // Lunch Break line should have empty speakers field
    expect(lines[2]).toContain("Lunch Break");
    expect(lines[2].endsWith(",")).toBe(true);
  });

  it("escapes commas in fields by wrapping in quotes", () => {
    const sessions: SessionForExport[] = [
      {
        title: "Advanced, Complex Topics",
        description: 'She said "hello"',
        type: "workshop",
        start_time: "2026-09-15T14:00:00Z",
        end_time: "2026-09-15T15:00:00Z",
        location: "Hall A, Building 2",
        session_tracks: [{ tracks: { name: "Backend" } }],
        session_speakers: [],
      },
    ];

    const csv = sessionsToCSV(sessions);
    const lines = csv.split("\n");

    // Fields with commas should be quoted
    expect(lines[1]).toContain('"Advanced, Complex Topics"');
    // Fields with quotes should have escaped quotes
    expect(lines[1]).toContain('"She said ""hello"""');
    expect(lines[1]).toContain('"Hall A, Building 2"');
  });

  it("escapes newlines in fields", () => {
    const sessions: SessionForExport[] = [
      {
        title: "Talk",
        description: "Line 1\nLine 2",
        type: "talk",
        start_time: "2026-09-15T14:00:00Z",
        end_time: "2026-09-15T15:00:00Z",
        location: null,
        session_tracks: [],
        session_speakers: [],
      },
    ];

    const csv = sessionsToCSV(sessions);
    expect(csv).toContain('"Line 1\nLine 2"');
  });

  it("exports multiple tracks semicolon-separated", () => {
    const sessions: SessionForExport[] = [
      {
        title: "Session A",
        description: null,
        type: "talk",
        start_time: "2026-01-01T10:00:00Z",
        end_time: "2026-01-01T11:00:00Z",
        location: null,
        session_tracks: [
          { tracks: { name: "AI" } },
          { tracks: { name: "Leadership" } },
        ],
        session_speakers: [],
      },
    ];
    const csv = sessionsToCSV(sessions);
    expect(csv).toContain("AI;Leadership");
  });

  it("handles no tracks as empty string", () => {
    const sessions: SessionForExport[] = [
      {
        title: "Session B",
        description: null,
        type: "talk",
        start_time: "2026-01-01T10:00:00Z",
        end_time: "2026-01-01T11:00:00Z",
        location: null,
        session_tracks: [],
        session_speakers: [],
      },
    ];
    const csv = sessionsToCSV(sessions);
    const lines = csv.split("\n");
    // track is the 4th column (index 3)
    const dataFields = lines[1].split(",");
    expect(dataFields[3]).toBe("");
  });
});
