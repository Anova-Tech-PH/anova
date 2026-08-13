import { describe, it, expect } from "vitest";
import { detectConflicts, type SessionForConflict } from "./conflict-check";

const makeSession = (overrides: Partial<SessionForConflict>): SessionForConflict => ({
  id: "s1",
  title: "Session 1",
  start_time: "2026-09-11T09:00:00Z",
  end_time: "2026-09-11T10:00:00Z",
  location: null,
  track_id: null,
  speaker_ids: [],
  ...overrides,
});

describe("detectConflicts", () => {
  it("returns empty array when no conflicts", () => {
    const sessions = [
      makeSession({ id: "s1", start_time: "2026-09-11T09:00:00Z", end_time: "2026-09-11T10:00:00Z" }),
      makeSession({ id: "s2", start_time: "2026-09-11T10:00:00Z", end_time: "2026-09-11T11:00:00Z" }),
    ];
    expect(detectConflicts(sessions)).toEqual([]);
  });

  it("detects room conflicts (same location, overlapping times)", () => {
    const sessions = [
      makeSession({ id: "s1", location: "Room A", start_time: "2026-09-11T09:00:00Z", end_time: "2026-09-11T10:00:00Z" }),
      makeSession({ id: "s2", location: "Room A", start_time: "2026-09-11T09:30:00Z", end_time: "2026-09-11T10:30:00Z", title: "Session 2" }),
    ];
    const conflicts = detectConflicts(sessions);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].type).toBe("room");
    expect(conflicts[0].sessionIds).toEqual(["s1", "s2"]);
  });

  it("detects speaker conflicts (same speaker, overlapping times)", () => {
    const sessions = [
      makeSession({ id: "s1", speaker_ids: ["sp1"], start_time: "2026-09-11T09:00:00Z", end_time: "2026-09-11T10:00:00Z" }),
      makeSession({ id: "s2", speaker_ids: ["sp1"], start_time: "2026-09-11T09:30:00Z", end_time: "2026-09-11T10:30:00Z", title: "Session 2" }),
    ];
    const conflicts = detectConflicts(sessions);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].type).toBe("speaker");
  });

  it("detects track conflicts (same track, overlapping times)", () => {
    const sessions = [
      makeSession({ id: "s1", track_id: "t1", start_time: "2026-09-11T09:00:00Z", end_time: "2026-09-11T10:00:00Z" }),
      makeSession({ id: "s2", track_id: "t1", start_time: "2026-09-11T09:30:00Z", end_time: "2026-09-11T10:30:00Z", title: "Session 2" }),
    ];
    const conflicts = detectConflicts(sessions);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].type).toBe("track");
  });

  it("ignores null locations", () => {
    const sessions = [
      makeSession({ id: "s1", location: null, start_time: "2026-09-11T09:00:00Z", end_time: "2026-09-11T10:00:00Z" }),
      makeSession({ id: "s2", location: null, start_time: "2026-09-11T09:30:00Z", end_time: "2026-09-11T10:30:00Z" }),
    ];
    expect(detectConflicts(sessions)).toEqual([]);
  });

  it("does not flag adjacent sessions (end time = start time)", () => {
    const sessions = [
      makeSession({ id: "s1", location: "Room A", start_time: "2026-09-11T09:00:00Z", end_time: "2026-09-11T10:00:00Z" }),
      makeSession({ id: "s2", location: "Room A", start_time: "2026-09-11T10:00:00Z", end_time: "2026-09-11T11:00:00Z" }),
    ];
    expect(detectConflicts(sessions)).toEqual([]);
  });

  it("reports multiple conflict types for same pair", () => {
    const sessions = [
      makeSession({ id: "s1", location: "Room A", speaker_ids: ["sp1"], start_time: "2026-09-11T09:00:00Z", end_time: "2026-09-11T10:00:00Z" }),
      makeSession({ id: "s2", location: "Room A", speaker_ids: ["sp1"], start_time: "2026-09-11T09:30:00Z", end_time: "2026-09-11T10:30:00Z", title: "Session 2" }),
    ];
    const conflicts = detectConflicts(sessions);
    expect(conflicts).toHaveLength(2);
    const types = conflicts.map(c => c.type).sort();
    expect(types).toEqual(["room", "speaker"]);
  });
});
