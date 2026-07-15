import Link from "next/link";
import { ArrowLeft, Calendar, Users, QrCode, BarChart3, Settings, Mic, DoorOpen, Mail } from "lucide-react";
import { createClient } from "@/shared/utils/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@/shared/components/ui";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("title, start_date, end_date, status")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  const tabs = [
    { href: `/events/${eventId}`, label: "Overview", icon: BarChart3 },
    { href: `/events/${eventId}/schedule`, label: "Schedule", icon: Calendar },
    { href: `/events/${eventId}/tickets`, label: "Tickets", icon: Mic },
    { href: `/events/${eventId}/registrations`, label: "Registrations", icon: Users },
    { href: `/events/${eventId}/check-in`, label: "Check-in", icon: QrCode },
    { href: `/events/${eventId}/rooms`, label: "Rooms", icon: DoorOpen },
    { href: `/events/${eventId}/emails`, label: "Emails", icon: Mail },
    { href: `/events/${eventId}/analytics`, label: "Analytics", icon: BarChart3 },
    { href: `/events/${eventId}/settings`, label: "Settings", icon: Settings },
  ];

  return (
    <div className="space-y-4">
      <Link
        href="/events"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </Link>

      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{event.title}</h1>
            <p className="text-sm text-muted-foreground">
              {new Date(event.start_date).toLocaleDateString()} -{" "}
              {new Date(event.end_date).toLocaleDateString()}
            </p>
          </div>
          <Badge
            variant={
              event.status === "published"
                ? "success"
                : event.status === "draft"
                  ? "warning"
                  : "default"
            }
            className="px-3 py-1"
          >
            {event.status}
          </Badge>
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
      </div>

      {children}
    </div>
  );
}
