"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Users,
  Mic2,
  HandHelping,
  Globe,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  ModalOverlay,
  useConfirm,
} from "@attendly/ui/components";
import { createConsentForm, deleteConsentForm } from "../actions";
import { TEMPLATES } from "../templates";
import type { ConsentForm } from "../queries";

interface ConsentFormsPageClientProps {
  eventId: string;
  forms: (ConsentForm & { submissionCount: number })[];
}

const audienceIcons: Record<ConsentForm["audience"], typeof Users> = {
  all: Globe,
  attendees: Users,
  speakers: Mic2,
  volunteers: HandHelping,
};

const audienceLabels: Record<ConsentForm["audience"], string> = {
  all: "All Participants",
  attendees: "Attendees",
  speakers: "Speakers",
  volunteers: "Volunteers",
};

export function ConsentFormsPageClient({
  eventId,
  forms: initialForms,
}: ConsentFormsPageClientProps) {
  const router = useRouter();
  const [forms, setForms] = useState(initialForms);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();

  async function handleCreate(templateKey?: string) {
    const template = templateKey
      ? TEMPLATES.find((t) => t.key === templateKey)
      : null;
    const title = template ? template.title : "Untitled Form";

    startTransition(async () => {
      try {
        const form = await createConsentForm(
          eventId,
          {
            title,
            description: template?.description ?? null,
          },
          templateKey
        );
        toast.success("Form created");
        setShowCreateModal(false);
        router.push(`/events/${eventId}/release-consent-forms/${form.id}`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to create form"
        );
      }
    });
  }

  async function handleDelete(formId: string, formTitle: string) {
    const ok = await confirm({
      title: "Delete Form",
      description: `Delete "${formTitle}"? All submissions will be permanently lost. This action cannot be undone.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;

    startTransition(async () => {
      try {
        await deleteConsentForm(eventId, formId);
        setForms((prev) => prev.filter((f) => f.id !== formId));
        toast.success("Form deleted");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to delete form"
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Release & Consent Forms</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage release waivers and consent forms for your event
            participants.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          disabled={forms.length >= 2 || isPending}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Form
        </Button>
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <FileText className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold">No forms yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Create a release waiver or consent form to collect signed
              agreements from your event participants.
            </p>
            <Button
              className="mt-4"
              onClick={() => setShowCreateModal(true)}
              disabled={isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Form
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {forms.map((form) => {
            const AudienceIcon = audienceIcons[form.audience];
            return (
              <Card
                key={form.id}
                className="cursor-pointer transition-colors hover:border-primary/40"
                onClick={() =>
                  router.push(
                    `/events/${eventId}/release-consent-forms/${form.id}`
                  )
                }
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-semibold">
                        {form.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                          <AudienceIcon className="h-3 w-3" />
                          {audienceLabels[form.audience]}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            form.status === "published"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }`}
                        >
                          {form.status === "published" ? "Published" : "Draft"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {form.submissionCount}{" "}
                        {form.submissionCount === 1
                          ? "submission"
                          : "submissions"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(
                            `/events/${eventId}/release-consent-forms/${form.id}`
                          );
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(form.id, form.title);
                        }}
                        disabled={isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Form Modal */}
      {showCreateModal && (
        <ModalOverlay onClose={() => setShowCreateModal(false)}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Create Consent Form</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Choose a template to get started, or start from scratch.
            </p>
            <div className="space-y-2">
              {TEMPLATES.map((template) => (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => handleCreate(template.key)}
                  disabled={isPending}
                  className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted disabled:opacity-50"
                >
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{template.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {template.description}
                    </p>
                  </div>
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleCreate()}
                disabled={isPending}
                className="flex w-full items-start gap-3 rounded-lg border border-dashed p-3 text-left transition-colors hover:bg-muted disabled:opacity-50"
              >
                <Plus className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Start from scratch</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Create a blank form and add your own elements.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {confirmDialog}
    </div>
  );
}
