import { describe, it, expect } from "vitest";
import { renderFrameOnPhoto, type FrameConfig } from "./render-frame";

describe("renderFrameOnPhoto", () => {
  it("returns original blob when frame is null", async () => {
    const blob = new Blob(["test"], { type: "image/jpeg" });
    const result = await renderFrameOnPhoto(blob, null);
    expect(result).toBe(blob);
  });

  it("exports FrameConfig type", () => {
    const config: FrameConfig = {
      template: "banner_top",
      message: "Test",
      color: "#FF0000",
    };
    expect(config.template).toBe("banner_top");
  });
});
