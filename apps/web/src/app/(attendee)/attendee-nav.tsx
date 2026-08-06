"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Ticket, CalendarHeart, UserCircle, LogOut } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/client";
import { Logo } from "@attendly/ui/logo";

const navItems = [
  { label: "My Tickets", path: "/my", icon: Ticket },
  { label: "My Schedule", path: "/my/schedule", icon: CalendarHeart },
  { label: "Profile", path: "/my/profile", icon: UserCircle },
];

export function AttendeeNav({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b px-4 py-3">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <Link href="/my">
          <Logo size="sm" />
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map(({ label, path, icon: Icon }) => {
            const isActive =
              path === "/my"
                ? pathname === "/my"
                : pathname.startsWith(path);

            return (
              <Link
                key={path}
                href={path}
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

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {userName || userEmail}
          </span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
