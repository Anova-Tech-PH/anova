import Link from "next/link";
import { createClient } from "@attendly/ui/supabase/server";
import { AttendeeHeaderActions } from "./header-actions";
import { AttendeeThemeToggle } from "./theme-toggle";

export default async function AttendeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isOrganizer = false;
  if (user) {
    const { count } = await supabase
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    isOrganizer = (count ?? 0) > 0;
  }

  return (
    <div id="attendee-root" className="min-h-screen bg-background text-foreground theme-light">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/my-events" className="text-[22px] font-[800] tracking-[-0.04em]">
            <span className="text-foreground">EVEN</span>
            <span className="bg-[image:linear-gradient(100deg,#8b3dff,#ff2f92_60%,#ff8a3d)] bg-clip-text text-transparent">TRIV</span>
          </Link>
          <div className="flex items-center gap-1">
            <AttendeeThemeToggle />
            <AttendeeHeaderActions isOrganizer={isOrganizer} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
