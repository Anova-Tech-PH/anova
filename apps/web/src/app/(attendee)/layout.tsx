import { redirect } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { AttendeeNav } from "./attendee-nav";

export default async function AttendeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/my");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen">
      <AttendeeNav
        userName={profile?.full_name || user.email || ""}
        userEmail={user.email || ""}
      />
      <main className="mx-auto max-w-4xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
