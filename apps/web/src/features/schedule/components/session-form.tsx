"use client";

import { useState, useRef } from "react";
import { X, FileText, BarChart3, Heart, Plus, Trash2, Upload, Link, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, ModalOverlay } from "@attendly/ui/components";
import { RichTextEditor } from "@/shared/components/rich-text-editor";
import { createSpeaker } from "@/features/speakers/actions";
import { createDocument } from "@/features/documents/actions";
import { createPoll } from "@/features/polls/actions";
import { createClient } from "@attendly/ui/supabase/client";

const SESSION_TYPES = [
  { value: "keynote", label: "Keynote" },
  { value: "talk", label: "Talk" },
  { value: "workshop", label: "Workshop" },
  { value: "panel", label: "Panel" },
  { value: "break", label: "Break" },
];

type Track = { id: string; name: string; color: string | null };
type Speaker = { id: string; name: string };

type SessionFormData = {
  id?: string;
  title: string;
  description: string;
  type: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  track_ids: string[];
  speaker_ids: string[];
  enable_check_in: boolean;
  rsvp_enabled: boolean;
  capacity: number | null;
  document_ids?: string[];
  poll_ids?: string[];
};

type EventDocumentOption = { id: string; title: string };
type EventPollOption = { id: string; question: string };

type TabId = "details" | "speakers" | "documents" | "polls";

export function SessionForm({
  eventId,
  session,
  tracks,
  speakers,
  rooms = [],
  defaults,
  eventDocuments = [],
  eventPolls = [],
  onSubmit,
  onCancel,
}: {
  eventId: string;
  session?: SessionFormData;
  tracks: Track[];
  speakers: Speaker[];
  rooms?: string[];
  defaults?: { date: string; start_time: string; end_time: string };
  eventDocuments?: EventDocumentOption[];
  eventPolls?: EventPollOption[];
  onSubmit: (data: {
    title: string;
    description: string;
    type: string;
    start_time: string;
    end_time: string;
    location: string;
    track_ids: string[];
    speaker_ids: string[];
    enable_check_in: boolean;
    rsvp_enabled: boolean;
    capacity: number | null;
    document_ids: string[];
    poll_ids: string[];
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const isExistingRoomValue = session?.location && rooms.includes(session.location);
  const initialRoomMode =
    rooms.length === 0
      ? "text"
      : session?.location && !isExistingRoomValue
        ? "custom"
        : "select";

  const [activeTab, setActiveTab] = useState<TabId>("details");
  const [form, setForm] = useState({
    title: session?.title ?? "",
    description: session?.description ?? "",
    type: session?.type ?? "talk",
    date: session?.date ?? defaults?.date ?? "",
    start_time: session?.start_time ?? defaults?.start_time ?? "",
    end_time: session?.end_time ?? defaults?.end_time ?? "",
    location: session?.location ?? "",
    track_ids: session?.track_ids ?? [],
    speaker_ids: session?.speaker_ids ?? [],
    enable_check_in: session?.enable_check_in ?? false,
    rsvp_enabled: session?.rsvp_enabled ?? false,
    capacity: session?.capacity ?? null,
    document_ids: session?.document_ids ?? [],
    poll_ids: session?.poll_ids ?? [],
  });
  const [roomMode, setRoomMode] = useState<"select" | "custom" | "text">(initialRoomMode);
  const [loading, setLoading] = useState(false);

  // Local copies that grow when creating inline
  const [availableSpeakers, setAvailableSpeakers] = useState(speakers);
  const [availableDocuments, setAvailableDocuments] = useState(eventDocuments);
  const [availablePolls, setAvailablePolls] = useState(eventPolls);

  // Inline add speaker
  const [showAddSpeaker, setShowAddSpeaker] = useState(false);
  const [newSpeaker, setNewSpeaker] = useState({ name: "", title: "", company: "", email: "" });
  const [savingSpeaker, setSavingSpeaker] = useState(false);

  // Inline add document
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: "", external_url: "" });
  const [savingDocument, setSavingDocument] = useState(false);
  const [docMode, setDocMode] = useState<"url" | "upload">("url");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const docFileRef = useRef<HTMLInputElement>(null);

  // Inline add poll
  const [showAddPoll, setShowAddPoll] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState("");
  const [newPollOptions, setNewPollOptions] = useState(["", ""]);
  const [savingPoll, setSavingPoll] = useState(false);
  const [newPollPrompt, setNewPollPrompt] = useState(true);
  const [newPollAnonymous, setNewPollAnonymous] = useState(false);
  const [newPollResultVisibility, setNewPollResultVisibility] = useState<"everyone" | "after_closed" | "organizers_only">("everyone");
  const [newPollOpenTimeMode, setNewPollOpenTimeMode] = useState<"now" | "before_session" | "scheduled">("now");
  const [newPollBeforeDays, setNewPollBeforeDays] = useState(0);
  const [newPollBeforeHours, setNewPollBeforeHours] = useState(0);
  const [newPollBeforeMinutes, setNewPollBeforeMinutes] = useState(0);
  const [newPollScheduledDate, setNewPollScheduledDate] = useState("");
  const [newPollScheduledTime, setNewPollScheduledTime] = useState("");
  const [showPollAdvanced, setShowPollAdvanced] = useState(false);

  function toggleSpeaker(speakerId: string) {
    setForm((f) => ({
      ...f,
      speaker_ids: f.speaker_ids.includes(speakerId)
        ? f.speaker_ids.filter((id) => id !== speakerId)
        : [...f.speaker_ids, speakerId],
    }));
  }

  function toggleDocumentId(docId: string) {
    setForm((f) => ({
      ...f,
      document_ids: f.document_ids.includes(docId)
        ? f.document_ids.filter((id) => id !== docId)
        : [...f.document_ids, docId],
    }));
  }

  function togglePollId(pollId: string) {
    setForm((f) => ({
      ...f,
      poll_ids: f.poll_ids.includes(pollId)
        ? f.poll_ids.filter((id) => id !== pollId)
        : [...f.poll_ids, pollId],
    }));
  }

  function handleRoomSelectChange(value: string) {
    if (value === "__custom__") {
      setRoomMode("custom");
      setForm((f) => ({ ...f, location: "" }));
    } else {
      setRoomMode("select");
      setForm((f) => ({ ...f, location: value }));
    }
  }

  async function handleSaveSpeaker() {
    if (!newSpeaker.name.trim()) return;
    setSavingSpeaker(true);
    try {
      const speaker = await createSpeaker(eventId, {
        name: newSpeaker.name.trim(),
        title: newSpeaker.title.trim() || undefined,
        company: newSpeaker.company.trim() || undefined,
        email: newSpeaker.email.trim() || undefined,
      });
      setAvailableSpeakers((prev) => [...prev, { id: speaker.id, name: speaker.name }]);
      setForm((f) => ({ ...f, speaker_ids: [...f.speaker_ids, speaker.id] }));
      setNewSpeaker({ name: "", title: "", company: "", email: "" });
      setShowAddSpeaker(false);
      toast.success("Speaker added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add speaker");
    } finally {
      setSavingSpeaker(false);
    }
  }

  async function handleDocFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      setUploadError("File must be under 25MB");
      return;
    }

    setUploadError("");
    setUploadingFile(true);

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${eventId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("event-documents")
        .upload(path, file);

      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage
        .from("event-documents")
        .getPublicUrl(path);

      // Auto-fill title from filename if empty
      if (!newDoc.title.trim()) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        setNewDoc((d) => ({ ...d, title: nameWithoutExt, external_url: "" }));
      }

      // Create the document record immediately
      const doc = await createDocument(eventId, {
        title: newDoc.title.trim() || file.name.replace(/\.[^/.]+$/, ""),
        type: "file",
        file_url: data.publicUrl,
        file_size: file.size,
        file_type: file.type || null,
      });
      setAvailableDocuments((prev) => [...prev, { id: doc.id, title: doc.title }]);
      setForm((f) => ({ ...f, document_ids: [...f.document_ids, doc.id] }));
      setNewDoc({ title: "", external_url: "" });
      setDocMode("url");
      setShowAddDocument(false);
      toast.success("Document uploaded");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingFile(false);
      if (docFileRef.current) docFileRef.current.value = "";
    }
  }

  async function handleSaveDocument() {
    if (!newDoc.title.trim()) return;
    setSavingDocument(true);
    try {
      const doc = await createDocument(eventId, {
        title: newDoc.title.trim(),
        type: "file",
        external_url: newDoc.external_url.trim() || null,
      });
      setAvailableDocuments((prev) => [...prev, { id: doc.id, title: doc.title }]);
      setForm((f) => ({ ...f, document_ids: [...f.document_ids, doc.id] }));
      setNewDoc({ title: "", external_url: "" });
      setShowAddDocument(false);
      toast.success("Document added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add document");
    } finally {
      setSavingDocument(false);
    }
  }

  async function handleSavePoll() {
    if (!newPollQuestion.trim()) return;
    const validOptions = newPollOptions.filter((o) => o.trim());
    if (validOptions.length < 2) {
      toast.error("At least 2 options are required");
      return;
    }
    setSavingPoll(true);
    try {
      const options = validOptions.map((text) => ({
        id: crypto.randomUUID(),
        text: text.trim(),
      }));
      const openBeforeMinutes = newPollBeforeDays * 1440 + newPollBeforeHours * 60 + newPollBeforeMinutes;
      const scheduledOpenAt = newPollScheduledDate && newPollScheduledTime
        ? `${newPollScheduledDate}T${newPollScheduledTime}`
        : undefined;

      const poll = await createPoll(eventId, {
        question: newPollQuestion.trim(),
        options,
        is_anonymous: newPollAnonymous,
        prompt_attendee: newPollPrompt,
        result_visibility: newPollResultVisibility,
        open_time_mode: newPollOpenTimeMode,
        open_before_minutes: openBeforeMinutes,
        scheduled_open_at: scheduledOpenAt,
      });
      setAvailablePolls((prev) => [...prev, { id: poll.id, question: poll.question }]);
      setForm((f) => ({ ...f, poll_ids: [...f.poll_ids, poll.id] }));
      setNewPollQuestion("");
      setNewPollOptions(["", ""]);
      setNewPollPrompt(true);
      setNewPollAnonymous(false);
      setNewPollResultVisibility("everyone");
      setNewPollOpenTimeMode("now");
      setNewPollBeforeDays(0);
      setNewPollBeforeHours(0);
      setNewPollBeforeMinutes(0);
      setNewPollScheduledDate("");
      setNewPollScheduledTime("");
      setShowAddPoll(false);
      setShowPollAdvanced(false);
      toast.success("Poll created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create poll");
    } finally {
      setSavingPoll(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const startISO = form.date && form.start_time ? `${form.date}T${form.start_time}` : "";
      const endISO = form.date && form.end_time ? `${form.date}T${form.end_time}` : "";

      await onSubmit({
        title: form.title,
        description: form.description,
        type: form.type,
        start_time: startISO,
        end_time: endISO,
        location: form.location,
        track_ids: form.track_ids,
        speaker_ids: form.speaker_ids,
        enable_check_in: form.enable_check_in,
        rsvp_enabled: form.rsvp_enabled,
        capacity: form.capacity,
        document_ids: form.document_ids,
        poll_ids: form.poll_ids,
      });
    } finally {
      setLoading(false);
    }
  }

  const tabCounts: Record<TabId, number> = {
    details: 0,
    speakers: form.speaker_ids.length,
    documents: form.document_ids.length,
    polls: form.poll_ids.length,
  };

  return (
    <ModalOverlay onClose={onCancel}>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border bg-background shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-lg font-semibold">
            {session ? "Edit Session" : "Add Session"}
          </h2>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b px-6" role="tablist">
          {(
            [
              { id: "details", label: "Details" },
              { id: "speakers", label: "Speakers" },
              { id: "documents", label: "Documents" },
              { id: "polls", label: "Live Polling" },
            ] as { id: TabId; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-1.5">
                {tab.label}
                {tabCounts[tab.id] > 0 && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    {tabCounts[tab.id]}
                  </span>
                )}
              </span>
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Scrollable content + footer */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4">

            {/* ── Details Tab ── */}
            {activeTab === "details" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Title *</label>
                  <Input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Type</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    >
                      {SESSION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {tracks.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Tracks</label>
                      <div className="flex flex-wrap gap-2">
                        {tracks.map((t) => {
                          const isSelected = form.track_ids.includes(t.id);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() =>
                                setForm((f) => ({
                                  ...f,
                                  track_ids: isSelected
                                    ? f.track_ids.filter((id) => id !== t.id)
                                    : [...f.track_ids, t.id],
                                }))
                              }
                              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                isSelected
                                  ? "border-transparent text-white"
                                  : "border-input bg-background hover:bg-accent"
                              }`}
                              style={isSelected ? { backgroundColor: t.color ?? "#6b7280" } : undefined}
                            >
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: t.color ?? "#6b7280" }}
                              />
                              {t.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="session-date" className="text-sm font-medium">Date *</label>
                  <Input
                    id="session-date"
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label htmlFor="session-start-time" className="text-sm font-medium">Start time *</label>
                    <Input
                      id="session-start-time"
                      type="time"
                      required
                      value={form.start_time}
                      onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="session-end-time" className="text-sm font-medium">End time *</label>
                    <Input
                      id="session-end-time"
                      type="time"
                      required
                      value={form.end_time}
                      onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Room field */}
                <div className="space-y-1.5">
                  <label htmlFor="session-room" className="text-sm font-medium">Room</label>
                  {roomMode === "text" ? (
                    <Input
                      id="session-room"
                      type="text"
                      value={form.location}
                      onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                      placeholder="e.g. Main Hall, Room A"
                    />
                  ) : roomMode === "custom" ? (
                    <div className="flex gap-2">
                      <Input
                        id="session-room"
                        type="text"
                        value={form.location}
                        onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                        placeholder="Enter room name"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRoomMode("select");
                          setForm((f) => ({ ...f, location: "" }));
                        }}
                      >
                        Back
                      </Button>
                    </div>
                  ) : (
                    <select
                      id="session-room"
                      aria-label="Room"
                      value={form.location === "" ? "" : rooms.includes(form.location) ? form.location : "__custom__"}
                      onChange={(e) => handleRoomSelectChange(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">No room</option>
                      {rooms.map((room) => (
                        <option key={room} value={room}>
                          {room}
                        </option>
                      ))}
                      <option value="__custom__">Custom...</option>
                    </select>
                  )}
                </div>

                <label className="flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.enable_check_in}
                    onChange={(e) => setForm((f) => ({ ...f, enable_check_in: e.target.checked }))}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  <div>
                    <span className="text-sm font-medium">Enable check-in for this session</span>
                    <p className="text-xs text-muted-foreground">Allows scanning attendee QR codes for this session</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.rsvp_enabled}
                    onChange={(e) => setForm((f) => ({ ...f, rsvp_enabled: e.target.checked, capacity: e.target.checked ? f.capacity : null }))}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  <div>
                    <span className="text-sm font-medium">Enable RSVP</span>
                    <p className="text-xs text-muted-foreground">Allow attendees to RSVP for this session</p>
                  </div>
                </label>

                {form.rsvp_enabled && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Capacity</label>
                    <Input
                      type="number"
                      min={1}
                      placeholder="Unlimited"
                      value={form.capacity ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value ? parseInt(e.target.value, 10) : null }))}
                    />
                    <p className="text-xs text-muted-foreground">Leave empty for unlimited capacity</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Description</label>
                  <RichTextEditor
                    value={form.description}
                    onChange={(html) => setForm((f) => ({ ...f, description: html }))}
                    placeholder="Session description..."
                  />
                </div>

                {/* Sponsors placeholder */}
                <div className="flex items-center justify-between rounded-lg border border-dashed px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Heart className="h-4 w-4" />
                    <span>Sponsors</span>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Coming soon</span>
                </div>
              </div>
            )}

            {/* ── Speakers Tab ── */}
            {activeTab === "speakers" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium">Speakers</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add speakers and specify their role in the session.
                  </p>
                </div>

                {form.type === "break" ? (
                  <p className="text-sm text-muted-foreground italic">Break sessions don&apos;t have speakers.</p>
                ) : (
                  <>
                    {availableSpeakers.length > 0 && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Select existing speakers</label>
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {availableSpeakers.map((speaker) => (
                            <button
                              key={speaker.id}
                              type="button"
                              onClick={() => toggleSpeaker(speaker.id)}
                              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                                form.speaker_ids.includes(speaker.id)
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "hover:bg-accent"
                              }`}
                            >
                              {speaker.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {availableSpeakers.length === 0 && !showAddSpeaker && (
                      <p className="text-sm text-muted-foreground">No speakers yet. Add one below.</p>
                    )}

                    {/* Inline add speaker form */}
                    {showAddSpeaker ? (
                      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                        <h4 className="text-sm font-medium">New Speaker</h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Name *</label>
                            <Input
                              type="text"
                              value={newSpeaker.name}
                              onChange={(e) => setNewSpeaker((s) => ({ ...s, name: e.target.value }))}
                              placeholder="Full name"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Email</label>
                            <Input
                              type="email"
                              value={newSpeaker.email}
                              onChange={(e) => setNewSpeaker((s) => ({ ...s, email: e.target.value }))}
                              placeholder="Email address"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Title</label>
                            <Input
                              type="text"
                              value={newSpeaker.title}
                              onChange={(e) => setNewSpeaker((s) => ({ ...s, title: e.target.value }))}
                              placeholder="Position or job title"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium">Company</label>
                            <Input
                              type="text"
                              value={newSpeaker.company}
                              onChange={(e) => setNewSpeaker((s) => ({ ...s, company: e.target.value }))}
                              placeholder="Company or affiliation"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowAddSpeaker(false);
                              setNewSpeaker({ name: "", title: "", company: "", email: "" });
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={!newSpeaker.name.trim()}
                            loading={savingSpeaker}
                            onClick={handleSaveSpeaker}
                          >
                            Save Speaker
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddSpeaker(true)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Speaker
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Documents Tab ── */}
            {activeTab === "documents" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium">Documents</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Attach documents to this session for attendees to access.
                  </p>
                </div>

                {availableDocuments.length > 0 && (
                  <div className="space-y-1.5">
                    {availableDocuments.map((doc) => (
                      <label key={doc.id} className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm cursor-pointer hover:bg-accent/50 transition-colors">
                        <input
                          type="checkbox"
                          aria-label={doc.title}
                          checked={form.document_ids.includes(doc.id)}
                          onChange={() => toggleDocumentId(doc.id)}
                          className="h-4 w-4 rounded border-input accent-primary"
                        />
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{doc.title}</span>
                      </label>
                    ))}
                  </div>
                )}

                {availableDocuments.length === 0 && !showAddDocument && (
                  <p className="text-sm text-muted-foreground">No documents yet. Add one below or upload in Documents &amp; Videos.</p>
                )}

                {/* Inline add document form */}
                {showAddDocument ? (
                  <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">New Document</h4>
                      <div className="flex rounded-lg border bg-muted/30 p-0.5 text-xs">
                        <button
                          type="button"
                          role="button"
                          aria-label="URL"
                          onClick={() => setDocMode("url")}
                          className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${
                            docMode === "url"
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Link className="h-3 w-3" />
                          URL
                        </button>
                        <button
                          type="button"
                          role="button"
                          aria-label="Upload"
                          onClick={() => setDocMode("upload")}
                          className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${
                            docMode === "upload"
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Upload className="h-3 w-3" />
                          Upload
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Title {docMode === "url" ? "*" : ""}</label>
                        <Input
                          type="text"
                          value={newDoc.title}
                          onChange={(e) => setNewDoc((d) => ({ ...d, title: e.target.value }))}
                          placeholder="Document title"
                        />
                        {docMode === "upload" && (
                          <p className="text-xs text-muted-foreground">Leave empty to use the file name</p>
                        )}
                      </div>

                      {docMode === "url" ? (
                        <div className="space-y-1">
                          <label className="text-xs font-medium">Link URL</label>
                          <Input
                            type="url"
                            value={newDoc.external_url}
                            onChange={(e) => setNewDoc((d) => ({ ...d, external_url: e.target.value }))}
                            placeholder="https://..."
                          />
                          <p className="text-xs text-muted-foreground">Link to an external document (Google Drive, Dropbox, etc.)</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div
                            onClick={() => !uploadingFile && docFileRef.current?.click()}
                            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 transition-colors ${
                              uploadingFile
                                ? "border-primary/30 bg-primary/5"
                                : "border-muted-foreground/20 hover:border-primary/40 hover:bg-accent/50"
                            }`}
                          >
                            <input
                              ref={docFileRef}
                              type="file"
                              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip"
                              className="hidden"
                              onChange={handleDocFileChange}
                            />
                            {uploadingFile ? (
                              <>
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                <p className="mt-2 text-sm text-muted-foreground">Uploading...</p>
                              </>
                            ) : (
                              <>
                                <Upload className="h-6 w-6 text-muted-foreground" />
                                <p className="mt-2 text-sm text-muted-foreground">
                                  Click to upload a file
                                </p>
                                <p className="text-xs text-muted-foreground/60">
                                  PDF, DOC, PPT, XLS, TXT, CSV, ZIP up to 25MB
                                </p>
                                <p className="text-xs text-muted-foreground/40 mt-1">
                                  File will be saved automatically on upload
                                </p>
                              </>
                            )}
                          </div>
                          {uploadError && (
                            <p className="text-xs text-destructive">{uploadError}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowAddDocument(false);
                          setNewDoc({ title: "", external_url: "" });
                          setDocMode("url");
                          setUploadError("");
                        }}
                      >
                        Cancel
                      </Button>
                      {docMode === "url" && (
                        <Button
                          type="button"
                          size="sm"
                          disabled={!newDoc.title.trim()}
                          loading={savingDocument}
                          onClick={handleSaveDocument}
                        >
                          Add Document
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddDocument(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Document
                  </Button>
                )}
              </div>
            )}

            {/* ── Live Polling Tab ── */}
            {activeTab === "polls" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium">Live Polling</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Capture your audience&apos;s attention and collect instant feedback.
                  </p>
                </div>

                {availablePolls.length > 0 && (
                  <div className="space-y-1.5">
                    {availablePolls.map((poll) => (
                      <label key={poll.id} className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm cursor-pointer hover:bg-accent/50 transition-colors">
                        <input
                          type="checkbox"
                          aria-label={poll.question}
                          checked={form.poll_ids.includes(poll.id)}
                          onChange={() => togglePollId(poll.id)}
                          className="h-4 w-4 rounded border-input accent-primary"
                        />
                        <BarChart3 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{poll.question}</span>
                      </label>
                    ))}
                  </div>
                )}

                {availablePolls.length === 0 && !showAddPoll && (
                  <p className="text-sm text-muted-foreground">No polls yet. Add one below.</p>
                )}

                {/* Inline add poll form */}
                {showAddPoll ? (
                  <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                    <h4 className="text-sm font-medium">New Poll</h4>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Question *</label>
                        <Input
                          type="text"
                          value={newPollQuestion}
                          onChange={(e) => setNewPollQuestion(e.target.value)}
                          placeholder="What would you like to ask?"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Options</label>
                        <div className="space-y-2">
                          {newPollOptions.map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
                              <Input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const updated = [...newPollOptions];
                                  updated[idx] = e.target.value;
                                  setNewPollOptions(updated);
                                }}
                                placeholder={`Option ${idx + 1}`}
                                className="flex-1"
                              />
                              {newPollOptions.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => setNewPollOptions((opts) => opts.filter((_, i) => i !== idx))}
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-1"
                          onClick={() => setNewPollOptions((opts) => [...opts, ""])}
                        >
                          <Plus className="h-3 w-3" />
                          Add Option
                        </Button>
                      </div>
                    </div>

                    {/* Advanced options toggle */}
                    <button
                      type="button"
                      className="flex w-full items-center gap-1.5 border-t pt-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowPollAdvanced((v) => !v)}
                    >
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showPollAdvanced ? "rotate-180" : ""}`} />
                      Advanced options
                    </button>

                    {showPollAdvanced && (<>
                    {/* Prompt attendee */}
                    <div className="space-y-1.5 border-t pt-3">
                      <p className="text-xs font-medium">Prompt attendee to answer?</p>
                      <div className="space-y-1">
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="poll-prompt"
                            aria-label="Prompt the poll to get better response rate"
                            checked={newPollPrompt}
                            onChange={() => setNewPollPrompt(true)}
                            className="h-3.5 w-3.5 accent-primary"
                          />
                          Prompt the poll to get better response rate
                        </label>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="poll-prompt"
                            aria-label="Do not prompt"
                            checked={!newPollPrompt}
                            onChange={() => setNewPollPrompt(false)}
                            className="h-3.5 w-3.5 accent-primary"
                          />
                          Do not prompt
                        </label>
                      </div>
                    </div>

                    {/* Anonymous response */}
                    <div className="space-y-1.5 border-t pt-3">
                      <p className="text-xs font-medium">Anonymous Response</p>
                      <label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer hover:bg-accent/50 transition-colors">
                        <input
                          type="checkbox"
                          aria-label="Poll responses will be anonymous"
                          checked={newPollAnonymous}
                          onChange={(e) => setNewPollAnonymous(e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-input accent-primary"
                        />
                        Poll responses will be anonymous
                      </label>
                    </div>

                    {/* Open Time */}
                    <div className="space-y-1.5 border-t pt-3">
                      <p className="text-xs font-medium">Open Time</p>
                      <div className="space-y-1">
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="poll-open-time"
                            aria-label="Open now"
                            checked={newPollOpenTimeMode === "now"}
                            onChange={() => setNewPollOpenTimeMode("now")}
                            className="h-3.5 w-3.5 accent-primary"
                          />
                          Open now
                        </label>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="poll-open-time"
                            aria-label="Open a specific time before the session starts"
                            checked={newPollOpenTimeMode === "before_session"}
                            onChange={() => setNewPollOpenTimeMode("before_session")}
                            className="h-3.5 w-3.5 accent-primary"
                          />
                          Open a specific time before the session starts
                        </label>
                        {newPollOpenTimeMode === "before_session" && (
                          <div className="ml-6 mt-1 flex items-center gap-2">
                            <div className="flex flex-col items-center gap-0.5">
                              <Input
                                type="number"
                                min={0}
                                aria-label="Days"
                                value={newPollBeforeDays}
                                onChange={(e) => setNewPollBeforeDays(parseInt(e.target.value) || 0)}
                                className="w-16 text-center"
                              />
                              <span className="text-[10px] text-muted-foreground">Days</span>
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                              <Input
                                type="number"
                                min={0}
                                max={23}
                                aria-label="Hours"
                                value={newPollBeforeHours}
                                onChange={(e) => setNewPollBeforeHours(parseInt(e.target.value) || 0)}
                                className="w-16 text-center"
                              />
                              <span className="text-[10px] text-muted-foreground">Hours</span>
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                              <Input
                                type="number"
                                min={0}
                                max={59}
                                aria-label="Minutes"
                                value={newPollBeforeMinutes}
                                onChange={(e) => setNewPollBeforeMinutes(parseInt(e.target.value) || 0)}
                                className="w-16 text-center"
                              />
                              <span className="text-[10px] text-muted-foreground">Minutes</span>
                            </div>
                          </div>
                        )}
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="poll-open-time"
                            aria-label="Schedule open date"
                            checked={newPollOpenTimeMode === "scheduled"}
                            onChange={() => setNewPollOpenTimeMode("scheduled")}
                            className="h-3.5 w-3.5 accent-primary"
                          />
                          Schedule open date
                        </label>
                        {newPollOpenTimeMode === "scheduled" && (
                          <div className="ml-6 mt-1 flex items-center gap-2">
                            <Input
                              type="date"
                              aria-label="Open date"
                              value={newPollScheduledDate}
                              onChange={(e) => setNewPollScheduledDate(e.target.value)}
                              className="w-40"
                            />
                            <Input
                              type="time"
                              aria-label="Open time"
                              value={newPollScheduledTime}
                              onChange={(e) => setNewPollScheduledTime(e.target.value)}
                              className="w-32"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Result visibility */}
                    <div className="space-y-1.5 border-t pt-3">
                      <p className="text-xs font-medium">Poll Result Visibility</p>
                      <div className="space-y-1">
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="poll-visibility"
                            aria-label="Everyone who answered"
                            checked={newPollResultVisibility === "everyone"}
                            onChange={() => setNewPollResultVisibility("everyone")}
                            className="h-3.5 w-3.5 accent-primary"
                          />
                          Everyone who answered
                        </label>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="poll-visibility"
                            aria-label="Everyone who answered after poll is closed"
                            checked={newPollResultVisibility === "after_closed"}
                            onChange={() => setNewPollResultVisibility("after_closed")}
                            className="h-3.5 w-3.5 accent-primary"
                          />
                          Everyone who answered after poll is closed
                        </label>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="poll-visibility"
                            aria-label="Only organizers"
                            checked={newPollResultVisibility === "organizers_only"}
                            onChange={() => setNewPollResultVisibility("organizers_only")}
                            className="h-3.5 w-3.5 accent-primary"
                          />
                          Only organizers
                        </label>
                      </div>
                    </div>

                    </>)}

                    <div className="flex justify-end gap-2 border-t pt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowAddPoll(false);
                          setShowPollAdvanced(false);
                          setNewPollQuestion("");
                          setNewPollOptions(["", ""]);
                          setNewPollPrompt(true);
                          setNewPollAnonymous(false);
                          setNewPollResultVisibility("everyone");
                          setNewPollOpenTimeMode("now");
                          setNewPollBeforeDays(0);
                          setNewPollBeforeHours(0);
                          setNewPollBeforeMinutes(0);
                          setNewPollScheduledDate("");
                          setNewPollScheduledTime("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={!newPollQuestion.trim() || newPollOptions.filter((o) => o.trim()).length < 2}
                        loading={savingPoll}
                        onClick={handleSavePoll}
                      >
                        Save Poll
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddPoll(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Poll
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!form.title || !form.date || !form.start_time || !form.end_time}
              loading={loading}
            >
              {loading ? "Saving..." : session ? "Update" : "Add Session"}
            </Button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
