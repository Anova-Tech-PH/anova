import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@attendly/ui/supabase/server";
import { getOrgBySlug } from "@/features/org/queries";
import { SignOutButton } from "./sign-out-button";
import { Card } from "@attendly/ui/components";
import { User, Building2, LogOut, Mail, Tag, Users, ChevronRight } from "lucide-react";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const org = await getOrgBySlug(orgSlug, user.id);
  if (!org) redirect("/onboarding");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Account and organization settings.
        </p>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-[oklch(0.445_0.107_195)]" />
          <h2 className="text-lg font-semibold">Account</h2>
        </div>
        <div className="divide-y divide-border text-sm">
          <div className="flex items-center justify-between rounded-lg px-3 py-3 bg-muted/30">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              Email
            </span>
            <span className="font-mono text-xs">{user.email}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg px-3 py-3">
            <span className="flex items-center gap-2 text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              Name
            </span>
            <span className="font-medium">{user.user_metadata?.full_name ?? "—"}</span>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-[oklch(0.445_0.107_195)]" />
          <h2 className="text-lg font-semibold">Organization</h2>
        </div>
        <div className="divide-y divide-border text-sm">
          <div className="flex items-center justify-between rounded-lg px-3 py-3 bg-muted/30">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              Name
            </span>
            <span className="font-medium">{org.name}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg px-3 py-3">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Tag className="h-3.5 w-3.5" />
              Slug
            </span>
            <span className="font-mono text-xs">{org.slug}</span>
          </div>
        </div>
      </Card>

      <Link
        href={`/org/${orgSlug}/settings/team`}
        className="group block"
      >
        <Card className="p-6 transition-colors hover:bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[oklch(0.445_0.107_195)]/10">
                <Users className="h-5 w-5 text-[oklch(0.445_0.107_195)]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Team</h2>
                <p className="text-sm text-muted-foreground">
                  Manage team members and their roles.
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
        </Card>
      </Link>

      <div className="rounded-xl border-2 border-destructive/40 bg-gradient-to-br from-destructive/5 to-destructive/10 p-6 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <LogOut className="h-5 w-5 text-destructive" />
          <h2 className="text-lg font-semibold">Sign Out</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Sign out of your account on this device.
        </p>
        <SignOutButton />
      </div>
    </div>
  );
}
