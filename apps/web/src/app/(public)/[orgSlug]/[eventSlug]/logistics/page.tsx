import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import {
  MapPin,
  Car,
  Building,
  Plane,
  Map,
  PartyPopper,
  FileText,
} from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";

const TEMPLATE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  welcome: PartyPopper,
  venue: MapPin,
  parking: Car,
  hotel: Building,
  travel_info: Plane,
  floor_map: Map,
  custom: FileText,
};

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
    .select("id, title")
    .eq("organization_id", org.id)
    .eq("slug", eventSlug)
    .eq("status", "published")
    .single();

  if (!event) notFound();

  const { data: items } = await supabase
    .from("logistics_items")
    .select("*")
    .eq("event_id", event.id)
    .order("sort_order", { ascending: true });

  const logisticsItems = items ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Logistics</h1>

      {logisticsItems.length === 0 ? (
        <div className="mt-6">
          <p className="text-muted-foreground">
            No logistics information has been shared yet.
          </p>
          <Link
            href={`/${orgSlug}/${eventSlug}`}
            className="mt-3 inline-block text-sm text-primary hover:underline"
          >
            Return to event
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {logisticsItems.map((item) => {
            const Icon = TEMPLATE_ICONS[item.template] ?? FileText;
            return (
              <section key={item.id}>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <Icon className="h-5 w-5 text-primary" /> {item.title}
                </h2>
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  <Markdown>{item.content}</Markdown>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
