"use client";

import { useState, useTransition } from "react";
import { CalendarDays, Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { GroupTicketForm } from "./group-ticket-form";
import { createTicketType, updateTicketType, deleteTicketType } from "../actions";
import { Badge, Button, Card, EmptyState, useConfirm } from "@attendly/ui/components";

type GroupTicket = {
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
  group_size: number | null;
  min_per_order: number | null;
  max_per_order: number | null;
};

function formatShortDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export function GroupTicketList({
  eventId,
  initialTickets,
}: {
  eventId: string;
  initialTickets: GroupTicket[];
}) {
  const [tickets, setTickets] = useState(initialTickets);
  const [showForm, setShowForm] = useState(false);
  const [editingTicket, setEditingTicket] = useState<GroupTicket | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [isPending, startTransition] = useTransition();

  async function handleCreate(data: any) {
    try {
      const groupSize = parseInt(data.min_per_order) || 2;
      const ticket = await createTicketType(eventId, {
        name: data.name,
        description: data.description || undefined,
        type: "paid",
        price: data.price,
        quantity: data.quantity ? parseInt(data.quantity) : undefined,
        sales_start: data.sales_start ? new Date(data.sales_start).toISOString() : undefined,
        sales_end: data.sales_end ? new Date(data.sales_end).toISOString() : undefined,
        group_size: groupSize,
        min_per_order: parseInt(data.min_per_order) || 2,
        max_per_order: data.max_per_order ? parseInt(data.max_per_order) : null,
      });
      setTickets((prev) => [...prev, { ...ticket, sold: 0 }]);
      setShowForm(false);
      toast.success("Group ticket created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create group ticket");
    }
  }

  async function handleUpdate(data: any) {
    if (!editingTicket) return;
    try {
      const groupSize = parseInt(data.min_per_order) || 2;
      await updateTicketType(eventId, editingTicket.id, {
        name: data.name,
        description: data.description || undefined,
        type: "paid",
        price: data.price,
        quantity: data.quantity ? parseInt(data.quantity) : null,
        sales_start: data.sales_start ? new Date(data.sales_start).toISOString() : null,
        sales_end: data.sales_end ? new Date(data.sales_end).toISOString() : null,
        group_size: groupSize,
        min_per_order: parseInt(data.min_per_order) || 2,
        max_per_order: data.max_per_order ? parseInt(data.max_per_order) : null,
      });
      setTickets((prev) =>
        prev.map((t) =>
          t.id === editingTicket.id
            ? { ...t, name: data.name, description: data.description, price: data.price, quantity: data.quantity ? parseInt(data.quantity) : null, group_size: groupSize, min_per_order: parseInt(data.min_per_order) || 2, max_per_order: data.max_per_order ? parseInt(data.max_per_order) : null, sales_start: data.sales_start ? new Date(data.sales_start).toISOString() : null, sales_end: data.sales_end ? new Date(data.sales_end).toISOString() : null }
            : t
        )
      );
      setEditingTicket(null);
      toast.success("Group ticket updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update group ticket");
    }
  }

  async function handleDelete(ticket: GroupTicket) {
    const ok = await confirm({
      title: "Delete Group Ticket",
      description: `Delete group ticket "${ticket.name}"? This action cannot be undone.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteTicketType(eventId, ticket.id);
        setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
        toast.success("Group ticket deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Incentivize bulk purchases with discounted group tickets. Attendees can buy multiple tickets at once and add attendee details later.
        </p>
        <Button onClick={() => setShowForm(true)} className="shrink-0">
          <Plus className="h-4 w-4" />
          Create Group Ticket
        </Button>
      </div>

      {tickets.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No group tickets yet"
          description="Create group tickets to let attendees purchase multiple tickets at a discounted price."
          action={
            <Button onClick={() => setShowForm(true)} variant="outline">
              <Plus className="h-4 w-4" />
              Create Group Ticket
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const soldPercent = ticket.quantity
              ? Math.min(100, Math.round((ticket.sold / ticket.quantity) * 100))
              : 0;

            return (
              <Card
                key={ticket.id}
                className="group overflow-hidden p-0 transition-all duration-200 hover:shadow-md"
                style={{ borderLeftWidth: 4, borderLeftColor: "oklch(0.6 0.15 250)" }}
              >
                <div className="flex items-center justify-between p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{ticket.name}</h3>
                      <Badge variant="info" className="text-xs font-semibold px-2.5">
                        ${ticket.price}/person
                      </Badge>
                      <Badge variant="outline" className="text-xs px-2.5">
                        Min {ticket.min_per_order ?? ticket.group_size ?? 2} tickets
                      </Badge>
                      {ticket.max_per_order && (
                        <Badge variant="outline" className="text-xs px-2.5">
                          Max {ticket.max_per_order} tickets
                        </Badge>
                      )}
                    </div>
                    {ticket.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground truncate">
                        {ticket.description}
                      </p>
                    )}
                    {(ticket.sales_start || ticket.sales_end) && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        On sale: {formatShortDate(ticket.sales_start) ?? "Now"}
                        {" – "}
                        {formatShortDate(ticket.sales_end) ?? "No end date"}
                      </p>
                    )}

                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-flex h-5 min-w-8 items-center justify-center rounded-md bg-primary/10 px-1.5 font-semibold text-primary">
                            {ticket.sold}
                          </span>
                          <span className="text-muted-foreground">
                            sold{ticket.quantity ? ` of ${ticket.quantity}` : ""}
                          </span>
                        </span>
                        {ticket.quantity ? (
                          <span className="text-muted-foreground">
                            {ticket.quantity - ticket.sold} remaining
                          </span>
                        ) : null}
                      </div>
                      {ticket.quantity ? (
                        <div className="h-1.5 w-full max-w-xs rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              soldPercent >= 90 ? "bg-amber-400" : "bg-primary"
                            }`}
                            style={{ width: `${soldPercent}%` }}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-1 ml-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingTicket(ticket)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(ticket)}
                      disabled={isPending}
                      className="hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showForm && (
        <GroupTicketForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingTicket && (
        <GroupTicketForm
          ticket={{
            id: editingTicket.id,
            name: editingTicket.name,
            description: editingTicket.description ?? "",
            price: editingTicket.price,
            quantity: editingTicket.quantity?.toString() ?? "",
            group_size: (editingTicket.group_size ?? 2).toString(),
            min_per_order: (editingTicket.min_per_order ?? editingTicket.group_size ?? 2).toString(),
            max_per_order: editingTicket.max_per_order?.toString() ?? "",
            sales_start: toLocalInput(editingTicket.sales_start),
            sales_end: toLocalInput(editingTicket.sales_end),
          }}
          onSubmit={handleUpdate}
          onCancel={() => setEditingTicket(null)}
        />
      )}

      {confirmDialog}
    </div>
  );
}
