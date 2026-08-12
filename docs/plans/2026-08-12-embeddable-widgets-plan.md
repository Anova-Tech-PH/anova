# Embeddable Widgets Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build three iframe-based embeddable widgets (Agenda, Speakers, Registration) with a full configurator UI in a new "Marketing" organizer tab.

**Architecture:** New `(embed)` route group serves lightweight, header-less pages styled via URL search params (accent color, theme, field toggles). A `WidgetConfigurator` client component in the organizer dashboard provides live iframe preview, controls, and copy-to-clipboard embed code. No new database tables — config is stateless via URL params.

**Tech Stack:** Next.js 16 Server Components, React 19, Tailwind 4, Supabase, existing `@attendly/ui/components`

---

### Task 1: Embed Layout with Theme Support

**Files:**
- Create: `apps/web/src/app/(embed)/embed/[eventId]/layout.tsx`

**Context:** This layout wraps all three embed widgets. It must have NO header, NO nav, NO Attendly chrome — just the widget content. It reads `accent` and `theme` from URL search params and injects CSS custom properties so child pages can use them. It also sets `X-Frame-Options: ALLOWALL` to permit iframe embedding.

**Step 1: Create the embed layout**

Create the file with this exact content:

```tsx
import "./embed.css";

export default async function EmbedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  return (
    <html lang="en">
      <body className="embed-body bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
```

**Step 2: Create embed CSS file**

Create `apps/web/src/app/(embed)/embed/[eventId]/embed.css`:

```css
@import "tailwindcss";

.embed-body {
  margin: 0;
  padding: 0;
  min-height: auto;
}

.embed-footer {
  text-align: center;
  padding: 1rem 0;
  font-size: 0.75rem;
  color: var(--color-muted-foreground);
}

.embed-footer a {
  color: var(--color-primary);
  text-decoration: none;
}

.embed-footer a:hover {
  text-decoration: underline;
}
```

**Step 3: Create a shared helper for parsing embed params**

Create `apps/web/src/app/(embed)/embed/[eventId]/parse-embed-params.ts`:

```tsx
export type EmbedParams = {
  accent: string;
  theme: "light" | "dark" | "auto";
  [key: string]: string;
};

export function parseEmbedParams(
  searchParams: Record<string, string | string[] | undefined>
): EmbedParams {
  const accent = (typeof searchParams.accent === "string" ? searchParams.accent : "3b82f6").replace(/[^a-fA-F0-9]/g, "").slice(0, 6);
  const rawTheme = typeof searchParams.theme === "string" ? searchParams.theme : "light";
  const theme = (["light", "dark", "auto"].includes(rawTheme) ? rawTheme : "light") as EmbedParams["theme"];

  const result: EmbedParams = { accent, theme };
  for (const [key, value] of Object.entries(searchParams)) {
    if (key !== "accent" && key !== "theme" && typeof value === "string") {
      result[key] = value;
    }
  }
  return result;
}

export function isToggleOn(params: EmbedParams, key: string, defaultOn = true): boolean {
  if (!(key in params)) return defaultOn;
  return params[key] === "1" || params[key] === "true";
}
```

**Step 4: Create the "Powered by Attendly" footer component**

Create `apps/web/src/app/(embed)/embed/[eventId]/powered-by-footer.tsx`:

```tsx
export function PoweredByFooter({ eventUrl }: { eventUrl?: string }) {
  return (
    <div className="embed-footer">
      Powered by{" "}
      {eventUrl ? (
        <a href={eventUrl} target="_blank" rel="noopener noreferrer">
          Attendly
        </a>
      ) : (
        <span>Attendly</span>
      )}
    </div>
  );
}
```

**Step 5: Add middleware to set X-Frame-Options for embed routes**

Create `apps/web/src/middleware.ts`:

```tsx
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Allow iframe embedding for /embed/* routes
  if (request.nextUrl.pathname.startsWith("/embed/")) {
    response.headers.delete("X-Frame-Options");
    response.headers.set("Content-Security-Policy", "frame-ancestors *");
  }

  return response;
}

export const config = {
  matcher: "/embed/:path*",
};
```

**Step 6: Verify the layout renders**

Run: `pnpm --filter web dev`

Navigate to `http://localhost:3000/embed/test` — should show a blank page with no header/nav. (It will 404 the child, which is expected since we haven't added pages yet.)

**Step 7: Commit**

```bash
git add apps/web/src/app/\(embed\) apps/web/src/middleware.ts
git commit -m "feat(widgets): add embed layout with theme support and X-Frame-Options middleware"
```

---

### Task 2: Agenda Embed Widget

**Files:**
- Create: `apps/web/src/app/(embed)/embed/[eventId]/agenda/page.tsx`

**Context:** This page renders the event schedule in a compact, embeddable format. It reuses the same Supabase queries as the public schedule page (`apps/web/src/app/(public)/[orgSlug]/[eventSlug]/schedule/page.tsx`) but without the public layout, bookmarks, RSVP, polls, or feedback — just clean session cards grouped by day with configurable toggle support.

**Data source:** Query `events` by ID (must be published), then `sessions` joined with `tracks` and `speakers` via `session_speakers`.

**Step 1: Create the agenda embed page**

```tsx
import { notFound } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { parseEmbedParams, isToggleOn } from "../parse-embed-params";
import { PoweredByFooter } from "../powered-by-footer";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

const typeBadgeColors: Record<string, string> = {
  keynote: "bg-primary/15 text-primary",
  talk: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  workshop: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  panel: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  break: "bg-muted text-muted-foreground",
};

export default async function AgendaEmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const rawParams = await searchParams;
  const embedParams = parseEmbedParams(rawParams);

  const showDesc = isToggleOn(embedParams, "showDesc");
  const showSpeakers = isToggleOn(embedParams, "showSpeakers");
  const showTrack = isToggleOn(embedParams, "showTrack");
  const showTime = isToggleOn(embedParams, "showTime");
  const showLocation = isToggleOn(embedParams, "showLocation");

  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, title, slug, organizations(slug)")
    .eq("id", eventId)
    .eq("status", "published")
    .single();

  if (!event) notFound();

  const { data: sessions } = await supabase
    .from("sessions")
    .select(`
      id, title, description, type, start_time, end_time, location,
      track:tracks(id, name, color),
      session_speakers(speaker_id, speakers(id, name, title, photo))
    `)
    .eq("event_id", event.id)
    .order("start_time");

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

  const orgSlug = (event as any).organizations?.slug;
  const eventUrl = orgSlug ? `/${orgSlug}/${event.slug}` : undefined;
  const accentColor = `#${embedParams.accent}`;

  return (
    <div className="p-4" style={{ "--embed-accent": accentColor } as React.CSSProperties}>
      <h2 className="text-lg font-semibold mb-4">{event.title} — Agenda</h2>

      {!sessions || sessions.length === 0 ? (
        <p className="text-muted-foreground text-sm">No sessions scheduled yet.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(dayGroups).map(([day, daySessions]) => (
            <div key={day}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">{day}</h3>
              <div className="space-y-2">
                {daySessions!.map((session) => (
                  <div
                    key={session.id}
                    className={`rounded-lg border p-3 ${session.type === "break" ? "bg-muted/50" : "bg-card"}`}
                    style={{
                      borderLeftWidth: showTrack && session.track ? 3 : undefined,
                      borderLeftColor: showTrack && session.track ? session.track.color : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${typeBadgeColors[session.type] ?? typeBadgeColors.break}`}>
                        {session.type}
                      </span>
                      {showTrack && session.track && (
                        <span className="text-[10px] text-muted-foreground">{session.track.name}</span>
                      )}
                    </div>

                    <h4 className="mt-1 text-sm font-medium">{session.title}</h4>

                    {showDesc && session.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{session.description}</p>
                    )}

                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      {showTime && (
                        <span>{formatTime(session.start_time)} – {formatTime(session.end_time)}</span>
                      )}
                      {showLocation && session.location && (
                        <span>📍 {session.location}</span>
                      )}
                    </div>

                    {showSpeakers && session.session_speakers.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {session.session_speakers.map(({ speakers: sp }: any) => (
                          <div key={sp.id} className="flex items-center gap-1.5">
                            {sp.photo ? (
                              <img src={sp.photo} alt={sp.name} className="h-5 w-5 rounded-full object-cover" />
                            ) : (
                              <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium">
                                {sp.name.charAt(0)}
                              </div>
                            )}
                            <span className="text-[11px]">{sp.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <PoweredByFooter eventUrl={eventUrl} />
    </div>
  );
}
```

**Step 2: Verify the widget renders**

Navigate to `http://localhost:3000/embed/{eventId}/agenda` using the test event ID (`4f8d60fa-4e10-4d83-932e-24fe83337c88`). Should show session cards grouped by day with no header/nav.

Test toggles:
- `?showDesc=0` — descriptions should be hidden
- `?showSpeakers=0` — speaker names/photos hidden
- `?showTrack=0` — track names and color bars hidden

**Step 3: Commit**

```bash
git add apps/web/src/app/\(embed\)/embed/\[eventId\]/agenda/
git commit -m "feat(widgets): add agenda embed widget with configurable toggles"
```

---

### Task 3: Speakers Embed Widget

**Files:**
- Create: `apps/web/src/app/(embed)/embed/[eventId]/speakers/page.tsx`

**Context:** Compact speaker grid/list for embedding. Reuses data from the `speakers` table. Reference: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/speakers/page.tsx` for query pattern.

**Step 1: Create the speakers embed page**

```tsx
import { notFound } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { parseEmbedParams, isToggleOn } from "../parse-embed-params";
import { PoweredByFooter } from "../powered-by-footer";

export default async function SpeakersEmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const rawParams = await searchParams;
  const embedParams = parseEmbedParams(rawParams);

  const showPhoto = isToggleOn(embedParams, "showPhoto");
  const showBio = isToggleOn(embedParams, "showBio");
  const showCompany = isToggleOn(embedParams, "showCompany");
  const layout = embedParams.layout === "list" ? "list" : "grid";

  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, title, slug, organizations(slug)")
    .eq("id", eventId)
    .eq("status", "published")
    .single();

  if (!event) notFound();

  const { data: speakers } = await supabase
    .from("speakers")
    .select("id, name, title, company, bio, photo")
    .eq("event_id", event.id)
    .order("name");

  const orgSlug = (event as any).organizations?.slug;
  const eventUrl = orgSlug ? `/${orgSlug}/${event.slug}/speakers` : undefined;

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">{event.title} — Speakers</h2>

      {!speakers || speakers.length === 0 ? (
        <p className="text-muted-foreground text-sm">Speakers haven&apos;t been announced yet.</p>
      ) : (
        <div className={layout === "grid" ? "grid gap-4 sm:grid-cols-2" : "space-y-3"}>
          {speakers.map((speaker) => (
            <div
              key={speaker.id}
              className={`flex gap-3 rounded-lg border bg-card p-4 ${layout === "list" ? "items-center" : ""}`}
            >
              {showPhoto && (
                speaker.photo ? (
                  <img
                    src={speaker.photo}
                    alt={speaker.name}
                    className="h-12 w-12 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {speaker.name.charAt(0)}
                  </div>
                )
              )}
              <div className="min-w-0">
                <h3 className="text-sm font-semibold">{speaker.name}</h3>
                {showCompany && (speaker.title || speaker.company) && (
                  <p className="text-xs text-muted-foreground">
                    {[speaker.title, speaker.company].filter(Boolean).join(" at ")}
                  </p>
                )}
                {showBio && speaker.bio && (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{speaker.bio}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <PoweredByFooter eventUrl={eventUrl} />
    </div>
  );
}
```

**Step 2: Verify**

Navigate to `http://localhost:3000/embed/{eventId}/speakers`. Test toggles: `?showBio=0`, `?showPhoto=0`, `?layout=list`.

**Step 3: Commit**

```bash
git add apps/web/src/app/\(embed\)/embed/\[eventId\]/speakers/
git commit -m "feat(widgets): add speakers embed widget with grid/list layout"
```

---

### Task 4: Registration Embed Widget

**Files:**
- Create: `apps/web/src/app/(embed)/embed/[eventId]/register/page.tsx`

**Context:** Compact registration form for embedding. Reuses the existing `RegistrationFlow` client component from `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/register/registration-flow.tsx` and the `QrConfirmation` component. Queries are identical to the public register page — ticket types, availability counts, custom fields.

**Step 1: Create the registration embed page**

```tsx
import { notFound } from "next/navigation";
import { Calendar, MapPin, Wifi } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";
import { RegistrationFlow } from "@/app/(public)/[orgSlug]/[eventSlug]/register/registration-flow";
import { getCustomFieldsByEvent } from "@/features/custom-fields/queries";
import { parseEmbedParams, isToggleOn } from "../parse-embed-params";
import { PoweredByFooter } from "../powered-by-footer";

export default async function RegisterEmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const rawParams = await searchParams;
  const embedParams = parseEmbedParams(rawParams);
  const showEventInfo = isToggleOn(embedParams, "showEventInfo");

  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, title, slug, start_date, end_date, venue_name, is_virtual, organizations(slug)")
    .eq("id", eventId)
    .eq("status", "published")
    .single();

  if (!event) notFound();

  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("*")
    .eq("event_id", event.id)
    .order("sort_order");

  const { data: regCounts } = await supabase
    .from("registrations")
    .select("ticket_type_id")
    .eq("event_id", event.id)
    .in("status", ["confirmed", "checked_in"]);

  const countMap: Record<string, number> = {};
  for (const r of regCounts ?? []) {
    countMap[r.ticket_type_id] = (countMap[r.ticket_type_id] ?? 0) + 1;
  }

  const ticketsWithAvailability = (ticketTypes ?? []).map((t) => ({
    ...t,
    sold: countMap[t.id] ?? 0,
    available: t.quantity ? t.quantity - (countMap[t.id] ?? 0) : null,
  }));

  const customFields = await getCustomFieldsByEvent(event.id);

  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);
  const dateStr = startDate.toDateString() === endDate.toDateString()
    ? startDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  const orgSlug = (event as any).organizations?.slug;
  const eventUrl = orgSlug ? `/${orgSlug}/${event.slug}/register` : undefined;

  return (
    <div className="p-4 max-w-lg mx-auto">
      {showEventInfo && (
        <div className="mb-6 rounded-lg border bg-card p-4">
          <h2 className="text-base font-semibold">{event.title}</h2>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {dateStr}
            </span>
            {event.venue_name && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {event.venue_name}
              </span>
            )}
            {event.is_virtual && (
              <span className="flex items-center gap-1">
                <Wifi className="h-3 w-3" />
                Virtual
              </span>
            )}
          </div>
        </div>
      )}

      {ticketsWithAvailability.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 py-8 text-center text-sm text-muted-foreground">
          Registration is not available yet.
        </div>
      ) : (
        <RegistrationFlow
          eventId={event.id}
          tickets={ticketsWithAvailability}
          customFields={customFields}
        />
      )}

      <PoweredByFooter eventUrl={eventUrl} />
    </div>
  );
}
```

**Step 2: Verify**

Navigate to `http://localhost:3000/embed/{eventId}/register`. Should show ticket selection + form. Test `?showEventInfo=0` to hide the event summary card.

**Step 3: Commit**

```bash
git add apps/web/src/app/\(embed\)/embed/\[eventId\]/register/
git commit -m "feat(widgets): add registration embed widget reusing RegistrationFlow"
```

---

### Task 5: Widget Configurator Component

**Files:**
- Create: `apps/web/src/features/widgets/components/widget-configurator.tsx`

**Context:** This is the main organizer-facing component. It renders a split view: left panel with controls (color picker, theme selector, field toggles), right panel with a live iframe preview. Bottom section has the embed code textarea with a copy button and a direct link. The iframe `src` updates in real-time as controls change.

**Step 1: Create the widget configurator**

```tsx
"use client";

import { useState, useMemo } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, Input } from "@attendly/ui/components";

type Toggle = {
  key: string;
  label: string;
  defaultOn: boolean;
};

type WidgetConfiguratorProps = {
  eventId: string;
  widgetType: "agenda" | "speakers" | "register";
  title: string;
  description: string;
  toggles: Toggle[];
  extraControls?: { key: string; label: string; options: { value: string; label: string }[] }[];
};

export function WidgetConfigurator({
  eventId,
  widgetType,
  title,
  description,
  toggles,
  extraControls = [],
}: WidgetConfiguratorProps) {
  const [accent, setAccent] = useState("3b82f6");
  const [theme, setTheme] = useState<"light" | "dark" | "auto">("light");
  const [toggleState, setToggleState] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const t of toggles) {
      initial[t.key] = t.defaultOn;
    }
    return initial;
  });
  const [extraState, setExtraState] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const c of extraControls) {
      initial[c.key] = c.options[0]?.value ?? "";
    }
    return initial;
  });
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const embedUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("accent", accent);
    params.set("theme", theme);
    for (const t of toggles) {
      params.set(t.key, toggleState[t.key] ? "1" : "0");
    }
    for (const c of extraControls) {
      params.set(c.key, extraState[c.key]);
    }
    return `${baseUrl}/embed/${eventId}/${widgetType}?${params.toString()}`;
  }, [accent, theme, toggleState, extraState, baseUrl, eventId, widgetType, toggles, extraControls]);

  const embedCode = `<iframe\n  src="${embedUrl}"\n  width="100%"\n  height="600"\n  frameborder="0"\n  style="border: none; border-radius: 8px;"\n  title="${title}"\n></iframe>`;

  async function handleCopy() {
    await navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success("Embed code copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Controls panel */}
        <div className="space-y-4">
          {/* Accent color */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Accent Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={`#${accent}`}
                onChange={(e) => setAccent(e.target.value.replace("#", ""))}
                className="h-9 w-9 cursor-pointer rounded border p-0.5"
              />
              <Input
                value={`#${accent}`}
                onChange={(e) => setAccent(e.target.value.replace("#", "").replace(/[^a-fA-F0-9]/g, "").slice(0, 6))}
                className="flex-1 font-mono text-sm"
              />
            </div>
          </div>

          {/* Theme */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Theme</label>
            <div className="flex gap-1">
              {(["light", "dark", "auto"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`flex-1 rounded-md border px-3 py-1.5 text-sm capitalize transition-colors ${
                    theme === t
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Field toggles */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Display Options</label>
            {toggles.map((toggle) => (
              <label key={toggle.key} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={toggleState[toggle.key]}
                  onChange={(e) =>
                    setToggleState((prev) => ({ ...prev, [toggle.key]: e.target.checked }))
                  }
                  className="rounded"
                />
                <span className="text-sm">{toggle.label}</span>
              </label>
            ))}
          </div>

          {/* Extra controls (e.g. layout for speakers) */}
          {extraControls.map((control) => (
            <div key={control.key} className="space-y-1.5">
              <label className="text-sm font-medium">{control.label}</label>
              <div className="flex gap-1">
                {control.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setExtraState((prev) => ({ ...prev, [control.key]: opt.value }))}
                    className={`flex-1 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                      extraState[control.key] === opt.value
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Live preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Preview</label>
            <a
              href={embedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Open in new tab
            </a>
          </div>
          <div className="rounded-lg border bg-muted/30 p-2">
            <iframe
              src={embedUrl}
              className="w-full rounded-md border bg-background"
              style={{ height: 500 }}
              title={`${title} preview`}
            />
          </div>
        </div>
      </div>

      {/* Embed code */}
      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Embed Code</label>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-1.5"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy Code"}
          </Button>
        </div>
        <pre className="rounded-lg border bg-muted/50 p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
          {embedCode}
        </pre>
      </div>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/widgets/
git commit -m "feat(widgets): add WidgetConfigurator component with live preview and copy embed code"
```

---

### Task 6: Marketing Organizer Tab

**Files:**
- Create: `apps/web/src/app/(organizer)/events/[eventId]/marketing/page.tsx`
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx` — add Marketing tab
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/desktop-tabs.tsx` — add Globe icon to icon map

**Context:** Add a "Marketing" tab to the organizer sidebar. The page renders three `WidgetConfigurator` instances (one per widget type) stacked vertically.

**Step 1: Add `Globe` icon to desktop-tabs.tsx icon map**

In `apps/web/src/app/(organizer)/events/[eventId]/desktop-tabs.tsx`:

- Add `Globe` to the lucide import on line 8 (add it to the destructured import list)
- Add `"globe": Globe,` to the `iconMap` object (after the existing entries around line 31)

**Step 2: Add the Marketing tab to layout.tsx**

In `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx`, add this entry to the `tabs` array at line 44 (before the Analytics tab):

```tsx
{ href: `/events/${eventId}/marketing`, label: "Marketing", icon: "globe" as const },
```

**Step 3: Create the marketing page**

Create `apps/web/src/app/(organizer)/events/[eventId]/marketing/page.tsx`:

```tsx
import { WidgetConfigurator } from "@/features/widgets/components/widget-configurator";

export default async function MarketingPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Marketing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Embed your event content on external websites. Customize the appearance and copy the embed code.
        </p>
      </div>

      <WidgetConfigurator
        eventId={eventId}
        widgetType="agenda"
        title="Agenda Widget"
        description="Display your event schedule on any website. Sessions auto-sync with your dashboard."
        toggles={[
          { key: "showDesc", label: "Show session descriptions", defaultOn: true },
          { key: "showSpeakers", label: "Show speaker names & photos", defaultOn: true },
          { key: "showTrack", label: "Show track names & colors", defaultOn: true },
          { key: "showTime", label: "Show session times", defaultOn: true },
          { key: "showLocation", label: "Show room/location", defaultOn: true },
        ]}
      />

      <WidgetConfigurator
        eventId={eventId}
        widgetType="speakers"
        title="Speakers Widget"
        description="Showcase your speakers on any website with photos, bios, and affiliations."
        toggles={[
          { key: "showPhoto", label: "Show speaker photos", defaultOn: true },
          { key: "showCompany", label: "Show title & company", defaultOn: true },
          { key: "showBio", label: "Show speaker bio", defaultOn: true },
        ]}
        extraControls={[
          {
            key: "layout",
            label: "Layout",
            options: [
              { value: "grid", label: "Grid" },
              { value: "list", label: "List" },
            ],
          },
        ]}
      />

      <WidgetConfigurator
        eventId={eventId}
        widgetType="register"
        title="Registration Widget"
        description="Let visitors register for your event directly from your website."
        toggles={[
          { key: "showEventInfo", label: "Show event info header", defaultOn: true },
        ]}
      />
    </div>
  );
}
```

**Step 4: Verify**

Navigate to `http://localhost:3000/events/{eventId}/marketing`. Should see:
- "Marketing" tab in the tab bar
- Three configurator sections with controls + live previews
- Embed code copyable for each widget

**Step 5: Commit**

```bash
git add apps/web/src/app/\(organizer\)/events/\[eventId\]/marketing/ \
       apps/web/src/app/\(organizer\)/events/\[eventId\]/layout.tsx \
       apps/web/src/app/\(organizer\)/events/\[eventId\]/desktop-tabs.tsx
git commit -m "feat(widgets): add Marketing tab with widget configurators for agenda, speakers, registration"
```

---

### Task 7: Verify All Widgets End-to-End

**Files:** None (testing only)

**Step 1: Start the dev server**

```bash
pnpm --filter web dev
```

**Step 2: Test each embed widget directly**

Using event ID `4f8d60fa-4e10-4d83-932e-24fe83337c88`:

1. `http://localhost:3000/embed/4f8d60fa-4e10-4d83-932e-24fe83337c88/agenda` — verify sessions render
2. `http://localhost:3000/embed/4f8d60fa-4e10-4d83-932e-24fe83337c88/speakers` — verify speaker grid
3. `http://localhost:3000/embed/4f8d60fa-4e10-4d83-932e-24fe83337c88/register` — verify registration form works

**Step 3: Test toggle parameters**

- Agenda: `?showDesc=0&showSpeakers=0` — verify descriptions and speakers hidden
- Speakers: `?layout=list&showBio=0` — verify list layout, no bios
- Register: `?showEventInfo=0` — verify event header hidden

**Step 4: Test the configurator**

1. Navigate to `http://localhost:3000/events/4f8d60fa-4e10-4d83-932e-24fe83337c88/marketing`
2. For each widget section:
   - Change accent color → preview updates
   - Toggle display options → preview updates
   - Click "Copy Code" → verify clipboard has correct iframe snippet
   - Click "Open in new tab" → opens embed page directly

**Step 5: Test iframe embedding**

Create a simple HTML file to test actual embedding:

```bash
cat > /tmp/test-embed.html << 'HTML'
<!DOCTYPE html>
<html>
<head><title>Test Embed</title></head>
<body style="max-width: 800px; margin: 40px auto; font-family: sans-serif;">
<h1>My Conference Website</h1>
<h2>Schedule</h2>
<iframe src="http://localhost:3000/embed/4f8d60fa-4e10-4d83-932e-24fe83337c88/agenda?accent=3b82f6&theme=light" width="100%" height="600" frameborder="0" style="border: none; border-radius: 8px;"></iframe>
</body>
</html>
HTML
open /tmp/test-embed.html
```

Verify the agenda widget loads inside the iframe on the test page.

**Step 6: Fix any issues found during testing**

Address any rendering, toggle, or iframe issues discovered.

---
