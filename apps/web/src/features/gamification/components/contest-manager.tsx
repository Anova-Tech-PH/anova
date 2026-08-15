"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Image,
  MessageSquare,
  Lightbulb,
  Play,
  Square,
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
import { createContest, updateContest, deleteContest } from "../contest-actions";
import type { Contest } from "../contest-queries";

// ── Type & status config ─────────────────────────────────────────────

const TYPE_CONFIG = {
  photo: { icon: Image, label: "Photo Contest", color: "bg-blue-100 text-blue-700" },
  caption: { icon: MessageSquare, label: "Caption Contest", color: "bg-purple-100 text-purple-700" },
  icebreaker: { icon: Lightbulb, label: "Icebreaker", color: "bg-amber-100 text-amber-700" },
} as const;

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-600" },
  active: { label: "Active", color: "bg-green-100 text-green-700" },
  ended: { label: "Ended", color: "bg-red-100 text-red-600" },
} as const;

// ── Contest Form Modal ───────────────────────────────────────────────

function ContestFormModal({
  contest,
  onSave,
  onCancel,
  isPending,
}: {
  contest: Contest | null;
  onSave: (data: {
    type: "photo" | "caption" | "icebreaker";
    title: string;
    description?: string;
    image_url?: string;
    starts_at?: string;
    ends_at?: string;
    points_per_action?: number;
    prize_description?: string;
    winner_criteria?: string;
    theme?: string;
  }) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [type, setType] = useState<"photo" | "caption" | "icebreaker">(
    contest?.type ?? "photo"
  );
  const [title, setTitle] = useState(contest?.title ?? "");
  const [description, setDescription] = useState(contest?.description ?? "");
  const [imageUrl, setImageUrl] = useState(contest?.image_url ?? "");
  const [startsAt, setStartsAt] = useState(contest?.starts_at ?? "");
  const [endsAt, setEndsAt] = useState(contest?.ends_at ?? "");
  const [pointsPerAction, setPointsPerAction] = useState<number>(
    contest?.points_per_action ?? 10
  );
  const [prizeDescription, setPrizeDescription] = useState(contest?.prize_description ?? "");
  const [winnerCriteria, setWinnerCriteria] = useState(contest?.winner_criteria ?? "");
  const [theme, setTheme] = useState(contest?.theme ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      type,
      title,
      description: description || undefined,
      image_url: imageUrl || undefined,
      starts_at: startsAt || undefined,
      ends_at: endsAt || undefined,
      points_per_action: pointsPerAction,
      prize_description: prizeDescription || undefined,
      winner_criteria: winnerCriteria || undefined,
      theme: theme || undefined,
    });
  }

  return (
    <ModalOverlay onClose={onCancel}>
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        <h3 className="text-lg font-semibold">
          {contest ? "Edit Contest" : "Create Contest"}
        </h3>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Type */}
          <div>
            <label className="mb-1 block text-sm font-medium">Type</label>
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value as "photo" | "caption" | "icebreaker")
              }
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              disabled={!!contest}
            >
              <option value="photo">Photo Contest</option>
              <option value="caption">Caption Contest</option>
              <option value="icebreaker">Icebreaker</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contest title"
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
              placeholder="What this contest is about"
              rows={2}
            />
          </div>

          {/* Image URL (caption contests) */}
          {type === "caption" && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                Image URL
              </label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Image for attendees to caption
              </p>
            </div>
          )}

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
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Ends at</label>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>

          {/* Points */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Points per action
            </label>
            <Input
              type="number"
              min={0}
              value={pointsPerAction}
              onChange={(e) => setPointsPerAction(Number(e.target.value))}
            />
          </div>

          {/* Prize Info */}
          <div className="border-t pt-4">
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              Prize Information (optional)
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Theme</label>
                <Textarea
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="What should participants focus on?"
                  rows={2}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Prize Description
                </label>
                <Input
                  value={prizeDescription}
                  onChange={(e) => setPrizeDescription(e.target.value)}
                  placeholder="e.g., Surprise Gifts, Gift Card"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  How Winners Are Chosen
                </label>
                <Textarea
                  value={winnerCriteria}
                  onChange={(e) => setWinnerCriteria(e.target.value)}
                  placeholder="e.g., Most likes wins the prize"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !title.trim()}
              style={{ backgroundColor: "oklch(0.445 0.107 195)" }}
              className="text-white"
            >
              {contest ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

// ── Contest Manager ──────────────────────────────────────────────────

export function ContestManager({
  eventId,
  contests: initialContests,
}: {
  eventId: string;
  contests: Contest[];
}) {
  const [contests, setContests] = useState(initialContests);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Contest | null>(null);
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();

  function handleSave(data: {
    type: "photo" | "caption" | "icebreaker";
    title: string;
    description?: string;
    image_url?: string;
    starts_at?: string;
    ends_at?: string;
    points_per_action?: number;
    prize_description?: string;
    winner_criteria?: string;
    theme?: string;
  }) {
    startTransition(async () => {
      try {
        if (editing) {
          await updateContest(eventId, editing.id, data);
          setContests((prev) =>
            prev.map((c) => (c.id === editing.id ? { ...c, ...data } : c))
          );
          setEditing(null);
          toast.success("Contest updated");
        } else {
          const contest = await createContest(eventId, data);
          setContests((prev) => [contest as Contest, ...prev]);
          setCreating(false);
          toast.success("Contest created");
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save contest"
        );
      }
    });
  }

  async function handleDelete(contest: Contest) {
    const ok = await confirm({
      title: "Delete Contest",
      description: `Delete contest "${contest.title}"? This action cannot be undone.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;

    startTransition(async () => {
      try {
        await deleteContest(eventId, contest.id);
        setContests((prev) => prev.filter((c) => c.id !== contest.id));
        toast.success("Contest deleted");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to delete contest"
        );
      }
    });
  }

  function handleStatusChange(contest: Contest, newStatus: "active" | "ended") {
    startTransition(async () => {
      try {
        await updateContest(eventId, contest.id, { status: newStatus });
        setContests((prev) =>
          prev.map((c) =>
            c.id === contest.id ? { ...c, status: newStatus } : c
          )
        );
        toast.success(
          newStatus === "active" ? "Contest activated" : "Contest ended"
        );
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update status"
        );
      }
    });
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "Not set";
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
        <h2 className="text-lg font-semibold">Contests</h2>
        <Button
          onClick={() => setCreating(true)}
          style={{ backgroundColor: "oklch(0.445 0.107 195)" }}
          className="text-white"
        >
          <Plus className="h-4 w-4" />
          Add Contest
        </Button>
      </div>

      {contests.length === 0 ? (
        <EmptyState
          icon={<Image className="h-8 w-8" />}
          title="No contests yet"
          description="Create photo, caption, or icebreaker contests to boost engagement."
          action={
            <button
              onClick={() => setCreating(true)}
              className="text-sm font-medium text-primary underline"
            >
              Add a contest
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {contests.map((contest) => {
            const typeConfig = TYPE_CONFIG[contest.type];
            const statusConfig = STATUS_CONFIG[contest.status];
            const TypeIcon = typeConfig.icon;

            return (
              <Card
                key={contest.id}
                className="group p-4 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <TypeIcon className="h-5 w-5 text-muted-foreground" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium leading-snug truncate">
                        {contest.title}
                      </h3>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeConfig.color}`}
                      >
                        {typeConfig.label}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.color}`}
                      >
                        {statusConfig.label}
                      </span>
                    </div>
                    {contest.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {contest.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(contest.starts_at)} &mdash;{" "}
                      {formatDate(contest.ends_at)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 flex-col gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    {contest.status === "draft" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleStatusChange(contest, "active")
                        }
                        disabled={isPending}
                        title="Activate"
                      >
                        <Play className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                    {contest.status === "active" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleStatusChange(contest, "ended")
                        }
                        disabled={isPending}
                        title="End contest"
                      >
                        <Square className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditing(contest)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(contest)}
                      disabled={isPending}
                      className="hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {creating && (
        <ContestFormModal
          contest={null}
          onSave={handleSave}
          onCancel={() => setCreating(false)}
          isPending={isPending}
        />
      )}

      {/* Edit modal */}
      {editing && (
        <ContestFormModal
          contest={editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          isPending={isPending}
        />
      )}

      {confirmDialog}
    </div>
  );
}
