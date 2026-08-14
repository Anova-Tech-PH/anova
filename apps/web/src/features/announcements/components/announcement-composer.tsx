"use client";

import { useEffect, useState, useTransition } from "react";
import { Send, SendHorizonal, Save, FlaskConical } from "lucide-react";
import { Button, Input, ModalOverlay } from "@attendly/ui/components";
import { RichTextEditor } from "@/shared/components/rich-text-editor";
import {
  createAnnouncement,
  updateAnnouncement,
  sendAnnouncement,
  sendTestAnnouncement,
} from "@/features/announcements/actions";
import type { Announcement } from "@/features/announcements/queries";
import { toast } from "sonner";

type AudienceType =
  | "all"
  | "ticket_types"
  | "category"
  | "segment"
  | "session"
  | "manual"
  | "exclude_categories";

interface AnnouncementComposerProps {
  eventId: string;
  open: boolean;
  onClose: () => void;
  draft?: Announcement | null;
  templateSubject?: string;
  templateBody?: string;
  templateSenderName?: string;
  templateReplyToEmail?: string;
  ticketTypes: { id: string; name: string }[];
  sessions: { id: string; title: string }[];
  categories: { id: string; name: string; color: string }[];
  totalAttendees: number;
}

export function AnnouncementComposer({
  eventId,
  open,
  onClose,
  draft,
  templateSubject,
  templateBody,
  templateSenderName,
  templateReplyToEmail,
  ticketTypes,
  sessions,
  categories,
  totalAttendees,
}: AnnouncementComposerProps) {
  const [isPending, startTransition] = useTransition();

  // Form state
  const [audienceType, setAudienceType] = useState<AudienceType>("all");
  const [selectedTicketTypes, setSelectedTicketTypes] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
  const [senderName, setSenderName] = useState("");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [channels, setChannels] = useState<string[]>(["in_app"]);
  const [signature, setSignature] = useState("");

  const isEditing = !!draft;

  // Sync form state when open/draft/template props change
  useEffect(() => {
    if (!open) return;

    if (draft) {
      const ta = draft.target_audience;
      if (ta.type === "ticket_types") {
        setAudienceType("ticket_types");
        setSelectedTicketTypes(ta.ticket_type_ids ?? []);
      } else if (ta.type === "category") {
        setAudienceType("category");
        setSelectedCategory(ta.category_id ?? ta.category ?? "");
      } else if (ta.type === "session") {
        setAudienceType("session");
        setSelectedSessionId(ta.session_id ?? "");
      } else if (ta.type === "exclude_categories") {
        setAudienceType("exclude_categories");
        setExcludedCategories(ta.excluded_category_ids ?? ta.excluded_categories ?? []);
      } else {
        setAudienceType("all");
      }
      setSelectedTicketTypes(
        ta.type === "ticket_types" ? ta.ticket_type_ids ?? [] : []
      );
      setSenderName(draft.sender_name ?? "");
      setReplyToEmail(draft.reply_to_email ?? "");
      setSubject(draft.subject);
      setBody(draft.body);
      setChannels(draft.channels ?? ["in_app"]);
      setSignature(draft.signature ?? "");
    } else {
      // Reset to defaults
      setAudienceType("all");
      setSelectedTicketTypes([]);
      setSelectedCategory("");
      setSelectedSessionId("");
      setExcludedCategories([]);
      setSenderName(templateSenderName ?? "");
      setReplyToEmail(templateReplyToEmail ?? "");
      setSubject(templateSubject ?? "");
      setBody(templateBody ?? "");
      setChannels(["in_app"]);
      setSignature("");
    }
  }, [open, draft, templateSubject, templateBody, templateSenderName, templateReplyToEmail]);

  function buildTargetAudience() {
    switch (audienceType) {
      case "ticket_types":
        return { type: "ticket_types", ticket_type_ids: selectedTicketTypes };
      case "category":
        return { type: "category", category_id: selectedCategory };
      case "session":
        return { type: "session", session_id: selectedSessionId };
      case "exclude_categories":
        return {
          type: "exclude_categories",
          excluded_category_ids: excludedCategories,
        };
      default:
        return { type: "all" };
    }
  }

  function buildPayload() {
    return {
      subject: subject.trim(),
      body,
      target_audience: buildTargetAudience(),
      channels,
      sender_name: senderName.trim() || undefined,
      reply_to_email: replyToEmail.trim() || undefined,
      signature: signature.trim() || undefined,
    };
  }

  /** Save draft — create or update, then close */
  async function saveDraft() {
    const payload = buildPayload();
    if (isEditing) {
      await updateAnnouncement(eventId, draft.id, payload);
      return draft.id;
    }
    const created = await createAnnouncement(eventId, payload);
    return created.id;
  }

  function handleSaveDraft() {
    if (!subject.trim()) return;
    startTransition(async () => {
      try {
        await saveDraft();
        toast.success(isEditing ? "Draft updated" : "Draft saved");
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  function handleSend() {
    if (!subject.trim()) return;
    startTransition(async () => {
      try {
        const id = await saveDraft();
        await sendAnnouncement(eventId, id);
        toast.success("Announcement sent");
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send");
      }
    });
  }

  function handleSendTest() {
    if (!subject.trim()) return;
    startTransition(async () => {
      try {
        const id = await saveDraft();
        await sendTestAnnouncement(eventId, id);
        toast.success("Test email sent");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to send test"
        );
      }
    });
  }

  function toggleChannel(channel: string) {
    setChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    );
  }

  function toggleTicketType(id: string) {
    setSelectedTicketTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function toggleExcludedCategory(cat: string) {
    setExcludedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  if (!open) return null;

  return (
    <ModalOverlay onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-5 rounded-xl bg-card p-6 shadow-xl"
      >
        <h3 className="text-lg font-semibold">
          {isEditing ? "Edit Announcement" : "New Announcement"}
        </h3>

        {/* 1. Recipients */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Recipients</label>
          <div className="space-y-2 text-sm">
            {/* All attendees */}
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="audience"
                checked={audienceType === "all"}
                onChange={() => setAudienceType("all")}
                className="accent-foreground"
              />
              All attendees
              <span className="text-muted-foreground">
                ({totalAttendees})
              </span>
            </label>

            {/* By ticket type */}
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="audience"
                checked={audienceType === "ticket_types"}
                onChange={() => setAudienceType("ticket_types")}
                className="accent-foreground"
              />
              Specific attendee ticket type
            </label>
            {audienceType === "ticket_types" && ticketTypes.length > 0 && (
              <div className="ml-6 space-y-1.5">
                {ticketTypes.map((tt) => (
                  <label key={tt.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedTicketTypes.includes(tt.id)}
                      onChange={() => toggleTicketType(tt.id)}
                      className="accent-foreground"
                    />
                    {tt.name}
                  </label>
                ))}
              </div>
            )}

            {/* By category */}
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="audience"
                checked={audienceType === "category"}
                onChange={() => setAudienceType("category")}
                className="accent-foreground"
              />
              Specific attendee category
            </label>
            {audienceType === "category" && categories.length > 0 && (
              <div className="ml-6">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Segment (coming soon) */}
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="audience"
                checked={audienceType === "segment"}
                onChange={() => setAudienceType("segment")}
                className="accent-foreground"
              />
              Specific attendee segment
            </label>
            {audienceType === "segment" && (
              <p className="ml-6 text-muted-foreground text-xs">Coming soon</p>
            )}

            {/* By session */}
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="audience"
                checked={audienceType === "session"}
                onChange={() => setAudienceType("session")}
                className="accent-foreground"
              />
              Attendees who added a specific session
            </label>
            {audienceType === "session" && sessions.length > 0 && (
              <div className="ml-6">
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select session...</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Manual (coming soon) */}
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="audience"
                checked={audienceType === "manual"}
                onChange={() => setAudienceType("manual")}
                className="accent-foreground"
              />
              Manually add attendees
            </label>
            {audienceType === "manual" && (
              <p className="ml-6 text-muted-foreground text-xs">Coming soon</p>
            )}

            {/* Exclude categories */}
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="audience"
                checked={audienceType === "exclude_categories"}
                onChange={() => setAudienceType("exclude_categories")}
                className="accent-foreground"
              />
              All attendees except selected categories
            </label>
            {audienceType === "exclude_categories" &&
              categories.length > 0 && (
                <div className="ml-6 space-y-1.5">
                  {categories.map((cat) => (
                    <label key={cat.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={excludedCategories.includes(cat.id)}
                        onChange={() => toggleExcludedCategory(cat.id)}
                        className="accent-foreground"
                      />
                      {cat.name}
                    </label>
                  ))}
                </div>
              )}
          </div>
        </div>

        {/* 2. Sender name */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Sender name
          </label>
          <Input
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="e.g. Event Team"
          />
        </div>

        {/* 3. Reply-to email */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Reply-to email
          </label>
          <Input
            type="email"
            value={replyToEmail}
            onChange={(e) => setReplyToEmail(e.target.value)}
            placeholder="e.g. hello@example.com"
          />
        </div>

        {/* 4. Subject */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Subject *</label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Schedule update for Day 2"
            required
          />
        </div>

        {/* 5. Body */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">Body</label>
          <RichTextEditor
            content={body}
            onChange={setBody}
            placeholder="Write your announcement message..."
          />
        </div>

        {/* 6. Channels */}
        <div className="space-y-1.5">
          <span className="text-sm font-medium">Channels</span>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={channels.includes("in_app")}
                onChange={() => toggleChannel("in_app")}
                className="accent-foreground"
              />
              In-App
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={channels.includes("email")}
                onChange={() => toggleChannel("email")}
                className="accent-foreground"
              />
              Email
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={channels.includes("push")}
                onChange={() => toggleChannel("push")}
                className="accent-foreground"
              />
              Push Notification
            </label>
          </div>
        </div>

        {/* 7. Auto-signature preview */}
        {signature.trim() && (
          <p className="text-xs text-muted-foreground whitespace-pre-line">
            Signature: {signature}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending || !subject.trim()}
              onClick={handleSendTest}
            >
              <FlaskConical className="mr-1.5 h-4 w-4" />
              {isPending ? "Sending..." : "Send myself test"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isPending || !subject.trim()}
              onClick={handleSaveDraft}
            >
              <Save className="mr-1.5 h-4 w-4" />
              {isPending ? "Saving..." : "Save draft"}
            </Button>
            <Button type="submit" disabled={isPending || !subject.trim()}>
              <Send className="mr-1.5 h-4 w-4" />
              {isPending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </form>
    </ModalOverlay>
  );
}
