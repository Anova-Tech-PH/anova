import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/features/profile/queries";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { createClient } from "@/shared/utils/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage how others see you at events.
        </p>
      </div>
      <ProfileForm profile={profile} />
    </div>
  );
}
