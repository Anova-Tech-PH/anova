"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, LayoutDashboard } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/client";

export function AttendeeHeaderActions({ isOrganizer }: { isOrganizer: boolean }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {isOrganizer ? (
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <LayoutDashboard className="h-4 w-4" />
          Organizer Dashboard
        </Link>
      ) : (
        <Link
          href="/onboarding"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Start organizing events
        </Link>
      )}
      <button
        onClick={handleSignOut}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <LogOut className="h-3.5 w-3.5" />
        Sign out
      </button>
    </div>
  );
}
