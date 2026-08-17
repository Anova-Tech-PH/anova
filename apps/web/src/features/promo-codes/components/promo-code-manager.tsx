"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Badge, Card, useConfirm } from "@attendly/ui/components";
import {
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
} from "../actions";
import type { PromoCode } from "../queries";

type TicketType = {
  id: string;
  name: string;
};

type PromoCodeFormData = {
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: string;
  max_uses_type: "unlimited" | "limited";
  max_uses: string;
  starts_at: string;
  expires_at: string;
  applies_to: string[];
};

const emptyForm: PromoCodeFormData = {
  code: "",
  discount_type: "fixed",
  discount_value: "",
  max_uses_type: "unlimited",
  max_uses: "",
  starts_at: "",
  expires_at: "",
  applies_to: [],
};

function getStatus(code: PromoCode): { label: string; variant: "success" | "warning" | "destructive" | "outline" } {
  if (!code.active) return { label: "Inactive", variant: "outline" };
  if (code.expires_at && new Date(code.expires_at) < new Date()) return { label: "Expired", variant: "destructive" };
  if (code.max_uses !== null && code.current_uses >= code.max_uses) return { label: "Maxed out", variant: "warning" };
  if (code.starts_at && new Date(code.starts_at) > new Date()) return { label: "Scheduled", variant: "outline" };
  return { label: "Active", variant: "success" };
}

function formatDiscount(code: PromoCode): string {
  if (code.discount_type === "percentage") return `${code.discount_value}%`;
  return `$${Number(code.discount_value).toFixed(2)}`;
}

function formatUsage(code: PromoCode): string {
  if (code.max_uses === null) return `${code.current_uses}/\u221E`;
  return `${code.current_uses}/${code.max_uses}`;
}

function toLocalDatetimeString(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PromoCodeManager({
  eventId,
  initialCodes,
  ticketTypes,
}: {
  eventId: string;
  initialCodes: PromoCode[];
  ticketTypes: TicketType[];
}) {
  const [codes, setCodes] = useState<PromoCode[]>(initialCodes);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PromoCodeFormData>(emptyForm);
  const [loading, setLoading] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(code: PromoCode) {
    setEditingId(code.id);
    setForm({
      code: code.code,
      discount_type: code.discount_type,
      discount_value: String(code.discount_value),
      max_uses_type: code.max_uses !== null ? "limited" : "unlimited",
      max_uses: code.max_uses !== null ? String(code.max_uses) : "",
      starts_at: toLocalDatetimeString(code.starts_at),
      expires_at: toLocalDatetimeString(code.expires_at),
      applies_to: code.applies_to ?? [],
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
      applies_to: f.applies_to.includes(ticketId)
        ? f.applies_to.filter((id) => id !== ticketId)
        : [...f.applies_to, ticketId],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.discount_value) return;
    setLoading(true);

    try {
      const payload = {
        code: form.code.toUpperCase().trim(),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        max_uses: form.max_uses_type === "limited" && form.max_uses ? Number(form.max_uses) : null,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        applies_to: form.applies_to.length > 0 ? form.applies_to : [],
      };

      if (editingId) {
        await updatePromoCode(eventId, editingId, payload);
        setCodes((prev) =>
          prev.map((c) =>
            c.id === editingId
              ? { ...c, ...payload, updated_at: new Date().toISOString() }
              : c
          )
        );
        toast.success("Discount code updated");
      } else {
        const created = await createPromoCode(eventId, payload);
        setCodes((prev) => [created, ...prev]);
        toast.success("Discount code created");
      }
      closeForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save discount code");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(codeId: string) {
    const ok = await confirm({
      title: "Delete Discount Code",
      description: "Delete this discount code? This action cannot be undone.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await deletePromoCode(eventId, codeId);
      setCodes((prev) => prev.filter((c) => c.id !== codeId));
      toast.success("Discount code deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function handleToggleActive(code: PromoCode) {
    try {
      await updatePromoCode(eventId, code.id, { active: !code.active });
      setCodes((prev) =>
        prev.map((c) =>
          c.id === code.id ? { ...c, active: !c.active } : c
        )
      );
      toast.success(code.active ? "Discount code deactivated" : "Discount code activated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  }

  function getTicketNames(ids: string[]): string {
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
          {codes.length} discount code{codes.length !== 1 ? "s" : ""}
        </p>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Create code
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium">
              {editingId ? "Edit discount code" : "Create discount code"}
            </h3>
            <button onClick={closeForm} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Code *</label>
              <Input
                required
                maxLength={50}
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                }
                placeholder="For example, whova50off"
                className="uppercase"
              />
              <p className="text-right text-xs text-muted-foreground">
                {form.code.length}/50
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Discount start *</label>
                <Input
                  type="datetime-local"
                  required
                  value={form.starts_at}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, starts_at: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Discount end *</label>
                <Input
                  type="datetime-local"
                  required
                  value={form.expires_at}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, expires_at: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Discount type *</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="discount_type"
                      checked={form.discount_type === "fixed"}
                      onChange={() =>
                        setForm((f) => ({ ...f, discount_type: "fixed" }))
                      }
                      className="accent-primary"
                    />
                    Flat amount
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="discount_type"
                      checked={form.discount_type === "percentage"}
                      onChange={() =>
                        setForm((f) => ({ ...f, discount_type: "percentage" }))
                      }
                      className="accent-primary"
                    />
                    Percentage of price
                  </label>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Discount amount *</label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  max={form.discount_type === "percentage" ? "100" : undefined}
                  value={form.discount_value}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, discount_value: e.target.value }))
                  }
                  placeholder={form.discount_type === "percentage" ? "20" : "0"}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Number of uses *</label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="max_uses_type"
                    checked={form.max_uses_type === "unlimited"}
                    onChange={() =>
                      setForm((f) => ({ ...f, max_uses_type: "unlimited", max_uses: "" }))
                    }
                    className="accent-primary"
                  />
                  Unlimited
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="max_uses_type"
                    checked={form.max_uses_type === "limited"}
                    onChange={() =>
                      setForm((f) => ({ ...f, max_uses_type: "limited" }))
                    }
                    className="accent-primary"
                  />
                  Limited to
                </label>
              </div>
              {form.max_uses_type === "limited" && (
                <Input
                  type="number"
                  min="1"
                  required
                  value={form.max_uses}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, max_uses: e.target.value }))
                  }
                  placeholder="Enter maximum number of uses"
                  className="mt-2 max-w-xs"
                />
              )}
            </div>

            {ticketTypes.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Assigned tickets</label>
                <p className="text-xs text-muted-foreground">
                  Select which tickets this discount code applies to. Leave empty to apply to all tickets.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ticketTypes.map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => toggleTicketType(ticket.id)}
                      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                        form.applies_to.includes(ticket.id)
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

      {/* Code list */}
      {codes.length === 0 && !showForm ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">No discount codes have been created</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a code to offer discounts to registrants.
          </p>
          <Button onClick={openCreate} variant="outline" className="mt-4" size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Create code
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {codes.map((code) => {
            const status = getStatus(code);
            return (
              <Card key={code.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3 min-w-0">
                    <code className="rounded bg-muted px-2 py-1 text-sm font-semibold">
                      {code.code}
                    </code>
                    <span className="text-sm font-medium">
                      {formatDiscount(code)} off
                    </span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                    <span className="text-xs text-muted-foreground">
                      Used: {formatUsage(code)}
                    </span>
                    {code.starts_at && (
                      <span className="text-xs text-muted-foreground">
                        From: {new Date(code.starts_at).toLocaleDateString()}
                      </span>
                    )}
                    {code.expires_at && (
                      <span className="text-xs text-muted-foreground">
                        Until: {new Date(code.expires_at).toLocaleDateString()}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {getTicketNames(code.applies_to)}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(code)}
                      title={code.active ? "Deactivate" : "Activate"}
                    >
                      {code.active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(code)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(code.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {confirmDialog}
    </div>
  );
}
