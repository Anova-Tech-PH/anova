"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";
import { Button, ModalOverlay } from "@attendly/ui/components";

interface QuickTemplate {
  id: string;
  subject: string;
  body: string;
}

function buildTemplates(eventName: string): QuickTemplate[] {
  return [
    {
      id: "session-room-change",
      subject: "Session Room Change",
      body: `<p>Dear attendee,</p><p>The room has changed for [session name]. It will be held in the [session location].</p><p>Thanks for your understanding.</p><p>Organizer,<br/>${eventName}</p>`,
    },
    {
      id: "thank-you",
      subject: "Thank You for Attending",
      body: `<p>Dear attendee,</p><p>Thank you so much for attending ${eventName}! We hope you had a great experience and found the sessions valuable.</p><p>We'd love to hear your feedback — please take a moment to fill out our post-event survey.</p><p>See you next time!<br/>The ${eventName} Team</p>`,
    },
    {
      id: "survey-reminder",
      subject: "Survey Reminder",
      body: `<p>Dear attendee,</p><p>We noticed you haven't completed our event survey yet. Your feedback helps us improve future events.</p><p>It only takes 2 minutes — please take a moment to share your thoughts.</p><p>Thank you!<br/>The ${eventName} Team</p>`,
    },
    {
      id: "session-feedback",
      subject: "Session Feedback Reminder",
      body: `<p>Dear attendee,</p><p>We hope you enjoyed the sessions at ${eventName}! Please take a moment to rate and provide feedback on the sessions you attended.</p><p>Your input helps our speakers improve and helps us plan better content for future events.</p><p>Thank you!<br/>The ${eventName} Team</p>`,
    },
    {
      id: "documents-reminder",
      subject: "Documents Reminder",
      body: `<p>Dear attendee,</p><p>Reminder: presentation slides and session materials are now available in the event app. Please check the Documents section to download them.</p><p>Thank you!<br/>The ${eventName} Team</p>`,
    },
    {
      id: "schedule-change",
      subject: "Schedule Change Notice",
      body: `<p>Dear attendee,</p><p>Please note there has been a change to the event schedule. Please check the updated agenda in the event app for the latest session times.</p><p>We apologize for any inconvenience.</p><p>The ${eventName} Team</p>`,
    },
    {
      id: "networking-reminder",
      subject: "Networking Reminder",
      body: `<p>Dear attendee,</p><p>Don't forget to connect with fellow attendees! Visit the Networking section in the event app to find and message other attendees.</p><p>Make the most of your ${eventName} experience!</p><p>The ${eventName} Team</p>`,
    },
    {
      id: "photo-contest",
      subject: "Photo Contest Reminder",
      body: `<p>Dear attendee,</p><p>Share your best moments from ${eventName}! Post photos on the Community Board for a chance to win prizes.</p><p>Don't miss out — the contest ends soon!</p><p>The ${eventName} Team</p>`,
    },
    {
      id: "live-poll",
      subject: "Live Poll Reminder",
      body: `<p>Dear attendee,</p><p>A live poll is now open! Head to the Live Polls section in the event app to cast your vote.</p><p>Your opinion matters!</p><p>The ${eventName} Team</p>`,
    },
    {
      id: "general-reminder",
      subject: "General Reminder",
      body: `<p>Dear attendee,</p><p>Just a quick reminder about an important update for ${eventName}. Please check the event app for the latest information.</p><p>Thank you!<br/>The ${eventName} Team</p>`,
    },
  ];
}

interface QuickReminderPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (subject: string, body: string) => void;
  eventName: string;
}

export function QuickReminderPicker({
  open,
  onClose,
  onSelect,
  eventName,
}: QuickReminderPickerProps) {
  const templates = buildTemplates(eventName);
  const [selectedId, setSelectedId] = useState(templates[0].id);

  if (!open) return null;

  const selected = templates.find((t) => t.id === selectedId) ?? templates[0];

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex w-full max-w-4xl max-h-[85vh] rounded-xl border bg-background shadow-xl overflow-hidden">
        {/* Left panel — template list */}
        <div
          data-testid="template-list-panel"
          className="w-[45%] border-r flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Compose Announcement
            </p>
            <h2 className="text-lg font-semibold">Quick reminders</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Send a quick announcement to let your attendees know about
              important updates at your event.
            </p>
          </div>

          {/* Template list */}
          <div className="flex-1 overflow-y-auto divide-y">
            {templates.map((t) => (
              <div
                key={t.id}
                className={`flex items-center justify-between px-6 py-3 ${
                  t.id === selectedId
                    ? "bg-muted/60"
                    : "hover:bg-muted/30"
                }`}
              >
                <span className="text-sm font-medium">{t.subject}</span>
                <Button
                  variant={t.id === selectedId ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setSelectedId(t.id)}
                >
                  Preview
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — preview */}
        <div
          data-testid="template-preview-panel"
          className="w-[55%] flex flex-col"
        >
          {/* Preview header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="text-base font-semibold">{selected.subject}</h3>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => onSelect(selected.subject, selected.body)}
              >
                Start from this template
              </Button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Info banner */}
          <div className="mx-6 mt-4 flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              In the next step, you can customize the announcement and choose
              to send it as an email or in-app message.
            </span>
          </div>

          {/* Preview body */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <p className="text-sm font-medium text-muted-foreground mb-3">
              {eventName}
            </p>
            <div
              data-testid="template-preview-body"
              className="rounded-lg border bg-muted/30 px-5 py-4 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: selected.body }}
            />
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}
