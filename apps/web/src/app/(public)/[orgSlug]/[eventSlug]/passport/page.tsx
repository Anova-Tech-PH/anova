import { createClient } from "@attendly/ui/supabase/server";
import { notFound, redirect } from "next/navigation";
import { getGamificationConfig } from "@/features/gamification/queries";
import { getPassportStamps } from "@/features/gamification/checkin-actions";
import { PassportCard } from "@/features/gamification/components/passport-card";
import { Stamp } from "lucide-react";

export default async function PassportPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const supabase = await createClient();

  // Resolve event
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("slug", eventSlug)
    .eq("organization_id", org?.id ?? "")
    .single();

  if (!event) notFound();

  // Check gamification enabled
  const config = await getGamificationConfig(event.id);

  if (!config?.enabled) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Stamp className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Exhibitor Passport</h1>
        <p className="mt-2 text-muted-foreground">
          The exhibitor passport is not available for this event yet.
        </p>
      </div>
    );
  }

  // Get current user — redirect to login if not authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${orgSlug}/${eventSlug}?login=true&redirect=${encodeURIComponent(`/${orgSlug}/${eventSlug}/passport`)}`);
  }

  // Fetch sponsors and user's stamps in parallel
  const [sponsorsResult, collectedIds] = await Promise.all([
    supabase
      .from("sponsors")
      .select("id, name, logo")
      .eq("event_id", event.id),
    getPassportStamps(event.id, user.id),
  ]);

  const sponsors = (sponsorsResult.data ?? []).map((s: Record<string, unknown>) => ({
    id: s.id as string,
    name: s.name as string,
    logo_url: (s.logo as string | null),
  }));

  if (sponsors.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Stamp className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Exhibitor Passport</h1>
        <p className="mt-2 text-muted-foreground">
          No exhibitors to visit yet. Check back later!
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PassportCard sponsors={sponsors} collectedIds={collectedIds} />
    </div>
  );
}
