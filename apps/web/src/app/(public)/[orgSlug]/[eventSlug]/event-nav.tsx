"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { use, useState, useEffect, useRef } from "react";
import { Calendar, Mic2, DoorOpen, Ticket, Megaphone, LogIn, LogOut } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/client";

const navItems = [
  { label: "Event", path: "", icon: Calendar },
  { label: "Schedule", path: "/schedule", icon: Calendar },
  { label: "Speakers", path: "/speakers", icon: Mic2 },
  { label: "Rooms", path: "/rooms", icon: DoorOpen },
  { label: "Announcements", path: "/announcements", icon: Megaphone },
  { label: "Register", path: "/register", icon: Ticket },
];

export function EventNav({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = use(params);
  const pathname = usePathname();
  const basePath = `/${orgSlug}/${eventSlug}`;

  const [user, setUser] = useState<{ email: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
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

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-2">
      <nav className="flex items-center gap-1">
        {navItems.map(({ label, path, icon: Icon }) => {
          const href = `${basePath}${path}`;
          const isActive =
            path === ""
              ? pathname === basePath
              : pathname.startsWith(href);

          return (
            <Link
              key={path}
              href={href}
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
    </div>
  );
}
