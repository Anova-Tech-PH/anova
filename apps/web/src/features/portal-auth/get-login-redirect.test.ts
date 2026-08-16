import { describe, it, expect } from "vitest";
import { getPortalLoginUrl } from "./get-login-redirect";

describe("getPortalLoginUrl", () => {
  it("builds login URL with redirect to the current portal path", () => {
    const url = getPortalLoginUrl("/test-org/my-event/schedule");
    expect(url).toBe("/login?redirect=%2Ftest-org%2Fmy-event%2Fschedule");
  });

  it("encodes special characters in the path", () => {
    const url = getPortalLoginUrl("/org/event?tab=1&view=grid");
    expect(url).toBe("/login?redirect=%2Forg%2Fevent%3Ftab%3D1%26view%3Dgrid");
  });

  it("handles root portal path", () => {
    const url = getPortalLoginUrl("/org/event");
    expect(url).toBe("/login?redirect=%2Forg%2Fevent");
  });
});
