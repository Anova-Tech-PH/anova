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
  ClipboardCheck,
  ClipboardList,
  Handshake,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Users,
  MessageCircle,
  Camera,
  HelpCircle,
  Trophy,
  BookMarked,
  StickyNote,
  User,
  Home,
  Brain,
  Stamp,
} from "lucide-react";
import { Logo } from "@attendly/ui/logo";
import { createClient } from "@attendly/ui/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SidebarData {
  /** Whether breakout rooms exist for the event */
  hasRooms: boolean;
  /** Whether documents/videos exist */
  hasResources: boolean;
  /** Whether logistics data exists */
  hasLogistics: boolean;
  /** Whether certificates are enabled */
  hasCertificates: boolean;
  /** Badge count for Attendees nav item */
  attendeeCount: number;
  /** Badge count for Community nav item */
  communityCount: number;
  /** Badge count for Messages nav item */
  unreadMessageCount: number;
  /** Whether gamification/leaderboard is enabled */
  hasLeaderboard: boolean;
  /** Whether the current user is already registered */
  isRegistered: boolean;
  /** Whether an active feedback survey exists */
  hasFeedback: boolean;
  /** Whether there are active contests */
  hasContests?: boolean;
  /** Whether there are active trivia games */
  hasTrivia?: boolean;
  /** Whether passport is available (gamification enabled + sponsors exist) */
  hasPassport?: boolean;
}

export const defaultSidebarData: SidebarData = {
  hasRooms: false,
  hasResources: false,
  hasLogistics: false,
  hasCertificates: false,
  attendeeCount: 0,
  communityCount: 0,
  unreadMessageCount: 0,
  hasLeaderboard: false,
  isRegistered: false,
  hasFeedback: false,
  hasContests: false,
  hasTrivia: false,
  hasPassport: false,
};

/* ------------------------------------------------------------------ */
/*  Badge component                                                    */
/* ------------------------------------------------------------------ */

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Nav link component                                                 */
/* ------------------------------------------------------------------ */

function NavLink({
  href,
  icon: Icon,
  label,
  isActive,
  badge,
  badgeVariant = "alert",
  indent,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  badge?: number;
  badgeVariant?: "alert" | "count";
  indent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
        indent ? "pl-9" : ""
      } ${
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
      {badge !== undefined && badge > 0 && (
        badgeVariant === "count" ? <CountBadge count={badge} /> : <Badge count={badge} />
      )}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Collapsible section                                                */
/* ------------------------------------------------------------------ */

function CollapsibleSection({
  label,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        )}
      </button>
      {open && <div className="space-y-0.5">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main sidebar                                                       */
/* ------------------------------------------------------------------ */

export function EventSidebar({
  params,
  sidebarData = defaultSidebarData,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
  sidebarData?: SidebarData;
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

  /* Helper to check if a path is active */
  function isActive(path: string) {
    const href = `${basePath}${path}`;
    return path === "" ? pathname === basePath : pathname.startsWith(href);
  }

  const sidebarContent = (
    <>
      <div className="p-4 border-b">
        <Link href="/">
          <Logo size="sm" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {/* Home */}
        <NavLink
          href={basePath}
          icon={Home}
          label="Home"
          isActive={isActive("")}
        />

        {/* Agenda (collapsible) */}
        <CollapsibleSection label="Agenda" icon={Calendar} defaultOpen>
          <NavLink
            href={`${basePath}/schedule`}
            icon={Calendar}
            label="Sessions"
            isActive={isActive("/schedule")}
            indent
          />
          <NavLink
            href={`${basePath}/speakers`}
            icon={Mic2}
            label="Speakers"
            isActive={isActive("/speakers")}
            indent
          />
        </CollapsibleSection>

        {/* Attendees */}
        <NavLink
          href={`${basePath}/attendees`}
          icon={Users}
          label="Attendees"
          isActive={isActive("/attendees")}
          badge={sidebarData.attendeeCount}
          badgeVariant="count"
        />

        {/* Community */}
        <NavLink
          href={`${basePath}/community`}
          icon={MessageCircle}
          label="Community"
          isActive={isActive("/community")}
          badge={sidebarData.communityCount}
          badgeVariant="count"
        />

        {/* Photos */}
        <NavLink
          href={`${basePath}/photos`}
          icon={Camera}
          label="Photos"
          isActive={isActive("/photos")}
        />

        {/* Session Q&A */}
        <NavLink
          href={`${basePath}/qa`}
          icon={HelpCircle}
          label="Session Q&A"
          isActive={isActive("/qa")}
        />

        {/* Sponsors */}
        <NavLink
          href={`${basePath}/sponsors`}
          icon={Handshake}
          label="Sponsors"
          isActive={isActive("/sponsors")}
        />

        {/* Resources (conditional) */}
        {sidebarData.hasResources && (
          <NavLink
            href={`${basePath}/resources`}
            icon={FileText}
            label="Resources"
            isActive={isActive("/resources")}
          />
        )}

        {/* Announcements */}
        <NavLink
          href={`${basePath}/announcements`}
          icon={Megaphone}
          label="Announcements"
          isActive={isActive("/announcements")}
        />

        {/* Feedback (conditional) */}
        {sidebarData.hasFeedback && (
          <NavLink
            href={`${basePath}/feedback`}
            icon={ClipboardCheck}
            label="Feedback"
            isActive={isActive("/feedback")}
          />
        )}

        {/* Rooms (conditional) */}
        {sidebarData.hasRooms && (
          <NavLink
            href={`${basePath}/rooms`}
            icon={DoorOpen}
            label="Rooms"
            isActive={isActive("/rooms")}
          />
        )}

        {/* Logistics (conditional) */}
        {sidebarData.hasLogistics && (
          <NavLink
            href={`${basePath}/logistics`}
            icon={ClipboardList}
            label="Logistics"
            isActive={isActive("/logistics")}
          />
        )}

        {/* Leaderboard (conditional) */}
        {sidebarData.hasLeaderboard && (
          <NavLink
            href={`${basePath}/leaderboard`}
            icon={Trophy}
            label="Leaderboard"
            isActive={isActive("/leaderboard")}
          />
        )}

        {/* Contests (conditional) */}
        {sidebarData.hasContests && (
          <NavLink
            href={`${basePath}/contests`}
            icon={Camera}
            label="Contests"
            isActive={isActive("/contests")}
          />
        )}

        {/* Trivia (conditional) */}
        {sidebarData.hasTrivia && (
          <NavLink
            href={`${basePath}/trivia`}
            icon={Brain}
            label="Trivia"
            isActive={isActive("/trivia")}
          />
        )}

        {/* Passport (conditional) */}
        {sidebarData.hasPassport && (
          <NavLink
            href={`${basePath}/passport`}
            icon={Stamp}
            label="Passport"
            isActive={isActive("/passport")}
          />
        )}

        {/* Register / My Ticket */}
        <NavLink
          href={`${basePath}/register`}
          icon={Ticket}
          label={sidebarData.isRegistered ? "My Ticket" : "Register"}
          isActive={isActive("/register")}
        />

        {/* Separator before My Stuff */}
        {user && (
          <>
            <div className="my-2 border-t" />

            {/* My Stuff (collapsible, auth-only) */}
            <CollapsibleSection label="My Stuff" icon={User} defaultOpen>
              <NavLink
                href={`${basePath}/my-agenda`}
                icon={BookMarked}
                label="My Agenda"
                isActive={isActive("/my-agenda")}
                indent
              />
              <NavLink
                href={`${basePath}/my-notes`}
                icon={StickyNote}
                label="My Notes"
                isActive={isActive("/my-notes")}
                indent
              />
              <NavLink
                href={`${basePath}/messages`}
                icon={MessageCircle}
                label="Messages"
                isActive={isActive("/messages")}
                badge={sidebarData.unreadMessageCount}
                indent
              />
              <NavLink
                href={`${basePath}/profile`}
                icon={User}
                label="Profile"
                isActive={isActive("/profile")}
                indent
              />
            </CollapsibleSection>

            {/* Certificate (conditional) */}
            {sidebarData.hasCertificates && (
              <NavLink
                href={`${basePath}/certificate`}
                icon={Award}
                label="Certificate"
                isActive={isActive("/certificate")}
              />
            )}
          </>
        )}
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
