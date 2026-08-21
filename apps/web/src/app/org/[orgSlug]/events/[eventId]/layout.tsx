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

  const base = `/org/${orgSlug}/events/${eventId}`;

  const groups = [
    {
      label: "Content",
      icon: "layout-grid" as const,
      firstHref: base,
      items: [
        { href: base, label: "Basics", icon: "settings" },
        {
          href: `${base}/schedule`,
          label: "Agenda Center",
          icon: "calendar",
          children: [
            { href: `${base}/schedule`, label: "Session Manager" },
            { href: `${base}/schedule/tracks`, label: "Track Manager" },
            { href: `${base}/schedule/conflicts`, label: "Conflict Check" },
            { href: `${base}/schedule/qa`, label: "Session Q&A Manager" },
          ],
        },
        {
          href: `${base}/speakers`,
          label: "Speaker Center",
          icon: "mic",
          children: [
            { href: `${base}/speakers`, label: "Speaker Manager" },
            { href: `${base}/speakers/message`, label: "Message Speakers" },
            { href: `${base}/speakers/meetings`, label: "Speaker 1-1 Meetings" },
            { href: `${base}/speakers/consent-forms`, label: "Release & Consent Forms" },
            { href: `${base}/speakers/settings`, label: "Settings" },
          ],
        },
        // { href: `${base}/rooms`, label: "Rooms", icon: "door-open" },
        {
          href: `${base}/sponsors`,
          label: "Sponsor Center",
          icon: "award",
          children: [
            { href: `${base}/sponsors`, label: "Sponsor Manager" },
            { href: `${base}/sponsors/message`, label: "Message Sponsors" },
            { href: `${base}/sponsors/leads`, label: "Lead Retrieval" },
          ],
        },
        {
          href: `${base}/documents`,
          label: "Documents & Videos",
          icon: "file-text",
          children: [
            { href: `${base}/documents`, label: "Documents" },
            { href: `${base}/documents/video-hosting`, label: "Video Hosting" },
            { href: `${base}/documents/attendee-video-access`, label: "Attendee Video Access" },
          ],
        },
        { href: `${base}/logistics`, label: "Logistics Center", icon: "clipboard-list" },
      ],
    },
    {
      label: "Attendees",
      icon: "users" as const,
      firstHref: `${base}/registrations`,
      items: [
        {
          href: `${base}/registrations`,
          label: "Manage Attendees",
          icon: "users",
          children: [
            { href: `${base}/registrations`, label: "Attendees" },
            { href: `${base}/attendee-limit`, label: "Attendee Limit Upgrade" },
            { href: `${base}/analytics-exports`, label: "Analytics & Exports" },
            { href: `${base}/cross-event-report`, label: "Cross-Event Report" },
          ],
        },
        { href: `${base}/admin-settings`, label: "Admin Settings", icon: "shield" },
        {
          href: `${base}/volunteers`,
          label: "Call For Volunteers",
          icon: "hand-helping",
          children: [
            { href: `${base}/volunteers`, label: "Volunteer Manager" },
            { href: `${base}/volunteers/consent-forms`, label: "Release & Consent Forms" },
          ],
        },
        { href: `${base}/attendee-categories`, label: "Categories", icon: "tag" },
        { href: `${base}/segments`, label: "Segments", icon: "filter" },
        { href: `${base}/ticket-session-mapping`, label: "Ticket Session Mapping", icon: "link" },
        { href: `${base}/session-cap`, label: "Session Cap", icon: "gauge" },
        { href: `${base}/release-consent-forms`, label: "Release & Consent Forms", icon: "file-text" },
        { href: `${base}/check-in`, label: "Attendee Check-in", icon: "qr-code" },
        { href: `${base}/checkout`, label: "Attendee Checkout", icon: "log-out" },
        { href: `${base}/badges`, label: "Name Badges", icon: "id-card" },
        { href: `${base}/certificates`, label: "Certificates", icon: "award" },
        { href: `${base}/integrations`, label: "Integrations", icon: "plug" },
      ],
    },
    {
      label: "Tickets",
      icon: "ticket" as const,
      firstHref: `${base}/tickets`,
      items: [
        {
          href: `${base}/tickets`,
          label: "Ticket Setup",
          icon: "ticket",
          children: [
            { href: `${base}/tickets`, label: "Create Tickets" },
            { href: `${base}/group-tickets`, label: "Group Tickets" },
            { href: `${base}/custom-fields`, label: "Question Forms" },
            { href: `${base}/confirmation-emails`, label: "Confirmation Emails" },
            { href: `${base}/ticket-addons`, label: "Ticket Add-ons" },
            { href: `${base}/promo-codes`, label: "Discount Codes" },
            { href: `${base}/member-tickets`, label: "Member & Invite-Only" },
            { href: `${base}/rsvp`, label: "Session RSVP" },
            { href: `${base}/registration-pages`, label: "Registration Pages" },
            { href: `${base}/registration-widgets`, label: "Registration Widgets" },
            { href: `${base}/abandoned-registration`, label: "Abandoned Registration" },
            { href: `${base}/registration-settings`, label: "Registration Settings" },
          ],
        },
        { href: `${base}/payout`, label: "Payout", icon: "credit-card" },
        { href: `${base}/orders`, label: "Orders & Transactions", icon: "receipt" },
      ],
    },
    {
      label: "Engagement",
      icon: "megaphone" as const,
      firstHref: `${base}/announcements`,
      items: [
        { href: `${base}/announcements`, label: "Announcements", icon: "megaphone" },
        {
          href: `${base}/meetups`,
          label: "Community",
          icon: "users",
          children: [
            { href: `${base}/meetups`, label: "Meet-ups" },
            { href: `${base}/discussion-topics`, label: "Discussion Topics" },
            { href: `${base}/social-groups`, label: "Social Groups" },
            { href: `${base}/matchmaking`, label: "Attendee Matchmaking" },
          ],
        },
        { href: `${base}/gamification`, label: "Gamification", icon: "trophy" },
        { href: "#", label: "1-1 Meeting Scheduler", icon: "calendar-clock", disabled: true },
        { href: "#", label: "Speed Networking", icon: "zap", disabled: true },
        { href: "#", label: "Round Table", icon: "circle-dot", disabled: true },
        { href: `${base}/feedback`, label: "Session Feedback", icon: "message-square" },
        { href: `${base}/survey`, label: "Surveys", icon: "clipboard-list" },
        { href: `${base}/floormap`, label: "Floormap", icon: "map" },
        { href: `${base}/announcement-wall`, label: "Announcement Wall", icon: "monitor" },
        { href: `${base}/polls`, label: "Live Polling", icon: "bar-chart-2" },
        {
          href: `${base}/photos`,
          label: "Photos",
          icon: "camera",
          children: [
            { href: `${base}/photos`, label: "Photo Collection" },
            { href: `${base}/photos/booth`, label: "Photo Booth" },
            { href: `${base}/photos/frames`, label: "Profile Photo Frames" },
          ],
        },
      ],
    },
    // {
    //   label: "Outreach",
    //   icon: "globe" as const,
    //   firstHref: `${base}/emails`,
    //   items: [
    //     { href: `${base}/emails`, label: "Emails", icon: "mail" },
    //     { href: `${base}/certificates`, label: "Certificates", icon: "award" },
    //     { href: `${base}/marketing`, label: "Marketing", icon: "globe" },
    //   ],
    // },
    {
      label: "Insights",
      icon: "bar-chart-3" as const,
      firstHref: `${base}/analytics`,
      items: [
        { href: `${base}/analytics`, label: "Analytics", icon: "bar-chart-3" },
        { href: `${base}/settings`, label: "Settings", icon: "settings" },
      ],
    },
    {
      label: "Publish",
      icon: "rocket" as const,
      firstHref: `${base}/publish`,
      items: [
        { href: `${base}/publish`, label: "Publish", icon: "rocket" },
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
