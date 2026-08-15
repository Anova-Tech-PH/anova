import { redirect } from "next/navigation";

export default async function SpeakerDetailRedirect({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string; speakerId: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  redirect(`/${orgSlug}/${eventSlug}/speakers`);
}
