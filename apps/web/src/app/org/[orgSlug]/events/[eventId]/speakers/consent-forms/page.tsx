import { redirect } from "next/navigation";

export default async function SpeakerConsentFormsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventId: string }>;
}) {
  const { orgSlug, eventId } = await params;
  redirect(`/org/${orgSlug}/events/${eventId}/release-consent-forms`);
}
