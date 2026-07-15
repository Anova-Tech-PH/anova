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

  return (
    <div className="flex min-h-screen flex-col">
      {/* Desktop sidebar */}
      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r bg-sidebar lg:block">
          <div className="flex h-14 items-center border-b px-4">
            <Link href="/feed">
              <Logo size="sm" />
            </Link>
          </div>
          <nav className="flex flex-col gap-1 p-2">
            <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Organizer</p>
            {organizerNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}

            <div className="my-2 border-t" />

            <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Attendee</p>
            {attendeeNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto border-t p-2">
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                pathname === "/settings"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </div>
        </aside>

        <main className="flex-1 p-4 pb-20 lg:p-6 lg:pb-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 flex border-t bg-background lg:hidden">
        {attendeeNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
              {isActive && (
                <span className="h-1 w-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
