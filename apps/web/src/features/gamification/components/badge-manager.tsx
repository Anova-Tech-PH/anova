"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Award,
  Footprints,
  BarChart,
  MessageSquare,
  Users,
  TrendingUp,
  Trophy,
  Star,
  Heart,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { createBadge, updateBadge, deleteBadge } from "@/features/gamification/actions";
import type { BadgeDefinition } from "@/features/gamification/queries";
import {
  Button,
  Card,
  EmptyState,
  Input,
  Textarea,
  ModalOverlay,
  useConfirm,
} from "@attendly/ui/components";

// ── Icon mapping ─────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  footprints: Footprints,
  butterfly: Heart,
  "bar-chart": BarChart,
  "message-square": MessageSquare,
  users: Users,
  "trending-up": TrendingUp,
  trophy: Trophy,
  star: Star,
  award: Award,
};

function BadgeIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name];
  if (Icon) return <Icon className={className} />;
  // Fallback: render as emoji or text
  return <span className={className}>{name}</span>;
}

// ── Activity options ──────────────────────────────────────────────────

const ACTIVITY_OPTIONS = [
  { value: "poll_vote", label: "Poll Vote" },
  { value: "session_feedback", label: "Session Feedback" },
  { value: "session_rsvp", label: "Session RSVP" },
  { value: "community_post", label: "Community Post" },
  { value: "community_comment", label: "Community Comment" },
  { value: "meetup_join", label: "Meetup Join" },
  { value: "survey_complete", label: "Survey Complete" },
] as const;

// ── Criteria summary helper ───────────────────────────────────────────

function criteriaSummary(badge: BadgeDefinition): string {
  const val = badge.criteria_value;
  switch (badge.criteria_type) {
    case "points_threshold":
      return `Points threshold: ${val.threshold ?? "?"} pts`;
    case "activity_count":
      return `Activity count: ${val.count ?? "?"}x ${val.activity ?? "?"}`;
    case "specific_activity":
      return `Specific activity: ${val.activity ?? "?"}`;
    default:
      return badge.criteria_type;
  }
}

// ── Badge Form Modal ──────────────────────────────────────────────────

function BadgeFormModal({
  badge,
  onSave,
  onCancel,
  isPending,
}: {
  badge: BadgeDefinition | null;
  onSave: (data: {
    name: string;
    description: string;
    icon: string;
    criteria_type: string;
    criteria_value: Record<string, unknown>;
  }) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(badge?.name ?? "");
  const [description, setDescription] = useState(badge?.description ?? "");
  const [icon, setIcon] = useState(badge?.icon ?? "");
  const [criteriaType, setCriteriaType] = useState(
    badge?.criteria_type ?? "points_threshold"
  );
  const [threshold, setThreshold] = useState<number>(
    (badge?.criteria_value?.threshold as number) ?? 100
  );
  const [activity, setActivity] = useState<string>(
    (badge?.criteria_value?.activity as string) ?? "poll_vote"
  );
  const [count, setCount] = useState<number>(
    (badge?.criteria_value?.count as number) ?? 5
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let criteria_value: Record<string, unknown> = {};
    switch (criteriaType) {
      case "points_threshold":
        criteria_value = { threshold };
        break;
      case "activity_count":
        criteria_value = { activity, count };
        break;
      case "specific_activity":
        criteria_value = { activity };
        break;
    }
    onSave({ name, description, icon, criteria_type: criteriaType, criteria_value });
  }

  return (
    <ModalOverlay onClose={onCancel}>
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        <h3 className="text-lg font-semibold">
          {badge ? "Edit Badge" : "Create Badge"}
        </h3>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Badge name"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this badge is for"
              rows={2}
            />
          </div>

          {/* Icon */}
          <div>
            <label className="mb-1 block text-sm font-medium">Icon</label>
            <Input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="Lucide icon name or emoji"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              e.g. trophy, star, or an emoji
            </p>
          </div>

          {/* Criteria Type */}
          <div>
            <label className="mb-1 block text-sm font-medium">Criteria Type</label>
            <select
              value={criteriaType}
              onChange={(e) => setCriteriaType(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="points_threshold">Points Threshold</option>
              <option value="activity_count">Activity Count</option>
              <option value="specific_activity">Specific Activity</option>
            </select>
          </div>

          {/* Conditional: Points Threshold */}
          {criteriaType === "points_threshold" && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                Threshold (points)
              </label>
              <Input
                type="number"
                min={1}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                required
              />
            </div>
          )}

          {/* Conditional: Activity Count */}
          {criteriaType === "activity_count" && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Activity</label>
                <select
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {ACTIVITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Count</label>
                <Input
                  type="number"
                  min={1}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  required
                />
              </div>
            </div>
          )}

          {/* Conditional: Specific Activity */}
          {criteriaType === "specific_activity" && (
            <div>
              <label className="mb-1 block text-sm font-medium">Activity</label>
              <select
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {ACTIVITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !name.trim()}
              style={{ backgroundColor: "oklch(0.445 0.107 195)" }}
              className="text-white"
            >
              {badge ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

// ── Badge Manager ─────────────────────────────────────────────────────

export function BadgeManager({
  eventId,
  badges: initialBadges,
}: {
  eventId: string;
  badges: BadgeDefinition[];
}) {
  const [badges, setBadges] = useState(initialBadges);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<BadgeDefinition | null>(null);
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();

  function handleSave(data: {
    name: string;
    description: string;
    icon: string;
    criteria_type: string;
    criteria_value: Record<string, unknown>;
  }) {
    startTransition(async () => {
      try {
        if (editing) {
          await updateBadge(eventId, editing.id, data);
          setBadges((prev) =>
            prev.map((b) => (b.id === editing.id ? { ...b, ...data } : b))
          );
          setEditing(null);
          toast.success("Badge updated");
        } else {
          const badge = await createBadge(eventId, data);
          setBadges((prev) => [...prev, badge as BadgeDefinition]);
          setCreating(false);
          toast.success("Badge created");
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save badge"
        );
      }
    });
  }

  async function handleDelete(badge: BadgeDefinition) {
    const ok = await confirm({
      title: "Delete Badge",
      description: `Delete badge "${badge.name}"? This action cannot be undone.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;

    startTransition(async () => {
      try {
        await deleteBadge(eventId, badge.id);
        setBadges((prev) => prev.filter((b) => b.id !== badge.id));
        toast.success("Badge deleted");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to delete badge"
        );
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Badges</h2>
        <Button
          onClick={() => setCreating(true)}
          style={{ backgroundColor: "oklch(0.445 0.107 195)" }}
          className="text-white"
        >
          <Plus className="h-4 w-4" />
          Add Badge
        </Button>
      </div>

      {badges.length === 0 ? (
        <EmptyState
          icon={<Award className="h-8 w-8" />}
          title="No badges yet"
          description="Create badges to reward attendees for their engagement."
          action={
            <button
              onClick={() => setCreating(true)}
              className="text-sm font-medium text-primary underline"
            >
              Add a badge
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {badges.map((badge) => (
            <Card
              key={badge.id}
              className="group p-4 transition-all duration-200 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <BadgeIcon name={badge.icon} className="h-5 w-5 text-muted-foreground" />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium leading-snug">{badge.name}</h3>
                  {badge.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                      {badge.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {criteriaSummary(badge)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditing(badge)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(badge)}
                    disabled={isPending}
                    className="hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create modal */}
      {creating && (
        <BadgeFormModal
          badge={null}
          onSave={handleSave}
          onCancel={() => setCreating(false)}
          isPending={isPending}
        />
      )}

      {/* Edit modal */}
      {editing && (
        <BadgeFormModal
          badge={editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          isPending={isPending}
        />
      )}

      {confirmDialog}
    </div>
  );
}
