import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@attendly/ui/components";
import { MobileTabSelect } from "./mobile-tab-select";
import { DesktopTabs } from "./desktop-tabs";

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
    { href: `/events/${eventId}`, label: "Overview", icon: "bar-chart-3" as const },
    { href: `/events/${eventId}/schedule`, label: "Schedule", icon: "calendar" as const },
    { href: `/events/${eventId}/tickets`, label: "Tickets", icon: "ticket" as const },
    { href: `/events/${eventId}/custom-fields`, label: "Form Fields", icon: "list-checks" as const },
    { href: `/events/${eventId}/promo-codes`, label: "Promo Codes", icon: "tag" as const },
    { href: `/events/${eventId}/registrations`, label: "Registrations", icon: "users" as const },
    { href: `/events/${eventId}/check-in`, label: "Check-in", icon: "qr-code" as const },
    { href: `/events/${eventId}/badges`, label: "Badges", icon: "id-card" as const },
    { href: `/events/${eventId}/rooms`, label: "Rooms", icon: "door-open" as const },
    { href: `/events/${eventId}/announcements`, label: "Announcements", icon: "megaphone" as const },
    { href: `/events/${eventId}/feedback`, label: "Feedback", icon: "message-square" as const },
    { href: `/events/${eventId}/polls`, label: "Polls", icon: "bar-chart-2" as const },
    { href: `/events/${eventId}/rsvp`, label: "RSVPs", icon: "calendar-check" as const },
    { href: `/events/${eventId}/emails`, label: "Emails", icon: "mail" as const },
    { href: `/events/${eventId}/survey`, label: "Survey", icon: "clipboard-list" as const },
    { href: `/events/${eventId}/certificates`, label: "Certificates", icon: "award" as const },
    { href: `/events/${eventId}/analytics`, label: "Analytics", icon: "bar-chart-3" as const },
    { href: `/events/${eventId}/settings`, label: "Settings", icon: "settings" as const },
  ];

  const statusVariant = event.status === "published"
    ? "success"
    : event.status === "draft"
      ? "warning"
      : event.status === "cancelled"
        ? "destructive"
        : "info";

  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);
  const dateStr = startDate.toDateString() === endDate.toDateString()
    ? startDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div className="space-y-6">
      <Link
        href="/events"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </Link>

      <div className="space-y-4">
        {/* Event header */}
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-xl font-semibold sm:text-2xl">{event.title}</h1>
            <Badge variant={statusVariant} className="shrink-0 px-3 py-1">
              {event.status}
            </Badge>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {dateStr}
          </p>
        </div>

        {/* Mobile: dropdown select */}
        <MobileTabSelect tabs={tabs.map((t) => ({ href: t.href, label: t.label }))} />

        {/* Desktop: horizontal tabs */}
        <DesktopTabs tabs={tabs} />
      </div>

      <div className="pt-2">{children}</div>
    </div>
  );
}
