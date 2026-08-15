"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, Map } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@attendly/ui/cn";
import { Input, useConfirm } from "@attendly/ui/components";
import { updateFloormap, deleteFloormap } from "../actions";
import type { Floormap } from "../queries";

export function FloormapList({
  floormaps,
  eventId,
  selectedId,
  onSelect,
}: {
  floormaps: Floormap[];
  eventId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();

  async function handleRename(id: string) {
    if (!editName.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await updateFloormap(id, eventId, { name: editName.trim() });
      toast.success("Map renamed");
      setEditingId(null);
    } catch {
      toast.error("Failed to rename");
    }
  }

  async function handleDelete(fm: Floormap) {
    const ok = await confirm({
      title: "Delete Floor Map",
      description: `Delete "${fm.name}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!ok) return;

    startTransition(async () => {
      try {
        await deleteFloormap(fm.id, eventId);
        toast.success("Map deleted");
      } catch {
        toast.error("Failed to delete");
      }
    });
  }

  if (floormaps.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <Map className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium">No floor maps yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload a venue floor plan image to get started
          </p>
        </div>
        {confirmDialog}
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {floormaps.map((fm) => (
          <div
            key={fm.id}
            className={cn(
              "group relative w-40 cursor-pointer overflow-hidden rounded-lg border transition-all",
              selectedId === fm.id
                ? "border-primary ring-2 ring-primary/20"
                : "hover:border-primary/40",
              isPending && "pointer-events-none opacity-60",
            )}
            onClick={() => onSelect(fm.id)}
          >
            <img
              src={fm.image_url}
              alt={fm.name}
              className="h-24 w-full object-cover"
            />
            <div className="flex items-center justify-between px-2 py-1.5">
              {editingId === fm.id ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => handleRename(fm.id)}
                  onKeyDown={(e) => e.key === "Enter" && handleRename(fm.id)}
                  className="h-6 text-xs"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="truncate text-xs font-medium">{fm.name}</span>
              )}
              <div className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(fm.id);
                    setEditName(fm.name);
                  }}
                  className="p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(fm);
                  }}
                  className="p-0.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {confirmDialog}
    </>
  );
}
