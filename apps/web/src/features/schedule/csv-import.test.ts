import { describe, it, expect } from "vitest";
import { parseSessionsCSV, type ParsedSession } from "./csv-import";

describe("parseSessionsCSV", () => {
  it("parses CSV into session objects with speaker names split by semicolon", () => {
    const csv = [
      "title,description,type,track,start_time,end_time,location,speakers",
      "Intro to TS,Learn basics,talk,Frontend,2026-09-15T09:00:00Z,2026-09-15T10:00:00Z,Room 101,Alice Smith;Bob Jones",
    ].join("\n");

    const result = parseSessionsCSV(csv);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      title: "Intro to TS",
      description: "Learn basics",
      type: "talk",
      trackNames: ["Frontend"],
      start_time: "2026-09-15T09:00:00Z",
      end_time: "2026-09-15T10:00:00Z",
      location: "Room 101",
      speakerNames: ["Alice Smith", "Bob Jones"],
    });
  });

  it("handles missing optional columns — defaults type to talk, empty speakers", () => {
    const csv = [
      "title,start_time,end_time",
      "My Session,2026-09-15T09:00:00Z,2026-09-15T10:00:00Z",
    ].join("\n");

    const result = parseSessionsCSV(csv);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("talk");
    expect(result[0].speakerNames).toEqual([]);
    expect(result[0].description).toBe("");
    expect(result[0].trackNames).toEqual([]);
    expect(result[0].location).toBe("");
  });

  it("skips rows without title", () => {
    const csv = [
      "title,description,type,track,start_time,end_time,location,speakers",
      ",Some desc,talk,Frontend,2026-09-15T09:00:00Z,2026-09-15T10:00:00Z,Room 101,Alice",
      "Valid Title,desc,talk,Frontend,2026-09-15T11:00:00Z,2026-09-15T12:00:00Z,Room 102,",
    ].join("\n");

    const result = parseSessionsCSV(csv);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Valid Title");
  });

  it("deduplicates by title + start_time", () => {
    const csv = [
      "title,description,type,track,start_time,end_time,location,speakers",
      "Talk A,First,talk,,2026-09-15T09:00:00Z,2026-09-15T10:00:00Z,,",
      "Talk A,Duplicate,workshop,,2026-09-15T09:00:00Z,2026-09-15T10:00:00Z,,",
      "Talk A,Different time,talk,,2026-09-15T11:00:00Z,2026-09-15T12:00:00Z,,",
    ].join("\n");

    const result = parseSessionsCSV(csv);

    expect(result).toHaveLength(2);
    expect(result[0].description).toBe("First");
    expect(result[1].start_time).toBe("2026-09-15T11:00:00Z");
  });

  it("validates type against allowed values, defaults to talk", () => {
    const csv = [
      "title,type,start_time,end_time",
      "S1,keynote,2026-09-15T09:00:00Z,2026-09-15T10:00:00Z",
      "S2,invalid_type,2026-09-15T11:00:00Z,2026-09-15T12:00:00Z",
      "S3,workshop,2026-09-15T13:00:00Z,2026-09-15T14:00:00Z",
    ].join("\n");

    const result = parseSessionsCSV(csv);

    expect(result[0].type).toBe("keynote");
    expect(result[1].type).toBe("talk"); // invalid -> default
    expect(result[2].type).toBe("workshop");
  });

  it("handles quoted fields with commas", () => {
    const csv = [
      "title,description,type,track,start_time,end_time,location,speakers",
      '"Advanced, Complex",desc,talk,Frontend,2026-09-15T09:00:00Z,2026-09-15T10:00:00Z,Room 101,Alice',
    ].join("\n");

    const result = parseSessionsCSV(csv);

    expect(result[0].title).toBe("Advanced, Complex");
  });

  it("parses semicolon-separated tracks", () => {
    const csv = [
      "title,track,start_time,end_time",
      "Session A,AI;Leadership,2026-01-01T10:00,2026-01-01T11:00",
    ].join("\n");

    const result = parseSessionsCSV(csv);
    expect(result[0].trackNames).toEqual(["AI", "Leadership"]);
  });

  it("handles empty track as empty array", () => {
    const csv = [
      "title,track,start_time,end_time",
      "Session A,,2026-01-01T10:00,2026-01-01T11:00",
    ].join("\n");

    const result = parseSessionsCSV(csv);
    expect(result[0].trackNames).toEqual([]);
  });

  it("trims whitespace around semicolon-separated tracks", () => {
    const csv = [
      "title,track,start_time,end_time",
      "Session A, AI ; Leadership ; DevOps ,2026-01-01T10:00,2026-01-01T11:00",
    ].join("\n");

    const result = parseSessionsCSV(csv);
    expect(result[0].trackNames).toEqual(["AI", "Leadership", "DevOps"]);
  });
});
