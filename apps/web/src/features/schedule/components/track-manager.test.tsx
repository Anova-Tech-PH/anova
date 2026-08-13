import { describe, it, expect } from "vitest";

describe("TrackManager", () => {
  it("validates hex color format", () => {
    const validHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
    expect(validHex.test("#ff0000")).toBe(true);
    expect(validHex.test("#FFF")).toBe(true);
    expect(validHex.test("#abc")).toBe(true);
    expect(validHex.test("ff0000")).toBe(false);
    expect(validHex.test("#gg0000")).toBe(false);
    expect(validHex.test("#ff")).toBe(false);
    expect(validHex.test("")).toBe(false);
  });
});
