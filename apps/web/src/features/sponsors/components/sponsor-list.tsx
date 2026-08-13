"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Upload, Award } from "lucide-react";
import { toast } from "sonner";
import { Button, Badge, Avatar, EmptyState, useConfirm } from "@attendly/ui/components";
import { SponsorForm } from "./sponsor-form";
import { createSponsor, updateSponsor, deleteSponsor } from "../actions";
import type { Sponsor } from "../queries";
import type { SponsorTier } from "../tier-queries";

export function SponsorList({
  eventId,
  initialSponsors,
  tiers,
}: {
  eventId: string;
  initialSponsors: Sponsor[];
  tiers: SponsorTier[];
}) {
  const [sponsors, setSponsors] = useState(initialSponsors);
  const [showForm, setShowForm] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();

  async function handleCreate(data: {
    name: string;
    logo: string;
    description: string;
    website_url: string;
    promo_video_url: string;
    tier_id: string;
    booth_enabled: boolean;
    contact_email: string;
    sort_order: number;
  }) {
    try {
      const sponsor = await createSponsor(eventId, {
        name: data.name,
        logo: data.logo || undefined,
        description: data.description || undefined,
        website_url: data.website_url || undefined,
        promo_video_url: data.promo_video_url || undefined,
        tier_id: data.tier_id || null,
        booth_enabled: data.booth_enabled,
        contact_email: data.contact_email || undefined,
        sort_order: data.sort_order,
      });
      setSponsors((prev) => [...prev, sponsor as Sponsor].sort((a, b) => a.sort_order - b.sort_order));
      setShowForm(false);
      toast.success("Sponsor added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add sponsor");
    }
  }

  async function handleUpdate(data: {
    name: string;
    logo: string;
    description: string;
    website_url: string;
    promo_video_url: string;
    tier_id: string;
    booth_enabled: boolean;
    contact_email: string;
    sort_order: number;
  }) {
    if (!editingSponsor) return;
    try {
      await updateSponsor(eventId, editingSponsor.id, {
        name: data.name,
        logo: data.logo || null,
        description: data.description || null,
        website_url: data.website_url || null,
        promo_video_url: data.promo_video_url || null,
        tier_id: data.tier_id || null,
        booth_enabled: data.booth_enabled,
        contact_email: data.contact_email || null,
        sort_order: data.sort_order,
      });
      setSponsors((prev) =>
        prev
          .map((s) =>
            s.id === editingSponsor.id
              ? {
                  ...s,
                  ...data,
                  logo: data.logo || null,
                  description: data.description || null,
                  website_url: data.website_url || null,
                  promo_video_url: data.promo_video_url || null,
                  tier_id: data.tier_id || null,
                  contact_email: data.contact_email || null,
                  tier: tiers.find((t) => t.id === data.tier_id) ?? undefined,
                }
              : s
          )
          .sort((a, b) => a.sort_order - b.sort_order)
      );
      setEditingSponsor(null);
      toast.success("Sponsor updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update sponsor");
    }
  }

  async function handleDelete(sponsor: Sponsor) {
    const ok = await confirm({
      title: "Delete Sponsor",
      description: `Delete sponsor "${sponsor.name}"? This action cannot be undone.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteSponsor(eventId, sponsor.id);
        setSponsors((prev) => prev.filter((s) => s.id !== sponsor.id));
        toast.success("Sponsor deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete sponsor");
      }
    });
  }

  function getTierName(tierId: string | null) {
    if (!tierId) return null;
    return tiers.find((t) => t.id === tierId)?.name ?? null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Sponsors</h3>
        <div className="flex gap-2">
          <Button
            onClick={() => toast.info("CSV import coming soon")}
            size="sm"
            variant="outline"
            className="transition-all duration-200 hover:shadow-md"
          >
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </Button>
          <Button
            onClick={() => setShowForm(true)}
            size="sm"
            className="transition-all duration-200 hover:shadow-md"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Sponsor
          </Button>
        </div>
      </div>

      {sponsors.length === 0 ? (
        <EmptyState
          icon={<Award className="h-8 w-8" />}
          title="No sponsors added"
          description="Add sponsors and exhibitors to your event."
        />
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="w-10 px-4 py-3" />
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Tier</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Booth</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sponsors.map((sponsor) => (
                <tr key={sponsor.id} className="border-b last:border-b-0 hover:bg-muted/20 group">
                  <td className="px-4 py-3">
                    <Avatar src={sponsor.logo} name={sponsor.name} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/events/${eventId}/sponsors/${sponsor.id}`}
                      className="font-medium hover:underline"
                    >
                      {sponsor.name}
                    </a>
                    {/* Show tier on mobile */}
                    <div className="sm:hidden mt-1 flex gap-1.5">
                      {getTierName(sponsor.tier_id) && (
                        <Badge variant="info" className="text-[10px] px-1.5 py-0">
                          {getTierName(sponsor.tier_id)}
                        </Badge>
                      )}
                      {sponsor.booth_enabled && (
                        <Badge variant="success" className="text-[10px] px-1.5 py-0">
                          Booth
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {getTierName(sponsor.tier_id) ? (
                      <Badge variant="info" className="text-xs">
                        {getTierName(sponsor.tier_id)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {sponsor.booth_enabled ? (
                      <Badge variant="success" className="text-xs">
                        Enabled
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="flex items-center justify-end gap-1 sm:invisible sm:group-hover:visible">
                      <button
                        onClick={() => setEditingSponsor(sponsor)}
                        className="rounded p-1 hover:bg-muted"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDelete(sponsor)}
                        disabled={isPending}
                        className="rounded p-1 hover:bg-destructive/10"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <SponsorForm
          eventId={eventId}
          tiers={tiers}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingSponsor && (
        <SponsorForm
          eventId={eventId}
          tiers={tiers}
          sponsor={editingSponsor}
          onSubmit={handleUpdate}
          onCancel={() => setEditingSponsor(null)}
        />
      )}

      {confirmDialog}
    </div>
  );
}
