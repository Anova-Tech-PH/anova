import { describe, it, expect } from "vitest";
import { filterTicketsByRegistrationPage } from "./filter-tickets";

const allTickets = [
  { id: "t1", name: "General Admission", price: 0 },
  { id: "t2", name: "VIP", price: 100 },
  { id: "t3", name: "Student", price: 25 },
];

describe("filterTicketsByRegistrationPage", () => {
  it("returns only tickets matching the page ticket_type_ids", () => {
    const result = filterTicketsByRegistrationPage(allTickets, ["t1", "t3"]);
    expect(result).toEqual([
      { id: "t1", name: "General Admission", price: 0 },
      { id: "t3", name: "Student", price: 25 },
    ]);
  });

  it("returns all tickets when ticket_type_ids is empty", () => {
    const result = filterTicketsByRegistrationPage(allTickets, []);
    expect(result).toEqual(allTickets);
  });

  it("returns all tickets when ticket_type_ids is undefined", () => {
    const result = filterTicketsByRegistrationPage(allTickets, undefined);
    expect(result).toEqual(allTickets);
  });

  it("preserves original ticket order", () => {
    const result = filterTicketsByRegistrationPage(allTickets, ["t3", "t1"]);
    expect(result.map((t) => t.id)).toEqual(["t1", "t3"]);
  });

  it("ignores ticket_type_ids that do not exist in tickets", () => {
    const result = filterTicketsByRegistrationPage(allTickets, ["t1", "nonexistent"]);
    expect(result).toEqual([{ id: "t1", name: "General Admission", price: 0 }]);
  });
});
