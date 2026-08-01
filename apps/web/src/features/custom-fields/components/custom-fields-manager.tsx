"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Badge, Card, CardContent, Textarea } from "@attendly/ui/components";
import { createCustomField, updateCustomField, deleteCustomField } from "@/features/custom-fields/actions";
import type { CustomField } from "@/features/custom-fields/queries";

const FIELD_TYPES = [
  { value: "text", label: "Short Text" },
  { value: "textarea", label: "Long Text" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
];

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

type FieldFormData = {
  label: string;
  field_key: string;
  type: string;
  required: boolean;
  options: string;
  placeholder: string;
};

const emptyForm: FieldFormData = {
  label: "",
  field_key: "",
  type: "text",
  required: false,
  options: "",
  placeholder: "",
};

export function CustomFieldsManager({
  eventId,
  initialFields,
}: {
  eventId: string;
  initialFields: CustomField[];
}) {
  const [fields, setFields] = useState<CustomField[]>(initialFields);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FieldFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(field: CustomField) {
    setEditingId(field.id);
    setForm({
      label: field.label,
      field_key: field.field_key,
      type: field.type,
      required: field.required,
      options: (field.options ?? []).join("\n"),
      placeholder: field.placeholder ?? "",
    });
    setShowForm(true);
  }

  function handleLabelChange(label: string) {
    setForm((f) => ({
      ...f,
      label,
      // Only auto-generate key when adding new fields
      ...(editingId ? {} : { field_key: slugify(label) }),
    }));
  }

  async function handleSave() {
    if (!form.label.trim() || !form.field_key.trim()) {
      toast.error("Label and key are required");
      return;
    }

    setSaving(true);
    try {
      const optionsArray = form.type === "select"
        ? form.options.split("\n").map((o) => o.trim()).filter(Boolean)
        : [];

      if (editingId) {
        await updateCustomField(eventId, editingId, {
          label: form.label,
          type: form.type,
          required: form.required,
          options: optionsArray,
          placeholder: form.placeholder || undefined,
        });
        setFields((prev) =>
          prev.map((f) =>
            f.id === editingId
              ? {
                  ...f,
                  label: form.label,
                  type: form.type,
                  required: form.required,
                  options: optionsArray,
                  placeholder: form.placeholder || null,
                }
              : f
          )
        );
        toast.success("Field updated");
      } else {
        const newField = await createCustomField(eventId, {
          label: form.label,
          field_key: form.field_key,
          type: form.type,
          required: form.required,
          options: optionsArray,
          placeholder: form.placeholder || undefined,
        });
        setFields((prev) => [...prev, newField as CustomField]);
        toast.success("Field added");
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save field");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(fieldId: string) {
    try {
      await deleteCustomField(eventId, fieldId);
      setFields((prev) => prev.filter((f) => f.id !== fieldId));
      toast.success("Field deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete field");
    }
  }

  return (
    <div className="space-y-4">
      {/* Existing fields */}
      {fields.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No custom fields yet. Add fields to collect additional information
            from registrants.
          </CardContent>
        </Card>
      )}

      {fields.map((field) => (
        <Card key={field.id}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <GripVertical className="h-4 w-4 text-muted-foreground/40" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{field.label}</p>
                  <Badge variant="outline" className="text-xs">
                    {FIELD_TYPES.find((t) => t.value === field.type)?.label ?? field.type}
                  </Badge>
                  {field.required && (
                    <Badge variant="destructive" className="text-xs">
                      Required
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Key: {field.field_key}
                  {field.type === "select" && field.options?.length > 0 && (
                    <> &middot; {field.options.length} options</>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEdit(field)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(field.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Add / Edit Form */}
      {showForm && (
        <Card>
          <CardContent className="space-y-4 py-5">
            <h3 className="text-sm font-semibold">
              {editingId ? "Edit Field" : "Add New Field"}
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Label *</label>
                <Input
                  value={form.label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  placeholder="e.g. Dietary Requirements"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Key</label>
                <Input
                  value={form.field_key}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, field_key: e.target.value }))
                  }
                  placeholder="dietary_requirements"
                  disabled={!!editingId}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Type</label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type: e.target.value }))
                  }
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Placeholder</label>
                <Input
                  value={form.placeholder}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, placeholder: e.target.value }))
                  }
                  placeholder="Optional placeholder text"
                />
              </div>
            </div>

            {form.type === "select" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Options (one per line)
                </label>
                <Textarea
                  value={form.options}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, options: e.target.value }))
                  }
                  placeholder={"Option 1\nOption 2\nOption 3"}
                  rows={4}
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="field-required"
                checked={form.required}
                onChange={(e) =>
                  setForm((f) => ({ ...f, required: e.target.checked }))
                }
                className="h-4 w-4 rounded border-input"
              />
              <label htmlFor="field-required" className="text-sm font-medium">
                Required field
              </label>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} loading={saving} disabled={saving}>
                {editingId ? "Update Field" : "Add Field"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showForm && (
        <Button onClick={openAdd} variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Field
        </Button>
      )}
    </div>
  );
}
