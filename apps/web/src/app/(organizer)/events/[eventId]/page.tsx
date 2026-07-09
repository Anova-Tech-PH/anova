import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Users, QrCode, BarChart3, Settings, Mic } from "lucide-react";
import { createClient } from "@/shared/utils/supabase/server";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  const tabs = [
    { href: `/events/${eventId}/schedule`, label: "Schedule", icon: Calendar },
    { href: `/events/${eventId}/tickets`, label: "Tickets", icon: Mic },
    { href: `/events/${eventId}/registrations`, label: "Registrations", icon: Users },
    { href: `/events/${eventId}/check-in`, label: "Check-in", icon: QrCode },
    { href: `/events/${eventId}/analytics`, label: "Analytics", icon: BarChart3 },
    { href: `/events/${eventId}/settings`, label: "Settings", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{event.title}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(event.start_date).toLocaleDateString()} -{" "}
            {new Date(event.end_date).toLocaleDateString()}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
            event.status === "published"
              ? "bg-green-100 text-green-700"
              : event.status === "draft"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-gray-100 text-gray-700"
          }`}
        >
          {event.status}
        </span>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-4 py-2.5 text-sm text-muted-foreground hover:border-border hover:text-foreground"
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Link>
        ))}
      </nav>

      {event.description && (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="mb-2 font-medium">About</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {event.description}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Venue</p>
          <p className="mt-1 font-medium">
            {event.is_virtual
              ? "Virtual Event"
              : event.venue_name || "Not set"}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Timezone</p>
          <p className="mt-1 font-medium">{event.timezone}</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Slug</p>
          <p className="mt-1 font-medium">{event.slug}</p>
        </div>
      </div>
    </div>
  );
}
