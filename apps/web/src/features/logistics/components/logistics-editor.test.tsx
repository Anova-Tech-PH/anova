import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../actions", () => ({
  createLogisticsItem: vi.fn().mockResolvedValue({
    id: "new-1",
    event_id: "evt-1",
    template: "parking",
    title: "Parking",
    content: "",
    sort_order: 0,
  }),
  updateLogisticsItem: vi.fn().mockResolvedValue(undefined),
  deleteLogisticsItem: vi.fn().mockResolvedValue(undefined),
  reorderLogisticsItems: vi.fn().mockResolvedValue(undefined),
}));

const { LogisticsEditor } = await import("./logistics-editor");

const items = [
  {
    id: "item-1",
    event_id: "evt-1",
    template: "parking" as const,
    title: "Parking Info",
    content: "Free parking at Lot A",
    sort_order: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

describe("LogisticsEditor", () => {
  it("renders existing items", () => {
    render(<LogisticsEditor eventId="evt-1" items={items} />);
    expect(screen.getByDisplayValue("Parking Info")).toBeDefined();
  });

  it("shows empty state when no items", () => {
    render(<LogisticsEditor eventId="evt-1" items={[]} />);
    expect(screen.getByText(/No logistics items yet/)).toBeDefined();
  });

  it("renders Add Item button", () => {
    render(<LogisticsEditor eventId="evt-1" items={[]} />);
    expect(screen.getByText("Add Item")).toBeDefined();
  });
});
