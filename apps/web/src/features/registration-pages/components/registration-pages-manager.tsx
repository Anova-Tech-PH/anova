"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Badge, Card, useConfirm } from "@attendly/ui/components";
import {
  createRegistrationPage,
  updateRegistrationPage,
  deleteRegistrationPage,
} from "../actions";
import type { RegistrationPage } from "../queries";

type TicketType = {
  id: string;
  name: string;
};

type PageFormData = {
  name: string;
  slug: string;
  ticket_type_ids: string[];
};

const emptyForm: PageFormData = {
  name: "",
  slug: "",
  ticket_type_ids: [],
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      title="Copy URL path"
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

export function RegistrationPagesManager({
  eventId,
  pages: initialPages,
  ticketTypes,
}: {
  eventId: string;
  pages: RegistrationPage[];
  ticketTypes: TicketType[];
}) {
  const [pages, setPages] = useState<RegistrationPage[]>(initialPages);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PageFormData>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setSlugManuallyEdited(false);
    setShowForm(true);
  }

  function openEdit(page: RegistrationPage) {
    setEditingId(page.id);
    setForm({
      name: page.name,
      slug: page.slug,
      ticket_type_ids: page.ticket_type_ids ?? [],
    });
    setSlugManuallyEdited(true);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setSlugManuallyEdited(false);
  }

  function handleNameChange(name: string) {
    setForm((f) => ({
      ...f,
      name,
      slug: slugManuallyEdited ? f.slug : generateSlug(name),
    }));
  }

  function handleSlugChange(slug: string) {
    setSlugManuallyEdited(true);
    setForm((f) => ({ ...f, slug }));
  }

  function toggleTicketType(ticketId: string) {
    setForm((f) => ({
      ...f,
      ticket_type_ids: f.ticket_type_ids.includes(ticketId)
        ? f.ticket_type_ids.filter((id) => id !== ticketId)
        : [...f.ticket_type_ids, ticketId],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);

    try {
      if (editingId) {
        await updateRegistrationPage(eventId, editingId, {
          name: form.name.trim(),
          slug: form.slug.trim() || generateSlug(form.name),
          ticket_type_ids: form.ticket_type_ids,
        });
        setPages((prev) =>
          prev.map((p) =>
            p.id === editingId
              ? {
                  ...p,
                  name: form.name.trim(),
                  slug: form.slug.trim() || generateSlug(form.name),
                  ticket_type_ids: form.ticket_type_ids,
                }
              : p
          )
        );
        toast.success("Registration page updated");
      } else {
        const created = await createRegistrationPage(eventId, {
          name: form.name.trim(),
          slug: form.slug.trim() || undefined,
          ticket_type_ids: form.ticket_type_ids,
        });
        setPages((prev) => [...prev, created]);
        toast.success("Registration page created");
      }
      closeForm();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save registration page"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(pageId: string) {
    const ok = await confirm({
      title: "Delete Registration Page",
      description:
        "Delete this registration page? This action cannot be undone.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await deleteRegistrationPage(eventId, pageId);
      setPages((prev) => prev.filter((p) => p.id !== pageId));
      toast.success("Registration page deleted");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete"
      );
    }
  }

  function getTicketName(id: string): string | undefined {
    return ticketTypes.find((t) => t.id === id)?.name;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {pages.length} page{pages.length !== 1 ? "s" : ""}
        </p>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Add Page
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium">
              {editingId ? "Edit Registration Page" : "New Registration Page"}
            </h3>
            <button
              onClick={closeForm}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Name *</label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. VIP Registration"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Slug</label>
                <Input
                  value={form.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="auto-generated-from-name"
                />
                <p className="text-xs text-muted-foreground">
                  URL path: /register/{form.slug || "..."}
                </p>
              </div>
            </div>

            {ticketTypes.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Included Ticket Types
                </label>
                <p className="text-xs text-muted-foreground">
                  Select which ticket types to show on this page. Leave unchecked to show all.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ticketTypes.map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => toggleTicketType(ticket.id)}
                      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                        form.ticket_type_ids.includes(ticket.id)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {ticket.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="submit" loading={loading}>
                {editingId ? "Update" : "Create"} Page
              </Button>
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Page list */}
      {pages.length === 0 && !showForm ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">No registration pages yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create registration pages with different ticket subsets, each with a unique shareable URL.
          </p>
          <Button
            onClick={openCreate}
            variant="outline"
            className="mt-4"
            size="sm"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Page
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {pages.map((page) => (
            <Card key={page.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold">{page.name}</span>
                    {page.is_default && (
                      <Badge variant="outline">Default</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      /register/{page.slug}
                    </code>
                    <CopyButton text={`/register/${page.slug}`} />
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {page.ticket_type_ids.length === 0 ? (
                      <span className="text-xs text-muted-foreground">
                        All tickets
                      </span>
                    ) : (
                      page.ticket_type_ids.map((id) => {
                        const name = getTicketName(id);
                        return name ? (
                          <Badge key={id} variant="outline" className="text-xs">
                            {name}
                          </Badge>
                        ) : null;
                      })
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(page)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(page.id)}
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
