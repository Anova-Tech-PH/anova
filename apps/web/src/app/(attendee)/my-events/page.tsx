import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import { createClient } from "@/shared/utils/supabase/server";

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
        <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          You haven&apos;t registered for any events yet.
        </div>
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
                className="flex gap-4 rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
              >
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
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      reg.status === "checked_in" ? "bg-blue-100 text-blue-700" :
                      reg.status === "confirmed" ? "bg-green-100 text-green-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {reg.status.replace("_", " ")}
                    </span>
                    {(reg.ticket_types as any)?.name && (
                      <span className="text-[10px] text-muted-foreground">
                        {(reg.ticket_types as any).name}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
