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
  Gift,
  MapPin,
  HeartHandshake,
  LayoutDashboard,
  Sun,
  Moon,
} from "lucide-react";
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
  /** Whether volunteer applications are open */
  hasVolunteer?: boolean;
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
  hasVolunteer: false,
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
  eventTitle,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
  sidebarData?: SidebarData;
  eventTitle: string;
}) {
  const { orgSlug, eventSlug } = use(params);
  const pathname = usePathname();
  const basePath = `/${orgSlug}/${eventSlug}`;

  const [user, setUser] = useState<{ email: string } | null>(null);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);
  const [otherEvents, setOtherEvents] = useState<{ title: string; orgSlug: string; eventSlug: string }[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUser({ email: data.user.email ?? "" });
        const [orgResult, regResult] = await Promise.all([
          supabase
            .from("organization_members")
            .select("id", { count: "exact", head: true })
            .eq("user_id", data.user.id),
          supabase
            .from("registrations")
            .select("events:event_id (title, slug, organizations:organization_id (slug))")
            .eq("user_id", data.user.id)
            .neq("status", "cancelled"),
        ]);
        setIsOrganizer((orgResult.count ?? 0) > 0);
        const events = (regResult.data ?? [])
          .map((r) => {
            const ev = r.events as unknown as { title: string; slug: string; organizations: { slug: string } };
            if (!ev) return null;
            return { title: ev.title, orgSlug: ev.organizations.slug, eventSlug: ev.slug };
          })
          .filter((e): e is NonNullable<typeof e> => e !== null && !(e.orgSlug === orgSlug && e.eventSlug === eventSlug));
        setOtherEvents(events);
      }
    });
  }, [orgSlug, eventSlug]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleTheme() {
    const next = isDark ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
    setIsDark(next === "dark");
  }

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
      <div className="border-b" ref={switcherRef}>
        <button
          onClick={() => setSwitcherOpen(!switcherOpen)}
          className="flex w-full items-center gap-2 p-4 text-left hover:bg-muted/50 transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary shrink-0">
            {eventTitle.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">{eventTitle}</p>
          </div>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${switcherOpen ? "rotate-180" : ""}`} />
        </button>

        {switcherOpen && (
          <div className="border-t bg-card px-2 py-2 space-y-1 max-h-72 overflow-y-auto">
            {otherEvents.length > 0 && (
              <>
                <p className="px-2 pt-1 pb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Switch event
                </p>
                {otherEvents.map((ev) => (
                  <Link
                    key={`${ev.orgSlug}/${ev.eventSlug}`}
                    href={`/${ev.orgSlug}/${ev.eventSlug}`}
                    onClick={() => setSwitcherOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-muted text-[10px] font-bold shrink-0">
                      {ev.title.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate">{ev.title}</span>
                  </Link>
                ))}
                <div className="my-1 border-t" />
              </>
            )}

            <Link
              href="/my-events"
              onClick={() => setSwitcherOpen(false)}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Calendar className="h-4 w-4 shrink-0" />
              All My Events
            </Link>

            {isOrganizer && (
              <Link
                href="/dashboard"
                onClick={() => setSwitcherOpen(false)}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                Organizer Dashboard
              </Link>
            )}
          </div>
        )}
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

        {/* Sponsors */}
        <NavLink
          href={`${basePath}/sponsors`}
          icon={Handshake}
          label="Sponsors"
          isActive={isActive("/sponsors")}
        />

        {/* Announcements */}
        <NavLink
          href={`${basePath}/announcements`}
          icon={Megaphone}
          label="Announcements"
          isActive={isActive("/announcements")}
        />

        {/* Volunteer (conditional) */}
        {sidebarData.hasVolunteer && (
          <NavLink
            href={`${basePath}/volunteer`}
            icon={HeartHandshake}
            label="Volunteer"
            isActive={isActive("/volunteer")}
          />
        )}

        {/* Separator before Engagement */}
        {(sidebarData.hasLeaderboard || sidebarData.hasContests || sidebarData.hasTrivia || sidebarData.hasPassport) && (
          <div className="my-2 border-t" />
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

        {/* Win a Prize (collapsible — groups Contests, Trivia, Passport) */}
        {(sidebarData.hasContests || sidebarData.hasTrivia || sidebarData.hasPassport) && (
          <CollapsibleSection
            label="Win a Prize"
            icon={Gift}
            defaultOpen={
              isActive("/contests") || isActive("/trivia") || isActive("/passport")
            }
          >
            {sidebarData.hasContests && (
              <NavLink
                href={`${basePath}/contests`}
                icon={Camera}
                label="Contests"
                isActive={isActive("/contests")}
                indent
              />
            )}
            {sidebarData.hasTrivia && (
              <NavLink
                href={`${basePath}/trivia`}
                icon={Brain}
                label="Trivia"
                isActive={isActive("/trivia")}
                indent
              />
            )}
            {sidebarData.hasPassport && (
              <NavLink
                href={`${basePath}/passport`}
                icon={Stamp}
                label="Passport"
                isActive={isActive("/passport")}
                indent
              />
            )}
          </CollapsibleSection>
        )}

        {/* Separator before Resources */}
        {(sidebarData.hasResources || sidebarData.hasRooms || sidebarData.hasLogistics || sidebarData.hasFeedback) && (
          <div className="my-2 border-t" />
        )}

        {/* Resources (collapsible — groups Q&A, Documents, Logistics, Rooms) */}
        <CollapsibleSection
          label="Resources"
          icon={FileText}
          defaultOpen={
            isActive("/qa") || isActive("/resources") || isActive("/logistics") || isActive("/rooms") || isActive("/floormap") || isActive("/feedback")
          }
        >
          <NavLink
            href={`${basePath}/qa`}
            icon={HelpCircle}
            label="Session Q&A"
            isActive={isActive("/qa")}
            indent
          />
          {sidebarData.hasResources && (
            <NavLink
              href={`${basePath}/resources`}
              icon={FileText}
              label="Documents"
              isActive={isActive("/resources")}
              indent
            />
          )}
          {sidebarData.hasLogistics && (
            <NavLink
              href={`${basePath}/logistics`}
              icon={ClipboardList}
              label="Logistics"
              isActive={isActive("/logistics")}
              indent
            />
          )}
          {sidebarData.hasRooms && (
            <NavLink
              href={`${basePath}/rooms`}
              icon={DoorOpen}
              label="Rooms"
              isActive={isActive("/rooms")}
              indent
            />
          )}
          <NavLink
            href={`${basePath}/floormap`}
            icon={MapPin}
            label="Floormap"
            isActive={isActive("/floormap")}
            indent
          />
          {sidebarData.hasFeedback && (
            <NavLink
              href={`${basePath}/feedback`}
              icon={ClipboardCheck}
              label="Feedback"
              isActive={isActive("/feedback")}
              indent
            />
          )}
        </CollapsibleSection>

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
              {sidebarData.hasCertificates && (
                <NavLink
                  href={`${basePath}/certificate`}
                  icon={Award}
                  label="Certificate"
                  isActive={isActive("/certificate")}
                  indent
                />
              )}
            </CollapsibleSection>
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
                  onClick={toggleTheme}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                >
                  {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                  {isDark ? "Light mode" : "Dark mode"}
                </button>
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
          <div className="flex items-center gap-1">
            <Link
              href={`/login?redirect=${encodeURIComponent(pathname)}`}
              className="flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </Link>
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar with hamburger */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b bg-background px-4 py-3 lg:hidden">
        <Link href={basePath} className="flex items-center gap-2 truncate max-w-[60%]">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary shrink-0">
            {eventTitle.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-semibold truncate">{eventTitle}</span>
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
