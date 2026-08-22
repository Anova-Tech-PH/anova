"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@attendly/ui/components";
import type { OrderRow } from "../queries";
import { RefundDialog } from "./refund-dialog";

const statusStyles: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  refunded: "bg-red-100 text-red-700",
  partially_refunded: "bg-amber-100 text-amber-700",
};

export function OrdersTable({
  orders,
  eventId,
}: {
  orders: OrderRow[];
  eventId: string;
}) {
  const [refundingOrder, setRefundingOrder] = useState<OrderRow | null>(null);
  const pathname = usePathname();
  const basePath = pathname.slice(0, pathname.indexOf(`/events/${eventId}`) + `/events/${eventId}`.length);

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 py-12 text-center text-muted-foreground">
        <p>No orders yet. Orders will appear here when attendees purchase paid tickets.</p>
        <div className="mt-4 flex justify-center gap-3">
          <Link
            href={`${basePath}/tickets`}
            className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            Set up paid tickets
          </Link>
          <Link
            href={`${basePath}/payout`}
            className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            Connect Stripe
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
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
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const canRefund =
                  (order.status === "completed" ||
                    order.status === "partially_refunded") &&
                  order.stripe_payment_intent_id;

                return (
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
                    <td className="px-4 py-3">
                      {canRefund && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRefundingOrder(order)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Refund
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {refundingOrder && (
        <RefundDialog
          orderId={refundingOrder.id}
          eventId={eventId}
          maxRefundable={
            refundingOrder.amount_total - refundingOrder.amount_refunded
          }
          onClose={() => setRefundingOrder(null)}
        />
      )}
    </>
  );
}
