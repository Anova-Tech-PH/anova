import { getTicketTypesByEvent } from "@/features/tickets/queries";
import { getRestrictionsByEvent } from "@/features/ticket-restrictions/queries";
import { RestrictionManager } from "@/features/ticket-restrictions/components/restriction-manager";
import { ShieldCheck, Info } from "lucide-react";

export default async function MemberTicketsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [tickets, restrictionsRaw] = await Promise.all([
    getTicketTypesByEvent(eventId),
    getRestrictionsByEvent(eventId),
  ]);

  const restrictions = restrictionsRaw.map(({ ticket_types, ...r }) => r);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(0.445_0.107_195_/_0.1)]">
          <ShieldCheck className="h-5 w-5 text-[oklch(0.445_0.107_195)]" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Member & Invite-Only Ticketing</h1>
          <p className="text-sm text-muted-foreground">
            Restrict who can register based on specific emails, organizations, organization types, or membership levels. Only individuals matching the set restrictions will be able to register for restricted tickets.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>4 ways to add restrictions: invited email addresses, specific organizations, organization types, or membership levels.</span>
      </div>

      <RestrictionManager
        eventId={eventId}
        tickets={tickets.map((t) => ({
          id: t.id,
          name: t.name,
          price: t.price,
          type: t.type,
        }))}
        initialRestrictions={restrictions}
      />
    </div>
  );
}
