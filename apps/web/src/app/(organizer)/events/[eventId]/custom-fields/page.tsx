import { getCustomFieldsByEvent } from "@/features/custom-fields/queries";
import { CustomFieldsManager } from "@/features/custom-fields/components/custom-fields-manager";
import { ListChecks } from "lucide-react";

export default async function CustomFieldsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const fields = await getCustomFieldsByEvent(eventId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(0.445_0.107_195_/_0.1)]">
          <ListChecks className="h-5 w-5 text-[oklch(0.445_0.107_195)]" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Question Forms</h1>
          <p className="text-sm text-muted-foreground">
            Customize the questions attendees answer when registering for your event.
          </p>
        </div>
      </div>
      <CustomFieldsManager eventId={eventId} initialFields={fields} />
    </div>
  );
}
