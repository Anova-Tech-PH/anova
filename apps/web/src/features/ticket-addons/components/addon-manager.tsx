"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Badge, Card, useConfirm } from "@attendly/ui/components";
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
  applies_to_tickets: string[];
};

const emptyForm: AddonFormData = {
  name: "",
  description: "",
  price: "",
  quantity: "",
  applies_to_tickets: [],
};

function formatPrice(price: number): string {
  return `$${Number(price).toFixed(2)}`;
}

function formatQuantity(addon: TicketAddon): string {
  if (addon.quantity === null) return "Unlimited";
  return String(addon.quantity);
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
              {editingId ? "Edit Add-on" : "New Add-on"}
            </h3>
            <button
              onClick={closeForm}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Name *</label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. T-Shirt, Parking Pass"
                />
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
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Optional description"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Quantity</label>
                <Input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, quantity: e.target.value }))
                  }
                  placeholder="Unlimited"
                />
              </div>
            </div>

            {ticketTypes.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Applies to Tickets
                </label>
                <p className="text-xs text-muted-foreground">
                  Leave unchecked to apply to all ticket types.
                </p>
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
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="submit" loading={loading}>
                {editingId ? "Update" : "Create"} Add-on
              </Button>
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancel
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
            Create add-ons such as t-shirts, parking passes, or meal upgrades that attendees can purchase during registration.
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
                  <span className="text-xs text-muted-foreground">
                    {getTicketNames(addon.applies_to_tickets)}
                  </span>
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
