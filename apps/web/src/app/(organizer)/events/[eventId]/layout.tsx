import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@attendly/ui/components";
import { EventSubSidebar } from "./event-sub-sidebar";
import { MobileEventNav } from "./mobile-event-nav";

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

  const groups = [
    {
      label: "Content",
      items: [
        { href: `/events/${eventId}`, label: "Basics", icon: "settings" },
        {
          href: `/events/${eventId}/schedule`,
          label: "Agenda Center",
          icon: "calendar",
          children: [
            { href: `/events/${eventId}/schedule`, label: "Session Manager" },
            { href: `/events/${eventId}/schedule/tracks`, label: "Track Manager" },
            { href: `/events/${eventId}/schedule/conflicts`, label: "Conflict Check" },
            { href: `/events/${eventId}/schedule/qa`, label: "Session Q&A Manager" },
          ],
        },
        { href: `/events/${eventId}/rooms`, label: "Rooms", icon: "door-open" },
        { href: `/events/${eventId}/sponsors`, label: "Sponsor Center", icon: "award" },
        { href: `/events/${eventId}/documents`, label: "Documents & Videos", icon: "file-text" },
        { href: `/events/${eventId}/logistics`, label: "Logistics Center", icon: "clipboard-list" },
      ],
    },
    {
      label: "Registration",
      items: [
        { href: `/events/${eventId}/tickets`, label: "Tickets", icon: "ticket" },
        { href: `/events/${eventId}/custom-fields`, label: "Form Fields", icon: "list-checks" },
        { href: `/events/${eventId}/promo-codes`, label: "Promo Codes", icon: "tag" },
        { href: `/events/${eventId}/registrations`, label: "Registrations", icon: "users" },
        { href: `/events/${eventId}/check-in`, label: "Check-in", icon: "qr-code" },
        { href: `/events/${eventId}/badges`, label: "Badges", icon: "id-card" },
      ],
    },
    {
      label: "Engagement",
      items: [
        { href: `/events/${eventId}/announcements`, label: "Announcements", icon: "megaphone" },
        { href: `/events/${eventId}/qa`, label: "Q&A", icon: "message-circle" },
        { href: `/events/${eventId}/feedback`, label: "Feedback", icon: "message-square" },
        { href: `/events/${eventId}/polls`, label: "Polls", icon: "bar-chart-2" },
        { href: `/events/${eventId}/rsvp`, label: "RSVPs", icon: "calendar-check" },
        { href: `/events/${eventId}/survey`, label: "Survey", icon: "clipboard-list" },
      ],
    },
    {
      label: "Outreach",
      items: [
        { href: `/events/${eventId}/website`, label: "Website", icon: "globe" },
        { href: `/events/${eventId}/emails`, label: "Emails", icon: "mail" },
        { href: `/events/${eventId}/certificates`, label: "Certificates", icon: "award" },
        { href: `/events/${eventId}/marketing`, label: "Marketing", icon: "globe" },
      ],
    },
    {
      label: "Insights",
      items: [
        { href: `/events/${eventId}/analytics`, label: "Analytics", icon: "bar-chart-3" },
        { href: `/events/${eventId}/settings`, label: "Settings", icon: "settings" },
      ],
    },
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
    <div className="flex min-h-[calc(100vh-3.5rem)] -m-4 lg:-m-6">
      {/* Desktop sub-sidebar */}
      <EventSubSidebar eventTitle={event.title} groups={groups} />

      {/* Main content */}
      <div className="flex-1 min-w-0 p-4 lg:p-6">
        {/* Mobile: back link + event header + nav */}
        <div className="mb-6 space-y-3 lg:hidden">
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Events
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{event.title}</h1>
              <Badge variant={statusVariant} className="shrink-0 px-3 py-1">
                {event.status}
              </Badge>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {dateStr}
            </p>
          </div>
          <MobileEventNav groups={groups} />
        </div>

        {/* Desktop: event header */}
        <div className="mb-6 hidden lg:block">
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

        {children}
      </div>
    </div>
  );
}
