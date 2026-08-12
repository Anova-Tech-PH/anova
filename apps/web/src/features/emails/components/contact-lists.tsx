"use client";

import { useState, useRef, useTransition } from "react";
import { useConfirm } from "@attendly/ui/components";
import { Upload, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { createContactList, uploadContacts, deleteContactList } from "../actions";

type ContactList = {
  id: string;
  name: string;
  contacts: { count: number }[] | [{ count: number }];
  created_at: string;
};

export function ContactLists({
  organizationId,
  initialLists,
}: {
  organizationId: string;
  initialLists: ContactList[];
}) {
  const [lists, setLists] = useState(initialLists);
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadListId, setUploadListId] = useState<string | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  function getCount(list: ContactList): number {
    if (Array.isArray(list.contacts) && list.contacts.length > 0) {
      return list.contacts[0].count;
    }
    return 0;
  }

  function handleCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      try {
        const list = await createContactList({ organizationId, name: newName.trim() });
        setLists((prev) => [{ ...list, contacts: [{ count: 0 }] }, ...prev]);
        setNewName("");
        toast.success("List created");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create list");
      }
    });
  }

  async function handleDelete(listId: string) {
    const ok = await confirm({
      title: "Delete Contact List",
      description: "Delete this contact list and all its contacts? This action cannot be undone.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteContactList(listId);
        setLists((prev) => prev.filter((l) => l.id !== listId));
        toast.success("List deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  function handleCSVUpload(listId: string) {
    setUploadListId(listId);
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadListId) return;

    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      toast.error("CSV must have a header row and at least one data row");
      return;
    }

    const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
    const emailIdx = header.findIndex((h) => h === "email");
    const firstIdx = header.findIndex((h) => h.includes("first"));
    const lastIdx = header.findIndex((h) => h.includes("last"));

    if (emailIdx < 0) {
      toast.error('CSV must have an "email" column');
      return;
    }

    const contacts = lines.slice(1).map((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      return {
        email: cols[emailIdx] ?? "",
        firstName: firstIdx >= 0 ? cols[firstIdx] : undefined,
        lastName: lastIdx >= 0 ? cols[lastIdx] : undefined,
      };
    }).filter((c) => c.email.includes("@"));

    startTransition(async () => {
      try {
        const result = await uploadContacts(uploadListId, contacts);
        toast.success(`Uploaded ${result.count} contacts`);
        window.location.reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    });

    e.target.value = "";
    setUploadListId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1">
          <label className="text-sm font-medium">New Contact List</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Newsletter Subscribers"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={isPending || !newName.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Create
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
      />

      {lists.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No contact lists yet. Create one above.
        </p>
      ) : (
        <div className="space-y-2">
          {lists.map((list) => (
            <div key={list.id} className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{list.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {getCount(list)} contacts
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleCSVUpload(list.id)}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" /> Import CSV
                </button>
                <button
                  onClick={() => handleDelete(list.id)}
                  disabled={isPending}
                  aria-label={`Delete ${list.name}`}
                  className="inline-flex items-center justify-center rounded-md p-1.5 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {confirmDialog}
    </div>
  );
}
