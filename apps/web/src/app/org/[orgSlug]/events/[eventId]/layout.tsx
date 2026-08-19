import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@attendly/ui/components";
import { EventSubSidebar } from "./event-sub-sidebar";
import { MobileEventNav } from "./mobile-event-nav";
import { EventTopTabs } from "./event-top-tabs";
import { EventNavProvider } from "./event-nav-context";
import { PreviewDropdown } from "./preview-dropdown";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; eventId: string }>;
}) {
  const { orgSlug, eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("title, slug, start_date, end_date, status, organization:organizations(slug)")
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
            { href: `/events/${eventId}/analytics-exports`, label: "Analytics & Exports" },
            { href: `/events/${eventId}/cross-event-report`, label: "Cross-Event Report" },
          ],
        },
        { href: `/events/${eventId}/admin-settings`, label: "Admin Settings", icon: "shield" },
        {
          href: `/events/${eventId}/volunteers`,
          label: "Call For Volunteers",
          icon: "hand-helping",
          children: [
            { href: `/events/${eventId}/volunteers`, label: "Volunteer Manager" },
            { href: `/events/${eventId}/volunteers/consent-forms`, label: "Release & Consent Forms" },
          ],
        },
        { href: `/events/${eventId}/attendee-categories`, label: "Categories", icon: "tag" },
        { href: `/events/${eventId}/segments`, label: "Segments", icon: "filter" },
        { href: `/events/${eventId}/ticket-session-mapping`, label: "Ticket Session Mapping", icon: "link" },
        { href: `/events/${eventId}/session-cap`, label: "Session Cap", icon: "gauge" },
        { href: `/events/${eventId}/release-consent-forms`, label: "Release & Consent Forms", icon: "file-text" },
        { href: `/events/${eventId}/check-in`, label: "Attendee Check-in", icon: "qr-code" },
        { href: `/events/${eventId}/checkout`, label: "Attendee Checkout", icon: "log-out" },
        { href: `/events/${eventId}/badges`, label: "Name Badges", icon: "id-card" },
        { href: `/events/${eventId}/certificates`, label: "Certificates", icon: "award" },
        { href: `/events/${eventId}/integrations`, label: "Integrations", icon: "plug" },
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
            { href: `/events/${eventId}/tickets`, label: "Create Tickets" },
            { href: `/events/${eventId}/group-tickets`, label: "Group Tickets" },
            { href: `/events/${eventId}/custom-fields`, label: "Question Forms" },
            { href: `/events/${eventId}/confirmation-emails`, label: "Confirmation Emails" },
            { href: `/events/${eventId}/ticket-addons`, label: "Ticket Add-ons" },
            { href: `/events/${eventId}/promo-codes`, label: "Discount Codes" },
            { href: `/events/${eventId}/member-tickets`, label: "Member & Invite-Only" },
            { href: `/events/${eventId}/rsvp`, label: "Session RSVP" },
            { href: `/events/${eventId}/registration-pages`, label: "Registration Pages" },
            { href: `/events/${eventId}/registration-widgets`, label: "Registration Widgets" },
            { href: `/events/${eventId}/abandoned-registration`, label: "Abandoned Registration" },
            { href: `/events/${eventId}/registration-settings`, label: "Registration Settings" },
          ],
        },
        { href: `/events/${eventId}/payout`, label: "Payout", icon: "credit-card" },
        { href: `/events/${eventId}/orders`, label: "Orders & Transactions", icon: "receipt" },
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
        { href: `/events/${eventId}/floormap`, label: "Floormap", icon: "map" },
        { href: `/events/${eventId}/announcement-wall`, label: "Announcement Wall", icon: "monitor" },
        { href: `/events/${eventId}/polls`, label: "Live Polling", icon: "bar-chart-2" },
        {
          href: `/events/${eventId}/photos`,
          label: "Photos",
          icon: "camera",
          children: [
            { href: `/events/${eventId}/photos`, label: "Photo Collection" },
            { href: `/events/${eventId}/photos/booth`, label: "Photo Booth" },
            { href: `/events/${eventId}/photos/frames`, label: "Profile Photo Frames" },
          ],
        },
      ],
    },
    // {
    //   label: "Outreach",
    //   icon: "globe" as const,
    //   firstHref: `/events/${eventId}/emails`,
    //   items: [
    //     { href: `/events/${eventId}/emails`, label: "Emails", icon: "mail" },
    //     { href: `/events/${eventId}/certificates`, label: "Certificates", icon: "award" },
    //     { href: `/events/${eventId}/marketing`, label: "Marketing", icon: "globe" },
    //   ],
    // },
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

  const eventOrgSlug = (event.organization as unknown as { slug: string })?.slug;
  const portalUrl = eventOrgSlug && event.slug ? `/${eventOrgSlug}/${event.slug}` : null;

  // Fetch registration pages for Preview dropdown
  const { data: regPages } = await supabase
    .from("registration_pages")
    .select("name, slug")
    .eq("event_id", eventId)
    .order("created_at");

  const registrationPages = (regPages ?? []).map((p) => ({ name: p.name, slug: p.slug }));

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
            href={`/org/${orgSlug}/events`}
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
              {portalUrl && event.status === "published" && (
                <PreviewDropdown
                  portalUrl={portalUrl}
                  registrationPages={registrationPages}
                />
              )}
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
            {portalUrl && event.status === "published" && (
              <PreviewDropdown
                portalUrl={portalUrl}
                registrationPages={registrationPages}
              />
            )}
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
