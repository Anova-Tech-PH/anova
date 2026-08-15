export function filterTicketsByRegistrationPage<T extends { id: string }>(
  tickets: T[],
  ticketTypeIds: string[] | undefined,
): T[] {
  if (!ticketTypeIds || ticketTypeIds.length === 0) return tickets;
  const idSet = new Set(ticketTypeIds);
  return tickets.filter((t) => idSet.has(t.id));
}
