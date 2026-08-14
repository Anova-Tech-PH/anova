import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@attendly/ui/components";
import { EventSubSidebar } from "./event-sub-sidebar";
import { MobileEventNav } from "./mobile-event-nav";
import { EventTopTabs } from "./event-top-tabs";
import { EventNavProvider } from "./event-nav-context";

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
      icon: "layout-grid" as const,
      firstHref: `/events/${eventId}`,
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
        {
          href: `/events/${eventId}/speakers`,
          label: "Speaker Center",
          icon: "mic",
          children: [
            { href: `/events/${eventId}/speakers`, label: "Speaker Manager" },
            { href: `/events/${eventId}/speakers/message`, label: "Message Speakers" },
            { href: `/events/${eventId}/speakers/meetings`, label: "Speaker 1-1 Meetings" },
            { href: `/events/${eventId}/speakers/consent-forms`, label: "Release & Consent Forms" },
            { href: `/events/${eventId}/speakers/settings`, label: "Settings" },
          ],
        },
        // { href: `/events/${eventId}/rooms`, label: "Rooms", icon: "door-open" },
        {
          href: `/events/${eventId}/sponsors`,
          label: "Sponsor Center",
          icon: "award",
          children: [
            { href: `/events/${eventId}/sponsors`, label: "Sponsor Manager" },
            { href: `/events/${eventId}/sponsors/message`, label: "Message Sponsors" },
            { href: `/events/${eventId}/sponsors/leads`, label: "Lead Retrieval" },
          ],
        },
        {
          href: `/events/${eventId}/documents`,
          label: "Documents & Videos",
          icon: "file-text",
          children: [
            { href: `/events/${eventId}/documents`, label: "Documents" },
            { href: `/events/${eventId}/documents/video-hosting`, label: "Video Hosting" },
            { href: `/events/${eventId}/documents/attendee-video-access`, label: "Attendee Video Access" },
          ],
        },
        { href: `/events/${eventId}/logistics`, label: "Logistics Center", icon: "clipboard-list" },
      ],
    },
    {
      label: "Attendees",
      icon: "users" as const,
      firstHref: `/events/${eventId}/registrations`,
      items: [
        {
          href: `/events/${eventId}/registrations`,
          label: "Manage Attendees",
          icon: "users",
          children: [
            { href: `/events/${eventId}/registrations`, label: "Attendees" },
            { href: `/events/${eventId}/attendee-limit`, label: "Attendee Limit Upgrade" },
            { href: `/events/${eventId}/attendee-categories`, label: "Attendee Categories" },
          ],
        },
        { href: `/events/${eventId}/check-in`, label: "Check-in", icon: "qr-code" },
        { href: `/events/${eventId}/badges`, label: "Badges", icon: "id-card" },
      ],
    },
    {
      label: "Tickets",
      icon: "ticket" as const,
      firstHref: `/events/${eventId}/tickets`,
      items: [
        {
          href: `/events/${eventId}/tickets`,
          label: "Ticket Setup",
          icon: "ticket",
          children: [
            { href: `/events/${eventId}/tickets`, label: "Tickets" },
            { href: `/events/${eventId}/group-tickets`, label: "Group Tickets" },
            { href: `/events/${eventId}/custom-fields`, label: "Form Fields" },
            { href: `/events/${eventId}/confirmation-emails`, label: "Confirmation Emails" },
            { href: `/events/${eventId}/ticket-addons`, label: "Ticket Add-ons" },
            { href: `/events/${eventId}/promo-codes`, label: "Promo Codes" },
            { href: `/events/${eventId}/registration-pages`, label: "Registration Pages" },
            { href: `/events/${eventId}/registration-widgets`, label: "Registration Widgets" },
            { href: `/events/${eventId}/registration-settings`, label: "Registration Settings" },
          ],
        },
      ],
    },
    {
      label: "Engagement",
      icon: "megaphone" as const,
      firstHref: `/events/${eventId}/announcements`,
      items: [
        { href: `/events/${eventId}/announcements`, label: "Announcements", icon: "megaphone" },
        {
          href: `/events/${eventId}/meetups`,
          label: "Community",
          icon: "users",
          children: [
            { href: `/events/${eventId}/meetups`, label: "Meet-ups" },
            { href: `/events/${eventId}/discussion-topics`, label: "Discussion Topics" },
            { href: `/events/${eventId}/social-groups`, label: "Social Groups" },
            { href: `/events/${eventId}/matchmaking`, label: "Attendee Matchmaking" },
          ],
        },
        { href: `/events/${eventId}/gamification`, label: "Gamification", icon: "trophy" },
        { href: "#", label: "1-1 Meeting Scheduler", icon: "calendar-clock", disabled: true },
        { href: "#", label: "Speed Networking", icon: "zap", disabled: true },
        { href: "#", label: "Round Table", icon: "circle-dot", disabled: true },
        { href: `/events/${eventId}/feedback`, label: "Session Feedback", icon: "message-square" },
        { href: `/events/${eventId}/survey`, label: "Surveys", icon: "clipboard-list" },
        { href: "#", label: "Floormap", icon: "map", disabled: true },
        { href: "#", label: "Announcement Wall", icon: "monitor", disabled: true },
        { href: `/events/${eventId}/polls`, label: "Live Polling", icon: "bar-chart-2" },
        { href: "#", label: "Photos", icon: "camera", disabled: true },
      ],
    },
    {
      label: "Outreach",
      icon: "globe" as const,
      firstHref: `/events/${eventId}/website`,
      items: [
        { href: `/events/${eventId}/website`, label: "Website", icon: "globe" },
        { href: `/events/${eventId}/emails`, label: "Emails", icon: "mail" },
        { href: `/events/${eventId}/certificates`, label: "Certificates", icon: "award" },
        { href: `/events/${eventId}/marketing`, label: "Marketing", icon: "globe" },
      ],
    },
    {
      label: "Insights",
      icon: "bar-chart-3" as const,
      firstHref: `/events/${eventId}/analytics`,
      items: [
        { href: `/events/${eventId}/analytics`, label: "Analytics", icon: "bar-chart-3" },
        { href: `/events/${eventId}/settings`, label: "Settings", icon: "settings" },
      ],
    },
    {
      label: "Publish",
      icon: "rocket" as const,
      firstHref: `/events/${eventId}/publish`,
      items: [
        { href: `/events/${eventId}/publish`, label: "Publish", icon: "rocket" },
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
    <EventNavProvider>
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

        {/* Desktop top tabs */}
        <div className="mb-4 hidden lg:block">
          <EventTopTabs groups={groups} />
        </div>

        {children}
      </div>
    </div>
    </EventNavProvider>
  );
}
