import { createClient } from "@attendly/ui/supabase/server";
import { notFound, redirect } from "next/navigation";
import { validateCheckinToken } from "@/features/gamification/checkin-tokens";
import { performCheckin } from "@/features/gamification/checkin-actions";
import { CheckinHandler } from "@/features/gamification/components/checkin-handler";

export default async function CheckinPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
  searchParams: Promise<{ type?: string; id?: string; token?: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const { type, id, token } = await searchParams;

  if (
    !type ||
    !id ||
    !token ||
    (type !== "session" && type !== "exhibitor")
  ) {
    notFound();
  }

  // Resolve event
  const supabase = await createClient();
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

  // Validate HMAC token
  const valid = validateCheckinToken(type, id, event.id, token);

  if (!valid) {
    return <CheckinHandler status="invalid" />;
  }

  // Get user — redirect to login if not authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const returnUrl = `/${orgSlug}/${eventSlug}/checkin?type=${type}&id=${id}&token=${token}`;
    redirect(
      `/${orgSlug}/${eventSlug}?login=true&redirect=${encodeURIComponent(returnUrl)}`
    );
  }

  // Perform check-in
  try {
    const result = await performCheckin({
      type: type as "session" | "exhibitor",
      id,
      eventId: event.id,
      userId: user.id,
    });
    return (
      <CheckinHandler
        status={result.alreadyCheckedIn ? "already" : "success"}
        points={result.points}
        type={type}
      />
    );
  } catch {
    return <CheckinHandler status="invalid" />;
  }
}
