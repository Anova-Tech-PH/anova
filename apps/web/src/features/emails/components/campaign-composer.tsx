"use client";

import { useState, useTransition, useCallback } from "react";
import { useConfirm } from "@attendly/ui/components";
import { useRouter } from "next/navigation";
import { Send, Save, FlaskConical, ArrowLeft, Copy, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { createCampaign, updateCampaign, sendCampaign, sendTestEmail } from "../actions";
import { CampaignPreview } from "./campaign-preview";

type ContactList = { id: string; name: string; contacts: { count: number }[] | [{ count: number }] };
type TicketType = { id: string; name: string };
type PastCampaign = { id: string; subject: string; body_html: string };

type InitialData = {
  id?: string;
  subject?: string;
  body_html?: string;
  recipient_source?: string;
  contact_list_id?: string | null;
  segment_filters?: Record<string, unknown> | null;
  sender_name?: string;
  reply_to?: string;
  include_cta?: boolean;
  status?: string;
} | null;

export function CampaignComposer({
  eventId,
  eventName,
  eventDate,
  eventLocation,
  eventUrl,
  contactLists,
  ticketTypes,
  pastCampaigns,
  initial,
  userEmail,
}: {
  eventId: string;
  eventName: string;
  eventDate: string;
  eventLocation?: string;
  eventUrl: string;
  contactLists: ContactList[];
  ticketTypes: TicketType[];
  pastCampaigns: PastCampaign[];
  initial: InitialData;
  userEmail?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [bodyHtml, setBodyHtml] = useState(initial?.body_html ?? "");
  const [recipientSource, setRecipientSource] = useState<"contact_list" | "registrants">(
    (initial?.recipient_source as any) ?? "registrants"
  );
  const [contactListId, setContactListId] = useState(initial?.contact_list_id ?? "");
  const [senderName, setSenderName] = useState(initial?.sender_name ?? "");
  const [replyTo, setReplyTo] = useState(initial?.reply_to ?? "");
  const [includeCta, setIncludeCta] = useState(initial?.include_cta ?? true);
  const [selectedTicketTypes, setSelectedTicketTypes] = useState<string[]>(
    (initial?.segment_filters as any)?.ticket_type_ids ?? []
  );
  const [campaignId, setCampaignId] = useState(initial?.id);
  const isSent = initial?.status === "sent";

  const statusOptions = [
    { value: "confirmed", label: "Confirmed" },
    { value: "checked_in", label: "Checked In" },
    { value: "pending", label: "Pending" },
  ];
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    (initial?.segment_filters as any)?.statuses ?? []
  );

  function getFilters() {
    return {
      ticket_type_ids: selectedTicketTypes.length > 0 ? selectedTicketTypes : undefined,
      statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    };
  }

  function handleSaveDraft() {
    startTransition(async () => {
      try {
        if (campaignId) {
          await updateCampaign(campaignId, {
            subject, bodyHtml, recipientSource,
            contactListId: recipientSource === "contact_list" ? contactListId : null,
            segmentFilters: recipientSource === "registrants" ? getFilters() : null,
            senderName: senderName || undefined,
            replyTo: replyTo || undefined,
            includeCta,
          });
          toast.success("Draft saved");
        } else {
          const camp = await createCampaign({
            eventId, subject, bodyHtml, recipientSource,
            contactListId: recipientSource === "contact_list" ? contactListId : undefined,
            segmentFilters: recipientSource === "registrants" ? getFilters() : undefined,
            senderName: senderName || undefined,
            replyTo: replyTo || undefined,
            includeCta,
          });
          setCampaignId(camp.id);
          toast.success("Draft created");
          router.replace(`/events/${eventId}/emails/campaigns/${camp.id}`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  async function handleSend() {
    if (!subject.trim() || !bodyHtml.trim()) {
      toast.error("Subject and body are required");
      return;
    }
    const ok = await confirm({
      title: "Send Campaign",
      description: "Send this campaign? This cannot be undone.",
      confirmLabel: "Send",
      variant: "primary",
    });
    if (!ok) return;

    startTransition(async () => {
      try {
        if (!campaignId) {
          const camp = await createCampaign({
            eventId, subject, bodyHtml, recipientSource,
            contactListId: recipientSource === "contact_list" ? contactListId : undefined,
            segmentFilters: recipientSource === "registrants" ? getFilters() : undefined,
            senderName: senderName || undefined,
            replyTo: replyTo || undefined,
            includeCta,
          });
          setCampaignId(camp.id);
          const result = await sendCampaign(camp.id);
          toast.success(`Sent to ${result.sentCount} recipients (${result.failedCount} failed)`);
        } else {
          await updateCampaign(campaignId, {
            subject, bodyHtml, recipientSource,
            contactListId: recipientSource === "contact_list" ? contactListId : null,
            segmentFilters: recipientSource === "registrants" ? getFilters() : null,
            senderName: senderName || undefined,
            replyTo: replyTo || undefined,
            includeCta,
          });
          const result = await sendCampaign(campaignId);
          toast.success(`Sent to ${result.sentCount} recipients (${result.failedCount} failed)`);
        }
        router.push(`/events/${eventId}/emails`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send");
      }
    });
  }

  function handleSendTest() {
    const email = userEmail ?? prompt("Send test email to:");
    if (!email) return;
    startTransition(async () => {
      try {
        await sendTestEmail({ eventId, subject, bodyHtml, recipientEmail: email });
        toast.success(`Test email sent to ${email}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send test");
      }
    });
  }

  function handleReusePast(campaign: PastCampaign) {
    setSubject(campaign.subject);
    setBodyHtml(campaign.body_html);
    toast.success("Content loaded from past campaign");
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/events/${eventId}/emails`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Emails
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left: Form */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">
            {isSent ? "View Campaign" : campaignId ? "Edit Campaign" : "Create Campaign"}
          </h2>

          {isSent && initial && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Campaign Sent</span>
              </div>
              <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
                Delivered to {(initial as any).sent_count ?? 0} recipients
                {(initial as any).failed_count > 0 && ` (${(initial as any).failed_count} failed)`}
                {(initial as any).sent_at && ` on ${new Date((initial as any).sent_at).toLocaleString()}`}
              </p>
              <button
                onClick={() => {
                  router.push(`/events/${eventId}/emails/campaigns/new?reuse=${campaignId}`);
                }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-white dark:hover:bg-emerald-900"
              >
                <Copy className="h-3.5 w-3.5" /> Duplicate as New Campaign
              </button>
            </div>
          )}

          <fieldset disabled={isSent} className="space-y-4">
            {/* Recipients */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Recipients</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={recipientSource === "registrants"}
                    onChange={() => setRecipientSource("registrants")}
                  /> Registered Attendees
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={recipientSource === "contact_list"}
                    onChange={() => setRecipientSource("contact_list")}
                  /> Contact List
                </label>
              </div>
            </div>

            {recipientSource === "contact_list" && (
              <select
                value={contactListId}
                onChange={(e) => setContactListId(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">Select a contact list...</option>
                {contactLists.map((cl) => (
                  <option key={cl.id} value={cl.id}>
                    {cl.name} ({Array.isArray(cl.contacts) && cl.contacts[0] ? cl.contacts[0].count : 0} contacts)
                  </option>
                ))}
              </select>
            )}

            {recipientSource === "registrants" && ticketTypes.length > 0 && (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Ticket Types</label>
                  <div className="flex flex-wrap gap-2">
                    {ticketTypes.map((tt) => (
                      <label key={tt.id} className="flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedTicketTypes.includes(tt.id)}
                          onChange={(e) =>
                            setSelectedTicketTypes((prev) =>
                              e.target.checked ? [...prev, tt.id] : prev.filter((id) => id !== tt.id)
                            )
                          }
                        />
                        {tt.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {statusOptions.map((s) => (
                      <label key={s.value} className="flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedStatuses.includes(s.value)}
                          onChange={(e) =>
                            setSelectedStatuses((prev) =>
                              e.target.checked ? [...prev, s.value] : prev.filter((v) => v !== s.value)
                            )
                          }
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Sender Info */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Sender Name</label>
                <input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="e.g. Event Team" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Reply-to Email</label>
                <input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="replies@example.com" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Subject</label>
                {pastCampaigns.length > 0 && (
                  <select
                    className="rounded border px-2 py-1 text-xs"
                    onChange={(e) => {
                      const camp = pastCampaigns.find((c) => c.id === e.target.value);
                      if (camp) handleReusePast(camp);
                      e.target.value = "";
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Reuse past email...</option>
                    {pastCampaigns.map((c) => (
                      <option key={c.id} value={c.id}>{c.subject}</option>
                    ))}
                  </select>
                )}
              </div>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. You're invited to {{event_name}}"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                Variables: {"{{first_name}}"}, {"{{event_name}}"}, {"{{event_date}}"}
              </p>
            </div>

            {/* Body */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Body</label>
              <textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={10}
                placeholder="Write your email content..."
                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* CTA Toggle */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeCta}
                onChange={(e) => setIncludeCta(e.target.checked)}
              />
              Include "Register" button linking to event page
            </label>
          </fieldset>

          {/* Actions */}
          {!isSent && (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSendTest}
                disabled={isPending || !subject.trim()}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
                {isPending ? "Sending..." : "Send Test"}
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isPending ? "Saving..." : "Save Draft"}
              </button>
              <button
                onClick={handleSend}
                disabled={isPending || !subject.trim() || !bodyHtml.trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {isPending ? "Sending..." : "Send Campaign"}
              </button>
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <div>
          <CampaignPreview
            eventName={eventName}
            eventDate={eventDate}
            eventLocation={eventLocation}
            subject={subject}
            bodyHtml={bodyHtml.replace(/\n/g, "<br/>")}
            showCta={includeCta}
            ctaUrl={eventUrl}
          />
        </div>
      </div>
      {confirmDialog}
    </div>
  );
}
