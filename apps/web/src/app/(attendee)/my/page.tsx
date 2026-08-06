import { redirect } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { getMyRegistrations } from "@/features/attendee/queries";
import { TicketsList } from "./tickets-list";

export default async function MyTicketsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/my");

  const registrations = await getMyRegistrations(user.id);

  return (
    <div>
      <h1 className="text-2xl font-semibold">My Tickets</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your event registrations and tickets.
      </p>
      <TicketsList registrations={registrations} />
    </div>
  );
}
