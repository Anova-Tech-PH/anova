"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Ticket } from "lucide-react";
import { toast } from "sonner";
import { TicketForm } from "./ticket-form";
import { createTicketType, updateTicketType, deleteTicketType } from "../actions";

type TicketType = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  price: number;
  quantity: number | null;
  sales_start: string | null;
  sales_end: string | null;
  sort_order: number;
  sold: number;
};

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export function TicketList({
  eventId,
  initialTickets,
}: {
  eventId: string;
  initialTickets: TicketType[];
}) {
  const [tickets, setTickets] = useState(initialTickets);
  const [showForm, setShowForm] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleCreate(data: any) {
    try {
      const ticket = await createTicketType(eventId, {
        name: data.name,
        description: data.description || undefined,
        type: data.type,
        price: data.type === "free" ? 0 : data.price,
        quantity: data.quantity ? parseInt(data.quantity) : undefined,
        sales_start: data.sales_start ? new Date(data.sales_start).toISOString() : undefined,
        sales_end: data.sales_end ? new Date(data.sales_end).toISOString() : undefined,
      });
      setTickets((prev) => [...prev, { ...ticket, sold: 0 }]);
      setShowForm(false);
      toast.success("Ticket type created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create ticket type");
    }
  }

  async function handleUpdate(data: any) {
    if (!editingTicket) return;
    try {
      await updateTicketType(eventId, editingTicket.id, {
        name: data.name,
        description: data.description || undefined,
        type: data.type,
        price: data.type === "free" ? 0 : data.price,
        quantity: data.quantity ? parseInt(data.quantity) : null,
        sales_start: data.sales_start ? new Date(data.sales_start).toISOString() : null,
        sales_end: data.sales_end ? new Date(data.sales_end).toISOString() : null,
      });
      setTickets((prev) =>
        prev.map((t) =>
          t.id === editingTicket.id
            ? { ...t, ...data, price: data.type === "free" ? 0 : data.price }
            : t
        )
      );
      setEditingTicket(null);
      toast.success("Ticket type updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update ticket type");
    }
  }

  function handleDelete(ticket: TicketType) {
    if (!confirm(`Delete ticket type "${ticket.name}"?`)) return;
    startTransition(async () => {
      try {
        await deleteTicketType(eventId, ticket.id);
        setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
        toast.success("Ticket type deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ticket Types</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Ticket Type
        </button>
      </div>

      {tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Ticket className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">No ticket types yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 text-sm font-medium text-primary underline"
          >
            Create your first ticket type
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="flex items-center justify-between rounded-xl border bg-card p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{ticket.name}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      ticket.type === "free"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {ticket.type === "free" ? "Free" : `$${ticket.price}`}
                  </span>
                </div>
                {ticket.description && (
                  <p className="mt-0.5 text-sm text-muted-foreground truncate">
                    {ticket.description}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    {ticket.sold} sold
                    {ticket.quantity ? ` / ${ticket.quantity}` : ""}
                  </span>
                  {ticket.quantity && (
                    <span>
                      {ticket.quantity - ticket.sold} remaining
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 gap-1 ml-4">
                <button
                  onClick={() => setEditingTicket(ticket)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(ticket)}
                  disabled={isPending}
                  className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <TicketForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {editingTicket && (
        <TicketForm
          ticket={{
            id: editingTicket.id,
            name: editingTicket.name,
            description: editingTicket.description ?? "",
            type: editingTicket.type,
            price: editingTicket.price,
            quantity: editingTicket.quantity?.toString() ?? "",
            sales_start: toLocalInput(editingTicket.sales_start),
            sales_end: toLocalInput(editingTicket.sales_end),
          }}
          onSubmit={handleUpdate}
          onCancel={() => setEditingTicket(null)}
        />
      )}
    </div>
  );
}
