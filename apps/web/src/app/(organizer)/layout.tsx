"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  Plus,
  Calendar,
  Settings,
  BarChart3,
  ScanLine,
  Users,
  Menu,
  X,
} from "lucide-react";
import { PageTransition, CommandPalette, type CommandItem, Button, Avatar } from "@attendly/ui/components";
import { Logo } from "@attendly/ui/logo";

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const commandItems: CommandItem[] = [
    { id: "new-event", label: "Create new event", icon: <Plus className="h-4 w-4" />, group: "Actions", onSelect: () => router.push("/events/new") },
    { id: "dashboard", label: "Go to dashboard", icon: <BarChart3 className="h-4 w-4" />, group: "Navigate", onSelect: () => router.push("/dashboard") },
    { id: "events", label: "View all events", icon: <Calendar className="h-4 w-4" />, group: "Navigate", onSelect: () => router.push("/events") },
    { id: "team", label: "Team settings", icon: <Users className="h-4 w-4" />, group: "Navigate", onSelect: () => router.push("/settings/team") },
    { id: "settings", label: "Account settings", icon: <Settings className="h-4 w-4" />, group: "Navigate", onSelect: () => router.push("/settings") },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar — 52px, ink background */}
      <header className="sticky top-0 z-40 flex h-[52px] items-center gap-4 bg-ink px-4 lg:px-6">
        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden text-white/70 hover:text-white transition-colors"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Left: wordmark + org */}
        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Logo size="sm" variant="white" />
          </Link>
          <span className="hidden sm:inline text-white/30">/</span>
          <button className="hidden sm:flex items-center gap-1 text-[14px] font-semibold text-white/90 hover:text-white transition-colors">
            Grace Chapel
            <ChevronDown className="h-3.5 w-3.5 text-white/50" />
          </button>
        </div>

        {/* Right: ⌘K chip, new event button, avatar */}
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => setCommandOpen(true)}
            className="hidden sm:flex items-center gap-1.5 rounded-[6px] border border-white/[0.22] px-2.5 py-1 text-[13px] font-mono text-white/70 hover:text-white/90 hover:border-white/[0.35] transition-colors"
          >
            ⌘K
          </button>
          <Link href="/events/new" className="hidden sm:block">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              New event
            </Button>
          </Link>
          <Avatar name="User" size="xs" className="h-[30px] w-[30px] rounded-[6px]" />
        </div>
      </header>

      {/* Mobile nav dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-border bg-card p-3 space-y-1">
          <Link href="/dashboard" className="block rounded-[6px] px-3 py-2 text-[14px] font-semibold hover:bg-primary/5">Dashboard</Link>
          <Link href="/events" className="block rounded-[6px] px-3 py-2 text-[14px] font-semibold hover:bg-primary/5">Events</Link>
          <Link href="/settings/team" className="block rounded-[6px] px-3 py-2 text-[14px] font-semibold hover:bg-primary/5">Team</Link>
          <Link href="/settings" className="block rounded-[6px] px-3 py-2 text-[14px] font-semibold hover:bg-primary/5">Settings</Link>
          <Link href="/events/new" className="block rounded-[6px] px-3 py-2 text-[14px] font-semibold text-primary hover:bg-primary/5">+ New event</Link>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 px-4 py-5 lg:px-7 lg:py-7">
        <PageTransition>{children}</PageTransition>
      </main>

      {/* Command palette */}
      <CommandPalette
        items={commandItems}
        open={commandOpen}
        onOpenChange={setCommandOpen}
      />
    </div>
  );
}
