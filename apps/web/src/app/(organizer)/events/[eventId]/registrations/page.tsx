import { getRegistrationsByEvent } from "@/features/registration/queries";
import { RegistrationsTable } from "@/features/registration/components/registrations-table";

export default async function RegistrationsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const registrations = await getRegistrationsByEvent(eventId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Registrations</h1>
        <p className="text-sm text-muted-foreground">
          View and manage event registrations.
        </p>
      </div>

      <RegistrationsTable eventId={eventId} initialRegistrations={registrations} />
    </div>
  );
}
