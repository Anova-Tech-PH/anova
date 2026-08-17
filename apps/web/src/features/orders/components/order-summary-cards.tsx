export function OrderSummaryCards({
  summary,
}: {
  summary: {
    gross: number;
    net: number;
    refunded: number;
    totalSold: number;
    totalRefunded: number;
  };
}) {
  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div className="rounded-xl border p-4">
        <p className="text-sm text-muted-foreground">Gross Sales</p>
        <p className="text-2xl font-semibold">{fmt(summary.gross)}</p>
      </div>
      <div className="rounded-xl border p-4">
        <p className="text-sm text-muted-foreground">Net Sales</p>
        <p className="text-2xl font-semibold">{fmt(summary.net)}</p>
      </div>
      <div className="rounded-xl border p-4">
        <p className="text-sm text-muted-foreground">Tickets Sold</p>
        <p className="text-2xl font-semibold">{summary.totalSold}</p>
      </div>
      <div className="rounded-xl border p-4">
        <p className="text-sm text-muted-foreground">Refunded</p>
        <p className="text-2xl font-semibold">{summary.totalRefunded}</p>
      </div>
    </div>
  );
}
