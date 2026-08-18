import { redirect } from "next/navigation";

export default async function VolunteerConsentFormsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  redirect(`/events/${eventId}/release-consent-forms`);
}
