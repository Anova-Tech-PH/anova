import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarkdownTextarea } from "./markdown-toolbar";

describe("MarkdownTextarea", () => {
  it("renders textarea with toolbar buttons", () => {
    render(
      <MarkdownTextarea value="" onChange={vi.fn()} placeholder="Write here..." />
    );

    expect(screen.getByPlaceholderText("Write here...")).toBeDefined();
    expect(screen.getByLabelText("Bold")).toBeDefined();
    expect(screen.getByLabelText("Italic")).toBeDefined();
    expect(screen.getByLabelText("Link")).toBeDefined();
    expect(screen.getByLabelText("List")).toBeDefined();
  });

  it("calls onChange when typing", () => {
    const onChange = vi.fn();
    render(
      <MarkdownTextarea value="" onChange={onChange} placeholder="Write..." />
    );

    fireEvent.change(screen.getByPlaceholderText("Write..."), {
      target: { value: "Hello" },
    });
    expect(onChange).toHaveBeenCalledWith("Hello");
  });
});
