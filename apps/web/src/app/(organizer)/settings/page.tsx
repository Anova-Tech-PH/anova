import { redirect } from "next/navigation";
import { createClient } from "@/shared/utils/supabase/server";
import { SignOutButton } from "./sign-out-button";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: org } = await supabase
    .from("organization_members")
    .select("organizations(id, name, slug)")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .single();

  const organization = (org?.organizations as any) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Account and organization settings.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Account</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Email</span>
            <span>{user.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Name</span>
            <span>{user.user_metadata?.full_name ?? "—"}</span>
          </div>
        </div>
      </div>

      {organization && (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Organization</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Name</span>
              <span>{organization.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Slug</span>
              <span className="font-mono text-xs">{organization.slug}</span>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="mb-2 text-lg font-semibold">Sign Out</h2>
        <p className="text-sm text-muted-foreground">
          Sign out of your account on this device.
        </p>
        <SignOutButton />
      </div>
    </div>
  );
}
