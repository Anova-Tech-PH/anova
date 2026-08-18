"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Bell,
  Download,
  FileText,
  Inbox,
  Plus,
  Upload,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  Input,
  ModalOverlay,
} from "@attendly/ui/components";
import {
  sendConsentFormEmails,
  sendConsentFormReminders,
  exportSubmissionsCsv,
} from "../actions";
import type { ConsentFormSubmission, ConsentForm } from "../queries";

interface SubmissionsTableProps {
  eventId: string;
  formId: string;
  submissions: ConsentFormSubmission[];
  formStatus: ConsentForm["status"];
}

export function SubmissionsTable({
  eventId,
  formId,
  submissions,
  formStatus,
}: SubmissionsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showSendForm, setShowSendForm] = useState(false);
  const [contacts, setContacts] = useState<{ email: string; name?: string }[]>(
    []
  );
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function addContact() {
    if (!emailInput.trim() || !emailInput.includes("@")) return;
    if (contacts.some((c) => c.email === emailInput.trim())) {
      toast.error("Email already added");
      return;
    }
    setContacts((prev) => [
      ...prev,
      { email: emailInput.trim(), name: nameInput.trim() || undefined },
    ]);
    setEmailInput("");
    setNameInput("");
  }

  function removeContact(email: string) {
    setContacts((prev) => prev.filter((c) => c.email !== email));
  }

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a .csv file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      const parsed: { email: string; name?: string }[] = [];
      for (const line of lines) {
        const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
        const email = parts.find((p) => p.includes("@"));
        if (email) {
          const name = parts.find((p) => !p.includes("@") && p.length > 0);
          parsed.push({ email, name: name || undefined });
        }
      }
      setContacts((prev) => {
        const existing = new Set(prev.map((c) => c.email));
        const newContacts = parsed.filter((c) => !existing.has(c.email));
        return [...prev, ...newContacts];
      });
      if (parsed.length > 0) toast.success(`Added ${parsed.length} contacts from CSV`);
      else toast.error("No valid emails found in CSV");
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleSendForm() {
    if (contacts.length === 0) return;
    startTransition(async () => {
      try {
        const count = await sendConsentFormEmails(eventId, formId, contacts);
        toast.success(`Form sent to ${count} recipient(s)`);
        setContacts([]);
        setShowSendForm(false);
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to send form"
        );
      }
    });
  }

  function handleSendReminders() {
    startTransition(async () => {
      try {
        const count = await sendConsentFormReminders(eventId, formId);
        if (count === 0) {
          toast.info("All participants have already signed the form");
        } else {
          toast.success(`Reminders sent to ${count} participant(s)`);
        }
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to send reminders"
        );
      }
    });
  }

  function handleExportCsv() {
    startTransition(async () => {
      try {
        const csv = await exportSubmissionsCsv(eventId, formId);
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `consent-form-submissions-${formId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV exported");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to export CSV"
        );
      }
    });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSendForm(true)}
          disabled={isPending || formStatus !== "published"}
        >
          <Send className="mr-2 h-4 w-4" />
          Send Form
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSendReminders}
          disabled={isPending || formStatus !== "published"}
        >
          <Bell className="mr-2 h-4 w-4" />
          Send Reminders
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          disabled={isPending || submissions.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Stats Card */}
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{submissions.length}</p>
            <p className="text-sm text-muted-foreground">
              Total {submissions.length === 1 ? "Submission" : "Submissions"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {submissions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Inbox className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold">No submissions yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {formStatus === "published"
                ? "Share the form link with participants to start collecting submissions."
                : "Publish the form first to start collecting submissions."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">
                  Signed Name
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  Signed Date
                </th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
                <tr key={sub.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{sub.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {sub.email}
                  </td>
                  <td className="px-4 py-3">{sub.signed_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(sub.signed_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Send Form Modal */}
      {showSendForm && (
        <ModalOverlay onClose={() => setShowSendForm(false)}>
          <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg space-y-4">
            <h3 className="text-lg font-semibold">Send Consent Form</h3>

            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Email"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addContact();
                    }
                  }}
                />
                <Input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Name (optional)"
                  className="w-40"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addContact();
                    }
                  }}
                />
                <Button variant="outline" onClick={addContact}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="mr-1 h-3.5 w-3.5" />
                Import CSV
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
            </div>

            {contacts.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-lg border">
                {contacts.map((c) => (
                  <div
                    key={c.email}
                    className="flex items-center justify-between border-b px-3 py-2 last:border-b-0"
                  >
                    <div>
                      <span className="text-sm">{c.email}</span>
                      {c.name && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({c.name})
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeContact(c.email)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSendForm(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendForm}
                disabled={isPending || contacts.length === 0}
              >
                <Send className="mr-1 h-4 w-4" />
                {isPending
                  ? "Sending..."
                  : `Send to ${contacts.length} Recipient${contacts.length !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
