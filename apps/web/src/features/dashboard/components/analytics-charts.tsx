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
import { Card } from "@/shared/components/ui/card";

// Recharts requires hex/rgb colors — oklch CSS vars won't work
const CHART_COLORS = {
  primary: "#1a7a7a",
  primaryLight: "#1a7a7a1a",
  secondary: "#3d9e8e",
  secondaryLight: "#3d9e8e1a",
  border: "#e5e2dd",
  muted: "#868078",
  cardBg: "#fdfdfc",
};

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
          <Card key={s.label} className="p-5">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </Card>
        ))}
      </div>

      {stats.totalRevenue > 0 && (
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="mt-1 text-2xl font-semibold">
            ${stats.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </Card>
      )}

      {/* Registration timeline */}
      {timeSeries.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-4 font-semibold">Registrations Over Time</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={timeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.border} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke={CHART_COLORS.muted} />
              <YAxis tick={{ fontSize: 12 }} stroke={CHART_COLORS.muted} />
              <Tooltip
                contentStyle={{
                  backgroundColor: CHART_COLORS.cardBg,
                  border: `1px solid ${CHART_COLORS.border}`,
                  borderRadius: "0.5rem",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke={CHART_COLORS.primary}
                fill={CHART_COLORS.primaryLight}
                name="Total"
              />
              <Area
                type="monotone"
                dataKey="registrations"
                stroke={CHART_COLORS.secondary}
                fill={CHART_COLORS.secondaryLight}
                name="Daily"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Ticket breakdown */}
      {ticketBreakdown.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-4 font-semibold">Ticket Breakdown</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ticketBreakdown} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.border} />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke={CHART_COLORS.muted} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} stroke={CHART_COLORS.muted} />
              <Tooltip
                contentStyle={{
                  backgroundColor: CHART_COLORS.cardBg,
                  border: `1px solid ${CHART_COLORS.border}`,
                  borderRadius: "0.5rem",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" fill={CHART_COLORS.primary} name="Registrations" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Check-in progress */}
      <Card className="p-6">
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
      </Card>
    </div>
  );
}
