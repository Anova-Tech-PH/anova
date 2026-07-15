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
import {
  Users,
  CheckCircle,
  UserCheck,
  TrendingUp,
  DollarSign,
  BarChart3,
  Activity,
} from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { cn } from "@/shared/utils/cn";

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

  const statCards = [
    {
      label: "Total Registrations",
      value: stats.total,
      icon: Users,
      gradient: "from-slate-50 to-slate-100/80 dark:from-slate-900/40 dark:to-slate-800/30",
      iconColor: "text-slate-600 dark:text-slate-400",
    },
    {
      label: "Confirmed",
      value: stats.confirmed,
      icon: CheckCircle,
      gradient: "from-emerald-50 to-emerald-100/80 dark:from-emerald-900/30 dark:to-emerald-800/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Checked In",
      value: stats.checkedIn,
      icon: UserCheck,
      gradient: "from-blue-50 to-blue-100/80 dark:from-blue-900/30 dark:to-blue-800/20",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Check-in Rate",
      value: `${stats.checkInRate}%`,
      icon: TrendingUp,
      gradient: "from-violet-50 to-violet-100/80 dark:from-violet-900/30 dark:to-violet-800/20",
      iconColor: "text-violet-600 dark:text-violet-400",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stats cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
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
                <p className="mt-2 text-3xl font-bold tabular-nums">{s.value}</p>
              </div>
              <div className={cn("rounded-lg bg-white/60 p-2 dark:bg-white/10", s.iconColor)}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Revenue card - visually distinct */}
      {stats.totalRevenue > 0 && (
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-emerald-100">
                Total Revenue
              </p>
              <p className="mt-2 text-4xl font-bold tabular-nums">
                ${stats.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-sm text-emerald-200">
                From {stats.active} active registration{stats.active !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="rounded-xl bg-white/15 p-3">
              <DollarSign className="h-8 w-8" />
            </div>
          </div>
          {/* Decorative circles */}
          <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/5" />
        </Card>
      )}

      {/* Registration timeline */}
      {timeSeries.length > 0 && (
        <Card className="overflow-hidden border shadow-sm">
          <div className="flex items-center gap-2 border-b bg-muted/30 px-6 py-4">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Registrations Over Time</h3>
          </div>
          <div className="p-6">
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
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke={CHART_COLORS.primary}
                  fill={CHART_COLORS.primaryLight}
                  name="Total"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="registrations"
                  stroke={CHART_COLORS.secondary}
                  fill={CHART_COLORS.secondaryLight}
                  name="Daily"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Ticket breakdown */}
      {ticketBreakdown.length > 0 && (
        <Card className="overflow-hidden border shadow-sm">
          <div className="flex items-center gap-2 border-b bg-muted/30 px-6 py-4">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Ticket Breakdown</h3>
          </div>
          <div className="p-6">
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
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  }}
                />
                <Bar dataKey="count" fill={CHART_COLORS.primary} name="Registrations" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Check-in progress */}
      <Card className="overflow-hidden border shadow-sm">
        <div className="flex items-center gap-2 border-b bg-muted/30 px-6 py-4">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">Check-in Progress</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-4xl font-bold tabular-nums">{stats.checkInRate}%</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stats.checkedIn} of {stats.active} attendees checked in
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                <UserCheck className="h-6 w-6" />
              </div>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-muted/60">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-1000 ease-out"
                style={{ width: `${stats.checkInRate}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
            {stats.cancelled > 0 && (
              <p className="text-sm text-muted-foreground">
                {stats.cancelled} cancelled registration{stats.cancelled !== 1 ? "s" : ""} not included
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
