import { notFound } from "next/navigation";
import { validateTokenAndGetContext } from "@/features/speakers/public-form-queries";
import { PublicSpeakerForm } from "@/features/speakers/components/public-speaker-form";

export default async function SpeakerFormPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const context = await validateTokenAndGetContext(token);

  if (!context) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-semibold mb-2">Speaker Profile</h1>
      <PublicSpeakerForm
        token={token}
        speaker={context.speaker}
        eventName={context.event.title}
        fields={context.fields}
      />
    </div>
  );
}
