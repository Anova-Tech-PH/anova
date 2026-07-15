"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, Settings, Rss, MessageCircle, DoorOpen, Users, CalendarDays, User, Menu } from "lucide-react";
import { motion } from "motion/react";
import { PageTransition } from "@/shared/components/ui";
import { Logo } from "@/shared/components/logo";
import { cn } from "@/shared/utils/cn";

const organizerNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/events", label: "Events", icon: Calendar },
];

const attendeeNav = [
  { href: "/feed", label: "Feed", icon: Rss },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/rooms", label: "Rooms", icon: DoorOpen },
  { href: "/people", label: "People", icon: Users },
  { href: "/my-events", label: "My Events", icon: CalendarDays },
  { href: "/profile", label: "Profile", icon: User },
];

function NavItem({ item, active, badge }: { item: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }; active: boolean; badge?: string }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200",
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
      <span className="relative flex w-full items-center gap-3">
        <span className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-200",
          active
            ? "bg-[oklch(0.445_0.107_195)] text-white shadow-sm"
            : "group-hover:bg-sidebar-accent/60"
        )}>
          <item.icon className="h-4 w-4" />
        </span>
        <span className="flex-1">{item.label}</span>
        {badge && (
          <span className="relative flex h-5 min-w-5 items-center justify-center rounded-full bg-[oklch(0.445_0.107_195)] px-1.5 text-[10px] font-semibold text-white shadow-sm">
            {badge}
          </span>
        )}
      </span>
    </Link>
  );
}

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 border-r bg-sidebar lg:flex lg:flex-col">
        {/* Logo area with subtle gradient */}
        <div className="relative flex h-14 items-center border-b px-4">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[oklch(0.445_0.107_195)]/5 to-transparent" />
          <Link href="/dashboard" className="relative">
            <Logo size="sm" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-0.5 p-2 pt-3">
          {/* Organizer section */}
          <div className="flex items-center gap-2 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.445_0.107_195)]" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Organizer</p>
          </div>
          {organizerNav.map((item) => (
            <NavItem key={item.href} item={item} active={isActive(item.href)} />
          ))}

          {/* Divider */}
          <div className="my-2.5 mx-3 border-t border-sidebar-accent/60" />

          {/* Attendee section */}
          <div className="flex items-center gap-2 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.6_0.1_195)]" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Attendee</p>
          </div>
          {attendeeNav.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              active={isActive(item.href)}
              badge={item.label === "Messages" ? "3" : undefined}
            />
          ))}
        </nav>

        {/* Footer with settings */}
        <div className="border-t border-sidebar-accent/60 bg-gradient-to-t from-sidebar-accent/20 to-transparent p-2">
          <Link
            href="/settings"
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
              isActive("/settings")
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
                : "text-sidebar-foreground hover:bg-sidebar-accent/40 hover:translate-x-0.5"
            )}
          >
            <span className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-200",
              isActive("/settings")
                ? "bg-[oklch(0.445_0.107_195)] text-white shadow-sm"
                : "bg-sidebar-accent/40 group-hover:bg-sidebar-accent/60"
            )}>
              <Settings className="h-4 w-4" />
            </span>
            Settings
          </Link>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b px-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] lg:hidden">
          <Menu className="h-5 w-5 text-muted-foreground" />
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
