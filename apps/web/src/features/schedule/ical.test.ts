import { describe, it, expect } from "vitest";
import { generateSessionIcsUrl, generateSessionIcs } from "./ical";
import type { ICalSession } from "./ical";

const baseSession: ICalSession = {
  id: "sess-001",
  title: "Intro to TypeScript",
  start_time: "2026-09-15T09:00:00Z",
  end_time: "2026-09-15T10:00:00Z",
};

describe("iCal Generation", () => {
  describe("generateSessionIcsUrl", () => {
    it("generates a valid data: URL", () => {
      const url = generateSessionIcsUrl(baseSession);
      expect(url).toMatch(/^data:text\/calendar;charset=utf-8,/);
      const decoded = decodeURIComponent(url.split(",").slice(1).join(","));
      expect(decoded).toContain("BEGIN:VCALENDAR");
      expect(decoded).toContain("END:VCALENDAR");
      expect(decoded).toContain("BEGIN:VEVENT");
      expect(decoded).toContain("SUMMARY:Intro to TypeScript");
    });
  });

  describe("generateSessionIcs", () => {
    it("includes location when provided", () => {
      const session: ICalSession = {
        ...baseSession,
        location: "Room 101",
      };
      const ics = generateSessionIcs(session);
      expect(ics).toContain("LOCATION:Room 101");
    });

    it("omits location when not provided", () => {
      const ics = generateSessionIcs(baseSession);
      expect(ics).not.toContain("LOCATION:");
    });

    it("escapes special characters", () => {
      const session: ICalSession = {
        ...baseSession,
        title: "Hello, World; Test\\n",
        description: "Line 1\nLine 2, and; more",
      };
      const ics = generateSessionIcs(session);
      expect(ics).toContain("SUMMARY:Hello\\, World\\; Test\\\\n");
      expect(ics).toContain("DESCRIPTION:Line 1\\nLine 2\\, and\\; more");
    });

    it("includes proper VCALENDAR structure", () => {
      const ics = generateSessionIcs(baseSession);
      expect(ics).toContain("VERSION:2.0");
      expect(ics).toContain("PRODID:-//Attendly//Events//EN");
      expect(ics).toContain("CALSCALE:GREGORIAN");
      expect(ics).toContain(`UID:${baseSession.id}@attendly`);
    });

    it("formats dates correctly", () => {
      const ics = generateSessionIcs(baseSession);
      expect(ics).toContain("DTSTART:20260915T090000Z");
      expect(ics).toContain("DTEND:20260915T100000Z");
    });

    it("includes description when provided", () => {
      const session: ICalSession = {
        ...baseSession,
        description: "A great session",
      };
      const ics = generateSessionIcs(session);
      expect(ics).toContain("DESCRIPTION:A great session");
    });
  });
});
