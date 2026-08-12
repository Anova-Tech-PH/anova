# Sub-Sidebar Navigation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the horizontal scrollable tab bar in event pages with a grouped vertical sub-sidebar, and collapse the main sidebar to icons-only when inside an event.

**Architecture:** The organizer layout detects `/events/[uuid]/...` routes via `usePathname()` and conditionally collapses the main sidebar (240px -> 56px). The event `[eventId]/layout.tsx` server component passes event data to a new `EventSubSidebar` client component that renders grouped navigation items. The horizontal `DesktopTabs` and `MobileTabSelect` components are removed.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, Framer Motion (motion/react), Lucide icons

---

### Task 1: Create the EventSubSidebar Client Component

**Files:**
- Create: `apps/web/src/app/(organizer)/events/[eventId]/event-sub-sidebar.tsx`

**Step 1: Create the grouped sub-sidebar component**

This component receives event info + tabs grouped into sections and renders them as a vertical sidebar.

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@attendly/ui/cn";
import {
  BarChart2, BarChart3, Calendar, CalendarCheck, ClipboardList,
  DoorOpen, IdCard, ListChecks, Mail, Megaphone, MessageSquare,
  Globe, QrCode, Settings, Tag, Ticket, Users, Award,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  "bar-chart-2": BarChart2,
  "bar-chart-3": BarChart3,
  calendar: Calendar,
  "calendar-check": CalendarCheck,
  "clipboard-list": ClipboardList,
  "door-open": DoorOpen,
  globe: Globe,
  "id-card": IdCard,
  "list-checks": ListChecks,
  mail: Mail,
  megaphone: Megaphone,
  "message-square": MessageSquare,
  "qr-code": QrCode,
  settings: Settings,
  tag: Tag,
  ticket: Ticket,
  users: Users,
  award: Award,
};

interface TabItem {
  href: string;
  label: string;
  icon: string;
}

interface TabGroup {
  label: string;
  items: TabItem[];
}

export function EventSubSidebar({
  eventTitle,
  groups,
}: {
  eventTitle: string;
  groups: TabGroup[];
}) {
  const pathname = usePathname();

  return (
    <motion.aside
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="hidden w-56 shrink-0 border-r bg-sidebar lg:flex lg:flex-col"
    >
      {/* Event header */}
      <div className="flex h-14 flex-col justify-center border-b px-4">
        <Link
          href="/events"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Events
        </Link>
        <p className="mt-0.5 truncate text-sm font-semibold">{eventTitle}</p>
      </div>

      {/* Grouped navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        {groups.map((group) => (
          <div key={group.label} className="mb-3">
            <div className="flex items-center gap-2 px-3 py-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {group.label}
              </p>
            </div>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const isActive = item.href === pathname;
                const Icon = iconMap[item.icon];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-all duration-200",
                      isActive
                        ? "text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/40"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="event-sidebar-indicator"
                        className="absolute inset-0 rounded-lg bg-sidebar-accent shadow-sm"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                      />
                    )}
                    <span className="relative flex items-center gap-2.5">
                      {Icon && <Icon className="h-4 w-4 shrink-0" />}
                      <span>{item.label}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </motion.aside>
  );
}
```

**Step 2: Verify the file compiles**

Run: `cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly && pnpm turbo build --filter=web -- --no-lint 2>&1 | tail -20`

If TypeScript errors appear, fix imports. The component is not rendered yet so it won't visually appear.

**Step 3: Commit**

```bash
git add apps/web/src/app/\(organizer\)/events/\[eventId\]/event-sub-sidebar.tsx
git commit -m "feat(nav): add EventSubSidebar component with grouped navigation"
```

---

### Task 2: Create the MobileEventNav Component

**Files:**
- Create: `apps/web/src/app/(organizer)/events/[eventId]/mobile-event-nav.tsx`

**Step 1: Create the mobile grouped navigation component**

This replaces the flat dropdown select with a grouped drawer-style navigation for mobile. Since we don't have a Sheet/Drawer component, we'll use a collapsible panel with Framer Motion.

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@attendly/ui/cn";
import {
  BarChart2, BarChart3, Calendar, CalendarCheck, ClipboardList,
  DoorOpen, IdCard, ListChecks, Mail, Megaphone, MessageSquare,
  Globe, QrCode, Settings, Tag, Ticket, Users, Award,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  "bar-chart-2": BarChart2,
  "bar-chart-3": BarChart3,
  calendar: Calendar,
  "calendar-check": CalendarCheck,
  "clipboard-list": ClipboardList,
  "door-open": DoorOpen,
  globe: Globe,
  "id-card": IdCard,
  "list-checks": ListChecks,
  mail: Mail,
  megaphone: Megaphone,
  "message-square": MessageSquare,
  "qr-code": QrCode,
  settings: Settings,
  tag: Tag,
  ticket: Ticket,
  users: Users,
  award: Award,
};

interface TabItem {
  href: string;
  label: string;
  icon: string;
}

interface TabGroup {
  label: string;
  items: TabItem[];
}

export function MobileEventNav({
  groups,
}: {
  groups: TabGroup[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Find current tab label
  const allItems = groups.flatMap((g) => g.items);
  const current = allItems.find((t) => t.href === pathname) ?? allItems[0];
  const CurrentIcon = current ? iconMap[current.icon] : null;

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-10 w-full items-center justify-between rounded-lg border bg-background px-3 text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          {CurrentIcon && <CurrentIcon className="h-4 w-4" />}
          {current?.label}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden rounded-b-lg border border-t-0 bg-background"
          >
            <div className="max-h-80 overflow-y-auto p-2">
              {groups.map((group) => (
                <div key={group.label} className="mb-2">
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </p>
                  {group.items.map((item) => {
                    const isActive = item.href === pathname;
                    const Icon = iconMap[item.icon];
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        {Icon && <Icon className="h-4 w-4" />}
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/\(organizer\)/events/\[eventId\]/mobile-event-nav.tsx
git commit -m "feat(nav): add MobileEventNav component with grouped collapsible navigation"
```

---

### Task 3: Update Event Layout to Use Sub-Sidebar

**Files:**
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx`

**Step 1: Replace the full event layout**

Remove the horizontal `DesktopTabs` and `MobileTabSelect` imports. Add `EventSubSidebar` and `MobileEventNav`. Restructure the layout so the sub-sidebar sits to the left of the content area. The event header (title, date, badge) moves into the content area.

Define the tab groups here in the server component:

```tsx
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
      label: "Event Setup",
      items: [
        { href: `/events/${eventId}`, label: "Overview", icon: "bar-chart-3" },
        { href: `/events/${eventId}/schedule`, label: "Schedule", icon: "calendar" },
        { href: `/events/${eventId}/rooms`, label: "Rooms", icon: "door-open" },
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
        { href: `/events/${eventId}/feedback`, label: "Feedback", icon: "message-square" },
        { href: `/events/${eventId}/polls`, label: "Polls", icon: "bar-chart-2" },
        { href: `/events/${eventId}/rsvp`, label: "RSVPs", icon: "calendar-check" },
        { href: `/events/${eventId}/survey`, label: "Survey", icon: "clipboard-list" },
      ],
    },
    {
      label: "Outreach",
      items: [
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

        {/* Desktop: event header (simpler, since title is in sub-sidebar) */}
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
```

**Step 2: Verify the page renders**

Run: `cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly && pnpm turbo build --filter=web -- --no-lint 2>&1 | tail -20`

The sub-sidebar should render on desktop, but the main sidebar won't be collapsed yet (that's Task 4).

**Step 3: Commit**

```bash
git add apps/web/src/app/\(organizer\)/events/\[eventId\]/layout.tsx
git commit -m "feat(nav): replace horizontal tabs with sub-sidebar in event layout"
```

---

### Task 4: Collapse Main Sidebar When Inside an Event

**Files:**
- Modify: `apps/web/src/app/(organizer)/layout.tsx`

**Step 1: Update the organizer layout**

Add logic to detect event detail routes and collapse the sidebar. The collapsed sidebar shows only icons with tooltips. Use `motion` for smooth width animation.

Replace the full content of `layout.tsx`:

```tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, Settings, Menu, X, Users } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition } from "@attendly/ui/components";
import { Logo } from "@attendly/ui/logo";
import { cn } from "@attendly/ui/cn";

const organizerNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/settings/team", label: "Team", icon: Users },
];

/** Matches /events/<uuid>/... but NOT /events or /events/new */
function isEventDetailRoute(pathname: string) {
  return /^\/events\/[0-9a-f-]{36}(\/|$)/i.test(pathname);
}

function NavItem({
  item,
  active,
  collapsed,
}: {
  item: { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center rounded-xl text-sm transition-all duration-200",
        collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
        active
          ? "text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground hover:bg-sidebar-accent/40 hover:translate-x-0.5"
      )}
    >
      {active && (
        <motion.div
          layoutId="sidebar-indicator"
          className="absolute inset-0 rounded-xl bg-sidebar-accent shadow-sm"
          transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
        />
      )}
      <span className={cn("relative flex items-center", collapsed ? "" : "w-full gap-3")}>
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-200",
            active
              ? "bg-[oklch(0.445_0.107_195)] text-white shadow-sm"
              : "group-hover:bg-sidebar-accent/60"
          )}
        >
          <item.icon className="h-4 w-4" />
        </span>
        {!collapsed && <span className="flex-1">{item.label}</span>}
      </span>
    </Link>
  );
}

function SidebarContent({
  isActive,
  collapsed,
}: {
  isActive: (href: string) => boolean;
  collapsed: boolean;
}) {
  return (
    <>
      <nav className="flex flex-1 flex-col gap-0.5 p-2 pt-3">
        {!collapsed && (
          <div className="flex items-center gap-2 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.445_0.107_195)]" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Organizer
            </p>
          </div>
        )}
        {organizerNav.map((item) => (
          <NavItem key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} />
        ))}
      </nav>

      <div className="border-t border-sidebar-accent/60 bg-gradient-to-t from-sidebar-accent/20 to-transparent p-2">
        <Link
          href="/settings"
          title={collapsed ? "Settings" : undefined}
          className={cn(
            "group relative flex items-center rounded-xl text-sm transition-all duration-200",
            collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
            isActive("/settings")
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
              : "text-sidebar-foreground hover:bg-sidebar-accent/40 hover:translate-x-0.5"
          )}
        >
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-200",
              isActive("/settings")
                ? "bg-[oklch(0.445_0.107_195)] text-white shadow-sm"
                : "bg-sidebar-accent/40 group-hover:bg-sidebar-accent/60"
            )}
          >
            <Settings className="h-4 w-4" />
          </span>
          {!collapsed && "Settings"}
        </Link>
      </div>
    </>
  );
}

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = isEventDetailRoute(pathname);

  const isActive = useCallback(
    (href: string) => pathname === href || pathname.startsWith(href + "/"),
    [pathname]
  );

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 56 : 240 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="hidden shrink-0 border-r bg-sidebar lg:flex lg:flex-col overflow-hidden"
      >
        <div className="relative flex h-14 items-center border-b px-4">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[oklch(0.445_0.107_195)]/5 to-transparent" />
          <Link href="/dashboard" className="relative">
            <Logo size="sm" />
          </Link>
        </div>
        <SidebarContent isActive={isActive} collapsed={collapsed} />
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0.1, duration: 0.35 }}
              className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-sidebar shadow-xl lg:hidden"
            >
              <div className="relative flex h-14 items-center justify-between border-b px-4">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[oklch(0.445_0.107_195)]/5 to-transparent" />
                <Link href="/dashboard" className="relative" onClick={() => setMobileOpen(false)}>
                  <Logo size="sm" />
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="relative rounded-md p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <SidebarContent isActive={isActive} collapsed={false} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b px-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/dashboard">
            <Logo size="sm" />
          </Link>
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
```

**Step 2: Verify sidebar collapses when navigating to an event**

Run: `cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly && pnpm --filter web dev`

Navigate to `/events` — sidebar should be full width (240px).
Navigate to an event — sidebar should collapse to 56px and sub-sidebar should appear.
Navigate back to `/events` — sidebar should expand back to 240px.

**Step 3: Commit**

```bash
git add apps/web/src/app/\(organizer\)/layout.tsx
git commit -m "feat(nav): collapse main sidebar to icons when inside event detail"
```

---

### Task 5: Handle Logo in Collapsed State

**Files:**
- Modify: `apps/web/src/app/(organizer)/layout.tsx` (minor tweak)
- Read: `packages/ui/src/components/logo.tsx`

**Step 1: Check the Logo component**

Read `packages/ui/src/components/logo.tsx` to see if it has an icon-only variant or if we need to hide the text when collapsed.

**Step 2: Conditionally render logo or icon in collapsed state**

In the desktop sidebar header section of `layout.tsx`, when `collapsed` is true, either:
- Hide the logo text and show only the icon mark, OR
- Reduce the padding so the logo fits

Update just the desktop sidebar header `<div>`:

```tsx
<div className={cn(
  "relative flex h-14 items-center border-b",
  collapsed ? "justify-center px-1" : "px-4"
)}>
  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[oklch(0.445_0.107_195)]/5 to-transparent" />
  <Link href="/dashboard" className="relative">
    {collapsed ? (
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[oklch(0.445_0.107_195)] text-white text-xs font-bold">
        A
      </span>
    ) : (
      <Logo size="sm" />
    )}
  </Link>
</div>
```

**Step 3: Verify visually**

Check that the collapsed sidebar shows a small "A" icon instead of the full logo, and the expanded sidebar still shows the full logo.

**Step 4: Commit**

```bash
git add apps/web/src/app/\(organizer\)/layout.tsx
git commit -m "feat(nav): show icon mark when sidebar is collapsed"
```

---

### Task 6: Clean Up Removed Components

**Files:**
- Delete: `apps/web/src/app/(organizer)/events/[eventId]/desktop-tabs.tsx`
- Delete: `apps/web/src/app/(organizer)/events/[eventId]/mobile-tab-select.tsx`

**Step 1: Verify no other files import these components**

Search the codebase for imports of `DesktopTabs` and `MobileTabSelect`:

Run: `grep -r "DesktopTabs\|MobileTabSelect\|desktop-tabs\|mobile-tab-select" apps/web/src/ --include="*.tsx" --include="*.ts"`

The only imports should be from the old `layout.tsx` which we already updated. If any other files import them, update those too.

**Step 2: Delete the files**

```bash
rm apps/web/src/app/\(organizer\)/events/\[eventId\]/desktop-tabs.tsx
rm apps/web/src/app/\(organizer\)/events/\[eventId\]/mobile-tab-select.tsx
```

**Step 3: Verify build still passes**

Run: `cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly && pnpm turbo build --filter=web -- --no-lint 2>&1 | tail -20`

**Step 4: Commit**

```bash
git add -A
git commit -m "chore(nav): remove deprecated horizontal tab components"
```

---

### Task 7: Visual Polish and Edge Cases

**Files:**
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/event-sub-sidebar.tsx` (if needed)
- Modify: `apps/web/src/app/(organizer)/layout.tsx` (if needed)

**Step 1: Test edge cases**

Run the dev server and manually verify:

1. **Direct URL entry**: Navigate directly to `/events/<id>/polls` — sub-sidebar should show with "Polls" highlighted under "Engagement"
2. **Browser back/forward**: Use browser navigation — sidebar state should update correctly
3. **Responsive**: Resize browser below `lg` breakpoint — sub-sidebar should hide, mobile nav should appear
4. **Overflow**: All 19 items should be visible in the sub-sidebar. If the viewport is short, the nav should scroll
5. **Transition**: Going from `/events` to `/events/<id>` and back should animate smoothly

**Step 2: Fix any visual issues found**

Common fixes:
- Adjust sub-sidebar width if items are truncated
- Adjust spacing between groups if too tight/loose
- Ensure the active indicator animation (`layoutId`) doesn't conflict between main sidebar and sub-sidebar (they use different layoutId strings: `sidebar-indicator` vs `event-sidebar-indicator`)

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix(nav): polish sub-sidebar visual edge cases"
```

---

### Task 8: Final Build Verification

**Step 1: Run full build**

Run: `cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly && pnpm turbo build --filter=web 2>&1 | tail -30`

**Step 2: Run dev server and do a final walkthrough**

Run: `pnpm --filter web dev`

Verify the complete flow:
1. Login -> Dashboard (full sidebar)
2. Click Events (full sidebar, events list)
3. Click an event (sidebar collapses, sub-sidebar appears with grouped tabs)
4. Click through several tabs (active state updates, smooth transitions)
5. Click "Back to Events" in sub-sidebar (sidebar expands, sub-sidebar gone)
6. Test on mobile viewport (hamburger menu + grouped mobile nav)

**Step 3: Commit if any final fixes needed**

```bash
git add -A
git commit -m "feat(nav): complete sub-sidebar navigation implementation"
```
