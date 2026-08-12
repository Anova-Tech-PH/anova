import { notFound } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { parseEmbedParams, isToggleOn } from "../parse-embed-params";
import { PoweredByFooter } from "../powered-by-footer";

export default async function SpeakersEmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const rawSearchParams = await searchParams;
  const embedParams = parseEmbedParams(rawSearchParams);

  const showPhoto = isToggleOn(embedParams, "showPhoto");
  const showBio = isToggleOn(embedParams, "showBio");
  const showCompany = isToggleOn(embedParams, "showCompany");
  const layout = embedParams.layout === "list" ? "list" : "grid";

  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, title, slug, organization_id, organizations(slug)")
    .eq("id", eventId)
    .eq("status", "published")
    .single();

  if (!event) notFound();

  const { data: speakers } = await supabase
    .from("speakers")
    .select("id, name, title, company, bio, photo")
    .eq("event_id", event.id)
    .order("name");

  const orgSlug = (event as any).organizations?.slug;
  const eventUrl =
    orgSlug && event.slug ? `/${orgSlug}/${event.slug}/speakers` : undefined;

  return (
    <div className="p-4">
      {!speakers || speakers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No speakers listed yet.</p>
      ) : (
        <div
          className={
            layout === "grid" ? "grid gap-4 sm:grid-cols-2" : "space-y-3"
          }
        >
          {speakers.map((speaker) => {
            const companyLine = [speaker.title, speaker.company]
              .filter(Boolean)
              .join(" at ");

            return (
              <div
                key={speaker.id}
                className="flex gap-3 rounded-lg border bg-card p-4"
              >
                {showPhoto && (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground overflow-hidden">
                    {speaker.photo ? (
                      <img
                        src={speaker.photo}
                        alt={speaker.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>
                        {speaker.name
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="text-sm font-semibold">{speaker.name}</p>

                  {showCompany && companyLine && (
                    <p className="text-xs text-muted-foreground">
                      {companyLine}
                    </p>
                  )}

                  {showBio && speaker.bio && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {speaker.bio}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PoweredByFooter eventUrl={eventUrl} />
    </div>
  );
}
