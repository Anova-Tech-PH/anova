"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Badge, useConfirm } from "@attendly/ui/components";
import { createSponsorCoupon, deleteSponsorCoupon } from "../actions";
import type { SponsorCoupon } from "../queries";

export function SponsorCouponsManager({
  sponsorId,
  eventId,
  initialCoupons,
}: {
  sponsorId: string;
  eventId: string;
  initialCoupons: SponsorCoupon[];
}) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [adding, setAdding] = useState(false);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [validUntil, setValidUntil] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();

  async function handleAdd() {
    if (!code.trim() || discountValue <= 0) return;
    startTransition(async () => {
      try {
        const coupon = await createSponsorCoupon(sponsorId, eventId, {
          code: code.trim().toUpperCase(),
          description: description.trim() || undefined,
          discount_value: discountValue,
          discount_type: discountType,
          valid_until: validUntil || undefined,
          max_uses: maxUses ? parseInt(maxUses) : undefined,
        });
        setCoupons([...coupons, coupon as SponsorCoupon]);
        setAdding(false);
        resetForm();
        toast.success("Coupon created");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create coupon");
      }
    });
  }

  function resetForm() {
    setCode("");
    setDescription("");
    setDiscountValue(0);
    setDiscountType("percentage");
    setValidUntil("");
    setMaxUses("");
  }

  async function handleDelete(coupon: SponsorCoupon) {
    const ok = await confirm({
      title: "Delete Coupon",
      description: `Delete coupon "${coupon.code}"? This action cannot be undone.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteSponsorCoupon(sponsorId, eventId, coupon.id);
        setCoupons(coupons.filter((c) => c.id !== coupon.id));
        toast.success("Coupon deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete coupon");
      }
    });
  }

  function formatDiscount(coupon: SponsorCoupon) {
    return coupon.discount_type === "percentage"
      ? `${coupon.discount_value}%`
      : `$${coupon.discount_value.toFixed(2)}`;
  }

  return (
    <div className="space-y-4">
      {confirmDialog}

      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">Coupons</h4>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add Coupon
        </Button>
      </div>

      {adding && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Code *</label>
              <Input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="SPONSOR20"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <Input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="20% off booth pass"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Discount *</label>
              <Input
                type="number"
                min={0}
                step={discountType === "percentage" ? 1 : 0.01}
                value={discountValue || ""}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed ($)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Max Uses</label>
              <Input
                type="number"
                min={0}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Valid Until</label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAdding(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!code.trim() || discountValue <= 0 || isPending}
              onClick={handleAdd}
              loading={isPending}
            >
              Add Coupon
            </Button>
          </div>
        </div>
      )}

      {coupons.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground">No coupons yet.</p>
      ) : (
        <div className="space-y-2">
          {coupons.map((coupon) => (
            <div
              key={coupon.id}
              className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Badge variant="info" className="font-mono shrink-0">
                  {coupon.code}
                </Badge>
                <div className="min-w-0 flex-1">
                  {coupon.description && (
                    <p className="text-sm truncate">{coupon.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{formatDiscount(coupon)} off</span>
                    <span>
                      Usage: {coupon.current_uses}/{coupon.max_uses ?? "\u221E"}
                    </span>
                    {coupon.valid_until && (
                      <span>
                        Valid until {new Date(coupon.valid_until).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDelete(coupon)}
                disabled={isPending}
                className="rounded p-1 hover:bg-destructive/10 sm:invisible sm:group-hover:visible shrink-0"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
