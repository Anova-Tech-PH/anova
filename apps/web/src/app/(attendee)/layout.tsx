"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Newspaper, MessageCircle, DoorOpen, Users, User, Calendar, LayoutDashboard, Settings } from "lucide-react";
import { PageTransition } from "@/shared/components/ui";
import { Logo } from "@/shared/components/logo";
import { cn } from "@/shared/utils/cn";

const organizerNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/events", label: "Events", icon: Calendar },
];

const attendeeNav = [
  { href: "/feed", label: "Feed", icon: Newspaper },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/rooms", label: "Rooms", icon: DoorOpen },
  { href: "/people", label: "People", icon: Users },
  { href: "/my-events", label: "My Events", icon: Calendar },
  { href: "/profile", label: "Profile", icon: User },
];

export default function AttendeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Desktop sidebar */}
      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 border-r bg-sidebar lg:flex lg:flex-col">
          {/* Logo area with subtle gradient */}
          <div className="relative flex h-14 items-center border-b px-4">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[oklch(0.445_0.107_195)]/5 to-transparent" />
            <Link href="/feed" className="relative">
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
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200",
                  isActive(item.href)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/40 hover:translate-x-0.5"
                )}
              >
                <span className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-200",
                  isActive(item.href)
                    ? "bg-[oklch(0.445_0.107_195)] text-white shadow-sm"
                    : "group-hover:bg-sidebar-accent/60"
                )}>
                  <item.icon className="h-4 w-4" />
                </span>
                {item.label}
              </Link>
            ))}

            {/* Divider */}
            <div className="my-2.5 mx-3 border-t border-sidebar-accent/60" />

            {/* Attendee section */}
            <div className="flex items-center gap-2 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.6_0.1_195)]" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Attendee</p>
            </div>
            {attendeeNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200",
                  isActive(item.href)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/40 hover:translate-x-0.5"
                )}
              >
                <span className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-200",
                  isActive(item.href)
                    ? "bg-[oklch(0.445_0.107_195)] text-white shadow-sm"
                    : "group-hover:bg-sidebar-accent/60"
                )}>
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="flex-1">{item.label}</span>
                {item.label === "Messages" && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[oklch(0.445_0.107_195)] px-1.5 text-[10px] font-semibold text-white shadow-sm">
                    3
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* Footer with settings */}
          <div className="border-t border-sidebar-accent/60 bg-gradient-to-t from-sidebar-accent/20 to-transparent p-2">
            <Link
              href="/settings"
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
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

        <main className="flex-1 p-4 pb-24 lg:p-6 lg:pb-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      {/* Mobile bottom tabs — frosted glass */}
      <nav className="fixed inset-x-0 bottom-0 flex border-t border-border/50 bg-background/80 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] lg:hidden">
        {attendeeNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 pt-2 pb-1.5 text-[10px] font-medium transition-colors duration-200",
                active ? "text-[oklch(0.445_0.107_195)]" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="relative">
                <item.icon className={cn("h-5 w-5", active && "drop-shadow-sm")} />
                {item.label === "Messages" && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[oklch(0.445_0.107_195)] px-1 text-[9px] font-bold text-white shadow-sm">
                    3
                  </span>
                )}
              </span>
              <span>{item.label}</span>
              {active && (
                <span className="h-1 w-5 rounded-full bg-[oklch(0.445_0.107_195)]" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
