import { redirect } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { getMyProfile } from "@/features/attendee/queries";
import { ProfileForm } from "./profile-form";

export default async function MyProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/my/profile");

  const profile = await getMyProfile(user.id);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your public profile visible to other event attendees.
      </p>
      <ProfileForm profile={profile} email={user.email || ""} />
    </div>
  );
}
