"use client";

import { useState, useRef, useTransition } from "react";
import {
  Button,
  Card,
  CardContent,
  Input,
  ModalOverlay,
} from "@attendly/ui/components";
import {
  Send,
  Upload,
  Copy,
  Link as LinkIcon,
  Mail,
  Plus,
  Trash2,
  Bell,
} from "lucide-react";
import { toast } from "sonner";
import type { VolunteerInvitation } from "../queries";
import { sendInvitations, sendReminders, importContactsCsv } from "../actions";

interface InvitationsTabProps {
  eventId: string;
  invitations: VolunteerInvitation[];
  applicationUrl: string | null;
}

export function InvitationsTab({
  eventId,
  invitations,
  applicationUrl,
}: InvitationsTabProps) {
  const [isPending, startTransition] = useTransition();
  const [showSendForm, setShowSendForm] = useState(false);
  const [contacts, setContacts] = useState<{ email: string; name?: string }[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [message, setMessage] = useState("");
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
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      try {
        const parsed = await importContactsCsv(eventId, text);
        setContacts((prev) => {
          const existing = new Set(prev.map((c) => c.email));
          const newContacts = parsed.filter((c) => !existing.has(c.email));
          return [...prev, ...newContacts];
        });
        toast.success(`Added ${parsed.length} contacts from CSV`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to parse CSV");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleSend() {
    if (contacts.length === 0) return;
    startTransition(async () => {
      try {
        const count = await sendInvitations(
          eventId,
          contacts,
          message || undefined
        );
        toast.success(`${count} invitations sent`);
        setContacts([]);
        setMessage("");
        setShowSendForm(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send");
      }
    });
  }

  function handleSendReminders() {
    startTransition(async () => {
      try {
        const count = await sendReminders(eventId);
        if (count === 0) {
          toast.info("No pending invitations to remind");
        } else {
          toast.success(`${count} reminders sent`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send reminders");
      }
    });
  }

  function copyLink() {
    if (applicationUrl) {
      navigator.clipboard.writeText(applicationUrl);
      toast.success("Link copied to clipboard");
    }
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      opened: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      applied: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}>
        {status}
      </span>
    );
  };

  const sentCount = invitations.filter((i) => i.status === "sent").length;
  const openedCount = invitations.filter((i) => i.status === "opened").length;
  const appliedCount = invitations.filter((i) => i.status === "applied").length;

  return (
    <div className="space-y-6">
      {/* Shareable Link */}
      {applicationUrl && (
        <Card>
          <CardContent className="p-4">
            <h4 className="mb-2 text-sm font-semibold">Application Portal Link</h4>
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
              <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <code className="flex-1 truncate text-sm">{applicationUrl}</code>
              <Button variant="outline" size="sm" onClick={copyLink}>
                <Copy className="mr-1 h-3.5 w-3.5" />
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{sentCount}</p>
            <p className="text-xs text-muted-foreground">Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{openedCount}</p>
            <p className="text-xs text-muted-foreground">Opened</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{appliedCount}</p>
            <p className="text-xs text-muted-foreground">Applied</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setShowSendForm(true)}>
          <Send className="mr-2 h-4 w-4" />
          Send Invitations
        </Button>
        <Button
          variant="outline"
          onClick={handleSendReminders}
          disabled={isPending || sentCount + openedCount === 0}
        >
          <Bell className="mr-2 h-4 w-4" />
          Send Reminders ({sentCount + openedCount})
        </Button>
      </div>

      {/* Invitation List */}
      {invitations.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 py-12 text-center text-sm text-muted-foreground">
          No invitations sent yet. Send invitations to recruit volunteers.
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Name</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Sent</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b last:border-b-0 hover:bg-muted/20"
                >
                  <td className="px-4 py-3">{inv.email}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {inv.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">{statusBadge(inv.status)}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {new Date(inv.sent_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Send Invitations Modal */}
      {showSendForm && (
      <ModalOverlay onClose={() => setShowSendForm(false)}>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Send Invitations</h3>

          {/* Add contacts */}
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

          {/* Contact list */}
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

          {/* Message */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Personal Message (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal note to the invitation email..."
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowSendForm(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isPending || contacts.length === 0}
            >
              <Send className="mr-1 h-4 w-4" />
              {isPending
                ? "Sending..."
                : `Send ${contacts.length} Invitation${contacts.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      </ModalOverlay>
      )}
    </div>
  );
}
