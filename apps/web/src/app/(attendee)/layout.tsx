import { Logo } from "@attendly/ui/logo";
import Link from "next/link";
import { createClient } from "@attendly/ui/supabase/server";
import { AttendeeHeaderActions } from "./header-actions";

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
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/my-events">
            <Logo size="md" />
          </Link>
          <AttendeeHeaderActions isOrganizer={isOrganizer} />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
