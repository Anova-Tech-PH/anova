"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@attendly/ui/components";
import { toast } from "sonner";
import { issueRefund } from "../actions";

type Props = {
  orderId: string;
  eventId: string;
  maxRefundable: number; // cents
  onClose: () => void;
};

export function RefundDialog({
  orderId,
  eventId,
  maxRefundable,
  onClose,
}: Props) {
  const [amount, setAmount] = useState((maxRefundable / 100).toFixed(2));
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const amountCents = Math.round(parseFloat(amount) * 100);
  const isFullRefund = amountCents >= maxRefundable;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await issueRefund({
          orderId,
          amount: amountCents,
          reason: reason || undefined,
          eventId,
        });
        toast.success(
          isFullRefund ? "Full refund issued" : "Partial refund issued",
        );
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Refund failed");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <form
        onSubmit={handleSubmit}
        className="bg-background w-full max-w-sm space-y-4 rounded-xl border p-6 shadow-lg"
      >
        <h3 className="text-lg font-semibold">Issue Refund</h3>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Amount</label>
          <div className="relative">
            <span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2">
              $
            </span>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={(maxRefundable / 100).toFixed(2)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-7"
              required
            />
          </div>
          <p className="text-muted-foreground text-xs">
            Max refundable: ${(maxRefundable / 100).toFixed(2)}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Reason (optional)</label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Customer requested cancellation"
          />
        </div>

        {isFullRefund && (
          <p className="text-sm text-amber-600">
            This is a full refund. The registration will be cancelled.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isPending}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            Refund ${parseFloat(amount || "0").toFixed(2)}
          </Button>
        </div>
      </form>
    </div>
  );
}
