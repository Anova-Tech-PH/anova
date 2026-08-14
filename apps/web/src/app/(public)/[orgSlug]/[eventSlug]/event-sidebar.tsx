"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { use, useState, useEffect, useRef } from "react";
import {
  Calendar,
  Mic2,
  DoorOpen,
  FileText,
  Ticket,
  Megaphone,
  LogIn,
  LogOut,
  Award,
  ClipboardList,
  Handshake,
  Globe,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "@attendly/ui/logo";
import { createClient } from "@attendly/ui/supabase/client";

const navItems = [
  { label: "Event", path: "", icon: Calendar },
  { label: "Schedule", path: "/schedule", icon: Calendar },
  { label: "Speakers", path: "/speakers", icon: Mic2 },
  { label: "Rooms", path: "/rooms", icon: DoorOpen },
  { label: "Resources", path: "/resources", icon: FileText },
  { label: "Sponsors", path: "/sponsors", icon: Handshake },
  { label: "Announcements", path: "/announcements", icon: Megaphone },
  { label: "Certificate", path: "/certificate", icon: Award },
  { label: "Logistics", path: "/logistics", icon: ClipboardList },
  { label: "Website", path: "/website", icon: Globe },
  { label: "Register", path: "/register", icon: Ticket },
];

export function EventSidebar({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = use(params);
  const pathname = usePathname();
  const basePath = `/${orgSlug}/${eventSlug}`;

  const [user, setUser] = useState<{ email: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { email: data.user.email ?? "" } : null);
    });
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
  }

  const sidebarContent = (
    <>
      <div className="p-4 border-b">
        <Link href="/">
          <Logo size="sm" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {navItems.map(({ label, path, icon: Icon }) => {
          const href = `${basePath}${path}`;
          const isActive =
            path === "" ? pathname === basePath : pathname.startsWith(href);

          return (
            <Link
              key={path}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        {user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary shrink-0">
                {user.email.charAt(0).toUpperCase()}
              </div>
              <span className="truncate">{user.email}</span>
            </button>
            {menuOpen && (
              <div className="absolute bottom-full left-2 mb-1 w-44 rounded-lg border bg-card p-1 shadow-lg z-50">
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
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogIn className="h-4 w-4" />
            Sign in
          </Link>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar with hamburger */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b bg-background px-4 py-3 lg:hidden">
        <Link href="/">
          <Logo size="sm" />
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 flex h-full w-64 flex-col border-r bg-background transition-transform duration-200 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r bg-background sticky top-0 h-screen">
        {sidebarContent}
      </aside>

    </>
  );
}
