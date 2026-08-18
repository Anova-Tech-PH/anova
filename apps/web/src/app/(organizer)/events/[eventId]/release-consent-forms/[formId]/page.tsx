import { notFound } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import {
  getConsentForm,
  getConsentFormElements,
  getSubmissions,
} from "@/features/consent-forms/queries";
import { FormDetailClient } from "@/features/consent-forms/components/form-detail-client";

export default async function ConsentFormDetailPage({
  params,
}: {
  params: Promise<{ eventId: string; formId: string }>;
}) {
  const { eventId, formId } = await params;
  const supabase = await createClient();

  // Fetch form, elements, submissions, and event slugs in parallel
  const [form, elements, submissions, eventResult] = await Promise.all([
    getConsentForm(formId),
    getConsentFormElements(formId),
    getSubmissions(formId),
    supabase
      .from("events")
      .select("slug, organization:organizations(slug)")
      .eq("id", eventId)
      .single(),
  ]);

  if (!form) notFound();

  // Build public form URL from org/event slugs
  const orgSlug = (
    eventResult.data?.organization as unknown as { slug: string }
  )?.slug;
  const eventSlug = eventResult.data?.slug;
  const formUrl =
    orgSlug && eventSlug
      ? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/${orgSlug}/${eventSlug}/consent/${formId}`
      : null;

  return (
    <FormDetailClient
      eventId={eventId}
      form={form}
      elements={elements}
      submissions={submissions}
      formUrl={formUrl}
    />
  );
}
