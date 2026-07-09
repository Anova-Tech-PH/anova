import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar, Users, TrendingUp, ScanLine, ArrowRight } from "lucide-react";
import { createClient } from "@/shared/utils/supabase/server";
import { getDashboardStats } from "@/features/dashboard/queries";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const stats = await getDashboardStats(user.id);

  const statCards = [
    { label: "Total Events", value: stats.totalEvents, icon: Calendar },
    { label: "Total Registrations", value: stats.totalRegistrations, icon: Users },
    { label: "Upcoming Events", value: stats.upcomingEvents, icon: TrendingUp },
    { label: "Check-in Rate", value: `${stats.checkInRate}%`, icon: ScanLine },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back{user.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-3xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent events */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Events</h2>
          <Link
            href="/events"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {stats.recentEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
            No events yet.{" "}
            <Link href="/events/new" className="text-primary underline">
              Create your first event
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Event</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-right font-medium">Registrations</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentEvents.map((event) => (
                  <tr key={event.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/events/${event.id}`} className="font-medium hover:underline">
                        {event.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          event.status === "published"
                            ? "bg-green-100 text-green-700"
                            : event.status === "draft"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {event.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(event.start_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {event.registrations_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
