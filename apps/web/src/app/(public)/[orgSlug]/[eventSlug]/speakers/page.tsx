import { notFound } from "next/navigation";
import Link from "next/link";
import { User, Star, Linkedin, Twitter, Globe } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";

export default async function PublicSpeakersPage({
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

  const { data: speakers } = await supabase
    .from("speakers")
    .select("*")
    .eq("event_id", event.id)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("name");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">{event.title} — Speakers</h1>

      {!speakers || speakers.length === 0 ? (
        <p className="mt-6 text-muted-foreground">
          Speakers haven&apos;t been announced yet.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {speakers.map((speaker) => (
            <Link
              key={speaker.id}
              href={`/${orgSlug}/${eventSlug}/speakers/${speaker.id}`}
              className="group relative flex gap-4 rounded-xl border bg-card p-5 transition-all duration-200 hover:shadow-md"
            >
              {/* Featured badge */}
              {speaker.is_featured && (
                <div className="absolute right-3 top-3">
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                </div>
              )}

              {speaker.photo ? (
                <img
                  src={speaker.photo}
                  alt={speaker.name}
                  className="h-16 w-16 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-muted">
                  <User className="h-7 w-7 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="font-semibold">{speaker.name}</h3>
                {(speaker.title || speaker.company) && (
                  <p className="text-sm text-muted-foreground">
                    {[speaker.title, speaker.company].filter(Boolean).join(" at ")}
                  </p>
                )}
                {speaker.bio && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                    {speaker.bio}
                  </p>
                )}

                {/* Social icons */}
                {(speaker.linkedin_url || speaker.twitter_handle || speaker.website_url) && (
                  <div className="mt-2 flex items-center gap-1.5">
                    {speaker.linkedin_url && (
                      <Linkedin className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    {speaker.twitter_handle && (
                      <Twitter className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    {speaker.website_url && (
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
