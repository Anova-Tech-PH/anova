import Link from "next/link";
import { ArrowLeft, Calendar, Users, QrCode, BarChart3, Settings, Ticket, DoorOpen, Mail, ListChecks, Tag, ClipboardList } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@attendly/ui/components";
import { MobileTabSelect } from "./mobile-tab-select";

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
    { href: `/events/${eventId}/tickets`, label: "Tickets", icon: Ticket },
    { href: `/events/${eventId}/custom-fields`, label: "Form Fields", icon: ListChecks },
    { href: `/events/${eventId}/promo-codes`, label: "Promo Codes", icon: Tag },
    { href: `/events/${eventId}/registrations`, label: "Registrations", icon: Users },
    { href: `/events/${eventId}/check-in`, label: "Check-in", icon: QrCode },
    { href: `/events/${eventId}/rooms`, label: "Rooms", icon: DoorOpen },
    { href: `/events/${eventId}/emails`, label: "Emails", icon: Mail },
    { href: `/events/${eventId}/survey`, label: "Survey", icon: ClipboardList },
    { href: `/events/${eventId}/analytics`, label: "Analytics", icon: BarChart3 },
    { href: `/events/${eventId}/settings`, label: "Settings", icon: Settings },
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
        <div className="relative hidden sm:block">
          <nav className="-mb-px flex gap-1 overflow-x-auto pb-px" style={{ scrollbarWidth: "none" }}>
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="group relative flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Link>
            ))}
          </nav>
          <div className="absolute inset-x-0 bottom-0 h-px bg-border" />
        </div>
      </div>

      <div className="pt-2">{children}</div>
    </div>
  );
}
