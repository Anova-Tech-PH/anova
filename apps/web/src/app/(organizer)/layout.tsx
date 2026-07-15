"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, Settings, Rss, MessageCircle, DoorOpen, Users, CalendarDays, User } from "lucide-react";
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

function NavItem({ item, active }: { item: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
      )}
    >
      {active && (
        <motion.div
          layoutId="sidebar-indicator"
          className="absolute inset-0 rounded-lg bg-sidebar-accent"
          transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
        />
      )}
      <span className="relative flex items-center gap-3">
        <item.icon className="h-4 w-4" />
        {item.label}
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
      <aside className="hidden w-56 shrink-0 border-r bg-sidebar lg:block">
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/dashboard">
            <Logo size="sm" />
          </Link>
        </div>
        <nav className="flex flex-col gap-1 p-2">
          <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Organizer</p>
          {organizerNav.map((item) => (
            <NavItem key={item.href} item={item} active={isActive(item.href)} />
          ))}

          <div className="my-2 border-t" />

          <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Attendee</p>
          {attendeeNav.map((item) => (
            <NavItem key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </nav>
        <div className="mt-auto border-t p-2">
          <Link
            href="/settings"
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              isActive("/settings")
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center gap-4 border-b px-4 lg:hidden">
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
