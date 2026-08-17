"use client";

import { useState, useTransition } from "react";
import {
  Button,
  Card,
  CardContent,
  Input,
  ModalOverlay,
  useConfirm,
} from "@attendly/ui/components";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Link as LinkIcon,
  Copy,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { VolunteerSettings, VolunteerRole, VolunteerQuestion } from "../queries";
import {
  upsertVolunteerSettings,
  uploadBannerImage,
  createRole,
  updateRole,
  deleteRole,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from "../actions";

interface SetupTabProps {
  eventId: string;
  settings: VolunteerSettings | null;
  roles: VolunteerRole[];
  questions: VolunteerQuestion[];
  applicationUrl: string | null;
}

export function SetupTab({
  eventId,
  settings,
  roles,
  questions,
  applicationUrl,
}: SetupTabProps) {
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();

  // Settings state
  const [title, setTitle] = useState(settings?.title ?? "Call for Volunteers");
  const [instructions, setInstructions] = useState(settings?.instructions ?? "");
  const [bannerUrl, setBannerUrl] = useState(settings?.banner_image_url ?? "");
  const [deadline, setDeadline] = useState(
    settings?.application_deadline
      ? new Date(settings.application_deadline).toISOString().slice(0, 16)
      : ""
  );
  const [autoAccept, setAutoAccept] = useState(settings?.auto_accept ?? false);
  const [autoAddAttendees, setAutoAddAttendees] = useState(
    settings?.auto_add_to_attendees ?? false
  );
  const [isPublished, setIsPublished] = useState(settings?.is_published ?? false);

  // Role form state
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState<VolunteerRole | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [roleMaxVolunteers, setRoleMaxVolunteers] = useState("");

  // Question form state
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<VolunteerQuestion | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [questionRequired, setQuestionRequired] = useState(false);

  function handleSaveSettings() {
    startTransition(async () => {
      try {
        await upsertVolunteerSettings(eventId, {
          title,
          instructions: instructions || null,
          banner_image_url: bannerUrl || null,
          application_deadline: deadline ? new Date(deadline).toISOString() : null,
          auto_accept: autoAccept,
          auto_add_to_attendees: autoAddAttendees,
          is_published: isPublished,
        });
        toast.success("Settings saved");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save settings");
      }
    });
  }

  function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const url = await uploadBannerImage(eventId, formData);
        setBannerUrl(url);
        await upsertVolunteerSettings(eventId, { banner_image_url: url });
        toast.success("Banner uploaded");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  function openRoleForm(role?: VolunteerRole) {
    setEditingRole(role ?? null);
    setRoleName(role?.name ?? "");
    setRoleDescription(role?.description ?? "");
    setRoleMaxVolunteers(role?.max_volunteers?.toString() ?? "");
    setShowRoleForm(true);
  }

  function handleSaveRole() {
    if (!roleName.trim()) return;
    startTransition(async () => {
      try {
        if (editingRole) {
          await updateRole(eventId, editingRole.id, {
            name: roleName,
            description: roleDescription || null,
            max_volunteers: roleMaxVolunteers ? parseInt(roleMaxVolunteers) : null,
          });
          toast.success("Role updated");
        } else {
          await createRole(eventId, {
            name: roleName,
            description: roleDescription || undefined,
            max_volunteers: roleMaxVolunteers ? parseInt(roleMaxVolunteers) : null,
          });
          toast.success("Role created");
        }
        setShowRoleForm(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save role");
      }
    });
  }

  async function handleDeleteRole(roleId: string) {
    const ok = await confirm({
      title: "Delete Role",
      description: "Are you sure? This will also remove any applications for this role.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteRole(eventId, roleId);
        toast.success("Role deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  function openQuestionForm(question?: VolunteerQuestion) {
    setEditingQuestion(question ?? null);
    setQuestionText(question?.question_text ?? "");
    setQuestionRequired(question?.is_required ?? false);
    setShowQuestionForm(true);
  }

  function handleSaveQuestion() {
    if (!questionText.trim()) return;
    startTransition(async () => {
      try {
        if (editingQuestion) {
          await updateQuestion(eventId, editingQuestion.id, {
            question_text: questionText,
            is_required: questionRequired,
          });
          toast.success("Question updated");
        } else {
          await createQuestion(eventId, {
            question_text: questionText,
            is_required: questionRequired,
          });
          toast.success("Question added");
        }
        setShowQuestionForm(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save question");
      }
    });
  }

  async function handleDeleteQuestion(questionId: string) {
    const ok = await confirm({
      title: "Delete Question",
      description: "Are you sure? This will also delete all answers to this question.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteQuestion(eventId, questionId);
        toast.success("Question deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  function copyLink() {
    if (applicationUrl) {
      navigator.clipboard.writeText(applicationUrl);
      toast.success("Link copied to clipboard");
    }
  }

  return (
    <div className="space-y-8">
      {/* Publish toggle + shareable link */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Application Portal</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {isPublished
                  ? "Your application portal is live and accepting submissions."
                  : "Publish to make the application portal public."}
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => {
                  setIsPublished(e.target.checked);
                  startTransition(async () => {
                    await upsertVolunteerSettings(eventId, {
                      is_published: e.target.checked,
                    });
                    toast.success(
                      e.target.checked ? "Portal published" : "Portal unpublished"
                    );
                  });
                }}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-primary transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>
          {isPublished && applicationUrl && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 p-3">
              <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <code className="flex-1 truncate text-sm">{applicationUrl}</code>
              <Button variant="outline" size="sm" onClick={copyLink}>
                <Copy className="mr-1 h-3.5 w-3.5" />
                Copy
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Portal Settings */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h3 className="text-base font-semibold">Portal Settings</h3>

          <div>
            <label className="mb-1 block text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Call for Volunteers"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Instructions</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Describe what volunteers will do, expectations, benefits..."
              rows={4}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Banner Image</label>
            {bannerUrl ? (
              <div className="relative">
                <img
                  src={bannerUrl}
                  alt="Banner"
                  className="h-32 w-full rounded-lg object-cover"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute right-2 top-2"
                  onClick={() => {
                    setBannerUrl("");
                    startTransition(async () => {
                      await upsertVolunteerSettings(eventId, { banner_image_url: null });
                    });
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <label className="flex h-32 cursor-pointer items-center justify-center rounded-lg border border-dashed bg-muted/20 hover:bg-muted/40 transition-colors">
                <div className="text-center">
                  <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
                  <span className="mt-1 text-sm text-muted-foreground">
                    Upload banner image
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleBannerUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Application Deadline
            </label>
            <Input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="auto-accept"
              checked={autoAccept}
              onChange={(e) => setAutoAccept(e.target.checked)}
              className="h-4 w-4 rounded border"
            />
            <label htmlFor="auto-accept" className="text-sm">
              Auto-accept all applications
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="auto-add"
              checked={autoAddAttendees}
              onChange={(e) => setAutoAddAttendees(e.target.checked)}
              className="h-4 w-4 rounded border"
            />
            <label htmlFor="auto-add" className="text-sm">
              Automatically add accepted volunteers to attendee list
            </label>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={isPending}>
              {isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Roles */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Volunteer Roles</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Define roles applicants can select when applying.
              </p>
            </div>
            <Button size="sm" onClick={() => openRoleForm()}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Role
            </Button>
          </div>

          {roles.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/20 py-8 text-center text-sm text-muted-foreground">
              No roles defined yet. Add roles for volunteers to choose from.
            </div>
          ) : (
            <div className="space-y-2">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center gap-3 rounded-lg border px-4 py-3"
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{role.name}</span>
                      {role.role_type === "built_in" && (
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          Built-in
                        </span>
                      )}
                      {role.max_volunteers && (
                        <span className="text-xs text-muted-foreground">
                          (max {role.max_volunteers})
                        </span>
                      )}
                    </div>
                    {role.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">
                        {role.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openRoleForm(role)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRole(role.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Questions */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Custom Questions</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add questions to the application form.
              </p>
            </div>
            <Button size="sm" onClick={() => openQuestionForm()}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Question
            </Button>
          </div>

          {questions.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/20 py-8 text-center text-sm text-muted-foreground">
              No custom questions yet. The form will use standard fields only.
            </div>
          ) : (
            <div className="space-y-2">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center gap-3 rounded-lg border px-4 py-3"
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm">{q.question_text}</span>
                    {q.is_required && (
                      <span className="ml-2 text-xs text-red-500">Required</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openQuestionForm(q)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Form Modal */}
      {showRoleForm && (
      <ModalOverlay onClose={() => setShowRoleForm(false)}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            {editingRole ? "Edit Role" : "Add Role"}
          </h3>
          <div>
            <label className="mb-1 block text-sm font-medium">Role Name</label>
            <Input
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="e.g. Registration Desk"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              value={roleDescription}
              onChange={(e) => setRoleDescription(e.target.value)}
              placeholder="What this role involves..."
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Max Volunteers (optional)
            </label>
            <Input
              type="number"
              value={roleMaxVolunteers}
              onChange={(e) => setRoleMaxVolunteers(e.target.value)}
              placeholder="Leave empty for unlimited"
              min={1}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowRoleForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole} disabled={isPending || !roleName.trim()}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </ModalOverlay>
      )}

      {/* Question Form Modal */}
      {showQuestionForm && (
      <ModalOverlay onClose={() => setShowQuestionForm(false)}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            {editingQuestion ? "Edit Question" : "Add Question"}
          </h3>
          <div>
            <label className="mb-1 block text-sm font-medium">Question</label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="e.g. What relevant experience do you have?"
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="question-required"
              checked={questionRequired}
              onChange={(e) => setQuestionRequired(e.target.checked)}
              className="h-4 w-4 rounded border"
            />
            <label htmlFor="question-required" className="text-sm">
              Required
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowQuestionForm(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveQuestion}
              disabled={isPending || !questionText.trim()}
            >
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </ModalOverlay>
      )}

      {confirmDialog}
    </div>
  );
}
