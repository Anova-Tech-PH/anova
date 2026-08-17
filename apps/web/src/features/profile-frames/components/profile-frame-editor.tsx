"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Trash2, UserCircle, X } from "lucide-react";
import { Button, Card, CardContent, Input, ConfirmDialog } from "@attendly/ui/components";
import {
  createProfileFrame,
  updateProfileFrame,
  deleteProfileFrame,
} from "../actions";
import type { ProfileFrame } from "../constants";
import { ProfileFramePreview } from "./profile-frame-preview";

const PRESET_COLORS = [
  "#3B82F6",
  "#EF4444",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#F97316",
];

interface FrameDialogProps {
  open: boolean;
  initial?: { label: string; color: string };
  onSave: (label: string, color: string) => void;
  onCancel: () => void;
  saving: boolean;
}

function FrameDialog({ open, initial, onSave, onCancel, saving }: FrameDialogProps) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [color, setColor] = useState(initial?.color ?? "#3B82F6");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {initial ? "Edit Frame" : "Create Frame"}
          </h3>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Label input */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium">
            Label
            <span className="ml-2 text-xs text-muted-foreground">
              {label.length}/12
            </span>
          </label>
          <Input
            value={label}
            onChange={(e) => {
              if (e.target.value.length <= 12) setLabel(e.target.value);
            }}
            placeholder="e.g. Speaker, VIP"
            maxLength={12}
          />
        </div>

        {/* Color picker */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium">Color</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full border-2 transition-transform ${
                  color === c ? "scale-110 border-foreground" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium">Preview</label>
          <div className="flex justify-center rounded-lg bg-muted/50 p-6">
            <ProfileFramePreview label={label} color={color} size="md" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onSave(label, color)} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FrameCard({
  frame,
  onEdit,
  onDelete,
}: {
  frame: ProfileFrame;
  onEdit: (frame: ProfileFrame) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      <Card>
        <CardContent className="flex items-center gap-4 pt-4">
          <ProfileFramePreview label={frame.label} color={frame.color} size="sm" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">{frame.label || "(no label)"}</p>
            <div className="flex items-center gap-2">
              <div
                className="h-4 w-4 rounded-full border"
                style={{ backgroundColor: frame.color }}
              />
              <span className="text-xs text-muted-foreground">{frame.color}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => onEdit(frame)}>
              Edit
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete frame?"
        description={`This will permanently delete the "${frame.label || "untitled"}" frame.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete(frame.id);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

export function ProfileFrameEditor({
  eventId,
  frames: initialFrames,
}: {
  eventId: string;
  frames: ProfileFrame[];
}) {
  const [frames, setFrames] = useState<ProfileFrame[]>(initialFrames);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFrame, setEditingFrame] = useState<ProfileFrame | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCreate = useCallback(
    async (label: string, color: string) => {
      setSaving(true);
      try {
        const newFrame = await createProfileFrame(eventId, label, color);
        setFrames((prev) => [...prev, newFrame]);
        setDialogOpen(false);
        toast.success("Frame created");
      } catch {
        toast.error("Failed to create frame");
      } finally {
        setSaving(false);
      }
    },
    [eventId]
  );

  const handleUpdate = useCallback(
    async (label: string, color: string) => {
      if (!editingFrame) return;
      setSaving(true);
      try {
        await updateProfileFrame(editingFrame.id, { label, color });
        setFrames((prev) =>
          prev.map((f) =>
            f.id === editingFrame.id ? { ...f, label, color } : f
          )
        );
        setEditingFrame(null);
        toast.success("Frame updated");
      } catch {
        toast.error("Failed to update frame");
      } finally {
        setSaving(false);
      }
    },
    [editingFrame]
  );

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteProfileFrame(id);
      setFrames((prev) => prev.filter((f) => f.id !== id));
      toast.success("Frame deleted");
    } catch {
      toast.error("Failed to delete frame");
    }
  }, []);

  const handleEdit = useCallback((frame: ProfileFrame) => {
    setEditingFrame(frame);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Profile Photo Frames</h2>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add Frame
        </Button>
      </div>

      {frames.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center">
          <UserCircle className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            No profile frames yet. Create frames for attendees to apply to their profile photos.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {frames.map((frame) => (
            <FrameCard
              key={frame.id}
              frame={frame}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <FrameDialog
        open={dialogOpen}
        onSave={handleCreate}
        onCancel={() => setDialogOpen(false)}
        saving={saving}
      />

      {/* Edit dialog */}
      <FrameDialog
        open={!!editingFrame}
        initial={
          editingFrame
            ? {
                label: editingFrame.label,
                color: editingFrame.color,
              }
            : undefined
        }
        onSave={handleUpdate}
        onCancel={() => setEditingFrame(null)}
        saving={saving}
      />
    </div>
  );
}
