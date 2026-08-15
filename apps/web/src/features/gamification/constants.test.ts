import { describe, it, expect } from "vitest";
import { ACTIVITY_LABELS, CHALLENGE_CATEGORIES, CHALLENGE_LINKS } from "./constants";

describe("CHALLENGE_CATEGORIES", () => {
  it("has 4 categories", () => {
    expect(CHALLENGE_CATEGORIES).toHaveLength(4);
  });

  it("covers all 16 activity types", () => {
    const allActivities = CHALLENGE_CATEGORIES.flatMap((c) => c.activities);
    expect(allActivities).toHaveLength(16);
    for (const key of Object.keys(ACTIVITY_LABELS)) {
      expect(allActivities).toContain(key);
    }
  });

  it("has no duplicate activities across categories", () => {
    const allActivities = CHALLENGE_CATEGORIES.flatMap((c) => c.activities);
    expect(new Set(allActivities).size).toBe(allActivities.length);
  });
});

describe("CHALLENGE_LINKS", () => {
  it("has a link for every activity type", () => {
    for (const key of Object.keys(ACTIVITY_LABELS)) {
      expect(CHALLENGE_LINKS[key]).toBeDefined();
    }
  });
});
