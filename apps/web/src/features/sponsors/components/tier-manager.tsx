"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { Badge, useConfirm } from "@attendly/ui/components";
import { createTier, updateTier, deleteTier } from "../tier-actions";
import type { SponsorTier } from "../tier-queries";

const LOGO_SIZES = ["large", "medium", "small"] as const;

export function TierManager({
  eventId,
  initialTiers,
}: {
  eventId: string;
  initialTiers: SponsorTier[];
}) {
  const [tiers, setTiers] = useState(initialTiers);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [logoSize, setLogoSize] = useState<"large" | "medium" | "small">("medium");
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();

  async function handleAdd() {
    if (!name.trim()) return;
    try {
      const tier = await createTier(eventId, {
        name: name.trim(),
        logo_size: logoSize,
        sort_order: tiers.length,
      });
      setTiers([...tiers, tier as SponsorTier]);
      setAdding(false);
      setName("");
      setLogoSize("medium");
      toast.success("Tier created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create tier");
    }
  }

  async function handleUpdate(tierId: string) {
    if (!name.trim()) return;
    try {
      await updateTier(eventId, tierId, { name: name.trim(), logo_size: logoSize });
      setTiers(tiers.map((t) => (t.id === tierId ? { ...t, name: name.trim(), logo_size: logoSize } : t)));
      setEditingId(null);
      setName("");
      toast.success("Tier updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update tier");
    }
  }

  async function handleDelete(tier: SponsorTier) {
    const ok = await confirm({
      title: "Delete Tier",
      description: `Delete tier "${tier.name}"? Sponsors in this tier will become unassigned.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteTier(eventId, tier.id);
        setTiers(tiers.filter((t) => t.id !== tier.id));
        toast.success("Tier deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete tier");
      }
    });
  }

  function startEdit(tier: SponsorTier) {
    setEditingId(tier.id);
    setName(tier.name);
    setLogoSize(tier.logo_size);
    setAdding(false);
  }

  function startAdd() {
    setAdding(true);
    setEditingId(null);
    setName("");
    setLogoSize("medium");
  }

  const logoSizeVariant = (size: string) =>
    size === "large" ? "success" : size === "medium" ? "info" : "warning";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Sponsor Tiers</h3>
        <button
          onClick={startAdd}
          className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium hover:bg-accent"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Tier
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tiers.map((tier) =>
          editingId === tier.id ? (
            <div key={tier.id} className="flex items-center gap-2 rounded-lg border bg-card p-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-28 rounded border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleUpdate(tier.id)}
              />
              <select
                value={logoSize}
                onChange={(e) => setLogoSize(e.target.value as "large" | "medium" | "small")}
                className="rounded border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
              >
                {LOGO_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button onClick={() => handleUpdate(tier.id)} title="Save" className="text-primary hover:text-primary/80">
                <Check className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setEditingId(null)} title="Cancel" className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div
              key={tier.id}
              className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5"
            >
              <span className="text-sm font-medium">{tier.name}</span>
              <Badge variant={logoSizeVariant(tier.logo_size)} className="text-[10px] px-1.5 py-0">
                {tier.logo_size}
              </Badge>
              <button onClick={() => startEdit(tier)} title="Edit" className="text-muted-foreground hover:text-foreground">
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={() => handleDelete(tier)}
                disabled={isPending}
                title="Delete"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )
        )}

        {adding && (
          <div className="flex items-center gap-2 rounded-lg border bg-card p-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tier name"
              className="w-28 rounded border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <select
              value={logoSize}
              onChange={(e) => setLogoSize(e.target.value as "large" | "medium" | "small")}
              className="rounded border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
            >
              {LOGO_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button onClick={handleAdd} title="Save" className="text-primary hover:text-primary/80">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setAdding(false)} title="Cancel" className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {tiers.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground">
          No tiers yet. Tiers let you organize sponsors by level (e.g. Platinum, Gold, Silver).
        </p>
      )}

      {confirmDialog}
    </div>
  );
}
