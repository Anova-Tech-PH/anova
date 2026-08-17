import { getPromoCodesByEvent } from "@/features/promo-codes/queries";
import { PromoCodeManager } from "@/features/promo-codes/components/promo-code-manager";
import { Tag } from "lucide-react";

export default async function PromoCodesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const codes = await getPromoCodesByEvent(eventId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(0.445_0.107_195_/_0.1)]">
          <Tag className="h-5 w-5 text-[oklch(0.445_0.107_195)]" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Discount Codes</h1>
          <p className="text-sm text-muted-foreground">
            Create discount codes to offer special pricing on tickets.
          </p>
        </div>
      </div>

      <PromoCodeManager eventId={eventId} initialCodes={codes} />
    </div>
  );
}
