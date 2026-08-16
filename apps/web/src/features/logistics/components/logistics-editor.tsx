"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  MapPin,
  Car,
  Building,
  Plane,
  Map,
  PartyPopper,
  FileText,
  ChevronDown,
} from "lucide-react";
import { Button, Card, CardContent, Input, ConfirmDialog } from "@attendly/ui/components";
import { MarkdownTextarea } from "./markdown-toolbar";
import {
  createLogisticsItem,
  updateLogisticsItem,
  deleteLogisticsItem,
} from "../actions";
import type { LogisticsItem } from "../constants";
import { TEMPLATES } from "../constants";

const TEMPLATE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  welcome: PartyPopper,
  venue: MapPin,
  parking: Car,
  hotel: Building,
  travel_info: Plane,
  floor_map: Map,
  custom: FileText,
};

const TEMPLATE_COLORS: Record<string, string> = {
  welcome: "bg-amber-100 text-amber-800",
  venue: "bg-blue-100 text-blue-800",
  parking: "bg-green-100 text-green-800",
  hotel: "bg-purple-100 text-purple-800",
  travel_info: "bg-cyan-100 text-cyan-800",
  floor_map: "bg-rose-100 text-rose-800",
  custom: "bg-gray-100 text-gray-800",
};

function ItemCard({
  item,
  onUpdate,
  onDelete,
}: {
  item: LogisticsItem;
  onUpdate: (id: string, updates: { title?: string; content?: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [content, setContent] = useState(item.content);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dirty = title !== item.title || content !== item.content;
  const Icon = TEMPLATE_ICONS[item.template] ?? FileText;

  async function handleSave() {
    setSaving(true);
    try {
      await onUpdate(item.id, { title, content });
      toast.success("Item saved");
    } catch {
      toast.error("Failed to save item");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${TEMPLATE_COLORS[item.template] ?? TEMPLATE_COLORS.custom}`}
            >
              <Icon className="h-3 w-3" />
              {TEMPLATES.find((t) => t.value === item.template)?.label ?? "Custom"}
            </span>
            <div className="ml-auto flex items-center gap-1">
              {dirty && (
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="mr-1 h-3.5 w-3.5" />
                  {saving ? "Saving..." : "Save"}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Item title"
            className="font-medium"
          />
          <MarkdownTextarea
            value={content}
            onChange={setContent}
            placeholder="Write content using Markdown..."
          />
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete logistics item?"
        description={`This will permanently delete "${item.title}".`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete(item.id);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

export function LogisticsEditor({
  eventId,
  items: initialItems,
}: {
  eventId: string;
  items: LogisticsItem[];
}) {
  const [items, setItems] = useState<LogisticsItem[]>(initialItems);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleCreate = useCallback(
    async (template: string) => {
      setMenuOpen(false);
      const label = TEMPLATES.find((t) => t.value === template)?.label ?? "Custom";
      try {
        const newItem = await createLogisticsItem(eventId, template, label, "");
        setItems((prev) => [...prev, newItem]);
        toast.success(`${label} item added`);
      } catch {
        toast.error("Failed to add item");
      }
    },
    [eventId]
  );

  const handleUpdate = useCallback(
    async (id: string, updates: { title?: string; content?: string }) => {
      await updateLogisticsItem(id, updates);
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );
    },
    []
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteLogisticsItem(id);
        setItems((prev) => prev.filter((item) => item.id !== id));
        toast.success("Item deleted");
      } catch {
        toast.error("Failed to delete item");
      }
    },
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Logistics</h2>
        <div className="relative">
          <Button onClick={() => setMenuOpen(!menuOpen)}>
            <Plus className="mr-1 h-4 w-4" /> Add Item
            <ChevronDown className="ml-1 h-3.5 w-3.5" />
          </Button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border bg-card p-1 shadow-lg">
              {TEMPLATES.map((t) => {
                const TIcon = TEMPLATE_ICONS[t.value] ?? FileText;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => handleCreate(t.value)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
                  >
                    <TIcon className="h-4 w-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            No logistics items yet. Add information like parking, hotels, or
            directions for your attendees.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
