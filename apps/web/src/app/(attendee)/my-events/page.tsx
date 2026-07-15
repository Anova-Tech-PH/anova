import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import { createClient } from "@/shared/utils/supabase/server";
import { Badge, Card, EmptyState } from "@/shared/components/ui";

export default async function MyEventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: registrations } = await supabase
    .from("registrations")
    .select(`
      id, status, qr_code, created_at,
      events(id, title, slug, start_date, end_date, venue_name, is_virtual, cover_image, status,
        organizations(slug, name)
      ),
      ticket_types(name)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My Events</h1>

      {!registrations || registrations.length === 0 ? (
        <EmptyState title="You haven't registered for any events yet." />
      ) : (
        <div className="space-y-3">
          {registrations.map((reg) => {
            const event = reg.events as any;
            const org = event?.organizations;
            if (!event) return null;

            return (
              <Link
                key={reg.id}
                href={`/${org?.slug}/${event.slug}`}
              >
              <Card hoverable className="flex gap-4 p-4">
                {event.cover_image && (
                  <img
                    src={event.cover_image}
                    alt=""
                    className="h-20 w-28 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium">{event.title}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(event.start_date).toLocaleDateString()}
                    </span>
                    {event.venue_name && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.venue_name}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={
                      reg.status === "checked_in" ? "info" :
                      reg.status === "confirmed" ? "success" :
                      "default"
                    }>
                      {reg.status.replace("_", " ")}
                    </Badge>
                    {(reg.ticket_types as any)?.name && (
                      <span className="text-[10px] text-muted-foreground">
                        {(reg.ticket_types as any).name}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
