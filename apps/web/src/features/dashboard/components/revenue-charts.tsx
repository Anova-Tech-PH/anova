"use client";

import { DollarSign, Ticket, Users, TrendingUp, BarChart3 } from "lucide-react";
import { Card } from "@attendly/ui/components";
import { cn } from "@attendly/ui/cn";

type RevenueData = {
  totalRevenue: number;
  totalPaidRegistrations: number;
  totalFreeRegistrations: number;
  averageTicketPrice: number;
  revenueByType: { name: string; revenue: number; count: number; price: number }[];
  dailyRevenue: { date: string; revenue: number }[];
  hasPaidTickets: boolean;
};

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function RevenueCharts({ data }: { data: RevenueData }) {
  const {
    totalRevenue,
    totalPaidRegistrations,
    totalFreeRegistrations,
    averageTicketPrice,
    revenueByType,
    dailyRevenue,
  } = data;

  const maxTypeRevenue = Math.max(...revenueByType.map((r) => r.revenue), 1);
  const maxDailyRevenue = Math.max(...dailyRevenue.map((d) => d.revenue), 1);

  const summaryCards = [
    {
      label: "Total Revenue",
      value: `$${formatCurrency(totalRevenue)}`,
      icon: DollarSign,
      gradient:
        "from-emerald-50 to-emerald-100/80 dark:from-emerald-900/30 dark:to-emerald-800/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Paid Registrations",
      value: totalPaidRegistrations,
      icon: Ticket,
      gradient:
        "from-blue-50 to-blue-100/80 dark:from-blue-900/30 dark:to-blue-800/20",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Free Registrations",
      value: totalFreeRegistrations,
      icon: Users,
      gradient:
        "from-slate-50 to-slate-100/80 dark:from-slate-900/40 dark:to-slate-800/30",
      iconColor: "text-slate-600 dark:text-slate-400",
    },
    {
      label: "Avg. Ticket Price",
      value: `$${formatCurrency(averageTicketPrice)}`,
      icon: TrendingUp,
      gradient:
        "from-amber-50 to-amber-100/80 dark:from-amber-900/30 dark:to-amber-800/20",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((s) => (
          <Card
            key={s.label}
            className={cn(
              "relative overflow-hidden border p-5 bg-gradient-to-br",
              s.gradient
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums">
                  {s.value}
                </p>
              </div>
              <div
                className={cn(
                  "rounded-lg bg-white/60 p-2 dark:bg-white/10",
                  s.iconColor
                )}
              >
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Revenue by Ticket Type */}
      {revenueByType.length > 0 && (
        <Card className="overflow-hidden border shadow-sm">
          <div className="flex items-center gap-2 border-b bg-muted/30 px-6 py-4">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Revenue by Ticket Type</h3>
          </div>
          <div className="space-y-4 p-6">
            {revenueByType.map((item) => (
              <div key={item.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.name}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {item.count} sold &middot; ${formatCurrency(item.revenue)}
                  </span>
                </div>
                <div className="h-6 w-full overflow-hidden rounded bg-muted/40">
                  <div
                    className="flex h-full items-center rounded px-2 text-xs font-medium text-white transition-all duration-500"
                    style={{
                      width: `${Math.max((item.revenue / maxTypeRevenue) * 100, 4)}%`,
                      backgroundColor: "oklch(0.445 0.107 195)",
                    }}
                  >
                    {(item.revenue / maxTypeRevenue) * 100 > 15
                      ? `$${formatCurrency(item.revenue)}`
                      : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Daily Revenue Trend */}
      {dailyRevenue.length > 0 && (
        <Card className="overflow-hidden border shadow-sm">
          <div className="flex items-center gap-2 border-b bg-muted/30 px-6 py-4">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Daily Revenue Trend</h3>
          </div>
          <div className="p-6">
            <div className="flex items-end gap-1" style={{ height: "200px" }}>
              {dailyRevenue.map((day) => (
                <div
                  key={day.date}
                  className="group relative flex flex-1 flex-col items-center justify-end"
                  style={{ height: "100%" }}
                >
                  {/* Tooltip on hover */}
                  <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 rounded bg-foreground px-2 py-1 text-xs text-background shadow group-hover:block">
                    ${formatCurrency(day.revenue)}
                  </div>
                  {/* Bar */}
                  <div
                    className="w-full min-w-[8px] rounded-t transition-all duration-300 hover:opacity-80"
                    style={{
                      height: `${Math.max((day.revenue / maxDailyRevenue) * 100, 2)}%`,
                      backgroundColor: "oklch(0.445 0.107 195)",
                    }}
                  />
                  {/* Date label */}
                  <span className="mt-2 text-[10px] text-muted-foreground [writing-mode:vertical-lr] rotate-180">
                    {new Date(day.date + "T00:00:00").toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                      }
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
