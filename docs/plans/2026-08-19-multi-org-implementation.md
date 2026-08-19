# Multi-Org Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move all organizer routes under `/org/[orgSlug]/` so each page is scoped to a specific organization, and add an org switcher dropdown in the sidebar.

**Architecture:** Replace the `(organizer)` route group with `org/[orgSlug]/` dynamic segment. The layout resolves the org from the URL slug and validates membership. All child pages receive `orgSlug` via params instead of querying `organization_members`. A cookie stores the last-used org for redirect convenience.

**Tech Stack:** Next.js 16 dynamic routes, Supabase queries, cookies for last-used org, client component for org switcher dropdown.

---

### Task 1: Create org query helpers

**Files:**
- Create: `apps/web/src/features/org/queries.ts`

**Step 1: Create the org queries file**

```ts
import { createClient } from "@attendly/ui/supabase/server";

export type OrgContext = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

export async function getOrgBySlug(orgSlug: string, userId: string): Promise<OrgContext | null> {
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", orgSlug)
    .single();

  if (!org) return null;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", org.id)
    .eq("user_id", userId)
    .single();

  if (!membership) return null;

  return { id: org.id, name: org.name, slug: org.slug, role: membership.role };
}

export async function getUserOrgs(userId: string): Promise<OrgContext[]> {
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("role, organizations(id, name, slug)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (!memberships) return [];

  return memberships.map((m) => {
    const org = m.organizations as any;
    return { id: org.id, name: org.name, slug: org.slug, role: m.role };
  });
}

export async function getFirstOrgSlug(userId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("organization_members")
    .select("organizations(slug)")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!data) return null;
  return (data.organizations as any)?.slug ?? null;
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/org/queries.ts
git commit -m "feat(org): add org query helpers for multi-org support"
```

---

### Task 2: Create the org-scoped layout with org switcher

**Files:**
- Create: `apps/web/src/app/org/[orgSlug]/layout.tsx`
- Create: `apps/web/src/shared/components/org-switcher.tsx`

**Step 1: Create the org switcher client component**

This is a dropdown in the sidebar showing the current org with a list of all orgs the user belongs to.

```tsx
// apps/web/src/shared/components/org-switcher.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/client";
import { ChevronsUpDown, Check, Plus } from "lucide-react";
import { cn } from "@attendly/ui/cn";

type Org = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

export function OrgSwitcher({
  currentSlug,
  collapsed,
}: {
  currentSlug: string;
  collapsed: boolean;
}) {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchOrgs() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberships } = await supabase
        .from("organization_members")
        .select("role, organizations(id, name, slug)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (memberships) {
        setOrgs(
          memberships.map((m) => {
            const org = m.organizations as any;
            return { id: org.id, name: org.name, slug: org.slug, role: m.role };
          })
        );
      }
    }
    fetchOrgs();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const current = orgs.find((o) => o.slug === currentSlug);

  function switchOrg(slug: string) {
    setOpen(false);
    router.push(`/org/${slug}/dashboard`);
  }

  if (collapsed) {
    return (
      <button
        onClick={() => setOpen(!open)}
        title={current?.name ?? "Switch org"}
        className="flex h-7 w-7 items-center justify-center rounded-[3px] bg-primary/10 text-xs font-bold text-primary"
      >
        {current?.name?.charAt(0).toUpperCase() ?? "O"}
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/50 px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-[3px] bg-primary/10 text-xs font-bold text-primary shrink-0">
          {current?.name?.charAt(0).toUpperCase() ?? "O"}
        </span>
        <span className="flex-1 truncate text-left font-medium">
          {current?.name ?? "Select org"}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border bg-popover p-1 shadow-lg">
          {orgs.map((org) => (
            <button
              key={org.id}
              onClick={() => switchOrg(org.slug)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                org.slug === currentSlug && "bg-accent"
              )}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-[2px] bg-primary/10 text-[10px] font-bold text-primary shrink-0">
                {org.name.charAt(0).toUpperCase()}
              </span>
              <span className="flex-1 truncate text-left">{org.name}</span>
              {org.slug === currentSlug && (
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
              )}
            </button>
          ))}
          <div className="my-1 border-t" />
          <button
            onClick={() => {
              setOpen(false);
              router.push("/onboarding");
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Create organization
          </button>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Create the org-scoped layout**

Copy the existing `(organizer)/layout.tsx` to `org/[orgSlug]/layout.tsx` and modify it to:
- Read `orgSlug` from params
- Pass `orgSlug` to all nav links (prefix with `/org/${orgSlug}`)
- Add the `OrgSwitcher` component below the wordmark
- Validate membership in a server wrapper

The layout needs to be split: a server component wrapper that validates the org, and the existing client layout that renders the sidebar.

```tsx
// apps/web/src/app/org/[orgSlug]/layout.tsx
// Copy the entire contents of (organizer)/layout.tsx, then make these changes:
// 1. Add orgSlug prop to the layout and all sub-components
// 2. Update all nav hrefs from "/dashboard" to `/org/${orgSlug}/dashboard` etc.
// 3. Add OrgSwitcher below the wordmark
// 4. Add a server wrapper that validates org membership
```

The detailed changes to the layout:

- Import `OrgSwitcher` from `@/shared/components/org-switcher`
- The outer export becomes a server component that validates org access:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { getOrgBySlug } from "@/features/org/queries";
import { OrganizerShell } from "./organizer-shell";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const org = await getOrgBySlug(orgSlug, user.id);
  if (!org) redirect("/onboarding");

  return <OrganizerShell orgSlug={orgSlug}>{children}</OrganizerShell>;
}
```

- Move the existing client layout code into `org/[orgSlug]/organizer-shell.tsx` (rename from the current layout), accepting `orgSlug` as a prop
- Update `organizerNav` to use orgSlug:

```tsx
const organizerNav = [
  { href: `/org/${orgSlug}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
  { href: `/org/${orgSlug}/events`, label: "Events", icon: Calendar },
  { href: `/org/${orgSlug}/settings/team`, label: "Team", icon: Users },
];
```

- Update settings link: `href={`/org/${orgSlug}/settings`}`
- Update all `<Link href="/dashboard">` to `<Link href={`/org/${orgSlug}/dashboard`}>`
- Add `<OrgSwitcher currentSlug={orgSlug} collapsed={collapsed} />` after the wordmark in the sidebar header
- Update `isEventDetailRoute` regex to match `/org/[slug]/events/<uuid>/...`

**Step 3: Commit**

```bash
git add apps/web/src/shared/components/org-switcher.tsx apps/web/src/app/org/
git commit -m "feat(org): add org-scoped layout with org switcher"
```

---

### Task 3: Move organizer pages into org-scoped routes

**Files:**
- Move: `apps/web/src/app/(organizer)/dashboard/` -> `apps/web/src/app/org/[orgSlug]/dashboard/`
- Move: `apps/web/src/app/(organizer)/events/` -> `apps/web/src/app/org/[orgSlug]/events/`
- Move: `apps/web/src/app/(organizer)/settings/` -> `apps/web/src/app/org/[orgSlug]/settings/`
- Delete: `apps/web/src/app/(organizer)/layout.tsx`

**Step 1: Move directories**

```bash
cp -r apps/web/src/app/\(organizer\)/dashboard apps/web/src/app/org/\[orgSlug\]/dashboard
cp -r apps/web/src/app/\(organizer\)/events apps/web/src/app/org/\[orgSlug\]/events
cp -r apps/web/src/app/\(organizer\)/settings apps/web/src/app/org/\[orgSlug\]/settings
```

**Step 2: Delete old organizer route group**

```bash
rm -rf apps/web/src/app/\(organizer\)
```

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: move organizer routes under /org/[orgSlug]/"
```

---

### Task 4: Update dashboard to use org-scoped queries

**Files:**
- Modify: `apps/web/src/app/org/[orgSlug]/dashboard/page.tsx`
- Modify: `apps/web/src/features/dashboard/queries.ts`
- Modify: `apps/web/src/app/org/[orgSlug]/dashboard/dashboard-content.tsx`

**Step 1: Update `getDashboardStats` to accept `orgId` instead of `userId`**

In `features/dashboard/queries.ts`, change the function signature from `getDashboardStats(userId: string)` to `getDashboardStats(orgId: string)`. Remove the organization_members lookup. Change the events query from `.in("organization_id", orgIds)` to `.eq("organization_id", orgId)`.

**Step 2: Update dashboard page to use orgSlug from params**

```tsx
// apps/web/src/app/org/[orgSlug]/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { getOrgBySlug } from "@/features/org/queries";
import { getDashboardStats } from "@/features/dashboard/queries";
import { DashboardContent } from "./dashboard-content";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getOrgBySlug(orgSlug, user.id);
  if (!org) redirect("/onboarding");

  const stats = await getDashboardStats(org.id);

  return (
    <DashboardContent
      userName={user.user_metadata?.full_name}
      stats={stats}
      orgSlug={orgSlug}
    />
  );
}
```

**Step 3: Update dashboard-content.tsx links**

Add `orgSlug` prop to `DashboardContent`. Update all hardcoded links:
- `href="/events/new"` -> `href={`/org/${orgSlug}/events/new`}`
- `href="/events"` -> `href={`/org/${orgSlug}/events`}`
- `href={`/events/${event.id}`}` -> `href={`/org/${orgSlug}/events/${event.id}`}`

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(dashboard): scope dashboard queries to active org"
```

---

### Task 5: Update events list page to use org-scoped queries

**Files:**
- Modify: `apps/web/src/app/org/[orgSlug]/events/page.tsx`
- Modify: `apps/web/src/app/org/[orgSlug]/events/events-list.tsx`

**Step 1: Update events page**

Replace the multi-org membership lookup with `getOrgBySlug`. Query events by single `org.id`.

```tsx
// apps/web/src/app/org/[orgSlug]/events/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";
import { getOrgBySlug } from "@/features/org/queries";
import { EmptyState, Button } from "@attendly/ui/components";
import { EventsList } from "./events-list";

export default async function EventsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getOrgBySlug(orgSlug, user.id);
  if (!org) redirect("/onboarding");

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false });

  const regCounts: Record<string, number> = {};
  if (events && events.length > 0) {
    for (const event of events) {
      const { count } = await supabase
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id);
      regCounts[event.id] = count ?? 0;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="text-sm text-muted-foreground">
            {events?.length ?? 0} event{events?.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link href={`/org/${orgSlug}/events/new`}>
          <Button className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            New Event
          </Button>
        </Link>
      </div>

      {!events || events.length === 0 ? (
        <EmptyState
          title="No events yet"
          className="py-16"
          action={
            <Link
              href={`/org/${orgSlug}/events/new`}
              className="text-sm font-medium text-primary underline"
            >
              Create one now
            </Link>
          }
        />
      ) : (
        <EventsList events={events} regCounts={regCounts} orgSlug={orgSlug} />
      )}
    </div>
  );
}
```

**Step 2: Update events-list.tsx**

Add `orgSlug` prop. Update all event links from `href={`/events/${event.id}`}` to `href={`/org/${orgSlug}/events/${event.id}`}`.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(events): scope events list to active org"
```

---

### Task 6: Update event creation page

**Files:**
- Modify: `apps/web/src/app/org/[orgSlug]/events/new/page.tsx`

**Step 1: Update the page**

This is a client component. It needs `orgSlug` from the URL. Use `useParams()` to get it.

Key changes:
- Replace the `organization_members` query in `handleCreate` with a direct org lookup by slug
- Replace the `organization_members` query in `fetchTemplates` with an org lookup by slug
- Update `router.push` after creation: `router.push(`/org/${orgSlug}/events/${event.id}`)`
- The `orgSlug` comes from `useParams().orgSlug`

In `handleCreate`, instead of querying `organization_members`, query `organizations` by slug:

```tsx
const { data: org } = await supabase
  .from("organizations")
  .select("id")
  .eq("slug", orgSlug)
  .single();

if (!org) {
  toast.error("Organization not found");
  return;
}
```

Then use `org.id` as the `organization_id` for event creation.

**Step 2: Commit**

```bash
git add -A
git commit -m "feat(events): scope event creation to active org"
```

---

### Task 7: Update settings and team pages

**Files:**
- Modify: `apps/web/src/app/org/[orgSlug]/settings/page.tsx`
- Modify: `apps/web/src/app/org/[orgSlug]/settings/team/page.tsx`

**Step 1: Update settings page**

Replace the `.single()` org_members query with `getOrgBySlug(orgSlug, user.id)`. Use `org.name` and `org.slug` directly.

Add params to the page:

```tsx
export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  // ... use getOrgBySlug(orgSlug, user.id) instead of organization_members query
}
```

Update the team link: `href={`/org/${orgSlug}/settings/team`}`

**Step 2: Update team page**

Replace the `.limit(1).single()` org_members query with `getOrgBySlug(orgSlug, user.id)`.

```tsx
export default async function TeamPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  // ... use getOrgBySlug(orgSlug, user.id)
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(settings): scope settings pages to active org"
```

---

### Task 8: Update event detail routes

**Files:**
- Modify: `apps/web/src/app/org/[orgSlug]/events/[eventId]/event-sub-sidebar.tsx`
- Modify: `apps/web/src/app/org/[orgSlug]/events/[eventId]/settings/settings-form.tsx`
- Modify: `apps/web/src/app/org/[orgSlug]/events/[eventId]/copy-link-button.tsx`

**Step 1: Update event-sub-sidebar back link**

Change `href="/events"` to use orgSlug from `useParams()`:

```tsx
const params = useParams();
const orgSlug = params.orgSlug as string;
// ...
href={`/org/${orgSlug}/events`}
```

**Step 2: Update settings-form.tsx**

Change `router.push("/events")` to `router.push(`/org/${orgSlug}/events`)`.

**Step 3: Check the event detail layout**

In `apps/web/src/app/org/[orgSlug]/events/[eventId]/layout.tsx` (if it exists), update any hardcoded `/events` links to include orgSlug.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(events): update event detail links for org-scoped routes"
```

---

### Task 9: Update middleware for redirects and backwards compatibility

**Files:**
- Modify: `apps/web/src/middleware.ts`

**Step 1: Update middleware**

Key changes:
- Protect `/org/*` routes (require auth)
- Add redirects for old routes: `/dashboard` -> `/org/[first-org]/dashboard`, `/events` -> `/org/[first-org]/events`, `/settings` -> `/org/[first-org]/settings`
- On login redirect, send to `/org/[first-org]/dashboard` instead of `/dashboard`
- Remove old `/dashboard` and `/events` protection logic (replaced by `/org/*`)
- The org membership validation happens in the layout, not middleware (to keep middleware fast)

For the redirect logic, query the user's first org slug:

```tsx
// Helper in middleware
async function getFirstOrgSlug(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("organization_members")
    .select("organizations(slug)")
    .eq("user_id", userId)
    .limit(1)
    .single();
  return (data?.organizations as any)?.slug ?? null;
}
```

Add redirect handlers:

```tsx
// Redirect old organizer routes to org-scoped ones
if (user && (pathname === "/dashboard" || pathname === "/events" || pathname.startsWith("/events/") || pathname === "/settings" || pathname.startsWith("/settings/"))) {
  const slug = await getFirstOrgSlug(supabase, user.id);
  if (slug) {
    const url = request.nextUrl.clone();
    url.pathname = `/org/${slug}${pathname}`;
    return NextResponse.redirect(url);
  }
  // No org — send to onboarding
  const url = request.nextUrl.clone();
  url.pathname = "/onboarding";
  return NextResponse.redirect(url);
}

// Protect /org/* routes
if (pathname.startsWith("/org/")) {
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }
}
```

Update login redirect from `/dashboard` to use org slug:

```tsx
const slug = await getFirstOrgSlug(supabase, user.id);
url.pathname = slug ? `/org/${slug}/dashboard` : "/my-events";
```

Update the onboarding check: remove the redirect to `/dashboard`, it now goes to `/org/[slug]/dashboard`.

**Step 2: Commit**

```bash
git add apps/web/src/middleware.ts
git commit -m "feat(middleware): add org-scoped route redirects and backwards compat"
```

---

### Task 10: Update onboarding redirect

**Files:**
- Modify: `apps/web/src/app/(auth)/onboarding/page.tsx`

**Step 1: Update redirect after org creation**

Change `router.push("/dashboard")` to redirect to the newly created org:

```tsx
// After org creation, use the slug we generated
router.push(`/org/${slug}/dashboard`);
```

The `slug` variable is already available in the `handleSubmit` function.

Also update the middleware check: onboarding should redirect to `/org/[slug]/dashboard` if user already has an org.

**Step 2: Commit**

```bash
git add apps/web/src/app/\(auth\)/onboarding/page.tsx
git commit -m "feat(onboarding): redirect to org-scoped dashboard after setup"
```

---

### Task 11: Update `getCurrentUserOrgId` and server actions

**Files:**
- Modify: `apps/web/src/features/team/queries.ts` — update `getCurrentUserOrgId` (may be unused after refactor, check and remove if so)
- Audit: `apps/web/src/features/team/actions.ts` — these already accept `orgId` as param, verify no `.single()` org lookups remain
- Audit: `apps/web/src/features/templates/actions.ts` — verify org resolution
- Audit: `apps/web/src/features/payments/actions.ts` — verify org resolution

**Step 1: Check each server action file for `organization_members` queries that use `.single()` without a specific org**

For any that do, they should already receive `orgId` as a parameter from the calling page. If not, add the parameter.

**Step 2: Remove `getCurrentUserOrgId` from team/queries.ts if no longer used**

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: clean up org resolution in server actions"
```

---

### Task 12: Smoke test and final verification

**Step 1: Start the dev server**

```bash
cd apps/web && pnpm dev
```

**Step 2: Test these flows**

1. Login -> should redirect to `/org/[slug]/dashboard`
2. `/dashboard` -> should redirect to `/org/[slug]/dashboard`
3. `/events` -> should redirect to `/org/[slug]/events`
4. Org switcher shows all orgs in sidebar
5. Switching org navigates to new org's dashboard
6. Create event works under the scoped org
7. Events list shows only events for the active org
8. Settings page shows the active org's details
9. Team page shows the active org's team
10. Onboarding creates org and redirects to `/org/[new-slug]/dashboard`

**Step 3: Final commit with any fixes**

```bash
git add -A
git commit -m "fix: address smoke test issues for multi-org support"
```

**Step 4: Push**

```bash
git push
```
