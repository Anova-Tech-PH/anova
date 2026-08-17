"use client";

import type { OrderRow } from "../queries";

const statusStyles: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  refunded: "bg-red-100 text-red-700",
  partially_refunded: "bg-amber-100 text-amber-700",
};

export function OrdersTable({ orders }: { orders: OrderRow[] }) {
  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 py-12 text-center text-muted-foreground">
        No orders yet. Orders will appear here when attendees purchase paid
        tickets.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left font-medium">Attendee</th>
              <th className="px-4 py-3 text-left font-medium">Ticket</th>
              <th className="px-4 py-3 text-left font-medium">Amount</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="border-b last:border-b-0 hover:bg-muted/20"
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{order.customer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.customer_email}
                  </p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {order.ticket_name}
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium">
                    ${(order.amount_total / 100).toFixed(2)}
                  </span>
                  {order.amount_refunded > 0 && (
                    <span className="ml-1 text-xs text-red-600">
                      (-${(order.amount_refunded / 100).toFixed(2)})
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[order.status] ?? "bg-gray-100 text-gray-700"}`}
                  >
                    {order.status.replaceAll("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
