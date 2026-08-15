import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@attendly/ui/supabase/server";
import { getGamificationConfig } from "@/features/gamification/queries";
import { getContests } from "@/features/gamification/contest-queries";
import { Camera, MessageSquare, Lightbulb, Trophy } from "lucide-react";
import { Card } from "@attendly/ui/components";

const TYPE_ICONS: Record<string, typeof Camera> = {
  photo: Camera,
  caption: MessageSquare,
  icebreaker: Lightbulb,
};

const TYPE_LABELS: Record<string, string> = {
  photo: "Photo Contest",
  caption: "Caption Contest",
  icebreaker: "Icebreaker",
};

export default async function ContestsPage({
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

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("slug", eventSlug)
    .eq("organization_id", org?.id ?? "")
    .single();

  if (!event) notFound();

  const config = await getGamificationConfig(event.id);

  if (!config?.enabled) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Trophy className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Contests</h1>
        <p className="mt-2 text-muted-foreground">
          Contests are not available for this event yet.
        </p>
      </div>
    );
  }

  const contests = await getContests(event.id, { status: "active" });

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold">Contests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Participate in contests to earn points and have fun!
        </p>
      </div>

      {contests.length === 0 ? (
        <div className="rounded-xl border p-8 text-center">
          <Trophy className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            No active contests right now. Check back later!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {contests.map((contest) => {
            const Icon = TYPE_ICONS[contest.type] ?? Camera;
            const label = TYPE_LABELS[contest.type] ?? contest.type;

            return (
              <Link
                key={contest.id}
                href={`/${orgSlug}/${eventSlug}/contests/${contest.id}`}
              >
                <Card className="h-full p-4 transition-shadow hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[oklch(0.445_0.107_195)]/10">
                      <Icon className="h-5 w-5 text-[oklch(0.445_0.107_195)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-medium uppercase tracking-wider text-[oklch(0.445_0.107_195)]">
                        {label}
                      </span>
                      <h3 className="mt-0.5 font-semibold leading-snug">
                        {contest.title}
                      </h3>
                      {contest.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {contest.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        {contest.starts_at && (
                          <span>
                            {new Date(contest.starts_at).toLocaleDateString()}
                          </span>
                        )}
                        {contest.starts_at && contest.ends_at && (
                          <span>-</span>
                        )}
                        {contest.ends_at && (
                          <span>
                            {new Date(contest.ends_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
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
