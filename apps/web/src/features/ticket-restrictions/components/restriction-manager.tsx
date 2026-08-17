"use client";

import { useState } from "react";
import { Plus, X, Trash2, Mail, Building2, Globe, Users } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Badge, Card, useConfirm } from "@attendly/ui/components";
import { upsertRestriction, removeRestriction } from "../actions";
import type { TicketRestriction } from "../queries";

type TicketType = {
  id: string;
  name: string;
  price: number;
  type: string;
};

type RestrictionType = TicketRestriction["restriction_type"];

const RESTRICTION_INFO: Record<
  RestrictionType,
  { label: string; icon: typeof Mail; description: string; placeholder: string; addLabel: string }
> = {
  email_list: {
    label: "Invited email addresses",
    icon: Mail,
    description: "Only attendees with emails on this list can purchase this ticket.",
    placeholder: "Enter email addresses, one per line",
    addLabel: "Restrict to a list of invited email addresses",
  },
  org_domain: {
    label: "Specific organizations",
    icon: Building2,
    description: "Only attendees with emails from specific organizations (e.g., @harvard.edu, @microsoft.com) can purchase this ticket.",
    placeholder: "Enter organization domains, one per line (e.g., harvard.edu)",
    addLabel: "Restrict to specific organizations",
  },
  domain_type: {
    label: "Organization types",
    icon: Globe,
    description: "Only attendees with eligible email domains (e.g., .edu, .gov) can purchase this ticket.",
    placeholder: "Enter domain types, one per line (e.g., .edu, .gov, .org)",
    addLabel: "Restrict to specific organization types",
  },
  membership: {
    label: "Membership levels",
    icon: Users,
    description: "Only attendees with specific membership IDs can purchase this ticket. Upload a list of member IDs.",
    placeholder: "Enter member IDs, one per line",
    addLabel: "Restrict to membership levels and statuses",
  },
};

function getRestrictionSummary(restrictions: TicketRestriction[]): string {
  if (restrictions.length === 0) return "No restrictions";
  const parts = restrictions.map((r) => {
    const count = r.values.length;
    switch (r.restriction_type) {
      case "email_list":
        return `${count} email${count !== 1 ? "s" : ""}`;
      case "org_domain":
        return `${count} org${count !== 1 ? "s" : ""}`;
      case "domain_type":
        return `${count} domain type${count !== 1 ? "s" : ""}`;
      case "membership":
        return `${count} member ID${count !== 1 ? "s" : ""}`;
    }
  });
  return parts.join(", ");
}

export function RestrictionManager({
  eventId,
  tickets,
  initialRestrictions,
}: {
  eventId: string;
  tickets: TicketType[];
  initialRestrictions: TicketRestriction[];
}) {
  const [restrictions, setRestrictions] = useState<TicketRestriction[]>(initialRestrictions);
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [editingType, setEditingType] = useState<RestrictionType | null>(null);
  const [editValues, setEditValues] = useState("");
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  function getTicketRestrictions(ticketId: string) {
    return restrictions.filter((r) => r.ticket_type_id === ticketId);
  }

  function openEditor(ticketId: string, type: RestrictionType) {
    const existing = restrictions.find(
      (r) => r.ticket_type_id === ticketId && r.restriction_type === type
    );
    setEditingTicketId(ticketId);
    setEditingType(type);
    setEditValues(existing ? existing.values.join("\n") : "");
    setDropdownOpen(null);
  }

  function closeEditor() {
    setEditingTicketId(null);
    setEditingType(null);
    setEditValues("");
  }

  async function handleSave() {
    if (!editingTicketId || !editingType) return;
    const values = editValues
      .split("\n")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);

    if (values.length === 0) {
      toast.error("Please enter at least one value");
      return;
    }

    setLoading(true);
    try {
      await upsertRestriction(eventId, editingTicketId, editingType, values);
      setRestrictions((prev) => {
        const filtered = prev.filter(
          (r) => !(r.ticket_type_id === editingTicketId && r.restriction_type === editingType)
        );
        return [
          ...filtered,
          {
            id: crypto.randomUUID(),
            ticket_type_id: editingTicketId!,
            restriction_type: editingType!,
            values,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
      });
      toast.success("Restriction saved");
      closeEditor();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save restriction");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(ticketId: string, type: RestrictionType) {
    const info = RESTRICTION_INFO[type];
    const ok = await confirm({
      title: "Remove Restriction",
      description: `Remove "${info.label}" restriction from this ticket? Anyone will be able to register for this ticket type.`,
      confirmLabel: "Remove",
    });
    if (!ok) return;

    try {
      await removeRestriction(eventId, ticketId, type);
      setRestrictions((prev) =>
        prev.filter((r) => !(r.ticket_type_id === ticketId && r.restriction_type === type))
      );
      toast.success("Restriction removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove restriction");
    }
  }

  function formatPrice(ticket: TicketType): string {
    if (ticket.type === "free") return "Free";
    return `$${Number(ticket.price).toFixed(2)}`;
  }

  const editingInfo = editingType ? RESTRICTION_INFO[editingType] : null;
  const editingTicketName = editingTicketId
    ? tickets.find((t) => t.id === editingTicketId)?.name ?? ""
    : "";

  return (
    <div className="space-y-4">
      {/* Editor panel */}
      {editingTicketId && editingType && editingInfo && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-medium">{editingInfo.label}</h3>
              <p className="text-sm text-muted-foreground">
                Ticket: {editingTicketName}
              </p>
            </div>
            <button onClick={closeEditor} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">{editingInfo.description}</p>
          <textarea
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            rows={8}
            value={editValues}
            onChange={(e) => setEditValues(e.target.value)}
            placeholder={editingInfo.placeholder}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {editValues.split("\n").filter((v) => v.trim()).length} entries
          </p>
          <div className="mt-4 flex gap-2">
            <Button type="button" variant="outline" onClick={closeEditor}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={loading}>
              Save
            </Button>
          </div>
        </Card>
      )}

      {/* Ticket table */}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Ticket name</th>
              <th className="px-4 py-3 text-left font-medium">Price</th>
              <th className="px-4 py-3 text-left font-medium">Restricted to</th>
              <th className="px-4 py-3 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => {
              const ticketRestrictions = getTicketRestrictions(ticket.id);
              const summary = getRestrictionSummary(ticketRestrictions);
              return (
                <tr key={ticket.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{ticket.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatPrice(ticket)}</td>
                  <td className="px-4 py-3">
                    {ticketRestrictions.length === 0 ? (
                      <span className="text-muted-foreground">No restrictions</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {ticketRestrictions.map((r) => {
                          const info = RESTRICTION_INFO[r.restriction_type];
                          const Icon = info.icon;
                          return (
                            <Badge
                              key={r.restriction_type}
                              variant="outline"
                              className="cursor-pointer gap-1"
                              onClick={() => openEditor(ticket.id, r.restriction_type)}
                            >
                              <Icon className="h-3 w-3" />
                              {r.values.length}{" "}
                              {r.restriction_type === "email_list"
                                ? "email" + (r.values.length !== 1 ? "s" : "")
                                : r.restriction_type === "org_domain"
                                  ? "org" + (r.values.length !== 1 ? "s" : "")
                                  : r.restriction_type === "domain_type"
                                    ? "type" + (r.values.length !== 1 ? "s" : "")
                                    : "ID" + (r.values.length !== 1 ? "s" : "")}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemove(ticket.id, r.restriction_type);
                                }}
                                className="ml-0.5 text-muted-foreground hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="relative inline-block">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setDropdownOpen(dropdownOpen === ticket.id ? null : ticket.id)
                        }
                      >
                        Add restrictions
                        <svg
                          className="ml-1 h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </Button>
                      {dropdownOpen === ticket.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setDropdownOpen(null)}
                          />
                          <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-lg border border-border bg-popover p-1 shadow-lg">
                            {(
                              Object.entries(RESTRICTION_INFO) as [
                                RestrictionType,
                                (typeof RESTRICTION_INFO)[RestrictionType],
                              ][]
                            ).map(([type, info]) => {
                              const Icon = info.icon;
                              const existing = ticketRestrictions.find(
                                (r) => r.restriction_type === type
                              );
                              return (
                                <button
                                  key={type}
                                  className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left text-sm hover:bg-muted"
                                  onClick={() => openEditor(ticket.id, type)}
                                >
                                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                  <div>
                                    <div className="font-medium">
                                      {info.addLabel}
                                      {existing && (
                                        <Badge variant="outline" className="ml-2 text-xs">
                                          {existing.values.length}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Items {tickets.length > 0 ? "1" : "0"}–{tickets.length} of {tickets.length}
      </p>

      {confirmDialog}
    </div>
  );
}
