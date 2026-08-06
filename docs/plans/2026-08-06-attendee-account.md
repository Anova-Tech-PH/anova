# Attendee Account Feature — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let attendees create accounts after registration and access a personal dashboard with their tickets, bookmarked sessions, and profile.

**Architecture:** New `(attendee)` route group at `/my` with server-side auth guard. Account creation via Supabase signUp from the QR confirmation page. Middleware updated to route attendees (users without orgs) to `/my` instead of `/onboarding`. Public event nav updated with user menu when logged in.

**Tech Stack:** Next.js 16 (App Router, Server Components, Server Actions), Supabase Auth, Tailwind 4, Lucide icons, Sonner toasts.

---

### Task 1: Attendee Server Actions & Queries

**Files:**
- Create: `apps/web/src/features/attendee/actions.ts`
- Create: `apps/web/src/features/attendee/queries.ts`

**Step 1: Create queries file**

```ts
// apps/web/src/features/attendee/queries.ts
import { createClient } from "@attendly/ui/supabase/server";

export async function getMyRegistrations(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("registrations")
    .select(`
      id, name, email, status, qr_code, created_at,
      ticket_types(name, type, price),
      events(id, title, slug, start_date, end_date, venue_name,
        organizations(slug))
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getMyBookmarkedSessions(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("session_bookmarks")
    .select(`
      session_id, created_at,
      sessions(
        id, title, description, start_time, end_time, location, type,
        track:tracks(id, name, color),
        session_speakers(speaker_id, speakers(id, name, title, photo)),
        events(id, title, slug, organizations(slug))
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getMyProfile(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}
```

**Step 2: Create actions file**

```ts
// apps/web/src/features/attendee/actions.ts
"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function createAttendeeAccount(data: {
  email: string;
  password: string;
  fullName: string;
}) {
  const supabase = await createClient();

  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: { full_name: data.fullName },
    },
  });

  if (error) throw new Error(error.message);
  if (!authData.user) throw new Error("Account creation failed");

  // Link existing registrations by email to this new account
  await supabase
    .from("registrations")
    .update({ user_id: authData.user.id, updated_at: new Date().toISOString() })
    .eq("email", data.email)
    .is("user_id", null);

  return { userId: authData.user.id };
}

export async function toggleSessionBookmark(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // Check if bookmark exists
  const { data: existing } = await supabase
    .from("session_bookmarks")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("session_id", sessionId)
    .single();

  if (existing) {
    await supabase
      .from("session_bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("session_id", sessionId);
  } else {
    const { error } = await supabase
      .from("session_bookmarks")
      .insert({ user_id: user.id, session_id: sessionId });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/my/schedule");
  return { bookmarked: !existing };
}

export async function updateMyProfile(data: {
  full_name: string;
  bio?: string;
  company?: string;
  job_title?: string;
  linkedin_url?: string;
  twitter_handle?: string;
  interests?: string[];
  looking_for?: string[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("profiles")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/my/profile");
}
```

**Step 3: Commit**

```bash
git add apps/web/src/features/attendee/
git commit -m "feat: add attendee account actions and queries"
```

---

### Task 2: Attendee Layout & My Tickets Page

**Files:**
- Create: `apps/web/src/app/(attendee)/layout.tsx`
- Create: `apps/web/src/app/(attendee)/my/page.tsx`

**Step 1: Create attendee layout**

The layout should be a simple header-based navigation (not a full sidebar like organizer). Links: My Tickets, My Schedule, Profile. Logo links to `/my`. Sign out button. Auth guard via server-side redirect.

```tsx
// apps/web/src/app/(attendee)/layout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { AttendeeNav } from "./attendee-nav";

export default async function AttendeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/my");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen">
      <AttendeeNav
        userName={profile?.full_name || user.email || ""}
        userEmail={user.email || ""}
      />
      <main className="mx-auto max-w-4xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
```

**Step 2: Create attendee nav (client component)**

```tsx
// apps/web/src/app/(attendee)/attendee-nav.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Ticket, CalendarHeart, UserCircle, LogOut } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/client";
import { Logo } from "@attendly/ui/logo";

const navItems = [
  { label: "My Tickets", path: "/my", icon: Ticket },
  { label: "My Schedule", path: "/my/schedule", icon: CalendarHeart },
  { label: "Profile", path: "/my/profile", icon: UserCircle },
];

export function AttendeeNav({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b px-4 py-3">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <Link href="/my">
          <Logo size="sm" />
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map(({ label, path, icon: Icon }) => {
            const isActive =
              path === "/my"
                ? pathname === "/my"
                : pathname.startsWith(path);

            return (
              <Link
                key={path}
                href={path}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {userName || userEmail}
          </span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
```

**Step 3: Create My Tickets page**

```tsx
// apps/web/src/app/(attendee)/my/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { getMyRegistrations } from "@/features/attendee/queries";
import { TicketsList } from "./tickets-list";

export default async function MyTicketsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/my");

  const registrations = await getMyRegistrations(user.id);

  return (
    <div>
      <h1 className="text-2xl font-semibold">My Tickets</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your event registrations and tickets.
      </p>
      <TicketsList registrations={registrations} />
    </div>
  );
}
```

**Step 4: Create TicketsList client component**

```tsx
// apps/web/src/app/(attendee)/my/tickets-list.tsx
"use client";

import { useState, useEffect } from "react";
import { Ticket, ChevronDown, ChevronUp } from "lucide-react";
import QRCode from "qrcode";
import { Card, Badge } from "@attendly/ui/components";

type Registration = {
  id: string;
  name: string;
  email: string;
  status: string;
  qr_code: string;
  created_at: string;
  ticket_types: { name: string; type: string; price: number } | null;
  events: {
    id: string;
    title: string;
    slug: string;
    start_date: string;
    end_date: string;
    venue_name: string | null;
    organizations: { slug: string } | null;
  } | null;
};

const statusVariant: Record<string, "success" | "warning" | "default" | "primary"> = {
  confirmed: "success",
  checked_in: "primary",
  pending: "warning",
  cancelled: "default",
};

export function TicketsList({ registrations }: { registrations: Registration[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    registrations.forEach((reg) => {
      if (reg.status !== "cancelled") {
        QRCode.toDataURL(reg.qr_code, {
          width: 180,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        }).then((url) => {
          setQrUrls((prev) => ({ ...prev, [reg.id]: url }));
        });
      }
    });
  }, [registrations]);

  if (registrations.length === 0) {
    return (
      <div className="mt-12 flex flex-col items-center gap-3 text-center text-muted-foreground">
        <Ticket className="h-12 w-12 opacity-30" />
        <p className="text-lg font-medium">No tickets yet</p>
        <p className="text-sm">Register for an event to see your tickets here.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {registrations.map((reg) => {
        const expanded = expandedId === reg.id;
        const event = reg.events;
        const dateStr = event
          ? new Date(event.start_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "";

        return (
          <Card key={reg.id} className="overflow-hidden">
            <button
              onClick={() => setExpandedId(expanded ? null : reg.id)}
              className="w-full p-5 text-left"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{event?.title ?? "Event"}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {reg.ticket_types?.name ?? "Ticket"} &middot; {dateStr}
                  </p>
                  {event?.venue_name && (
                    <p className="text-xs text-muted-foreground">{event.venue_name}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant[reg.status] ?? "default"}>
                    {reg.status}
                  </Badge>
                  {expanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </button>

            {expanded && reg.status !== "cancelled" && (
              <div className="border-t px-5 py-6 flex flex-col items-center gap-3">
                {qrUrls[reg.id] && (
                  <img
                    src={qrUrls[reg.id]}
                    alt="QR Code"
                    className="rounded-lg"
                    width={180}
                    height={180}
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Show this QR code at check-in
                </p>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add apps/web/src/app/(attendee)/
git commit -m "feat: add attendee layout and My Tickets page"
```

---

### Task 3: My Schedule Page

**Files:**
- Create: `apps/web/src/app/(attendee)/my/schedule/page.tsx`

**Step 1: Create the page**

```tsx
// apps/web/src/app/(attendee)/my/schedule/page.tsx
import { redirect } from "next/navigation";
import { CalendarHeart, Clock, MapPin, X } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";
import { getMyBookmarkedSessions } from "@/features/attendee/queries";
import { Card, Badge, Avatar } from "@attendly/ui/components";
import { RemoveBookmarkButton } from "./remove-bookmark-button";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function MySchedulePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/my/schedule");

  const bookmarks = await getMyBookmarkedSessions(user.id);

  if (!bookmarks || bookmarks.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">My Schedule</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sessions you've saved.</p>
        <div className="mt-12 flex flex-col items-center gap-3 text-center text-muted-foreground">
          <CalendarHeart className="h-12 w-12 opacity-30" />
          <p className="text-lg font-medium">No saved sessions</p>
          <p className="text-sm">Browse an event's schedule and bookmark sessions to see them here.</p>
        </div>
      </div>
    );
  }

  // Group by event
  const byEvent: Record<string, { eventTitle: string; eventSlug: string; orgSlug: string; sessions: typeof bookmarks }> = {};
  for (const b of bookmarks) {
    const s = b.sessions as any;
    if (!s?.events) continue;
    const key = s.events.id;
    if (!byEvent[key]) {
      byEvent[key] = {
        eventTitle: s.events.title,
        eventSlug: s.events.slug,
        orgSlug: s.events.organizations?.slug ?? "",
        sessions: [],
      };
    }
    byEvent[key].sessions.push(b);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">My Schedule</h1>
      <p className="mt-1 text-sm text-muted-foreground">Sessions you've saved.</p>

      <div className="mt-6 space-y-8">
        {Object.entries(byEvent).map(([eventId, group]) => (
          <div key={eventId}>
            <h2 className="mb-3 text-lg font-medium">{group.eventTitle}</h2>
            <div className="space-y-3">
              {group.sessions.map((b) => {
                const s = b.sessions as any;
                return (
                  <Card key={b.session_id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{s.title}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(s.start_time)} - {formatTime(s.end_time)}
                          </span>
                          {s.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {s.location}
                            </span>
                          )}
                        </div>
                        {s.session_speakers?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {s.session_speakers.map(({ speakers: sp }: any) => (
                              <div key={sp.id} className="flex items-center gap-1.5">
                                <Avatar src={sp.photo} name={sp.name} size="sm" className="h-5 w-5" />
                                <span className="text-xs">{sp.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <RemoveBookmarkButton sessionId={b.session_id} />
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Create RemoveBookmarkButton client component**

```tsx
// apps/web/src/app/(attendee)/my/schedule/remove-bookmark-button.tsx
"use client";

import { X } from "lucide-react";
import { toast } from "sonner";
import { toggleSessionBookmark } from "@/features/attendee/actions";

export function RemoveBookmarkButton({ sessionId }: { sessionId: string }) {
  async function handleRemove() {
    try {
      await toggleSessionBookmark(sessionId);
      toast.success("Session removed from schedule");
    } catch {
      toast.error("Failed to remove session");
    }
  }

  return (
    <button
      onClick={handleRemove}
      className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      title="Remove from schedule"
    >
      <X className="h-4 w-4" />
    </button>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/src/app/(attendee)/my/schedule/
git commit -m "feat: add My Schedule page with bookmarked sessions"
```

---

### Task 4: Profile Page

**Files:**
- Create: `apps/web/src/app/(attendee)/my/profile/page.tsx`

**Step 1: Create profile page with inline form**

```tsx
// apps/web/src/app/(attendee)/my/profile/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { getMyProfile } from "@/features/attendee/queries";
import { ProfileForm } from "./profile-form";

export default async function MyProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/my/profile");

  const profile = await getMyProfile(user.id);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your public profile visible to other event attendees.
      </p>
      <ProfileForm profile={profile} email={user.email || ""} />
    </div>
  );
}
```

**Step 2: Create ProfileForm client component**

```tsx
// apps/web/src/app/(attendee)/my/profile/profile-form.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input, Textarea, Button, Card } from "@attendly/ui/components";
import { updateMyProfile } from "@/features/attendee/actions";

type Profile = {
  full_name: string;
  bio: string | null;
  company: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  twitter_handle: string | null;
  interests: string[] | null;
  looking_for: string[] | null;
};

export function ProfileForm({ profile, email }: { profile: Profile; email: string }) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [company, setCompany] = useState(profile.company ?? "");
  const [jobTitle, setJobTitle] = useState(profile.job_title ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedin_url ?? "");
  const [twitterHandle, setTwitterHandle] = useState(profile.twitter_handle ?? "");
  const [interests, setInterests] = useState((profile.interests ?? []).join(", "));
  const [lookingFor, setLookingFor] = useState((profile.looking_for ?? []).join(", "));
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await updateMyProfile({
        full_name: fullName,
        bio: bio || undefined,
        company: company || undefined,
        job_title: jobTitle || undefined,
        linkedin_url: linkedinUrl || undefined,
        twitter_handle: twitterHandle || undefined,
        interests: interests ? interests.split(",").map((s) => s.trim()).filter(Boolean) : [],
        looking_for: lookingFor ? lookingFor.split(",").map((s) => s.trim()).filter(Boolean) : [],
      });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mt-6 p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Email</label>
          <Input type="email" value={email} disabled />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Full name *</label>
          <Input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Company</label>
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Inc."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Job title</label>
            <Input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Software Engineer"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Bio</label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Tell other attendees about yourself..."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">LinkedIn URL</label>
            <Input
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Twitter / X</label>
            <Input
              value={twitterHandle}
              onChange={(e) => setTwitterHandle(e.target.value)}
              placeholder="@handle"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Interests</label>
          <Input
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="AI, Cloud, DevOps (comma-separated)"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Looking for</label>
          <Input
            value={lookingFor}
            onChange={(e) => setLookingFor(e.target.value)}
            placeholder="Networking, Hiring, Learning (comma-separated)"
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" loading={loading}>
            {loading ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/src/app/(attendee)/my/profile/
git commit -m "feat: add attendee profile page with edit form"
```

---

### Task 5: Account Creation CTA on QR Confirmation

**Files:**
- Modify: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/register/qr-confirmation.tsx`

**Step 1: Add account creation form below QR code**

Update the `QrConfirmation` component to include a "Create an account" section below the QR card. It should:
- Show a CTA button "Create an account to manage your tickets"
- On click, expand to show a password field (name/email already known)
- On submit, call `createAttendeeAccount` server action
- On success, show a success message and link to `/my`

The component needs two new props: `name` and `email` are already passed. No new props needed — those are sufficient.

Add this section **after** the existing `<Card>`:

```tsx
// Add to imports at top:
import { useState } from "react"; // already imported
import { Lock, ArrowRight, UserPlus } from "lucide-react";
import { Button, Input } from "@attendly/ui/components";
import { createAttendeeAccount } from "@/features/attendee/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Add inside component, after the Card closing tag, inside the return's wrapping div:

// New state variables (add alongside existing state):
const [showAccountForm, setShowAccountForm] = useState(false);
const [password, setPassword] = useState("");
const [accountLoading, setAccountLoading] = useState(false);
const [accountCreated, setAccountCreated] = useState(false);
const router = useRouter();

async function handleCreateAccount(e: React.FormEvent) {
  e.preventDefault();
  setAccountLoading(true);
  try {
    await createAttendeeAccount({ email, password, fullName: name });
    setAccountCreated(true);
    toast.success("Account created!");
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Failed to create account");
  } finally {
    setAccountLoading(false);
  }
}

// JSX to add after the Card:
{accountCreated ? (
  <div className="rounded-xl border bg-success-light/30 p-4 text-center">
    <p className="text-sm font-medium">Account created!</p>
    <Link href="/my" className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
      Go to My Tickets <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  </div>
) : showAccountForm ? (
  <form onSubmit={handleCreateAccount} className="rounded-xl border p-4 space-y-3">
    <p className="text-sm font-medium text-center">Set a password to create your account</p>
    <p className="text-xs text-muted-foreground text-center">{email}</p>
    <Input
      type="password"
      required
      minLength={8}
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      placeholder="At least 8 characters"
    />
    <Button type="submit" loading={accountLoading} className="w-full">
      {accountLoading ? "Creating..." : "Create account"}
    </Button>
  </form>
) : (
  <button
    onClick={() => setShowAccountForm(true)}
    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
  >
    <UserPlus className="h-4 w-4" />
    Create an account to manage your tickets
  </button>
)}
```

The full updated file should incorporate these additions into the existing component. Add `Link` import from `next/link`.

**Step 2: Commit**

```bash
git add apps/web/src/app/(public)/[orgSlug]/[eventSlug]/register/qr-confirmation.tsx
git commit -m "feat: add account creation CTA to registration confirmation"
```

---

### Task 6: Update Middleware for Attendee Routing

**Files:**
- Modify: `apps/web/src/middleware.ts`

**Step 1: Add `/my` route protection and attendee routing**

Add two middleware rules:

1. **Protect `/my` routes** — require authentication, redirect to `/login?redirect=/my`
2. **Update login/signup redirect** — logged-in users without an org should go to `/my` not `/dashboard`
3. **Update onboarding** — users without an org who have registrations should be allowed to go to `/my` instead of being forced to onboard

Changes to `middleware.ts`:

After the existing organizer route protection block (line 42-49), add:

```ts
// Protect attendee routes
if (pathname.startsWith("/my")) {
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }
}
```

Update the login/signup redirect block (lines 52-58) to check for org membership:

```ts
// Redirect logged-in users away from auth pages
if (pathname.startsWith("/login") || pathname.startsWith("/signup")) {
  if (user) {
    const { count } = await supabase
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const url = request.nextUrl.clone();
    url.pathname = count && count > 0 ? "/dashboard" : "/my";
    return NextResponse.redirect(url);
  }
}
```

Update the onboarding block (lines 61-78): if user has no org, redirect to `/my` instead of keeping them on onboarding (unless they choose to create an org):

```ts
if (pathname.startsWith("/onboarding")) {
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  const { count } = await supabase
    .from("organization_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (count && count > 0) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }
  // User has no org — let them stay on onboarding if they navigated here intentionally
}
```

**Step 2: Commit**

```bash
git add apps/web/src/middleware.ts
git commit -m "feat: add /my route protection and attendee routing in middleware"
```

---

### Task 7: Update Public Event Nav with User Menu

**Files:**
- Modify: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/event-nav.tsx`

**Step 1: Add user auth state and dropdown**

Update `EventNav` to check if user is logged in (client-side via Supabase). If logged in, show a user avatar/initials with a dropdown containing "My Tickets", "Profile", "Sign out". If not logged in, show a "Sign in" link.

The component is already a client component. Add:

```tsx
// Additional imports:
import { useState, useEffect, useRef } from "react";
import { createClient } from "@attendly/ui/supabase/client";
import { LogIn, LogOut, UserCircle } from "lucide-react";

// Inside the component, add auth state:
const [user, setUser] = useState<{ email: string } | null>(null);
const [menuOpen, setMenuOpen] = useState(false);
const menuRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const supabase = createClient();
  supabase.auth.getUser().then(({ data }) => {
    setUser(data.user ? { email: data.user.email ?? "" } : null);
  });
}, []);

// Close menu on outside click
useEffect(() => {
  function handleClick(e: MouseEvent) {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setMenuOpen(false);
    }
  }
  document.addEventListener("mousedown", handleClick);
  return () => document.removeEventListener("mousedown", handleClick);
}, []);

async function handleSignOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.reload();
}
```

After the nav `</nav>`, add the user section:

```tsx
{user ? (
  <div className="relative" ref={menuRef}>
    <button
      onClick={() => setMenuOpen(!menuOpen)}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary"
    >
      {user.email.charAt(0).toUpperCase()}
    </button>
    {menuOpen && (
      <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border bg-card p-1 shadow-lg z-50">
        <Link
          href="/my"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
          onClick={() => setMenuOpen(false)}
        >
          <Ticket className="h-3.5 w-3.5" /> My Tickets
        </Link>
        <Link
          href="/my/profile"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
          onClick={() => setMenuOpen(false)}
        >
          <UserCircle className="h-3.5 w-3.5" /> Profile
        </Link>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-muted"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>
    )}
  </div>
) : (
  <Link
    href={`/login?redirect=${encodeURIComponent(pathname)}`}
    className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
  >
    <LogIn className="h-3.5 w-3.5" />
    <span className="hidden sm:inline">Sign in</span>
  </Link>
)}
```

Wrap the return in a `<div className="flex items-center gap-2">` containing the `<nav>` and the user section.

**Step 2: Commit**

```bash
git add apps/web/src/app/(public)/[orgSlug]/[eventSlug]/event-nav.tsx
git commit -m "feat: add user menu to public event navigation"
```

---

### Task 8: Session Bookmark Toggle on Public Schedule

**Files:**
- Modify: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/schedule/page.tsx`
- Create: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/schedule/bookmark-button.tsx`

**Step 1: Create BookmarkButton client component**

```tsx
// apps/web/src/app/(public)/[orgSlug]/[eventSlug]/schedule/bookmark-button.tsx
"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { toggleSessionBookmark } from "@/features/attendee/actions";

export function BookmarkButton({
  sessionId,
  initialBookmarked,
}: {
  sessionId: string;
  initialBookmarked: boolean;
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      const result = await toggleSessionBookmark(sessionId);
      setBookmarked(result.bookmarked);
      toast.success(result.bookmarked ? "Session saved" : "Session removed");
    } catch {
      toast.error("Sign in to save sessions");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`rounded-md p-1.5 transition-colors ${
        bookmarked
          ? "text-primary bg-primary/10"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
      title={bookmarked ? "Remove from schedule" : "Save to schedule"}
    >
      <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`} />
    </button>
  );
}
```

**Step 2: Update schedule page to include bookmark buttons**

In `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/schedule/page.tsx`:

- Import `BookmarkButton` and the server-side Supabase client
- After fetching sessions, check if user is logged in
- If logged in, fetch their bookmarks for this event's sessions
- Pass `initialBookmarked` to `BookmarkButton` for each session
- Render `BookmarkButton` in each session card (top-right corner, next to track badge)

Add after the sessions query:

```tsx
// Check if user is logged in for bookmark state
const { data: { user } } = await supabase.auth.getUser();
let bookmarkedIds = new Set<string>();
if (user) {
  const sessionIds = (sessions ?? []).map((s) => s.id);
  if (sessionIds.length > 0) {
    const { data: bookmarks } = await supabase
      .from("session_bookmarks")
      .select("session_id")
      .eq("user_id", user.id)
      .in("session_id", sessionIds);
    bookmarkedIds = new Set((bookmarks ?? []).map((b) => b.session_id));
  }
}
```

In each session card JSX, add the bookmark button in the top-right area (alongside the type badge):

```tsx
<div className="flex items-center justify-between">
  <div className="flex items-center gap-2">
    <Badge variant={typeBadgeVariant[session.type] ?? "default"}>
      {session.type}
    </Badge>
    {session.track && (
      <span className="text-[10px] text-muted-foreground">
        {session.track.name}
      </span>
    )}
  </div>
  {user && (
    <BookmarkButton
      sessionId={session.id}
      initialBookmarked={bookmarkedIds.has(session.id)}
    />
  )}
</div>
```

**Step 3: Commit**

```bash
git add apps/web/src/app/(public)/[orgSlug]/[eventSlug]/schedule/
git commit -m "feat: add session bookmark toggle to public schedule"
```

---

### Task 9: Update Login Redirect for Attendees

**Files:**
- Modify: `apps/web/src/app/(auth)/signup/page.tsx`

**Step 1: Update signup redirect logic**

The signup page currently always redirects to `/onboarding`. Update it to check for a `redirect` query param (like login does). If `redirect=/my` is present, go there instead.

In `signup/page.tsx`, add `useSearchParams` import and usage:

```tsx
import { useSearchParams } from "next/navigation";

// Inside the component:
const searchParams = useSearchParams();

// In handleSubmit, after successful signup:
const redirect = searchParams.get("redirect");
const dest = redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/onboarding";
router.push(dest);
```

Wrap the default export in `<Suspense>` like login does (needed for `useSearchParams`).

**Step 2: Commit**

```bash
git add apps/web/src/app/(auth)/signup/page.tsx
git commit -m "feat: support redirect param in signup page"
```

---

### Task 10: End-to-End Testing

**No files to create — manual browser testing via Playwright MCP.**

**Test flow:**

1. Navigate to the public event page at `/techsummit-global-l46z/global-tech-summit-2026`
2. Verify "Sign in" link appears in nav (not logged in)
3. Go to Register page, select a ticket, fill form, submit
4. Verify QR confirmation shows with "Create an account" CTA
5. Click CTA, enter password, submit
6. Verify account created success message and "Go to My Tickets" link
7. Click "Go to My Tickets" — verify `/my` page shows the registration
8. Navigate to My Schedule — verify empty state
9. Navigate to Profile — verify form with pre-filled name
10. Go back to public schedule page — verify bookmark icons appear (now logged in)
11. Click a bookmark — verify session saves
12. Go to My Schedule — verify bookmarked session appears
13. Test sign out from attendee nav
14. Test sign out from public event nav user menu
15. Test login redirect: visit `/my` while logged out → should redirect to `/login?redirect=/my`
16. Sign in → should redirect back to `/my`

**Commit final:**

```bash
git commit -m "feat: attendee account feature complete"
```
