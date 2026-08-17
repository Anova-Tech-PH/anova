"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Textarea, Badge, Card, useConfirm } from "@attendly/ui/components";
import { createAddon, updateAddon, deleteAddon } from "../actions";
import type { TicketAddon } from "../queries";

type TicketType = {
  id: string;
  name: string;
};

type AddonFormData = {
  name: string;
  description: string;
  price: string;
  quantity: string;
  limit_per_order: string;
  availability: "until_sales_end" | "specific_date";
  available_until: string;
  applies_to_tickets: string[];
};

const emptyForm: AddonFormData = {
  name: "",
  description: "",
  price: "",
  quantity: "",
  limit_per_order: "10",
  availability: "until_sales_end",
  available_until: "",
  applies_to_tickets: [],
};

function formatPrice(price: number): string {
  return `$${Number(price).toFixed(2)}`;
}

function formatQuantity(addon: TicketAddon): string {
  if (addon.quantity === null) return "Unlimited";
  return String(addon.quantity);
}

function toLocalDatetimeString(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AddonManager({
  eventId,
  addons: initialAddons,
  ticketTypes,
}: {
  eventId: string;
  addons: TicketAddon[];
  ticketTypes: TicketType[];
}) {
  const [addons, setAddons] = useState<TicketAddon[]>(initialAddons);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddonFormData>(emptyForm);
  const [loading, setLoading] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(addon: TicketAddon) {
    setEditingId(addon.id);
    setForm({
      name: addon.name,
      description: addon.description ?? "",
      price: String(addon.price),
      quantity: addon.quantity !== null ? String(addon.quantity) : "",
      limit_per_order: addon.limit_per_order !== null ? String(addon.limit_per_order) : "10",
      availability: addon.available_until ? "specific_date" : "until_sales_end",
      available_until: toLocalDatetimeString(addon.available_until),
      applies_to_tickets: addon.applies_to_tickets ?? [],
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function toggleTicketType(ticketId: string) {
    setForm((f) => ({
      ...f,
      applies_to_tickets: f.applies_to_tickets.includes(ticketId)
        ? f.applies_to_tickets.filter((id) => id !== ticketId)
        : [...f.applies_to_tickets, ticketId],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.price) return;
    setLoading(true);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: Number(form.price),
        quantity: form.quantity ? Number(form.quantity) : null,
        limit_per_order: form.limit_per_order ? Number(form.limit_per_order) : 10,
        available_until:
          form.availability === "specific_date" && form.available_until
            ? new Date(form.available_until).toISOString()
            : null,
        applies_to_tickets:
          form.applies_to_tickets.length > 0
            ? form.applies_to_tickets
            : null,
      };

      if (editingId) {
        await updateAddon(eventId, editingId, payload);
        setAddons((prev) =>
          prev.map((a) =>
            a.id === editingId
              ? { ...a, ...payload, description: payload.description ?? null, updated_at: new Date().toISOString() }
              : a
          )
        );
        toast.success("Add-on updated");
      } else {
        const created = await createAddon(eventId, payload);
        setAddons((prev) => [...prev, created]);
        toast.success("Add-on created");
      }
      closeForm();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save add-on"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(addonId: string) {
    const ok = await confirm({
      title: "Delete Add-on",
      description:
        "Delete this add-on? This action cannot be undone.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await deleteAddon(eventId, addonId);
      setAddons((prev) => prev.filter((a) => a.id !== addonId));
      toast.success("Add-on deleted");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete"
      );
    }
  }

  function getTicketNames(ids: string[] | null): string {
    if (!ids || ids.length === 0) return "All tickets";
    const names = ids
      .map((id) => ticketTypes.find((t) => t.id === id)?.name)
      .filter(Boolean);
    return names.length > 0 ? names.join(", ") : "All tickets";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {addons.length} add-on{addons.length !== 1 ? "s" : ""}
        </p>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Create Add-on
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium">
              {editingId ? "Edit Add-on" : "Create add-on"}
            </h3>
            <button
              onClick={closeForm}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground">Add-on details</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Add-on name *</label>
                <Input
                  required
                  maxLength={50}
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. T-shirt"
                />
                <p className="text-right text-xs text-muted-foreground">
                  {form.name.length}/50
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Price *</label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                maxLength={350}
                rows={3}
                placeholder="Enter a description about this add-on"
              />
              <p className="text-right text-xs text-muted-foreground">
                {form.description.length}/350
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                How long will this add-on be available for purchase? *
              </label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="availability"
                    checked={form.availability === "until_sales_end"}
                    onChange={() =>
                      setForm((f) => ({ ...f, availability: "until_sales_end", available_until: "" }))
                    }
                    className="accent-primary"
                  />
                  Until ticket sales end
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="availability"
                    checked={form.availability === "specific_date"}
                    onChange={() =>
                      setForm((f) => ({ ...f, availability: "specific_date" }))
                    }
                    className="accent-primary"
                  />
                  Until a specific date and time
                </label>
              </div>
              {form.availability === "specific_date" && (
                <Input
                  type="datetime-local"
                  required
                  value={form.available_until}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, available_until: e.target.value }))
                  }
                  className="mt-2 max-w-xs"
                />
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Quantity *</label>
                <Input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, quantity: e.target.value }))
                  }
                  placeholder="Enter quantity"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Limit per order</label>
                <select
                  value={form.limit_per_order}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, limit_per_order: e.target.value }))
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {ticketTypes.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-muted-foreground">Advanced options</p>
                <label className="text-sm font-medium">
                  Which tickets can purchase this add-on? *
                </label>
                <p className="text-xs text-muted-foreground">
                  For example, a T-shirt add-on is only available for member-only tickets.
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="ticket_scope"
                      checked={form.applies_to_tickets.length === 0}
                      onChange={() =>
                        setForm((f) => ({ ...f, applies_to_tickets: [] }))
                      }
                      className="accent-primary"
                    />
                    All tickets ({ticketTypes.length})
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="ticket_scope"
                      checked={form.applies_to_tickets.length > 0}
                      onChange={() =>
                        setForm((f) => ({
                          ...f,
                          applies_to_tickets: [ticketTypes[0]?.id].filter(Boolean),
                        }))
                      }
                      className="accent-primary"
                    />
                    Specific tickets
                  </label>
                </div>
                {form.applies_to_tickets.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ticketTypes.map((ticket) => (
                      <button
                        key={ticket.id}
                        type="button"
                        onClick={() => toggleTicketType(ticket.id)}
                        className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                          form.applies_to_tickets.includes(ticket.id)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        {ticket.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                {editingId ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Add-on list */}
      {addons.length === 0 && !showForm ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">No add-ons yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sell add-ons such as t-shirts and other merchandise. The organizer is responsible for fulfilling these add-ons.
          </p>
          <Button
            onClick={openCreate}
            variant="outline"
            className="mt-4"
            size="sm"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Create Add-on
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {addons.map((addon) => (
            <Card key={addon.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 min-w-0">
                  <span className="text-sm font-semibold">{addon.name}</span>
                  <Badge variant="outline">{formatPrice(addon.price)}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Qty: {formatQuantity(addon)}
                  </span>
                  {addon.limit_per_order && (
                    <span className="text-xs text-muted-foreground">
                      Limit: {addon.limit_per_order}/order
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {getTicketNames(addon.applies_to_tickets)}
                  </span>
                  {addon.available_until && (
                    <span className="text-xs text-muted-foreground">
                      Until: {new Date(addon.available_until).toLocaleDateString()}
                    </span>
                  )}
                  {addon.description && (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {addon.description}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(addon)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(addon.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {confirmDialog}
    </div>
  );
}
