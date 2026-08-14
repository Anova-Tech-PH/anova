import { createClient } from "@attendly/ui/supabase/server";
import { notFound } from "next/navigation";
import { RegistrationWidgets } from "@/features/registration-pages/components/registration-widgets";

export default async function RegistrationWidgetsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("slug, organizations(slug)")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgSlug = (event as any).organizations?.slug ?? "org";
  const eventSlug = event.slug ?? eventId;
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://app.evenstry.com";
  const registrationUrl = `${baseUrl}/${orgSlug}/${eventSlug}/register`;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Registration Widgets</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Embed registration on your website with these code snippets.
        </p>
      </div>
      <RegistrationWidgets registrationUrl={registrationUrl} />
    </div>
  );
}
