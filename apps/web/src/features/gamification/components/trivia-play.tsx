"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Trophy,
  ChevronRight,
  Brain,
  PlayCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Card } from "@attendly/ui/components";
import {
  getNextTriviaQuestion,
  submitTriviaAnswer,
  completeTriviaGame,
} from "../trivia-actions";
import { getTriviaLeaderboard } from "../trivia-queries";
import type { TriviaGame, TriviaAttempt } from "../trivia-queries";

type Question = {
  id: string;
  question_text: string;
  options: string[];
  sort_order: number;
};

type AnswerFeedback = {
  correct: boolean;
  correctIndex: number;
  points: number;
  selectedIndex: number;
};

type LeaderboardEntry = {
  id: string;
  user_id: string;
  score: number;
  total_time_ms: number;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
};

export function TriviaPlay({
  game,
  userId,
  questionCount,
  existingAttempt,
  initialLeaderboard,
}: {
  game: TriviaGame;
  userId: string;
  questionCount: number;
  existingAttempt: TriviaAttempt | null;
  initialLeaderboard: LeaderboardEntry[];
}) {
  const [phase, setPhase] = useState<"start" | "playing" | "results">(
    existingAttempt?.completed_at ? "results" : "start"
  );
  const [currentIndex, setCurrentIndex] = useState(
    existingAttempt && !existingAttempt.completed_at
      ? (existingAttempt.answers as unknown[]).length
      : 0
  );
  const [question, setQuestion] = useState<Question | null>(null);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [score, setScore] = useState(existingAttempt?.score ?? 0);
  const [loading, setLoading] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] =
    useState<LeaderboardEntry[]>(initialLeaderboard);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmittedRef = useRef(false);

  // ── Timer countdown ──────────────────────────────────────
  useEffect(() => {
    if (
      phase !== "playing" ||
      !game.time_limit_seconds ||
      feedback ||
      !question
    ) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setTimeLeft(game.time_limit_seconds);
    autoSubmittedRef.current = false;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          // Auto-submit a random answer on timeout
          if (!autoSubmittedRef.current) {
            autoSubmittedRef.current = true;
            const randomIndex = Math.floor(
              Math.random() * (question?.options.length ?? 4)
            );
            handleAnswer(randomIndex);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, question?.id, feedback, game.time_limit_seconds]);

  // ── Load question ────────────────────────────────────────
  const loadQuestion = useCallback(
    async (index: number) => {
      setLoading(true);
      setFeedback(null);
      try {
        const q = await getNextTriviaQuestion(game.id, index);
        if (q) {
          const parsed = q as Record<string, unknown>;
          setQuestion({
            id: parsed.id as string,
            question_text: parsed.question_text as string,
            options: parsed.options as string[],
            sort_order: parsed.sort_order as number,
          });
          setStartTime(Date.now());
        } else {
          // No more questions; game is done
          await finishGame();
        }
      } catch (err) {
        toast.error("Failed to load question.");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game.id]
  );

  // ── Handle answer ────────────────────────────────────────
  async function handleAnswer(selectedIndex: number) {
    if (!question || feedback) return;

    if (timerRef.current) clearInterval(timerRef.current);

    const timeMs = Date.now() - startTime;

    try {
      const result = await submitTriviaAnswer(
        game.id,
        userId,
        question.id,
        selectedIndex,
        timeMs
      );

      setFeedback({
        correct: result.correct,
        correctIndex: result.correct_index,
        points: result.points,
        selectedIndex,
      });

      if (result.correct) {
        setScore((prev) => prev + result.points);
      }
    } catch (err) {
      toast.error("Failed to submit answer.");
    }
  }

  // ── Handle next ──────────────────────────────────────────
  async function handleNext() {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questionCount) {
      await finishGame();
    } else {
      setCurrentIndex(nextIndex);
      await loadQuestion(nextIndex);
    }
  }

  // ── Finish game ──────────────────────────────────────────
  async function finishGame() {
    setLoading(true);
    try {
      await completeTriviaGame(game.id, userId);
      const lb = await getTriviaLeaderboard(game.id);
      setLeaderboard(lb);
      setPhase("results");
    } catch (err) {
      toast.error("Failed to complete game.");
    } finally {
      setLoading(false);
    }
  }

  // ── Start game ───────────────────────────────────────────
  async function handleStart() {
    setPhase("playing");
    await loadQuestion(currentIndex);
  }

  // ── Find user rank ───────────────────────────────────────
  const userRank =
    leaderboard.findIndex((e) => e.user_id === userId) + 1 || null;

  // ──────────────────────────────────────────────────────────
  // ── Start Screen ──────────────────────────────────────────
  // ──────────────────────────────────────────────────────────
  if (phase === "start") {
    return (
      <Card className="p-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[oklch(0.445_0.107_195)]/10">
          <Brain className="h-8 w-8 text-[oklch(0.445_0.107_195)]" />
        </div>
        <h2 className="text-xl font-bold">{game.title}</h2>
        {game.description && (
          <p className="mt-2 text-sm text-muted-foreground">
            {game.description}
          </p>
        )}
        <div className="mt-4 flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <span>
            {questionCount} question{questionCount !== 1 ? "s" : ""}
          </span>
          {game.time_limit_seconds && (
            <span>{game.time_limit_seconds}s per question</span>
          )}
          <span>{game.points_per_correct} pts each</span>
        </div>
        {existingAttempt && !existingAttempt.completed_at && (
          <p className="mt-3 text-sm text-amber-600">
            You have an in-progress attempt. Continuing from question{" "}
            {currentIndex + 1}.
          </p>
        )}
        <Button
          onClick={handleStart}
          className="mt-6 gap-2"
          disabled={loading}
        >
          <PlayCircle className="h-4 w-4" />
          {existingAttempt && !existingAttempt.completed_at
            ? "Continue"
            : "Start"}
        </Button>
      </Card>
    );
  }

  // ──────────────────────────────────────────────────────────
  // ── Results Screen ────────────────────────────────────────
  // ──────────────────────────────────────────────────────────
  if (phase === "results") {
    return (
      <div className="space-y-6">
        <Card className="p-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[oklch(0.445_0.107_195)]/10">
            <Trophy className="h-8 w-8 text-[oklch(0.445_0.107_195)]" />
          </div>
          <h2 className="text-xl font-bold">Game Complete!</h2>
          <p className="mt-1 text-lg font-semibold text-[oklch(0.445_0.107_195)]">
            {score} points
          </p>
          {userRank && (
            <p className="mt-1 text-sm text-muted-foreground">
              Rank #{userRank} of {leaderboard.length}
            </p>
          )}
        </Card>

        {/* Trivia leaderboard */}
        {leaderboard.length > 0 && (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Trophy className="h-5 w-5 text-[oklch(0.445_0.107_195)]" />
              Leaderboard
            </h3>
            <div className="rounded-xl border divide-y">
              {leaderboard.map((entry, index) => {
                const isMe = entry.user_id === userId;
                const rank = index + 1;
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 px-4 py-2.5 ${
                      isMe ? "bg-[oklch(0.445_0.107_195)]/5" : ""
                    }`}
                  >
                    <span className="w-8 text-center text-sm font-medium">
                      {rank <= 3
                        ? ["\u{1F947}", "\u{1F948}", "\u{1F949}"][rank - 1]
                        : rank}
                    </span>
                    <span className="flex-1 truncate text-sm">
                      {entry.profile?.full_name ?? "Anonymous"}
                      {isMe && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (You)
                        </span>
                      )}
                    </span>
                    <span className="text-sm font-semibold">
                      {entry.score} pts
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // ── Playing Screen ────────────────────────────────────────
  // ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Question {currentIndex + 1} of {questionCount}
          </span>
          <span className="font-medium">{score} pts</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[oklch(0.445_0.107_195)] transition-all duration-300"
            style={{
              width: `${((currentIndex + (feedback ? 1 : 0)) / questionCount) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Timer */}
      {game.time_limit_seconds && timeLeft !== null && !feedback && (
        <div
          className={`flex items-center justify-center gap-2 text-sm font-medium ${
            timeLeft <= 5 ? "text-red-600 animate-pulse" : "text-muted-foreground"
          }`}
        >
          <Clock className="h-4 w-4" />
          {timeLeft}s
        </div>
      )}

      {/* Question */}
      {loading ? (
        <Card className="flex items-center justify-center p-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[oklch(0.445_0.107_195)] border-t-transparent" />
        </Card>
      ) : question ? (
        <Card className="p-6">
          <h3 className="text-lg font-semibold">{question.question_text}</h3>
          <div className="mt-4 space-y-2">
            {question.options.map((option, index) => {
              const letter = String.fromCharCode(65 + index); // A, B, C, D
              let variant: string = "";

              if (feedback) {
                if (index === feedback.correctIndex) {
                  variant =
                    "border-green-500 bg-green-50 dark:bg-green-950/20";
                } else if (
                  index === feedback.selectedIndex &&
                  !feedback.correct
                ) {
                  variant = "border-red-500 bg-red-50 dark:bg-red-950/20";
                }
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  disabled={!!feedback || loading}
                  className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50 disabled:cursor-default disabled:hover:bg-transparent ${variant}`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium">
                    {letter}
                  </span>
                  <span className="flex-1">{option}</span>
                  {feedback && index === feedback.correctIndex && (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                  )}
                  {feedback &&
                    index === feedback.selectedIndex &&
                    !feedback.correct && (
                      <XCircle className="h-5 w-5 shrink-0 text-red-600" />
                    )}
                </button>
              );
            })}
          </div>

          {/* Feedback + Next */}
          {feedback && (
            <div className="mt-4 flex items-center justify-between">
              <span
                className={`text-sm font-medium ${
                  feedback.correct ? "text-green-600" : "text-red-600"
                }`}
              >
                {feedback.correct
                  ? `Correct! +${feedback.points} pts`
                  : "Incorrect"}
              </span>
              <Button
                onClick={handleNext}
                disabled={loading}
                className="gap-1"
                size="sm"
              >
                {currentIndex + 1 >= questionCount ? "Finish" : "Next"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
}
