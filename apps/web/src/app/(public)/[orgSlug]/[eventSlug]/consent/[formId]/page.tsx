import { notFound } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { getPublicConsentForm } from "@/features/consent-forms/queries";
import { PublicConsentForm } from "@/features/consent-forms/components/public-consent-form";

export default async function PublicConsentPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string; formId: string }>;
}) {
  const { orgSlug, eventSlug, formId } = await params;
  const supabase = await createClient();

  // Resolve org from slug
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  if (!org) notFound();

  // Resolve event from org + slug
  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("slug", eventSlug)
    .eq("organization_id", org.id)
    .single();

  if (!event) notFound();

  // Get published consent form + elements
  const result = await getPublicConsentForm(formId);
  if (!result) notFound();

  // Verify form belongs to this event
  if (result.form.event_id !== event.id) notFound();

  // Get current user info for pre-fill
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userEmail: string | undefined;
  let userName: string | undefined;

  if (user) {
    userEmail = user.email;
    const { data: profile } = await supabase
      .from("registrations")
      .select("name")
      .eq("email", user.email ?? "")
      .limit(1)
      .single();
    userName = profile?.name ?? user.user_metadata?.name;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <PublicConsentForm
        formId={result.form.id}
        title={result.form.title}
        description={result.form.description}
        elements={result.elements}
        eventTitle={event.title}
        userEmail={userEmail}
        userName={userName}
      />
    </div>
  );
}
