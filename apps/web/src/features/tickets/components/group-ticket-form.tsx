"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button, Input, Textarea, ModalOverlay } from "@attendly/ui/components";

type GroupTicketFormData = {
  id?: string;
  name: string;
  description: string;
  price: number;
  quantity: string;
  group_size: string;
  min_per_order: string;
  max_per_order: string;
  sales_start: string;
  sales_end: string;
};

export function GroupTicketForm({
  ticket,
  onSubmit,
  onCancel,
}: {
  ticket?: GroupTicketFormData;
  onSubmit: (data: GroupTicketFormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<GroupTicketFormData>({
    name: ticket?.name ?? "",
    description: ticket?.description ?? "",
    price: ticket?.price ?? 5,
    quantity: ticket?.quantity ?? "",
    group_size: ticket?.group_size ?? "2",
    min_per_order: ticket?.min_per_order ?? "2",
    max_per_order: ticket?.max_per_order ?? "",
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
    <ModalOverlay onClose={onCancel}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {ticket ? "Edit Group Ticket" : "Create Group Ticket"}
          </h2>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Group ticket name *</label>
            <Input
              type="text"
              required
              maxLength={50}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Adult General Admission"
            />
            <p className="text-right text-xs text-muted-foreground">{form.name.length}/50</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Ticket description</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              maxLength={200}
              placeholder="Enter a description about this ticket"
            />
            <p className="text-right text-xs text-muted-foreground">{form.description.length}/200</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Total tickets available *</label>
            <Input
              type="number"
              min="1"
              required
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              placeholder="0"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Price per attendee *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                required
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                className="pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This is the price per attendee, not the total price for the entire group.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Minimum tickets per order *</label>
              <Input
                type="number"
                min="2"
                required
                value={form.min_per_order}
                onChange={(e) => setForm((f) => ({ ...f, min_per_order: e.target.value }))}
                placeholder="2"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Maximum tickets per buyer</label>
              <Input
                type="number"
                min="1"
                value={form.max_per_order}
                onChange={(e) => setForm((f) => ({ ...f, max_per_order: e.target.value }))}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Ticket sales start *</label>
              <Input
                type="datetime-local"
                required
                value={form.sales_start}
                onChange={(e) => setForm((f) => ({ ...f, sales_start: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Ticket sales end *</label>
              <Input
                type="datetime-local"
                required
                value={form.sales_end}
                onChange={(e) => setForm((f) => ({ ...f, sales_end: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!form.name || !form.quantity || !form.min_per_order}
              loading={loading}
            >
              {loading ? "Saving..." : ticket ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
