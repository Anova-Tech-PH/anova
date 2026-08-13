"use client";

import { useState } from "react";
import { FileText, Plus, Zap, RotateCcw, Globe } from "lucide-react";
import { Button, Card, CardContent } from "@attendly/ui/components";
import type {
  Announcement,
  AnnouncementTemplate,
} from "@/features/announcements/queries";
import { AnnouncementComposer } from "./announcement-composer";
import { AnnouncementList } from "./announcement-list";
import { TemplatePicker } from "./template-picker";
import { QuickReminderPicker } from "./quick-reminder-picker";

interface AnnouncementsPageClientProps {
  eventId: string;
  drafts: Announcement[];
  sent: Announcement[];
  totalDrafts: number;
  totalSent: number;
  ticketTypes: { id: string; name: string }[];
  sessions: { id: string; title: string }[];
  categories: string[];
  totalAttendees: number;
  orgTemplates: AnnouncementTemplate[];
  eventName: string;
  page: number;
  pageSize: number;
}

export function AnnouncementsPageClient({
  eventId,
  drafts,
  sent,
  totalDrafts,
  totalSent,
  ticketTypes,
  sessions,
  categories,
  totalAttendees,
  orgTemplates,
  eventName,
  page,
  pageSize,
}: AnnouncementsPageClientProps) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<Announcement | null>(null);
  const [templateSubject, setTemplateSubject] = useState<string | undefined>();
  const [templateBody, setTemplateBody] = useState<string | undefined>();
  const [templateSenderName, setTemplateSenderName] = useState<string | undefined>();
  const [templateReplyToEmail, setTemplateReplyToEmail] = useState<string | undefined>();
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [templatePickerMode, setTemplatePickerMode] = useState<
    "reuse" | "org_templates"
  >("reuse");
  const [quickReminderOpen, setQuickReminderOpen] = useState(false);

  function openComposerEmpty() {
    setEditDraft(null);
    setTemplateSubject(undefined);
    setTemplateBody(undefined);
    setTemplateSenderName(undefined);
    setTemplateReplyToEmail(undefined);
    setComposerOpen(true);
  }

  function openComposerWithTemplate(
    subject: string,
    body: string,
    senderName?: string,
    replyToEmail?: string
  ) {
    setEditDraft(null);
    setTemplateSubject(subject);
    setTemplateBody(body);
    setTemplateSenderName(senderName);
    setTemplateReplyToEmail(replyToEmail);
    setComposerOpen(true);
  }

  function openQuickReminder() {
    setQuickReminderOpen(true);
  }

  function handleQuickReminderSelect(subject: string, body: string) {
    setQuickReminderOpen(false);
    openComposerWithTemplate(subject, body);
  }

  function handleEditDraft(draft: Announcement) {
    setTemplateSubject(undefined);
    setTemplateBody(undefined);
    setEditDraft(draft);
    setComposerOpen(true);
  }

  function handleDuplicate(announcement: Announcement) {
    openComposerWithTemplate(
      announcement.subject,
      announcement.body,
      announcement.sender_name ?? undefined,
      announcement.reply_to_email ?? undefined
    );
  }

  function handleTemplateSelect(subject: string, body: string) {
    setTemplatePickerOpen(false);
    openComposerWithTemplate(subject, body);
  }

  function handleComposerClose() {
    setComposerOpen(false);
    setEditDraft(null);
    setTemplateSubject(undefined);
    setTemplateBody(undefined);
    setTemplateSenderName(undefined);
    setTemplateReplyToEmail(undefined);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Announcements</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Send announcements to your attendees via in-app notifications, email,
          or push.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalSent}</p>
              <p className="text-xs text-muted-foreground">Sent</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalDrafts}</p>
              <p className="text-xs text-muted-foreground">Drafts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={openComposerEmpty}>
          <Plus className="mr-2 h-4 w-4" />
          Start from scratch
        </Button>
        <Button onClick={openQuickReminder}>
          <Zap className="mr-2 h-4 w-4" />
          Quick reminder
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setTemplatePickerMode("reuse");
            setTemplatePickerOpen(true);
          }}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reuse past announcement
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setTemplatePickerMode("org_templates");
            setTemplatePickerOpen(true);
          }}
        >
          <Globe className="mr-2 h-4 w-4" />
          From other organizers
        </Button>
      </div>

      {/* Announcement list */}
      <AnnouncementList
        drafts={drafts}
        sent={sent}
        totalDrafts={totalDrafts}
        totalSent={totalSent}
        eventId={eventId}
        page={page}
        pageSize={pageSize}
        onEditDraft={handleEditDraft}
        onDuplicate={handleDuplicate}
      />

      {/* Composer modal */}
      <AnnouncementComposer
        eventId={eventId}
        open={composerOpen}
        onClose={handleComposerClose}
        draft={editDraft}
        templateSubject={templateSubject}
        templateBody={templateBody}
        templateSenderName={templateSenderName}
        templateReplyToEmail={templateReplyToEmail}
        ticketTypes={ticketTypes}
        sessions={sessions}
        categories={categories}
        totalAttendees={totalAttendees}
      />

      {/* Quick reminder picker modal */}
      <QuickReminderPicker
        open={quickReminderOpen}
        onClose={() => setQuickReminderOpen(false)}
        onSelect={handleQuickReminderSelect}
        eventName={eventName}
      />

      {/* Template picker modal */}
      <TemplatePicker
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        onSelect={handleTemplateSelect}
        mode={templatePickerMode}
        sentAnnouncements={sent}
        orgTemplates={orgTemplates}
      />
    </div>
  );
}
