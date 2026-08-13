"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Textarea, Badge } from "@attendly/ui/components";
import { saveSpeakerFormSettings } from "../settings-actions";
import { DEFAULT_SPEAKER_FIELDS, type FormFieldConfig } from "../settings-constants";

type SpeakerSettingsProps = {
  eventId: string;
  initialSettings: {
    email_subject: string;
    email_body: string;
    notification_preference: string;
    send_reminder_email: boolean;
  } | null;
  initialFields: FormFieldConfig[];
};

const LOCKED_FIELDS = ["name", "email"];
const MAX_CUSTOM_FIELDS = 5;

const FIELD_TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Textarea" },
  { value: "url", label: "URL" },
  { value: "image", label: "Image" },
];

function getInitialFields(initialFields: FormFieldConfig[]): FormFieldConfig[] {
  if (initialFields.length > 0) return initialFields;
  return DEFAULT_SPEAKER_FIELDS.map((f) => ({ ...f }));
}

export function SpeakerSettings({
  eventId,
  initialSettings,
  initialFields,
}: SpeakerSettingsProps) {
  const [isPending, startTransition] = useTransition();

  const [emailSubject, setEmailSubject] = useState(
    initialSettings?.email_subject ?? ""
  );
  const [emailBody, setEmailBody] = useState(
    initialSettings?.email_body ?? ""
  );
  const [notificationPreference, setNotificationPreference] = useState(
    initialSettings?.notification_preference ?? "every_update"
  );
  const [sendReminderEmail] = useState(
    initialSettings?.send_reminder_email ?? true
  );
  const [fields, setFields] = useState<FormFieldConfig[]>(() =>
    getInitialFields(initialFields)
  );

  const customFieldCount = fields.filter((f) => f.is_custom).length;

  function handleToggleInclude(index: number) {
    setFields((prev) =>
      prev.map((f, i) => {
        if (i !== index) return f;
        const included = !f.included;
        return { ...f, included, required: included ? f.required : false };
      })
    );
  }

  function handleToggleRequired(index: number) {
    setFields((prev) =>
      prev.map((f, i) => {
        if (i !== index) return f;
        if (!f.included) return f;
        return { ...f, required: !f.required };
      })
    );
  }

  function handleAddCustomField() {
    if (customFieldCount >= MAX_CUSTOM_FIELDS) {
      toast.error(`Maximum of ${MAX_CUSTOM_FIELDS} custom fields allowed`);
      return;
    }
    const key = `custom_${Date.now()}`;
    setFields((prev) => [
      ...prev,
      {
        field_key: key,
        label: "",
        included: true,
        required: false,
        is_custom: true,
        field_type: "text",
        sort_order: prev.length,
        organizer_only: false,
      },
    ]);
  }

  function handleDeleteCustomField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  function handleCustomLabelChange(index: number, label: string) {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, label } : f))
    );
  }

  function handleCustomTypeChange(index: number, field_type: string) {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, field_type } : f))
    );
  }

  function handleSave() {
    const emptyCustom = fields.find((f) => f.is_custom && !f.label.trim());
    if (emptyCustom) {
      toast.error("Custom fields must have a label");
      return;
    }
    startTransition(async () => {
      try {
        await saveSpeakerFormSettings(eventId, {
          emailSubject,
          emailBody,
          notificationPreference,
          fields,
        });
        toast.success("Settings saved successfully");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to save settings"
        );
      }
    });
  }

  function handleCancel() {
    setEmailSubject(initialSettings?.email_subject ?? "");
    setEmailBody(initialSettings?.email_body ?? "");
    setNotificationPreference(
      initialSettings?.notification_preference ?? "every_update"
    );
    setFields(getInitialFields(initialFields));
  }

  return (
    <div className="space-y-8">
      {/* Section 1: Speaker Form Email */}
      <section className="space-y-4">
        <h3 className="text-md font-semibold">Speaker Form Email</h3>
        <p className="text-sm text-muted-foreground">
          Customize the email sent to speakers with the form link. Available
          variables:{" "}
          <code className="text-xs">{"{{speaker_name}}"}</code>,{" "}
          <code className="text-xs">{"{{event_name}}"}</code>,{" "}
          <code className="text-xs">{"{{form_link}}"}</code>
        </p>

        <div className="space-y-3">
          <div>
            <label htmlFor="email-subject" className="text-sm font-medium">
              Subject
            </label>
            <Input
              id="email-subject"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="{{speaker_name}}, please submit your speaker info for {{event_name}}"
            />
          </div>

          <div>
            <label htmlFor="email-body" className="text-sm font-medium">
              Email Body
            </label>
            <Textarea
              id="email-body"
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Optional custom message to include in the email body..."
              rows={4}
            />
          </div>
        </div>
      </section>

      {/* Section 2: Speaker Form Fields */}
      <section className="space-y-4">
        <h3 className="text-md font-semibold">Speaker Form</h3>
        <p className="text-sm text-muted-foreground">
          Choose which fields to include on the speaker form and which are
          required.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 font-medium">Field</th>
                <th className="pb-2 pr-4 font-medium text-center">Include</th>
                <th className="pb-2 pr-4 font-medium text-center">Required</th>
                <th className="pb-2 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => {
                const isLocked = LOCKED_FIELDS.includes(field.field_key);
                return (
                  <tr key={field.field_key} className="border-b">
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        {field.is_custom ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={field.label}
                              onChange={(e) =>
                                handleCustomLabelChange(index, e.target.value)
                              }
                              placeholder="Field label"
                              className="h-8 w-40"
                            />
                            <select
                              value={field.field_type}
                              onChange={(e) =>
                                handleCustomTypeChange(index, e.target.value)
                              }
                              className="h-8 rounded-md border px-2 text-sm"
                            >
                              {FIELD_TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <span>{field.label}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-center">
                      <input
                        type="checkbox"
                        checked={field.included}
                        disabled={isLocked}
                        onChange={() => handleToggleInclude(index)}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="py-2 pr-4 text-center">
                      <input
                        type="checkbox"
                        checked={field.required}
                        disabled={isLocked || !field.included}
                        onChange={() => handleToggleRequired(index)}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="py-2 text-center">
                      {field.is_custom && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCustomField(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleAddCustomField}
          disabled={customFieldCount >= MAX_CUSTOM_FIELDS}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add Custom Field
        </Button>
      </section>

      {/* Section 3: Additional Settings */}
      <section className="space-y-4">
        <h3 className="text-md font-semibold">Additional Settings</h3>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="send-reminder"
              checked={sendReminderEmail}
              disabled
              className="h-4 w-4"
            />
            <label
              htmlFor="send-reminder"
              className="text-sm text-muted-foreground"
            >
              Send reminder email to speakers who haven&apos;t submitted
            </label>
            <Badge variant="outline">Coming Soon</Badge>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Notification Preference</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="notification_preference"
                  value="every_update"
                  checked={notificationPreference === "every_update"}
                  onChange={(e) => setNotificationPreference(e.target.value)}
                  className="h-4 w-4"
                />
                Receive an email every time a speaker updates their profile
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="notification_preference"
                  value="daily_summary"
                  checked={notificationPreference === "daily_summary"}
                  onChange={(e) => setNotificationPreference(e.target.value)}
                  className="h-4 w-4"
                />
                Receive 1 email per day with summary of changes (daily summary)
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 border-t pt-4">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save Settings"}
        </Button>
        <Button variant="outline" onClick={handleCancel} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
