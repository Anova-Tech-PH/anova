"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Input,
  Badge,
  ModalOverlay,
  useConfirm,
} from "@attendly/ui/components";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  setTicketCategoryMapping,
  toggleVisibility,
} from "../actions";
import type {
  AttendeeCategory,
  VisibilityPair,
  TicketCategoryMapping,
} from "../queries";

const COLORS = [
  { name: "blue", bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  { name: "green", bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  { name: "red", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  { name: "purple", bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  { name: "orange", bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
  { name: "pink", bg: "bg-pink-100", text: "text-pink-700", dot: "bg-pink-500" },
  { name: "yellow", bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  { name: "gray", bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" },
];

function getColorClasses(color: string) {
  return COLORS.find((c) => c.name === color) ?? COLORS[0];
}

export function CategoryManager({
  eventId,
  categories: initialCategories,
  visibility: initialVisibility,
  ticketMappings: initialMappings,
  ticketTypes,
}: {
  eventId: string;
  categories: AttendeeCategory[];
  visibility: VisibilityPair[];
  ticketMappings: TicketCategoryMapping[];
  ticketTypes: { id: string; name: string }[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [visibility, setVisibility] = useState(initialVisibility);
  const [mappings, setMappings] = useState(initialMappings);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AttendeeCategory | null>(null);
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState("blue");
  const [formVisible, setFormVisible] = useState(true);
  const [formTicketId, setFormTicketId] = useState<string>("");

  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();

  function getTicketName(catId: string): string | null {
    const mapping = mappings.find((m) => m.category_id === catId);
    if (!mapping) return null;
    const ticket = ticketTypes.find((t) => t.id === mapping.ticket_type_id);
    return ticket?.name ?? null;
  }

  function openAdd() {
    setEditing(null);
    setFormName("");
    setFormColor("blue");
    setFormVisible(true);
    setFormTicketId("");
    setShowForm(true);
  }

  function openEdit(cat: AttendeeCategory) {
    setEditing(cat);
    setFormName(cat.name);
    setFormColor(cat.color);
    setFormVisible(cat.is_visible_in_directory);
    const mapping = mappings.find((m) => m.category_id === cat.id);
    setFormTicketId(mapping?.ticket_type_id ?? "");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  function handleSubmit() {
    if (!formName.trim()) return;

    startTransition(async () => {
      try {
        if (editing) {
          await updateCategory(eventId, editing.id, {
            name: formName.trim(),
            color: formColor,
            is_visible_in_directory: formVisible,
          });

          // Handle ticket mapping change
          const oldMapping = mappings.find((m) => m.category_id === editing.id);
          const oldTicketId = oldMapping?.ticket_type_id ?? "";

          if (formTicketId !== oldTicketId) {
            // Remove old mapping
            if (oldTicketId) {
              await setTicketCategoryMapping(eventId, oldTicketId, null);
            }
            // Set new mapping
            if (formTicketId) {
              await setTicketCategoryMapping(eventId, formTicketId, editing.id);
            }
            setMappings((prev) => {
              let next = prev.filter((m) => m.category_id !== editing.id);
              if (formTicketId) {
                next = next.filter((m) => m.ticket_type_id !== formTicketId);
                next.push({ ticket_type_id: formTicketId, category_id: editing.id });
              }
              return next;
            });
          }

          setCategories((prev) =>
            prev.map((c) =>
              c.id === editing.id
                ? {
                    ...c,
                    name: formName.trim(),
                    color: formColor,
                    is_visible_in_directory: formVisible,
                    updated_at: new Date().toISOString(),
                  }
                : c
            )
          );
          toast.success("Category updated");
        } else {
          const created = await createCategory(eventId, {
            name: formName.trim(),
            color: formColor,
            is_visible_in_directory: formVisible,
          });

          // Set ticket mapping if selected
          if (formTicketId) {
            await setTicketCategoryMapping(eventId, formTicketId, created.id);
            setMappings((prev) => {
              const next = prev.filter((m) => m.ticket_type_id !== formTicketId);
              next.push({ ticket_type_id: formTicketId, category_id: created.id });
              return next;
            });
          }

          setCategories((prev) => [...prev, created]);

          // Add default visibility (all-to-all) for the new category
          const newVisPairs: VisibilityPair[] = [];
          newVisPairs.push({ viewer_category_id: created.id, visible_category_id: created.id });
          for (const cat of categories) {
            newVisPairs.push({ viewer_category_id: created.id, visible_category_id: cat.id });
            newVisPairs.push({ viewer_category_id: cat.id, visible_category_id: created.id });
          }
          setVisibility((prev) => [...prev, ...newVisPairs]);

          toast.success("Category created");
        }
        closeForm();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save category");
      }
    });
  }

  async function handleDelete(cat: AttendeeCategory) {
    const ok = await confirm({
      title: "Delete Category",
      description: `Delete "${cat.name}"? Attendees in this category will become uncategorized. This action cannot be undone.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;

    startTransition(async () => {
      try {
        await deleteCategory(eventId, cat.id);
        setCategories((prev) => prev.filter((c) => c.id !== cat.id));
        setVisibility((prev) =>
          prev.filter(
            (v) => v.viewer_category_id !== cat.id && v.visible_category_id !== cat.id
          )
        );
        setMappings((prev) => prev.filter((m) => m.category_id !== cat.id));
        toast.success("Category deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete category");
      }
    });
  }

  function isVisible(viewerId: string, visibleId: string): boolean {
    return visibility.some(
      (v) => v.viewer_category_id === viewerId && v.visible_category_id === visibleId
    );
  }

  function handleToggleVisibility(viewerId: string, visibleId: string, enabled: boolean) {
    // Optimistic update
    const prev = [...visibility];
    if (enabled) {
      setVisibility((v) => [...v, { viewer_category_id: viewerId, visible_category_id: visibleId }]);
    } else {
      setVisibility((v) =>
        v.filter(
          (p) => !(p.viewer_category_id === viewerId && p.visible_category_id === visibleId)
        )
      );
    }

    startTransition(async () => {
      try {
        await toggleVisibility(eventId, viewerId, visibleId, enabled);
      } catch (err) {
        // Revert
        setVisibility(prev);
        toast.error(err instanceof Error ? err.message : "Failed to update visibility");
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Category List */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {categories.length} categor{categories.length !== 1 ? "ies" : "y"}
          </p>
          <Button onClick={openAdd} size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Add Category
          </Button>
        </div>

        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
            <p className="text-muted-foreground">No categories yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create categories to organize attendees and control directory visibility.
            </p>
            <Button onClick={openAdd} variant="outline" className="mt-4" size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Add First Category
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-left font-medium">Ticket Mapping</th>
                  <th className="px-4 py-3 text-left font-medium">Directory</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => {
                  const color = getColorClasses(cat.color);
                  const ticketName = getTicketName(cat.id);
                  return (
                    <tr key={cat.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${color.dot}`} />
                          <span className="font-medium">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {ticketName ?? <span className="italic">None</span>}
                      </td>
                      <td className="px-4 py-3">
                        {cat.is_visible_in_directory ? (
                          <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">
                            Visible
                          </Badge>
                        ) : (
                          <Badge variant="outline">Hidden</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(cat)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      {showForm && (
        <ModalOverlay onClose={closeForm}>
          <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <h3 className="text-lg font-semibold">
              {editing ? "Edit Category" : "New Category"}
            </h3>
            <div className="mt-4 space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Speaker, VIP, Attendee"
                />
              </div>

              {/* Color palette */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setFormColor(c.name)}
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${c.bg} transition-all ${
                        formColor === c.name
                          ? "ring-2 ring-offset-2 ring-offset-background ring-current " + c.text
                          : "hover:scale-110"
                      }`}
                    >
                      <span className={`h-3 w-3 rounded-full ${c.dot}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Visible in directory */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Visible in attendee directory</label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={formVisible}
                  onClick={() => setFormVisible(!formVisible)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    formVisible ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                      formVisible ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Ticket mapping */}
              {ticketTypes.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Ticket Mapping</label>
                  <p className="text-xs text-muted-foreground">
                    Automatically assign this category to attendees who purchase a specific ticket.
                  </p>
                  <select
                    value={formTicketId}
                    onChange={(e) => setFormTicketId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">None</option>
                    {ticketTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSubmit} disabled={isPending || !formName.trim()}>
                  {isPending ? "Saving..." : editing ? "Update" : "Create"}
                </Button>
                <Button variant="outline" onClick={closeForm}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Visibility Matrix */}
      {categories.length >= 2 && (
        <div>
          <h3 className="mb-1 text-lg font-semibold">Visibility Matrix</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Control which categories can see each other in the attendee directory.
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Viewer \ Visible</th>
                  {categories.map((cat) => {
                    const color = getColorClasses(cat.color);
                    return (
                      <th key={cat.id} className="px-4 py-3 text-center font-medium">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${color.dot}`} />
                          <span>{cat.name}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {categories.map((viewer) => {
                  const viewerColor = getColorClasses(viewer.color);
                  return (
                    <tr key={viewer.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${viewerColor.dot}`} />
                          <span className="font-medium">{viewer.name}</span>
                        </div>
                      </td>
                      {categories.map((visible) => {
                        const disabled =
                          !viewer.is_visible_in_directory || !visible.is_visible_in_directory;
                        const checked = isVisible(viewer.id, visible.id);
                        return (
                          <td key={visible.id} className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled}
                              onChange={(e) =>
                                handleToggleVisibility(viewer.id, visible.id, e.target.checked)
                              }
                              className={`h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary ${
                                disabled ? "opacity-30" : ""
                              }`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmDialog}
    </div>
  );
}
