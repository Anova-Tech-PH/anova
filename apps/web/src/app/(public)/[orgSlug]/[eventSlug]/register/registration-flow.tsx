"use client";

import { useState } from "react";
import { Check, Ticket } from "lucide-react";
import { toast } from "sonner";
import { registerForEvent } from "@/features/registration/actions";
import { QrConfirmation } from "./qr-confirmation";
import { Input, Button, Textarea } from "@attendly/ui/components";

type TicketType = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  price: number;
  available: number | null;
};

type CustomFieldDef = {
  id: string;
  label: string;
  field_key: string;
  type: string;
  required: boolean;
  options: string[];
  placeholder: string | null;
};

export function RegistrationFlow({
  eventId,
  tickets,
  customFields = [],
}: {
  eventId: string;
  tickets: TicketType[];
  customFields?: CustomFieldDef[];
}) {
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [customValues, setCustomValues] = useState<Record<string, string | boolean>>({});
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    qr_code: string;
    name: string;
    email: string;
  } | null>(null);

  const selected = tickets.find((t) => t.id === selectedTicket);

  function setCustomValue(key: string, value: string | boolean) {
    setCustomValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTicket) return;
    setLoading(true);

    try {
      // Build custom_fields from dynamic values
      const custom_fields: Record<string, string | boolean> = {};
      for (const field of customFields) {
        const val = customValues[field.field_key];
        if (val !== undefined && val !== "" && val !== false) {
          custom_fields[field.field_key] = val;
        }
      }

      const reg = await registerForEvent({
        event_id: eventId,
        ticket_type_id: selectedTicket,
        name,
        email,
        custom_fields,
      });
      setConfirmation(reg);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (confirmation) {
    return (
      <QrConfirmation
        name={confirmation.name}
        email={confirmation.email}
        qrCode={confirmation.qr_code}
        ticketName={selected?.name ?? ""}
      />
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {/* Step 1: Select ticket */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium">Select a ticket</h2>
        {tickets.map((ticket) => {
          const soldOut = ticket.available !== null && ticket.available <= 0;
          return (
            <button
              key={ticket.id}
              onClick={() => !soldOut && setSelectedTicket(ticket.id)}
              disabled={soldOut}
              className={`w-full rounded-xl border p-4 text-left transition-colors ${
                selectedTicket === ticket.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : soldOut
                    ? "cursor-not-allowed opacity-50"
                    : "hover:border-foreground/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                      selectedTicket === ticket.id
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {selectedTicket === ticket.id && (
                      <Check className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{ticket.name}</p>
                    {ticket.description && (
                      <p className="text-xs text-muted-foreground">{ticket.description}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {ticket.type === "free" ? "Free" : `$${ticket.price}`}
                  </p>
                  {soldOut ? (
                    <p className="text-xs text-destructive">Sold out</p>
                  ) : ticket.available !== null ? (
                    <p className="text-xs text-muted-foreground">
                      {ticket.available} left
                    </p>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Step 2: Fill form */}
      {selectedTicket && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-sm font-medium">Your information</h2>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Full name *</label>
            <Input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email *</label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {/* Dynamic custom fields */}
          {customFields.map((field) => (
            <div key={field.id} className="space-y-1.5">
              <label className="text-sm font-medium">
                {field.label}
                {field.required && " *"}
              </label>

              {field.type === "text" && (
                <Input
                  type="text"
                  required={field.required}
                  value={(customValues[field.field_key] as string) ?? ""}
                  onChange={(e) => setCustomValue(field.field_key, e.target.value)}
                  placeholder={field.placeholder ?? undefined}
                />
              )}

              {field.type === "textarea" && (
                <Textarea
                  required={field.required}
                  value={(customValues[field.field_key] as string) ?? ""}
                  onChange={(e) => setCustomValue(field.field_key, e.target.value)}
                  placeholder={field.placeholder ?? undefined}
                  rows={3}
                />
              )}

              {field.type === "select" && (
                <select
                  required={field.required}
                  value={(customValues[field.field_key] as string) ?? ""}
                  onChange={(e) => setCustomValue(field.field_key, e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">
                    {field.placeholder || "Select..."}
                  </option>
                  {(field.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}

              {field.type === "checkbox" && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!customValues[field.field_key]}
                    onChange={(e) => setCustomValue(field.field_key, e.target.checked)}
                    required={field.required}
                    className="h-4 w-4 rounded border-input"
                  />
                  {field.placeholder && (
                    <span className="text-sm text-muted-foreground">
                      {field.placeholder}
                    </span>
                  )}
                </div>
              )}

              {field.type === "number" && (
                <Input
                  type="number"
                  required={field.required}
                  value={(customValues[field.field_key] as string) ?? ""}
                  onChange={(e) => setCustomValue(field.field_key, e.target.value)}
                  placeholder={field.placeholder ?? undefined}
                />
              )}

              {field.type === "date" && (
                <Input
                  type="date"
                  required={field.required}
                  value={(customValues[field.field_key] as string) ?? ""}
                  onChange={(e) => setCustomValue(field.field_key, e.target.value)}
                />
              )}
            </div>
          ))}

          <Button
            type="submit"
            disabled={!name || !email}
            loading={loading}
            className="w-full"
          >
            {loading ? "Registering..." : "Complete Registration"}
          </Button>
        </form>
      )}
    </div>
  );
}
