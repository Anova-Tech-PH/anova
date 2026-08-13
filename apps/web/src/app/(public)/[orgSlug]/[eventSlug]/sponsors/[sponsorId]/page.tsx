import { notFound } from "next/navigation";
import { ExternalLink, FileText, Download } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";
import { VideoEmbed } from "@/features/documents/components/video-embed";
import { BoothChat } from "@/features/sponsors/components/booth-chat";
import { LeadCaptureButton } from "@/features/sponsors/components/lead-capture-button";
import { CouponDisplay } from "@/features/sponsors/components/coupon-display";
import { BoothVisitTracker } from "@/features/sponsors/components/booth-visit-tracker";
import type { SponsorWithDetails } from "@/features/sponsors/queries";

export default async function PublicSponsorBoothPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string; sponsorId: string }>;
}) {
  const { orgSlug, eventSlug, sponsorId } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  if (!org) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("organization_id", org.id)
    .eq("slug", eventSlug)
    .eq("status", "published")
    .single();

  if (!event) notFound();

  const { data: sponsorRaw } = await supabase
    .from("sponsors")
    .select("*, tier:sponsor_tiers(*), sponsor_documents(*), sponsor_coupons(*)")
    .eq("id", sponsorId)
    .single();

  if (!sponsorRaw) notFound();

  const sponsor: SponsorWithDetails = {
    ...sponsorRaw,
    documents: Array.isArray(sponsorRaw.sponsor_documents)
      ? sponsorRaw.sponsor_documents
      : [],
    coupons: Array.isArray(sponsorRaw.sponsor_coupons)
      ? sponsorRaw.sponsor_coupons
      : [],
    sponsor_documents: undefined,
    sponsor_coupons: undefined,
  } as unknown as SponsorWithDetails;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <BoothVisitTracker sponsorId={sponsor.id} eventId={event.id} />

      {/* Hero */}
      <div className="flex flex-col items-center text-center">
        {sponsor.logo ? (
          <img
            src={sponsor.logo}
            alt={sponsor.name}
            className="mb-6 h-32 w-32 rounded-xl object-contain"
          />
        ) : (
          <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-xl bg-primary/10">
            <span className="text-4xl font-bold text-primary">
              {sponsor.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <h1 className="text-2xl font-semibold">{sponsor.name}</h1>
        {sponsor.tier && (
          <span className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {sponsor.tier.name}
          </span>
        )}
        {sponsor.description && (
          <p className="mt-4 text-muted-foreground leading-relaxed">
            {sponsor.description}
          </p>
        )}
        {sponsor.website_url && (
          <a
            href={sponsor.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ExternalLink className="h-4 w-4" />
            Visit Website
          </a>
        )}
      </div>

      <div className="mt-10 space-y-10">
        {/* Promo Video */}
        {sponsor.promo_video_url && (
          <section>
            <h2 className="mb-4 text-lg font-semibold">Promo Video</h2>
            <VideoEmbed url={sponsor.promo_video_url} title={`${sponsor.name} promo`} />
          </section>
        )}

        {/* Documents */}
        {sponsor.documents.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-semibold">Documents</h2>
            <div className="space-y-3">
              {sponsor.documents.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-all hover:shadow-md"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{doc.title}</p>
                    {doc.file_type && (
                      <p className="text-xs text-muted-foreground">{doc.file_type}</p>
                    )}
                  </div>
                  <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Coupons */}
        {sponsor.coupons.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-semibold">Special Offers</h2>
            <CouponDisplay coupons={sponsor.coupons} />
          </section>
        )}

        {/* Lead Capture */}
        <section>
          <LeadCaptureButton
            sponsorId={sponsor.id}
            eventId={event.id}
            sponsorName={sponsor.name}
          />
        </section>

        {/* Booth Chat */}
        {sponsor.booth_enabled && (
          <section>
            <h2 className="mb-4 text-lg font-semibold">Booth Chat</h2>
            <BoothChat sponsorId={sponsor.id} eventId={event.id} />
          </section>
        )}
      </div>
    </div>
  );
}
