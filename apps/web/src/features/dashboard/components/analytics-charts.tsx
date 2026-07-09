"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type AnalyticsData = {
  stats: {
    total: number;
    confirmed: number;
    checkedIn: number;
    cancelled: number;
    active: number;
    checkInRate: number;
    totalRevenue: number;
  };
  timeSeries: { date: string; registrations: number; cumulative: number }[];
  ticketBreakdown: { name: string; count: number; revenue: number }[];
};

export function AnalyticsCharts({ data }: { data: AnalyticsData }) {
  const { stats, timeSeries, ticketBreakdown } = data;

  return (
    <div className="space-y-8">
      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Registrations", value: stats.total },
          { label: "Confirmed", value: stats.confirmed },
          { label: "Checked In", value: stats.checkedIn },
          { label: "Check-in Rate", value: `${stats.checkInRate}%` },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      {stats.totalRevenue > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="mt-1 text-2xl font-semibold">
            ${stats.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
      )}

      {/* Registration timeline */}
      {timeSeries.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="mb-4 font-semibold">Registrations Over Time</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={timeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary) / 0.1)"
                name="Total"
              />
              <Area
                type="monotone"
                dataKey="registrations"
                stroke="hsl(var(--chart-2))"
                fill="hsl(var(--chart-2) / 0.1)"
                name="Daily"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Ticket breakdown */}
      {ticketBreakdown.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="mb-4 font-semibold">Ticket Breakdown</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ticketBreakdown} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" name="Registrations" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Check-in progress */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">Check-in Progress</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {stats.checkedIn} of {stats.active} attendees checked in
            </span>
            <span className="font-semibold">{stats.checkInRate}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${stats.checkInRate}%` }}
            />
          </div>
          {stats.cancelled > 0 && (
            <p className="text-xs text-muted-foreground">
              {stats.cancelled} cancelled registration{stats.cancelled !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
