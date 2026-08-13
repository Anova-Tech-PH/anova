"use client";

import { Copy, Tag } from "lucide-react";
import { toast } from "sonner";
import type { SponsorCoupon } from "@/features/sponsors/queries";

type CouponDisplayProps = {
  coupons: SponsorCoupon[];
};

function formatDiscount(coupon: SponsorCoupon): string {
  if (coupon.discount_type === "percentage") {
    return `${coupon.discount_value}% off`;
  }
  return `$${coupon.discount_value} off`;
}

export function CouponDisplay({ coupons }: CouponDisplayProps) {
  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Coupon code copied!");
    } catch {
      toast.error("Failed to copy code");
    }
  }

  return (
    <div className="space-y-3">
      {coupons.map((coupon) => (
        <div
          key={coupon.id}
          className="rounded-xl border bg-card p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Tag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <button
                  onClick={() => copyCode(coupon.code)}
                  className="font-mono text-lg font-semibold tracking-wider hover:text-primary transition-colors"
                >
                  {coupon.code}
                </button>
                <p className="text-sm font-medium text-primary">
                  {formatDiscount(coupon)}
                </p>
              </div>
            </div>
            <button
              onClick={() => copyCode(coupon.code)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors hover:bg-muted"
              title="Copy code"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          {coupon.description && (
            <p className="mt-2 text-sm text-muted-foreground">
              {coupon.description}
            </p>
          )}
          {coupon.valid_until && (
            <p className="mt-1 text-xs text-muted-foreground">
              Valid until {new Date(coupon.valid_until).toLocaleDateString()}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
