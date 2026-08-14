import { Tags } from "lucide-react";
import { getCategories, getVisibilityMatrix, getTicketCategoryMappings } from "@/features/attendee-categories/queries";
import { CategoryManager } from "@/features/attendee-categories/components/category-manager";
import { createClient } from "@attendly/ui/supabase/server";

export default async function AttendeeCategoriesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("id, name")
    .eq("event_id", eventId)
    .order("sort_order");

  const categories = await getCategories(eventId);
  const categoryIds = categories.map((c) => c.id);

  const [visibility, ticketMappings] = await Promise.all([
    getVisibilityMatrix(categoryIds),
    getTicketCategoryMappings(
      (ticketTypes ?? []).map((t: { id: string }) => t.id)
    ),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(0.445_0.107_295_/_0.1)]">
          <Tags className="h-5 w-5 text-[oklch(0.445_0.107_295)]" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Attendee Categories</h2>
          <p className="text-sm text-muted-foreground">
            Define categories to organize attendees and control directory visibility.
          </p>
        </div>
      </div>

      <CategoryManager
        eventId={eventId}
        categories={categories}
        visibility={visibility}
        ticketMappings={ticketMappings}
        ticketTypes={(ticketTypes ?? []).map((t: { id: string; name: string }) => ({
          id: t.id,
          name: t.name,
        }))}
      />
    </div>
  );
}
