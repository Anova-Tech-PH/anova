"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/shared/utils/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="mt-4 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90"
    >
      Sign Out
    </button>
  );
}
