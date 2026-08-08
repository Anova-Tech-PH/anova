import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, MapPin, Users, ArrowRight } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";
import { Badge } from "@attendly/ui/components";

/* ── Helpers ── */

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
  };
  if (s.toDateString() === e.toDateString()) {
    return s.toLocaleDateString("en-US", opts);
  }
  return `${s.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – ${e.toLocaleDateString("en-US", opts)}`;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(price)
    .replace("NGN", "\u20A6")
    .trim();
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const SESSION_TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  keynote: {
    bg: "bg-[oklch(0.93_0.03_255)]",
    text: "text-[oklch(0.42_0.14_255)]",
  },
  talk: {
    bg: "bg-[oklch(0.94_0.04_200)]",
    text: "text-[oklch(0.44_0.12_200)]",
  },
  workshop: { bg: "bg-success-bg", text: "text-success" },
  panel: { bg: "bg-warning-bg", text: "text-warning" },
};

/* ── Page ── */

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", orgSlug)
    .single();

  if (!org) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("organization_id", org.id)
    .eq("slug", eventSlug)
    .eq("status", "published")
    .single();

  if (!event) notFound();

  // Fetch speakers
  const { data: speakers } = await supabase
    .from("speakers")
    .select("*")
    .eq("event_id", event.id)
    .order("name");

  // Fetch sessions with speakers
  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      `*, track:tracks(id, name, color), session_speakers(speaker_id, speakers(id, name, title, company, photo))`
    )
    .eq("event_id", event.id)
    .order("start_time");

  // Fetch ticket types
  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("id, name, price, quantity")
    .eq("event_id", event.id)
    .order("price");

  // Registration count
  const { count: regCount } = await supabase
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id);

  // Group sessions by day
  const dayGroups: Record<string, typeof sessions> = {};
  for (const s of sessions ?? []) {
    const day = new Date(s.start_time).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    (dayGroups[day] ??= []).push(s);
  }

  const dayKeys = Object.keys(dayGroups);
  const isMultiDay = dayKeys.length > 1;

  const firstTicket = ticketTypes?.[0];

  const visibleSpeakers = speakers?.slice(0, 5) ?? [];
  const extraSpeakerCount = (speakers?.length ?? 0) - 5;

  return (
    <div className="min-h-screen">
      {/* ══════════════════════════════════════════
          HEADER
         ══════════════════════════════════════════ */}
      <header className="h-[58px] border-b border-border bg-card">
        <div className="mx-auto flex h-full max-w-[1180px] items-center justify-between px-6">
          <Link
            href={`/${orgSlug}`}
            className="font-display text-[19px] font-extrabold uppercase tracking-[-0.025em]"
          >
            {org.name}
          </Link>
          <nav className="flex items-center gap-6">
            {sessions && sessions.length > 0 && (
              <a
                href="#programme"
                className="text-[14px] font-semibold text-muted-strong transition-colors hover:text-foreground"
              >
                Programme
              </a>
            )}
            {speakers && speakers.length > 0 && (
              <a
                href="#speakers"
                className="text-[14px] font-semibold text-muted-strong transition-colors hover:text-foreground"
              >
                Speakers
              </a>
            )}
            {event.venue_name && (
              <a
                href="#venue"
                className="text-[14px] font-semibold text-muted-strong transition-colors hover:text-foreground"
              >
                Venue
              </a>
            )}
            <Link
              href={`/${orgSlug}/${eventSlug}/register`}
              className="rounded-[6px] bg-primary px-4 py-2 text-[14px] font-bold text-white transition-colors hover:bg-primary/90"
            >
              Register
            </Link>
          </nav>
        </div>
      </header>

      {/* ══════════════════════════════════════════
          HERO — bg-ink
         ══════════════════════════════════════════ */}
      <section className="bg-ink text-white">
        <div className="mx-auto grid max-w-[1180px] grid-cols-[1.3fr_1fr] items-start gap-14 px-6 py-16">
          {/* Left column */}
          <div>
            {/* Registration pill */}
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-1.5">
              <span className="h-[7px] w-[7px] rounded-full bg-accent" />
              <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-accent">
                Registration open
              </span>
            </span>

            {/* Title */}
            <h1 className="mt-6 font-display text-[62px] font-extrabold leading-[1.0] tracking-[-0.045em]">
              {event.title}
            </h1>

            {/* Meta row */}
            <div className="mt-6 flex items-center gap-6">
              <span className="flex items-center gap-2 text-[15px] font-semibold text-white/[0.85]">
                <Calendar className="h-[17px] w-[17px] text-accent" />
                {formatDateRange(event.start_date, event.end_date)}
              </span>
              {event.venue_name && (
                <span className="flex items-center gap-2 text-[15px] font-semibold text-white/[0.85]">
                  <MapPin className="h-[17px] w-[17px] text-accent" />
                  {event.venue_name}
                </span>
              )}
              {(regCount ?? 0) > 0 && (
                <span className="flex items-center gap-2 text-[15px] font-semibold text-white/[0.85]">
                  <Users className="h-[17px] w-[17px] text-accent" />
                  {regCount} registered
                </span>
              )}
            </div>

            {/* Description */}
            {event.description && (
              <p className="mt-6 max-w-[54ch] text-[17px] font-medium leading-[1.6] text-white/[0.72]">
                {event.description}
              </p>
            )}
          </div>

          {/* Right column — Registration card */}
          <div className="rounded-[10px] bg-card p-6 text-ink shadow-[0_20px_50px_rgba(0,0,0,0.28)]">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Choose your ticket
            </p>

            {/* Ticket rows */}
            {ticketTypes && ticketTypes.length > 0 ? (
              <div className="space-y-2">
                {ticketTypes.map((ticket, i) => (
                  <div
                    key={ticket.id}
                    className={`flex items-center justify-between rounded-[8px] p-4 ${
                      i === 0
                        ? "border-[1.5px] border-primary bg-primary/5"
                        : "border border-border"
                    }`}
                  >
                    <div>
                      <p className="font-display text-[15px] font-extrabold">
                        {ticket.name}
                      </p>
                      {ticket.quantity != null && (
                        <p className="mt-0.5 text-[12px] font-medium text-muted-foreground">
                          {ticket.quantity} spots available
                        </p>
                      )}
                    </div>
                    <p className="font-display text-[22px] font-extrabold text-right">
                      {Number(ticket.price) === 0
                        ? "Free"
                        : formatPrice(Number(ticket.price))}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-[14px] text-muted-foreground">
                Tickets coming soon
              </p>
            )}

            {/* Form inputs (display-only) */}
            <div className="mt-5 space-y-3">
              <div>
                <label className="mb-2 block text-[12px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                  Full name
                </label>
                <div className="h-[42px] rounded-[6px] border border-border bg-background" />
              </div>
              <div>
                <label className="mb-2 block text-[12px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                  Email
                </label>
                <div className="h-[42px] rounded-[6px] border border-border bg-background" />
              </div>
            </div>

            {/* Submit button — links to register page */}
            <Link
              href={`/${orgSlug}/${eventSlug}/register`}
              className="mt-4 flex w-full items-center justify-center rounded-[6px] bg-primary py-[14px] text-[15px] font-bold text-white transition-colors hover:bg-primary/90"
            >
              Register
              {firstTicket && Number(firstTicket.price) > 0
                ? ` \u2014 ${formatPrice(Number(firstTicket.price))}`
                : ""}
            </Link>

            <p className="mt-3 text-center text-[13px] text-muted-foreground">
              Your pass arrives by email straight away.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          BELOW HERO — bg-background
         ══════════════════════════════════════════ */}
      <section className="bg-background">
        <div className="mx-auto grid max-w-[1180px] grid-cols-[1.3fr_1fr] items-start gap-14 px-6 py-14">
          {/* ── Programme (left) ── */}
          {sessions && sessions.length > 0 ? (
            <div id="programme">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-[30px] font-extrabold">
                  Programme
                </h2>
                {isMultiDay && (
                  <div className="flex items-center gap-1 rounded-[8px] border border-border bg-card p-1">
                    {dayKeys.map((day, i) => (
                      <span
                        key={day}
                        className={`rounded-[6px] px-3 py-1.5 text-[13px] font-bold ${
                          i === 0
                            ? "bg-primary text-white"
                            : "text-muted-foreground"
                        }`}
                      >
                        Day {i + 1}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6">
                {Object.entries(dayGroups).map(([day, daySessions]) => (
                  <div key={day}>
                    {isMultiDay && (
                      <p className="mb-2 mt-6 text-[13px] font-bold text-muted-foreground first:mt-0">
                        {day}
                      </p>
                    )}
                    {daySessions!.map((session) => {
                      const isBreak =
                        session.type === "break" || session.type === "lunch";
                      const typeStyle = SESSION_TYPE_STYLES[session.type];
                      const sessionSpeakers =
                        session.session_speakers?.map(
                          (ss: any) => ss.speakers?.name
                        ).filter(Boolean) ?? [];

                      return (
                        <div
                          key={session.id}
                          className="flex items-start gap-4 border-b border-border-subtle py-[18px]"
                        >
                          {/* Time */}
                          <span
                            className={`w-[58px] shrink-0 text-[14px] font-bold tabular-nums ${
                              isBreak ? "text-[oklch(0.55_0.02_250)]" : "text-primary"
                            }`}
                          >
                            {formatTime(session.start_time)}
                          </span>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-[16px] font-bold ${
                                isBreak
                                  ? "text-[oklch(0.55_0.02_250)]"
                                  : ""
                              }`}
                            >
                              {session.title}
                            </p>
                            {sessionSpeakers.length > 0 && (
                              <p className="mt-0.5 text-[13px] font-medium text-muted-foreground">
                                {sessionSpeakers.join(", ")}
                              </p>
                            )}
                            {session.location && (
                              <p className="mt-0.5 text-[13px] font-medium text-muted-foreground">
                                {session.location}
                              </p>
                            )}
                          </div>

                          {/* Badge */}
                          {!isBreak && typeStyle && (
                            <span
                              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${typeStyle.bg} ${typeStyle.text}`}
                            >
                              {session.type}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div id="programme">
              <h2 className="font-display text-[30px] font-extrabold">
                Programme
              </h2>
              <p className="mt-4 text-[15px] text-muted-foreground">
                Programme coming soon.
              </p>
            </div>
          )}

          {/* ── Speakers (right) ── */}
          <div id="speakers">
            <h2 className="font-display text-[30px] font-extrabold">
              Speakers
            </h2>

            {speakers && speakers.length > 0 ? (
              <div className="mt-6 space-y-2">
                {visibleSpeakers.map((speaker) => (
                  <div
                    key={speaker.id}
                    className="flex items-center gap-3.5 rounded-[8px] border border-border p-3.5"
                  >
                    {/* Initials tile */}
                    {speaker.photo ? (
                      <img
                        src={speaker.photo}
                        alt={speaker.name}
                        className="h-[42px] w-[42px] shrink-0 rounded-[8px] object-cover"
                      />
                    ) : (
                      <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[8px] bg-primary/10 text-[14px] font-bold text-primary">
                        {initials(speaker.name)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold">{speaker.name}</p>
                      {(speaker.title || speaker.company) && (
                        <p className="text-[13px] font-medium text-muted-foreground">
                          {[speaker.title, speaker.company]
                            .filter(Boolean)
                            .join(" at ")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {extraSpeakerCount > 0 && (
                  <div className="flex items-center justify-center rounded-[8px] border border-dashed border-border p-3.5 text-[14px] font-semibold text-muted-foreground">
                    + {extraSpeakerCount} more speaker
                    {extraSpeakerCount !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-4 text-[15px] text-muted-foreground">
                Speakers coming soon.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
