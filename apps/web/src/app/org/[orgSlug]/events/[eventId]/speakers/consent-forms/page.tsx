import { redirect } from "next/navigation";

export default async function SpeakerConsentFormsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  redirect(`/events/${eventId}/release-consent-forms`);
}
