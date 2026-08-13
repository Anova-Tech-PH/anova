"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button, Input, Textarea, ModalOverlay } from "@attendly/ui/components";
import type { SponsorTier } from "../tier-queries";
import type { Sponsor } from "../queries";

type SponsorFormData = {
  name: string;
  logo: string;
  description: string;
  website_url: string;
  promo_video_url: string;
  tier_id: string;
  booth_enabled: boolean;
  contact_email: string;
  sort_order: number;
};

export function SponsorForm({
  eventId,
  tiers,
  sponsor,
  onSubmit,
  onCancel,
}: {
  eventId: string;
  tiers: SponsorTier[];
  sponsor?: Sponsor;
  onSubmit: (data: SponsorFormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<SponsorFormData>({
    name: sponsor?.name ?? "",
    logo: sponsor?.logo ?? "",
    description: sponsor?.description ?? "",
    website_url: sponsor?.website_url ?? "",
    promo_video_url: sponsor?.promo_video_url ?? "",
    tier_id: sponsor?.tier_id ?? "",
    booth_enabled: sponsor?.booth_enabled ?? false,
    contact_email: sponsor?.contact_email ?? "",
    sort_order: sponsor?.sort_order ?? 0,
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
      <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {sponsor ? "Edit Sponsor" : "Add Sponsor"}
          </h2>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Name *</label>
              <Input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Contact Email</label>
              <Input
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Logo URL</label>
            <Input
              type="url"
              value={form.logo}
              onChange={(e) => setForm((f) => ({ ...f, logo: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Website URL</label>
              <Input
                type="url"
                value={form.website_url}
                onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Promo Video URL</label>
              <Input
                type="url"
                value={form.promo_video_url}
                onChange={(e) => setForm((f) => ({ ...f, promo_video_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tier</label>
              <select
                value={form.tier_id}
                onChange={(e) => setForm((f) => ({ ...f, tier_id: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">No tier</option>
                {tiers.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Sort Order</label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.booth_enabled}
              onChange={(e) => setForm((f) => ({ ...f, booth_enabled: e.target.checked }))}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <span className="text-sm font-medium">Enable Booth</span>
          </label>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!form.name} loading={loading}>
              {loading ? "Saving..." : sponsor ? "Update" : "Add Sponsor"}
            </Button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
