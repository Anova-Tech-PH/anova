import Link from "next/link";
import { Newspaper, MessageCircle, Users, User, Calendar } from "lucide-react";

const tabs = [
  { href: "/feed", label: "Feed", icon: Newspaper },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/people", label: "People", icon: Users },
  { href: "/my-events", label: "Events", icon: Calendar },
  { href: "/profile", label: "Profile", icon: User },
];

export default function AttendeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Desktop sidebar */}
      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r bg-sidebar lg:block">
          <div className="flex h-14 items-center border-b px-4">
            <Link href="/feed" className="text-lg font-semibold">
              Attendly
            </Link>
          </div>
          <nav className="flex flex-col gap-1 p-2">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-4 pb-20 lg:p-6 lg:pb-6">{children}</main>
      </div>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 flex border-t bg-background lg:hidden">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-1 flex-col items-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <tab.icon className="h-5 w-5" />
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
