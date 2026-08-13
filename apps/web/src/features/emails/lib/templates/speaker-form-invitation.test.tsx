import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SpeakerFormInvitation } from "./speaker-form-invitation";

describe("SpeakerFormInvitation", () => {
  it("renders speaker name and event name", () => {
    const html = renderToStaticMarkup(
      <SpeakerFormInvitation
        speakerName="Alice"
        eventName="Tech Conf 2025"
        formLink="https://example.com/speakers/form/abc123"
        bodyText="Please fill out your profile."
      />
    );

    expect(html).toContain("Alice");
    expect(html).toContain("Tech Conf 2025");
    expect(html).toContain("https://example.com/speakers/form/abc123");
    expect(html).toContain("Please fill out your profile");
  });

  it("renders CTA button with form link", () => {
    const html = renderToStaticMarkup(
      <SpeakerFormInvitation
        speakerName="Bob"
        eventName="Summit"
        formLink="https://example.com/form/xyz"
        bodyText=""
      />
    );

    expect(html).toContain("Complete Your Speaker Profile");
    expect(html).toContain("https://example.com/form/xyz");
  });

  it("renders as HTML string via renderToStaticMarkup", () => {
    const html = renderToStaticMarkup(
      <SpeakerFormInvitation
        speakerName="Bob"
        eventName="Summit"
        formLink="https://example.com/form/xyz"
        bodyText="Hello"
      />
    );

    expect(typeof html).toBe("string");
    expect(html).toContain("Bob");
  });
});
