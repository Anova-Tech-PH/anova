import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NoteCard } from "./note-button";

vi.mock("../actions", () => ({
  saveNote: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/shared/components/rich-text-editor", () => ({
  RichTextEditor: ({ placeholder }: { placeholder: string }) => (
    <div data-testid="rich-text-editor">{placeholder}</div>
  ),
}));

describe("NoteCard", () => {
  it("starts in edit mode with the editor visible", () => {
    render(<NoteCard sessionId="s1" />);
    expect(screen.getByTestId("rich-text-editor")).toBeInTheDocument();
  });

  it("starts in edit mode even when there is existing content", () => {
    render(<NoteCard sessionId="s1" initialContent="<p>My notes</p>" />);
    expect(screen.getByTestId("rich-text-editor")).toBeInTheDocument();
  });
});
