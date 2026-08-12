import { notFound } from "next/navigation";
import { MapPin, Wifi, Car, Bus, Building, Phone, Mail, User } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";
import type { LogisticsData } from "@/features/logistics/queries";

export default async function PublicLogisticsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  if (!org) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("id, title, venue_description, venue_map_url, logistics")
    .eq("organization_id", org.id)
    .eq("slug", eventSlug)
    .eq("status", "published")
    .single();

  if (!event) notFound();

  const logistics: LogisticsData = event.logistics ?? {};
  const venueDescription: string = event.venue_description ?? "";
  const venueMapUrl: string = event.venue_map_url ?? "";

  const hasVenue = venueDescription || venueMapUrl;
  const hasParking = logistics.parking?.title || logistics.parking?.body;
  const hasTransportation = logistics.transportation?.title || logistics.transportation?.body;
  const hasWifi = logistics.wifi?.network;
  const hasHotels = logistics.hotels && logistics.hotels.length > 0;
  const hasContacts = logistics.contacts && logistics.contacts.length > 0;
  const hasCustom = logistics.customSections && logistics.customSections.length > 0;
  const hasAnything = hasVenue || hasParking || hasTransportation || hasWifi || hasHotels || hasContacts || hasCustom;

  const isGoogleMapsEmbed = venueMapUrl.includes("google.com/maps/embed") || venueMapUrl.includes("maps.google.com/embed");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{event.title} — Logistics</h1>

      {!hasAnything ? (
        <p className="mt-6 text-muted-foreground">
          No logistics information has been shared yet.
        </p>
      ) : (
        <div className="mt-8 space-y-10">
          {/* Venue */}
          {hasVenue && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <MapPin className="h-5 w-5 text-primary" /> Venue
              </h2>
              {venueDescription && (
                <p className="whitespace-pre-wrap text-muted-foreground">{venueDescription}</p>
              )}
              {venueMapUrl && (
                <div className="mt-4">
                  {isGoogleMapsEmbed ? (
                    <iframe
                      src={venueMapUrl}
                      className="h-72 w-full rounded-xl border"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  ) : (
                    <a
                      href={venueMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      View Map
                    </a>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Parking */}
          {hasParking && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Car className="h-5 w-5 text-primary" /> {logistics.parking?.title || "Parking"}
              </h2>
              {logistics.parking?.body && (
                <p className="whitespace-pre-wrap text-muted-foreground">{logistics.parking.body}</p>
              )}
            </section>
          )}

          {/* Transportation */}
          {hasTransportation && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Bus className="h-5 w-5 text-primary" /> {logistics.transportation?.title || "Transportation"}
              </h2>
              {logistics.transportation?.body && (
                <p className="whitespace-pre-wrap text-muted-foreground">{logistics.transportation.body}</p>
              )}
            </section>
          )}

          {/* WiFi */}
          {hasWifi && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Wifi className="h-5 w-5 text-primary" /> WiFi
              </h2>
              <div className="inline-flex flex-col gap-1 rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Network:</span>
                  <span className="font-mono">{logistics.wifi!.network}</span>
                </div>
                {logistics.wifi!.password && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Password:</span>
                    <span className="font-mono">{logistics.wifi!.password}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Hotels */}
          {hasHotels && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Building className="h-5 w-5 text-primary" /> Hotels
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">Hotel</th>
                      <th className="pb-2 font-medium">Distance</th>
                      <th className="pb-2 font-medium">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logistics.hotels!.map((hotel, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2">
                          {hotel.url ? (
                            <a
                              href={hotel.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline"
                            >
                              {hotel.name}
                            </a>
                          ) : (
                            hotel.name
                          )}
                        </td>
                        <td className="py-2 text-muted-foreground">{hotel.distance || "-"}</td>
                        <td className="py-2 text-muted-foreground">{hotel.rate || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Contacts */}
          {hasContacts && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <User className="h-5 w-5 text-primary" /> Contacts
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {logistics.contacts!.map((contact, i) => (
                  <div key={i} className="rounded-xl border bg-card p-4 shadow-sm">
                    <p className="font-medium">{contact.name}</p>
                    {contact.phone && (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" /> {contact.phone}
                      </p>
                    )}
                    {contact.email && (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" /> {contact.email}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Custom Sections */}
          {hasCustom &&
            logistics.customSections!.map((section, i) => (
              <section key={i}>
                <h2 className="mb-4 text-lg font-semibold">{section.title}</h2>
                <p className="whitespace-pre-wrap text-muted-foreground">{section.body}</p>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
