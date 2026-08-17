"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Save, Camera, X } from "lucide-react";
import { Button, Card, CardContent, Input, ConfirmDialog } from "@attendly/ui/components";
import {
  createBoothFrame,
  updateBoothFrame,
  deleteBoothFrame,
} from "../actions";
import type { BoothFrame } from "../constants";
import { FRAME_TEMPLATES } from "../constants";
import { FramePreview } from "./frame-preview";

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

const TEMPLATE_COLORS: Record<string, string> = {
  banner_top: "bg-blue-100 text-blue-800",
  banner_bottom: "bg-emerald-100 text-emerald-800",
  corner: "bg-amber-100 text-amber-800",
  border: "bg-purple-100 text-purple-800",
};

type FrameTemplate = BoothFrame["template"];

interface FrameDialogProps {
  open: boolean;
  initial?: { template: FrameTemplate; message: string; color: string };
  onSave: (template: FrameTemplate, message: string, color: string) => void;
  onCancel: () => void;
  saving: boolean;
}

function FrameDialog({ open, initial, onSave, onCancel, saving }: FrameDialogProps) {
  const [template, setTemplate] = useState<FrameTemplate>(initial?.template ?? "banner_top");
  const [message, setMessage] = useState(initial?.message ?? "");
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

        {/* Template picker */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium">Template</label>
          <div className="grid grid-cols-2 gap-2">
            {FRAME_TEMPLATES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTemplate(t.value)}
                className={`rounded-lg border-2 p-3 text-center text-sm font-medium transition-colors ${
                  template === t.value
                    ? "border-primary bg-primary/5"
                    : "border-transparent bg-muted hover:bg-muted/80"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message input */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium">
            Message
            <span className="ml-2 text-xs text-muted-foreground">
              {message.length}/40
            </span>
          </label>
          <Input
            value={message}
            onChange={(e) => {
              if (e.target.value.length <= 40) setMessage(e.target.value);
            }}
            placeholder="e.g. Welcome to DevConf 2026!"
            maxLength={40}
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
          <div className="flex justify-center rounded-lg bg-muted/50 p-4">
            <FramePreview template={template} message={message} color={color} size="md" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onSave(template, message, color)} disabled={saving}>
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
  frame: BoothFrame;
  onEdit: (frame: BoothFrame) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      <Card>
        <CardContent className="flex items-center gap-4 pt-4">
          <FramePreview
            template={frame.template}
            message={frame.message}
            color={frame.color}
            size="sm"
          />
          <div className="flex-1 space-y-1">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                TEMPLATE_COLORS[frame.template] ?? "bg-gray-100 text-gray-800"
              }`}
            >
              {FRAME_TEMPLATES.find((t) => t.value === frame.template)?.label ?? frame.template}
            </span>
            <p className="text-sm font-medium">{frame.message || "(no message)"}</p>
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
        description={`This will permanently delete the "${frame.message || "untitled"}" frame.`}
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

export function BoothFrameEditor({
  eventId,
  frames: initialFrames,
}: {
  eventId: string;
  frames: BoothFrame[];
}) {
  const [frames, setFrames] = useState<BoothFrame[]>(initialFrames);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFrame, setEditingFrame] = useState<BoothFrame | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCreate = useCallback(
    async (template: FrameTemplate, message: string, color: string) => {
      setSaving(true);
      try {
        const newFrame = await createBoothFrame(eventId, template, message, color);
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
    async (template: FrameTemplate, message: string, color: string) => {
      if (!editingFrame) return;
      setSaving(true);
      try {
        await updateBoothFrame(editingFrame.id, { template, message, color });
        setFrames((prev) =>
          prev.map((f) =>
            f.id === editingFrame.id ? { ...f, template, message, color } : f
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
      await deleteBoothFrame(id);
      setFrames((prev) => prev.filter((f) => f.id !== id));
      toast.success("Frame deleted");
    } catch {
      toast.error("Failed to delete frame");
    }
  }, []);

  const handleEdit = useCallback((frame: BoothFrame) => {
    setEditingFrame(frame);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Photo Booth</h2>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Create Frame
        </Button>
      </div>

      {frames.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center">
          <Camera className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            No frames yet. Create frames for attendees to use on their photos.
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
                template: editingFrame.template,
                message: editingFrame.message,
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
