"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Play,
  Square,
  ChevronDown,
  ChevronUp,
  GripVertical,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  Input,
  Textarea,
  ModalOverlay,
  useConfirm,
  EmptyState,
} from "@attendly/ui/components";
import {
  createTriviaGame,
  updateTriviaGame,
  deleteTriviaGame,
  addTriviaQuestion,
  updateTriviaQuestion,
  deleteTriviaQuestion,
} from "../trivia-actions";
import { getTriviaQuestions } from "../trivia-queries";
import type { TriviaGame, TriviaQuestion } from "../trivia-queries";

// ── Status config ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-600" },
  active: { label: "Active", color: "bg-green-100 text-green-700" },
  ended: { label: "Ended", color: "bg-red-100 text-red-600" },
};

// ── Game Form Modal ──────────────────────────────────────────────────

function GameFormModal({
  game,
  onSave,
  onCancel,
  isPending,
}: {
  game: TriviaGame | null;
  onSave: (data: {
    title: string;
    description?: string;
    starts_at: string;
    ends_at: string;
    time_limit_seconds?: number;
    points_per_correct?: number;
  }) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState(game?.title ?? "");
  const [description, setDescription] = useState(game?.description ?? "");
  const [startsAt, setStartsAt] = useState(game?.starts_at ?? "");
  const [endsAt, setEndsAt] = useState(game?.ends_at ?? "");
  const [timeLimit, setTimeLimit] = useState<number>(
    game?.time_limit_seconds ?? 30
  );
  const [pointsPerCorrect, setPointsPerCorrect] = useState<number>(
    game?.points_per_correct ?? 10
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      title,
      description: description || undefined,
      starts_at: startsAt,
      ends_at: endsAt,
      time_limit_seconds: timeLimit,
      points_per_correct: pointsPerCorrect,
    });
  }

  return (
    <ModalOverlay onClose={onCancel}>
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        <h3 className="text-lg font-semibold">
          {game ? "Edit Trivia Game" : "Create Trivia Game"}
        </h3>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Trivia game title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this trivia game is about"
              rows={2}
            />
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Starts at
              </label>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Ends at</label>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Time limit */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Time limit per question (seconds)
            </label>
            <Input
              type="number"
              min={5}
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
            />
          </div>

          {/* Points */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Points per correct answer
            </label>
            <Input
              type="number"
              min={0}
              value={pointsPerCorrect}
              onChange={(e) => setPointsPerCorrect(Number(e.target.value))}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !title.trim() || !startsAt || !endsAt}
              style={{ backgroundColor: "oklch(0.445 0.107 195)" }}
              className="text-white"
            >
              {game ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

// ── Question Form Modal ──────────────────────────────────────────────

function QuestionFormModal({
  question,
  sortOrder,
  onSave,
  onCancel,
  isPending,
}: {
  question: TriviaQuestion | null;
  sortOrder: number;
  onSave: (data: {
    question_text: string;
    options: string[];
    correct_index: number;
    sort_order: number;
  }) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [questionText, setQuestionText] = useState(
    question?.question_text ?? ""
  );
  const [options, setOptions] = useState<string[]>(
    question?.options ?? ["", "", "", ""]
  );
  const [correctIndex, setCorrectIndex] = useState<number>(
    question?.correct_index ?? 0
  );

  function handleOptionChange(index: number, value: string) {
    setOptions((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      question_text: questionText,
      options,
      correct_index: correctIndex,
      sort_order: question?.sort_order ?? sortOrder,
    });
  }

  return (
    <ModalOverlay onClose={onCancel}>
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        <h3 className="text-lg font-semibold">
          {question ? "Edit Question" : "Add Question"}
        </h3>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Question text */}
          <div>
            <label className="mb-1 block text-sm font-medium">Question</label>
            <Textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Enter the question"
              rows={2}
              required
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Options (select the correct answer)
            </label>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct"
                  checked={correctIndex === i}
                  onChange={() => setCorrectIndex(i)}
                  className="h-4 w-4 accent-[oklch(0.445_0.107_195)]"
                />
                <Input
                  value={opt}
                  onChange={(e) => handleOptionChange(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  required
                  className="flex-1"
                />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isPending ||
                !questionText.trim() ||
                options.some((o) => !o.trim())
              }
              style={{ backgroundColor: "oklch(0.445 0.107 195)" }}
              className="text-white"
            >
              {question ? "Save" : "Add"}
            </Button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

// ── Question List (expanded within a game) ───────────────────────────

function QuestionList({
  gameId,
  eventId,
}: {
  gameId: string;
  eventId: string;
}) {
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<TriviaQuestion | null>(
    null
  );
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();

  // Load questions on first render
  if (!loaded) {
    getTriviaQuestions(gameId).then((qs) => {
      setQuestions(qs);
      setLoaded(true);
    });
  }

  function handleSaveQuestion(data: {
    question_text: string;
    options: string[];
    correct_index: number;
    sort_order: number;
  }) {
    startTransition(async () => {
      try {
        if (editingQuestion) {
          await updateTriviaQuestion(editingQuestion.id, data);
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === editingQuestion.id ? { ...q, ...data } : q
            )
          );
          setEditingQuestion(null);
          toast.success("Question updated");
        } else {
          const question = await addTriviaQuestion(gameId, data);
          setQuestions((prev) => [...prev, question as TriviaQuestion]);
          setAddingQuestion(false);
          toast.success("Question added");
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save question"
        );
      }
    });
  }

  async function handleDeleteQuestion(question: TriviaQuestion) {
    const ok = await confirm({
      title: "Delete Question",
      description: "Delete this question? This action cannot be undone.",
      confirmLabel: "Delete",
    });
    if (!ok) return;

    startTransition(async () => {
      try {
        await deleteTriviaQuestion(question.id);
        setQuestions((prev) => prev.filter((q) => q.id !== question.id));
        toast.success("Question deleted");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to delete question"
        );
      }
    });
  }

  if (!loaded) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Loading questions...
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Questions ({questions.length})
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddingQuestion(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Question
        </Button>
      </div>

      {questions.length === 0 ? (
        <p className="py-3 text-center text-sm text-muted-foreground">
          No questions yet. Add some to make the game playable.
        </p>
      ) : (
        <div className="space-y-1.5">
          {questions.map((q, i) => (
            <div
              key={q.id}
              className="group flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2"
            >
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />
              <span className="min-w-0 flex-1 text-sm truncate">
                <span className="font-medium text-muted-foreground">
                  {i + 1}.
                </span>{" "}
                {q.question_text}
              </span>
              <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setEditingQuestion(q)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleDeleteQuestion(q)}
                  disabled={isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {addingQuestion && (
        <QuestionFormModal
          question={null}
          sortOrder={questions.length}
          onSave={handleSaveQuestion}
          onCancel={() => setAddingQuestion(false)}
          isPending={isPending}
        />
      )}

      {editingQuestion && (
        <QuestionFormModal
          question={editingQuestion}
          sortOrder={editingQuestion.sort_order}
          onSave={handleSaveQuestion}
          onCancel={() => setEditingQuestion(null)}
          isPending={isPending}
        />
      )}

      {confirmDialog}
    </div>
  );
}

// ── Trivia Manager ───────────────────────────────────────────────────

export function TriviaManager({
  eventId,
  games: initialGames,
}: {
  eventId: string;
  games: TriviaGame[];
}) {
  const [games, setGames] = useState(initialGames);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TriviaGame | null>(null);
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();

  function handleSave(data: {
    title: string;
    description?: string;
    starts_at: string;
    ends_at: string;
    time_limit_seconds?: number;
    points_per_correct?: number;
  }) {
    startTransition(async () => {
      try {
        if (editing) {
          await updateTriviaGame(eventId, editing.id, data);
          setGames((prev) =>
            prev.map((g) => (g.id === editing.id ? { ...g, ...data } : g))
          );
          setEditing(null);
          toast.success("Trivia game updated");
        } else {
          const game = await createTriviaGame(eventId, data);
          setGames((prev) => [
            { ...(game as TriviaGame), question_count: 0 },
            ...prev,
          ]);
          setCreating(false);
          toast.success("Trivia game created");
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save trivia game"
        );
      }
    });
  }

  async function handleDelete(game: TriviaGame) {
    const ok = await confirm({
      title: "Delete Trivia Game",
      description: `Delete "${game.title}"? This action cannot be undone.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;

    startTransition(async () => {
      try {
        await deleteTriviaGame(eventId, game.id);
        setGames((prev) => prev.filter((g) => g.id !== game.id));
        toast.success("Trivia game deleted");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to delete trivia game"
        );
      }
    });
  }

  function handleStatusChange(game: TriviaGame, newStatus: string) {
    startTransition(async () => {
      try {
        await updateTriviaGame(eventId, game.id, { status: newStatus });
        setGames((prev) =>
          prev.map((g) =>
            g.id === game.id ? { ...g, status: newStatus } : g
          )
        );
        toast.success(
          newStatus === "active" ? "Game activated" : "Game ended"
        );
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update status"
        );
      }
    });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Trivia Games</h2>
        <Button
          onClick={() => setCreating(true)}
          style={{ backgroundColor: "oklch(0.445 0.107 195)" }}
          className="text-white"
        >
          <Plus className="h-4 w-4" />
          Add Game
        </Button>
      </div>

      {games.length === 0 ? (
        <EmptyState
          icon={<HelpCircle className="h-8 w-8" />}
          title="No trivia games yet"
          description="Create trivia games to test attendees' knowledge and award points."
          action={
            <button
              onClick={() => setCreating(true)}
              className="text-sm font-medium text-primary underline"
            >
              Add a game
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {games.map((game) => {
            const statusConfig = STATUS_CONFIG[game.status] ??
              STATUS_CONFIG.draft;
            const isExpanded = expandedGameId === game.id;

            return (
              <Card
                key={game.id}
                className="group p-4 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <HelpCircle className="h-5 w-5 text-muted-foreground" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium leading-snug truncate">
                        {game.title}
                      </h3>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.color}`}
                      >
                        {statusConfig.label}
                      </span>
                    </div>
                    {game.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                        {game.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {game.question_count} question
                      {game.question_count !== 1 ? "s" : ""} &middot;{" "}
                      {formatDate(game.starts_at)} &mdash;{" "}
                      {formatDate(game.ends_at)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setExpandedGameId(isExpanded ? null : game.id)
                      }
                      title={isExpanded ? "Collapse" : "Expand questions"}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <div className="flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      {game.status === "draft" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleStatusChange(game, "active")
                          }
                          disabled={isPending}
                          title="Activate"
                        >
                          <Play className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      {game.status === "active" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleStatusChange(game, "ended")
                          }
                          disabled={isPending}
                          title="End game"
                        >
                          <Square className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditing(game)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(game)}
                        disabled={isPending}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded question list */}
                {isExpanded && (
                  <QuestionList gameId={game.id} eventId={eventId} />
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {creating && (
        <GameFormModal
          game={null}
          onSave={handleSave}
          onCancel={() => setCreating(false)}
          isPending={isPending}
        />
      )}

      {/* Edit modal */}
      {editing && (
        <GameFormModal
          game={editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          isPending={isPending}
        />
      )}

      {confirmDialog}
    </div>
  );
}
