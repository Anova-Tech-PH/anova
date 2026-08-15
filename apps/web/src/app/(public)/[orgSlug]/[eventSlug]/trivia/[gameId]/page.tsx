import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@attendly/ui/supabase/server";
import {
  getTriviaGames,
  getUserTriviaAttempt,
  getTriviaQuestionCount,
  getTriviaLeaderboard,
} from "@/features/gamification/trivia-queries";
import { TriviaPlay } from "@/features/gamification/components/trivia-play";
import { ArrowLeft, Trophy } from "lucide-react";

export default async function TriviaPlayPage({
  params,
}: {
  params: Promise<{
    orgSlug: string;
    eventSlug: string;
    gameId: string;
  }>;
}) {
  const { orgSlug, eventSlug, gameId } = await params;
  const supabase = await createClient();

  // Resolve event from slugs
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

  // Fetch the game from the event's trivia games
  const games = await getTriviaGames(event.id);
  const game = games.find((g) => g.id === gameId);
  if (!game) notFound();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Sign In Required</h1>
        <p className="mt-2 text-muted-foreground">
          Please sign in to play trivia games.
        </p>
      </div>
    );
  }

  // Get user's existing attempt and question count in parallel
  const [existingAttempt, questionCount] = await Promise.all([
    getUserTriviaAttempt(gameId, user.id),
    getTriviaQuestionCount(gameId),
  ]);

  // If attempt is completed, also fetch leaderboard
  let leaderboard: Awaited<ReturnType<typeof getTriviaLeaderboard>> = [];
  if (existingAttempt?.completed_at) {
    leaderboard = await getTriviaLeaderboard(gameId);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <Link
        href={`/${orgSlug}/${eventSlug}/trivia`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to trivia
      </Link>

      <TriviaPlay
        game={game}
        userId={user.id}
        questionCount={questionCount}
        existingAttempt={existingAttempt}
        initialLeaderboard={leaderboard}
      />
    </div>
  );
}
