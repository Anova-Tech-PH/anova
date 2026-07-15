"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button, Input, Textarea } from "@/shared/components/ui";

type TicketFormData = {
  id?: string;
  name: string;
  description: string;
  type: string;
  price: number;
  quantity: string;
  sales_start: string;
  sales_end: string;
};

export function TicketForm({
  ticket,
  onSubmit,
  onCancel,
}: {
  ticket?: TicketFormData;
  onSubmit: (data: TicketFormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<TicketFormData>({
    name: ticket?.name ?? "",
    description: ticket?.description ?? "",
    type: ticket?.type ?? "free",
    price: ticket?.price ?? 0,
    quantity: ticket?.quantity ?? "",
    sales_start: ticket?.sales_start ?? "",
    sales_end: ticket?.sales_end ?? "",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {ticket ? "Edit Ticket Type" : "Add Ticket Type"}
          </h2>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Name *</label>
            <Input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. General Admission"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="What's included with this ticket?"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type</label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    type: e.target.value,
                    price: e.target.value === "free" ? 0 : f.price,
                  }))
                }
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            {form.type === "paid" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Price ($)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Quantity (leave blank for unlimited)</label>
            <Input
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              placeholder="Unlimited"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Sales start</label>
              <Input
                type="datetime-local"
                value={form.sales_start}
                onChange={(e) => setForm((f) => ({ ...f, sales_start: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Sales end</label>
              <Input
                type="datetime-local"
                value={form.sales_end}
                onChange={(e) => setForm((f) => ({ ...f, sales_end: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!form.name}
              loading={loading}
            >
              {loading ? "Saving..." : ticket ? "Update" : "Add Ticket Type"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
