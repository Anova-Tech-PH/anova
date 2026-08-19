import { getOrders, getOrderSummary } from "@/features/orders/queries";
import { OrdersTable } from "@/features/orders/components/orders-table";
import { OrderSummaryCards } from "@/features/orders/components/order-summary-cards";

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [orders, summary] = await Promise.all([
    getOrders(eventId),
    getOrderSummary(eventId),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Orders & Transactions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          View and manage all ticket purchases for this event.
        </p>
      </div>
      <OrderSummaryCards summary={summary} />
      <OrdersTable orders={orders} eventId={eventId} />
    </div>
  );
}
