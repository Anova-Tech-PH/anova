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

function NavItem({ item, active }: { item: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }; active: boolean }) {
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
      </span>
    </Link>
  );
}

function SidebarContent({ isActive }: { isActive: (href: string) => boolean }) {
  return (
    <>
      <nav className="flex flex-1 flex-col gap-0.5 p-2 pt-3">
        <div className="flex items-center gap-2 px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.445_0.107_195)]" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Organizer</p>
        </div>
        {organizerNav.map((item) => (
          <NavItem key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </nav>

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
      <aside className="hidden w-60 shrink-0 border-r bg-sidebar lg:flex lg:flex-col">
        <div className="relative flex h-14 items-center border-b px-4">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[oklch(0.445_0.107_195)]/5 to-transparent" />
          <Link href="/dashboard" className="relative">
            <Logo size="sm" />
          </Link>
        </div>
        <SidebarContent isActive={isActive} />
      </aside>

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
              <SidebarContent isActive={isActive} />
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
