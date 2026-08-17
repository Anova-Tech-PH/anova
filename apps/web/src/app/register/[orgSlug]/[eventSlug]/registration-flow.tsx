"use client";

import { useState, useCallback, useRef } from "react";
import { Check, Ticket, ChevronDown, X, Clock } from "lucide-react";
import { toast } from "sonner";
import { registerForEvent } from "@/features/registration/actions";
import { trackRegistrationIntent } from "@/features/registration/intent-actions";
import { validatePromoCode } from "@/features/promo-codes/actions";
import { createCheckoutSession } from "@/features/payments/checkout-actions";
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
  initialIntent,
  orgSlug,
  eventSlug,
}: {
  eventId: string;
  tickets: TicketType[];
  customFields?: CustomFieldDef[];
  initialIntent?: {
    ticket_type_id: string;
    email: string;
    name?: string;
    custom_fields?: Record<string, string | boolean>;
  };
  orgSlug: string;
  eventSlug: string;
}) {
  const [selectedTicket, setSelectedTicket] = useState<string | null>(initialIntent?.ticket_type_id ?? null);
  const [name, setName] = useState(initialIntent?.name ?? "");
  const [email, setEmail] = useState(initialIntent?.email ?? "");
  const [customValues, setCustomValues] = useState<Record<string, string | boolean>>(initialIntent?.custom_fields ?? {});

  const intentTracked = useRef<string | null>(null);

  const handleEmailBlur = useCallback(async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!selectedTicket || !trimmedEmail || !trimmedEmail.includes("@")) return;
    if (intentTracked.current === trimmedEmail) return;
    intentTracked.current = trimmedEmail;
    try {
      await trackRegistrationIntent({
        event_id: eventId,
        ticket_type_id: selectedTicket,
        email: trimmedEmail,
        name: name || undefined,
      });
    } catch {
      // Silent fail — intent tracking should never block UX
    }
  }, [email, selectedTicket, name, eventId]);

  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    qr_code: string;
    name: string;
    email: string;
    status: string;
  } | null>(null);

  // Promo code state
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{
    id: string;
    code: string;
    discount_type: "percentage" | "fixed";
    discount_value: number;
  } | null>(null);

  const selected = tickets.find((t) => t.id === selectedTicket);

  // Calculate discounted price
  const originalPrice = selected ? selected.price : 0;
  const discountAmount = appliedPromo
    ? appliedPromo.discount_type === "percentage"
      ? parseFloat((originalPrice * appliedPromo.discount_value / 100).toFixed(2))
      : Math.min(appliedPromo.discount_value, originalPrice)
    : 0;
  const finalPrice = Math.max(0, originalPrice - discountAmount);

  async function handleApplyPromo() {
    if (!promoInput.trim() || !selectedTicket) return;
    setPromoLoading(true);
    try {
      const result = await validatePromoCode(eventId, promoInput, selectedTicket);
      setAppliedPromo({
        id: result.id,
        code: promoInput.toUpperCase().trim(),
        discount_type: result.discount_type,
        discount_value: result.discount_value,
      });
      toast.success("Promo code applied!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid promo code");
    } finally {
      setPromoLoading(false);
    }
  }

  function removePromo() {
    setAppliedPromo(null);
    setPromoInput("");
  }

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

      // Paid ticket: redirect to Stripe Checkout
      if (finalPrice > 0) {
        const { url } = await createCheckoutSession({
          event_id: eventId,
          ticket_type_id: selectedTicket,
          name,
          email,
          custom_fields: Object.keys(custom_fields).length > 0 ? custom_fields : undefined,
          promo_code_id: appliedPromo?.id,
          discount_amount: appliedPromo ? discountAmount : undefined,
          origin: window.location.origin,
          org_slug: orgSlug,
          event_slug: eventSlug,
        });
        if (url) {
          window.location.href = url;
          return;
        }
        throw new Error("Failed to create checkout session");
      }

      // Free ticket: register directly
      const reg = await registerForEvent({
        event_id: eventId,
        ticket_type_id: selectedTicket,
        name,
        email,
        custom_fields,
        promo_code_id: appliedPromo?.id,
        discount_amount: appliedPromo ? discountAmount : undefined,
      });
      setConfirmation(reg);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (confirmation) {
    // If the registration is pending approval, show a different message instead of the QR code
    if (confirmation.status === "pending") {
      return (
        <div className="mt-8 flex flex-col items-center gap-4 rounded-xl border bg-card p-8 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold">Registration Pending</h2>
          <p className="text-muted-foreground max-w-sm">
            Your registration is pending approval. You will receive an email at{" "}
            <strong>{confirmation.email}</strong> once approved by the organizer.
          </p>
          <p className="text-sm text-muted-foreground">
            Thank you for your interest, {confirmation.name}!
          </p>
        </div>
      );
    }

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
              onClick={() => {
                if (soldOut) return;
                setSelectedTicket(ticket.id);
                // Reset intent tracking so it re-tracks with new ticket
                const trimmedEmail = email.trim().toLowerCase();
                if (trimmedEmail && trimmedEmail.includes("@")) {
                  intentTracked.current = null;
                }
              }}
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

      {/* Promo code section */}
      {selectedTicket && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setPromoOpen(!promoOpen)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${promoOpen ? "rotate-180" : ""}`}
            />
            Have a promo code?
          </button>

          {promoOpen && (
            <div className="space-y-2">
              {appliedPromo ? (
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm dark:border-green-800 dark:bg-green-950">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>
                    Code <strong>{appliedPromo.code}</strong> applied:{" "}
                    {appliedPromo.discount_type === "percentage"
                      ? `${appliedPromo.discount_value}% off`
                      : `$${appliedPromo.discount_value.toFixed(2)} off`}
                  </span>
                  <button
                    type="button"
                    onClick={removePromo}
                    className="ml-auto text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="flex-1 uppercase"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleApplyPromo}
                    disabled={!promoInput.trim() || promoLoading}
                  >
                    {promoLoading ? "Checking..." : "Apply"}
                  </Button>
                </div>
              )}

              {appliedPromo && selected && selected.type !== "free" && (
                <div className="text-sm text-muted-foreground">
                  <span className="line-through">${originalPrice.toFixed(2)}</span>{" "}
                  <span className="font-semibold text-foreground">
                    ${finalPrice.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
              onBlur={handleEmailBlur}
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
            {loading
              ? "Registering..."
              : finalPrice > 0
                ? `Pay $${finalPrice.toFixed(2)} & Register`
                : "Complete Registration"}
          </Button>
        </form>
      )}
    </div>
  );
}
