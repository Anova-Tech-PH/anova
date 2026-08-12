"use client";

import { useState } from "react";
import { Eye, FileText, Tag, Users, Globe, Mail, Video, Store, Pencil } from "lucide-react";
import { Badge, Button, Card } from "@attendly/ui/components";
import { SponsorDocsManager } from "./sponsor-docs-manager";
import { SponsorCouponsManager } from "./sponsor-coupons-manager";
import { SponsorForm } from "./sponsor-form";
import { updateSponsor } from "../actions";
import { toast } from "sonner";
import type { SponsorWithDetails, SponsorLead } from "../queries";
import type { SponsorTier } from "../tier-queries";

const TABS = ["Details", "Documents", "Coupons", "Leads"] as const;
type Tab = (typeof TABS)[number];

export function SponsorDetailPanel({
  eventId,
  sponsor: initialSponsor,
  leads,
  analytics,
  tiers,
}: {
  eventId: string;
  sponsor: SponsorWithDetails;
  leads: SponsorLead[];
  analytics: { visit_count: number; lead_count: number };
  tiers: SponsorTier[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("Details");
  const [sponsor, setSponsor] = useState(initialSponsor);
  const [editing, setEditing] = useState(false);

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
    try {
      await updateSponsor(eventId, sponsor.id, {
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
      setSponsor((prev) => ({
        ...prev,
        ...data,
        logo: data.logo || null,
        description: data.description || null,
        website_url: data.website_url || null,
        promo_video_url: data.promo_video_url || null,
        tier_id: data.tier_id || null,
        contact_email: data.contact_email || null,
        tier: tiers.find((t) => t.id === data.tier_id) ?? undefined,
      }));
      setEditing(false);
      toast.success("Sponsor updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update sponsor");
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics.visit_count}</p>
              <p className="text-sm text-muted-foreground">Total Visits</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analytics.lead_count}</p>
              <p className="text-sm text-muted-foreground">Total Leads</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-4 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "Details" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit Sponsor
            </Button>
          </div>
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{sponsor.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tier</p>
                <p className="font-medium">
                  {sponsor.tier ? (
                    <Badge variant="info">{sponsor.tier.name}</Badge>
                  ) : (
                    <span className="text-muted-foreground">No tier</span>
                  )}
                </p>
              </div>
            </div>

            {sponsor.description && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-sm mt-1">{sponsor.description}</p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {sponsor.website_url && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={sponsor.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:underline"
                  >
                    {sponsor.website_url}
                  </a>
                </div>
              )}
              {sponsor.contact_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${sponsor.contact_email}`} className="text-sm hover:underline">
                    {sponsor.contact_email}
                  </a>
                </div>
              )}
              {sponsor.promo_video_url && (
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={sponsor.promo_video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:underline"
                  >
                    Promo Video
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Booth: {sponsor.booth_enabled ? (
                    <Badge variant="success" className="text-xs">Enabled</Badge>
                  ) : (
                    <span className="text-muted-foreground">Disabled</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Documents" && (
        <SponsorDocsManager
          sponsorId={sponsor.id}
          eventId={eventId}
          initialDocs={sponsor.documents}
        />
      )}

      {activeTab === "Coupons" && (
        <SponsorCouponsManager
          sponsorId={sponsor.id}
          eventId={eventId}
          initialCoupons={sponsor.coupons}
        />
      )}

      {activeTab === "Leads" && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">
            Captured Leads ({leads.length})
          </h4>
          {leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leads captured yet.</p>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Email</th>
                    <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Company</th>
                    <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Job Title</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b last:border-b-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{lead.name}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {lead.email}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {lead.company ?? "--"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {lead.job_title ?? "--"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {editing && (
        <SponsorForm
          eventId={eventId}
          tiers={tiers}
          sponsor={sponsor}
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}
