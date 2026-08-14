"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Textarea, Badge, Card, useConfirm } from "@attendly/ui/components";
import { createTemplate, updateTemplate, deleteTemplate } from "../actions";
import type { EmailTemplate } from "../queries";

type TicketType = {
  id: string;
  name: string;
};

type TemplateFormData = {
  ticket_type_id: string;
  subject: string;
  body: string;
};

const emptyForm: TemplateFormData = {
  ticket_type_id: "",
  subject: "",
  body: "",
};

export function EmailTemplateManager({
  eventId,
  templates: initialTemplates,
  ticketTypes,
}: {
  eventId: string;
  templates: EmailTemplate[];
  ticketTypes: TicketType[];
}) {
  const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateFormData>(emptyForm);
  const [loading, setLoading] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(template: EmailTemplate) {
    setEditingId(template.id);
    setForm({
      ticket_type_id: template.ticket_type_id ?? "",
      subject: template.subject,
      body: template.body,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function getTicketTypeName(ticketTypeId: string | null): string {
    if (!ticketTypeId) return "All Tickets (Default)";
    return ticketTypes.find((t) => t.id === ticketTypeId)?.name ?? "Unknown";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.subject.trim() || !form.body.trim()) return;
    setLoading(true);

    try {
      if (editingId) {
        await updateTemplate(eventId, editingId, {
          subject: form.subject.trim(),
          body: form.body.trim(),
        });
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === editingId
              ? {
                  ...t,
                  subject: form.subject.trim(),
                  body: form.body.trim(),
                  updated_at: new Date().toISOString(),
                }
              : t
          )
        );
        toast.success("Template updated");
      } else {
        const created = await createTemplate(eventId, {
          ticket_type_id: form.ticket_type_id || null,
          subject: form.subject.trim(),
          body: form.body.trim(),
        });
        setTemplates((prev) => [
          ...prev,
          {
            ...created,
            ticket_type_name: getTicketTypeName(created.ticket_type_id),
          },
        ]);
        toast.success("Template created");
      }
      closeForm();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save template"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(templateId: string) {
    const ok = await confirm({
      title: "Delete Template",
      description:
        "Delete this email template? This action cannot be undone.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await deleteTemplate(eventId, templateId);
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      toast.success("Template deleted");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete"
      );
    }
  }

  async function handleToggleEnabled(template: EmailTemplate) {
    try {
      await updateTemplate(eventId, template.id, {
        enabled: !template.enabled,
      });
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === template.id ? { ...t, enabled: !t.enabled } : t
        )
      );
      toast.success(
        template.enabled ? "Template disabled" : "Template enabled"
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update"
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {templates.length} template{templates.length !== 1 ? "s" : ""}
        </p>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Template
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium">
              {editingId ? "Edit Template" : "New Template"}
            </h3>
            <button
              onClick={closeForm}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingId && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Ticket Type</label>
                <select
                  value={form.ticket_type_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ticket_type_id: e.target.value }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">All Tickets (Default)</option>
                  {ticketTypes.map((tt) => (
                    <option key={tt.id} value={tt.id}>
                      {tt.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Choose a specific ticket type or leave as default for all
                  tickets.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Subject *</label>
              <Input
                required
                value={form.subject}
                onChange={(e) =>
                  setForm((f) => ({ ...f, subject: e.target.value }))
                }
                placeholder='e.g. Your registration for {{event_name}} is confirmed!'
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Body *</label>
              <Textarea
                required
                rows={8}
                value={form.body}
                onChange={(e) =>
                  setForm((f) => ({ ...f, body: e.target.value }))
                }
                placeholder="Write your confirmation email content here..."
              />
              <p className="text-xs text-muted-foreground">
                Available merge variables:{" "}
                <code className="rounded bg-muted px-1 py-0.5">{"{{name}}"}</code>,{" "}
                <code className="rounded bg-muted px-1 py-0.5">{"{{ticket_name}}"}</code>,{" "}
                <code className="rounded bg-muted px-1 py-0.5">{"{{event_name}}"}</code>,{" "}
                <code className="rounded bg-muted px-1 py-0.5">{"{{event_date}}"}</code>,{" "}
                <code className="rounded bg-muted px-1 py-0.5">{"{{qr_code_url}}"}</code>
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" loading={loading}>
                {editingId ? "Update" : "Create"} Template
              </Button>
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Template list */}
      {templates.length === 0 && !showForm ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">No email templates yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create templates to customize confirmation emails sent after
            registration.
          </p>
          <Button
            onClick={openCreate}
            variant="outline"
            className="mt-4"
            size="sm"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Template
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <Card key={template.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 min-w-0">
                  <span className="text-sm font-semibold">
                    {template.ticket_type_name}
                  </span>
                  <span className="text-sm text-muted-foreground truncate max-w-[300px]">
                    {template.subject}
                  </span>
                  <Badge variant={template.enabled ? "default" : "secondary"}>
                    {template.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleEnabled(template)}
                    title={template.enabled ? "Disable" : "Enable"}
                  >
                    {template.enabled ? (
                      <Power className="h-4 w-4" />
                    ) : (
                      <PowerOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(template)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {confirmDialog}
    </div>
  );
}
