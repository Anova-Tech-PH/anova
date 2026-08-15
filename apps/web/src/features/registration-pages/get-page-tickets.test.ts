import { describe, it, expect } from "vitest";
import { filterTicketsByRegistrationPage } from "./filter-tickets";

describe("filterTicketsByRegistrationPage — registration page route integration", () => {
  const tickets = [
    { id: "aaa", name: "General", price: 0, sold: 5, available: 95 },
    { id: "bbb", name: "VIP", price: 200, sold: 2, available: 8 },
    { id: "ccc", name: "Student", price: 25, sold: 0, available: 50 },
  ];

  it("filters tickets when page has specific ticket_type_ids", () => {
    const page = { ticket_type_ids: ["aaa", "ccc"] };
    const result = filterTicketsByRegistrationPage(tickets, page.ticket_type_ids);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("General");
    expect(result[1].name).toBe("Student");
  });

  it("returns all tickets when page has empty ticket_type_ids", () => {
    const page = { ticket_type_ids: [] as string[] };
    const result = filterTicketsByRegistrationPage(tickets, page.ticket_type_ids);
    expect(result).toHaveLength(3);
  });

  it("preserves sold/available metadata through filtering", () => {
    const page = { ticket_type_ids: ["bbb"] };
    const result = filterTicketsByRegistrationPage(tickets, page.ticket_type_ids);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: "bbb", name: "VIP", price: 200, sold: 2, available: 8 });
  });
});
