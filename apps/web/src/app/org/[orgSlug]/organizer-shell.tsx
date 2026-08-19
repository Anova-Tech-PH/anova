"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, Settings, Menu, X, Users } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition } from "@attendly/ui/components";
import { cn } from "@attendly/ui/cn";
import { ThemeToggle } from "@/shared/components/theme-toggle";
import { OrgSwitcher } from "@/shared/components/org-switcher";

function getOrganizerNav(orgSlug: string) {
  return [
    { href: `/org/${orgSlug}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
    { href: `/org/${orgSlug}/events`, label: "Events", icon: Calendar },
    { href: `/org/${orgSlug}/settings/team`, label: "Team", icon: Users },
  ];
}

/** Matches /org/[slug]/events/<uuid>/... but NOT /org/[slug]/events or /org/[slug]/events/new */
function isEventDetailRoute(pathname: string) {
  return /^\/org\/[^/]+\/events\/[0-9a-f-]{36}(\/|$)/i.test(pathname);
}

function Wordmark({ size = "default" }: { size?: "default" | "small" }) {
  return (
    <span
      className={cn(
        "font-[800] tracking-[-0.04em]",
        size === "small" ? "text-[16px]" : "text-[20px]"
      )}
    >
      <span className="text-foreground">EVEN</span>
      <span className="gradient-brand-text">TRIV</span>
    </span>
  );
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
        "group relative flex items-center rounded-[3px] text-sm transition-all duration-200",
        collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
        active
          ? "text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
    >
      {active && (
        <motion.div
          layoutId="sidebar-indicator"
          className="absolute inset-0 rounded-[3px] bg-sidebar-accent"
          transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
        />
      )}
      <span className={cn("relative flex items-center", collapsed ? "" : "w-full gap-3")}>
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-[3px] transition-colors duration-200",
            active
              ? "gradient-brand text-white"
              : "group-hover:bg-sidebar-accent"
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
  organizerNav,
  settingsHref,
}: {
  isActive: (href: string) => boolean;
  collapsed: boolean;
  organizerNav: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
  settingsHref: string;
}) {
  return (
    <>
      <nav className="flex flex-1 flex-col gap-0.5 p-2 pt-3">
        {!collapsed && (
          <div className="flex items-center gap-2 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-pink" />
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60">
              Organizer
            </p>
          </div>
        )}
        {organizerNav.map((item) => (
          <NavItem key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} />
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-2 space-y-0.5">
        <ThemeToggle collapsed={collapsed} />
        <Link
          href={settingsHref}
          title={collapsed ? "Settings" : undefined}
          className={cn(
            "group relative flex items-center rounded-[3px] text-sm transition-all duration-200",
            collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
            isActive(settingsHref)
              ? "bg-sidebar-accent text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-[3px] transition-colors duration-200",
              isActive(settingsHref)
                ? "gradient-brand text-white"
                : "bg-white/[0.04] group-hover:bg-sidebar-accent"
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

export function OrganizerShell({
  orgSlug,
  children,
}: {
  orgSlug: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = isEventDetailRoute(pathname);

  const organizerNav = getOrganizerNav(orgSlug);
  const settingsHref = `/org/${orgSlug}/settings`;
  const dashboardHref = `/org/${orgSlug}/dashboard`;

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
        className="hidden shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col overflow-hidden"
      >
        <div className={cn(
          "relative flex h-[58px] items-center border-b border-sidebar-border",
          collapsed ? "justify-center px-1" : "px-4"
        )}>
          <Link href={dashboardHref} className="relative">
            {collapsed ? (
              <span className="flex h-7 w-7 items-center justify-center rounded-[3px] gradient-brand text-white text-xs font-bold">
                E
              </span>
            ) : (
              <Wordmark />
            )}
          </Link>
        </div>
        <div className={cn("px-2 pb-2 pt-2", collapsed && "px-1")}>
          <OrgSwitcher currentSlug={orgSlug} collapsed={collapsed} />
        </div>
        <SidebarContent
          isActive={isActive}
          collapsed={collapsed}
          organizerNav={organizerNav}
          settingsHref={settingsHref}
        />
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
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0.1, duration: 0.35 }}
              className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-sidebar border-r border-sidebar-border lg:hidden"
            >
              <div className="relative flex h-[58px] items-center justify-between border-b border-sidebar-border px-4">
                <Link href={dashboardHref} className="relative" onClick={() => setMobileOpen(false)}>
                  <Wordmark />
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="relative rounded-[3px] p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="px-2 pt-2 pb-2">
                <OrgSwitcher currentSlug={orgSlug} collapsed={false} />
              </div>
              <SidebarContent
                isActive={isActive}
                collapsed={false}
                organizerNav={organizerNav}
                settingsHref={settingsHref}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[58px] items-center gap-3 border-b border-sidebar-border px-4 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-[3px] p-1 text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href={dashboardHref}>
            <Wordmark size="small" />
          </Link>
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
