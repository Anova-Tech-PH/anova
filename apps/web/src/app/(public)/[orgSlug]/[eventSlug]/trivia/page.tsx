import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@attendly/ui/supabase/server";
import { getGamificationConfig } from "@/features/gamification/queries";
import { getTriviaGames, getUserTriviaAttempt } from "@/features/gamification/trivia-queries";
import { Trophy, Brain, CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { Card } from "@attendly/ui/components";

export default async function TriviaListPage({
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
          <Brain className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Trivia</h1>
        <p className="mt-2 text-muted-foreground">
          Trivia games are not available for this event yet.
        </p>
      </div>
    );
  }

  const games = await getTriviaGames(event.id, { status: "active" });

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get user's attempts for each game in parallel
  const attempts = user
    ? await Promise.all(
        games.map((game) => getUserTriviaAttempt(game.id, user.id))
      )
    : games.map(() => null);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold">Trivia</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Test your knowledge and earn points!
        </p>
      </div>

      {games.length === 0 ? (
        <div className="rounded-xl border p-8 text-center">
          <Brain className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">
            No active trivia games right now. Check back later!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {games.map((game, index) => {
            const attempt = attempts[index];
            const isCompleted = !!attempt?.completed_at;
            const isInProgress = !!attempt && !attempt.completed_at;

            let statusIcon = <PlayCircle className="h-4 w-4 text-muted-foreground" />;
            let statusText = "Not started";
            let statusColor = "text-muted-foreground";

            if (isCompleted) {
              statusIcon = <CheckCircle2 className="h-4 w-4 text-green-600" />;
              statusText = `Completed - ${attempt.score} pts`;
              statusColor = "text-green-600";
            } else if (isInProgress) {
              statusIcon = <Clock className="h-4 w-4 text-amber-600" />;
              statusText = "In progress";
              statusColor = "text-amber-600";
            }

            return (
              <Link
                key={game.id}
                href={`/${orgSlug}/${eventSlug}/trivia/${game.id}`}
              >
                <Card className="p-4 transition-shadow hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[oklch(0.445_0.107_195)]/10">
                      <Brain className="h-5 w-5 text-[oklch(0.445_0.107_195)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold leading-snug">
                        {game.title}
                      </h3>
                      {game.description && (
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                          {game.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-xs">
                        <span className="text-muted-foreground">
                          {game.question_count} question{game.question_count !== 1 ? "s" : ""}
                        </span>
                        {game.time_limit_seconds && (
                          <span className="text-muted-foreground">
                            {game.time_limit_seconds}s per question
                          </span>
                        )}
                        <span className={`flex items-center gap-1 ${statusColor}`}>
                          {statusIcon}
                          {statusText}
                        </span>
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
