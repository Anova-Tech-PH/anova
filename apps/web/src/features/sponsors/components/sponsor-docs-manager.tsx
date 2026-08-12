"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, useConfirm } from "@attendly/ui/components";
import { createSponsorDocument, deleteSponsorDocument } from "../actions";
import type { SponsorDocument } from "../queries";

export function SponsorDocsManager({
  sponsorId,
  eventId,
  initialDocs,
}: {
  sponsorId: string;
  eventId: string;
  initialDocs: SponsorDocument[];
}) {
  const [docs, setDocs] = useState(initialDocs);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();

  async function handleAdd() {
    if (!title.trim() || !fileUrl.trim()) return;
    startTransition(async () => {
      try {
        const doc = await createSponsorDocument(sponsorId, eventId, {
          title: title.trim(),
          file_url: fileUrl.trim(),
        });
        setDocs([...docs, doc as SponsorDocument]);
        setAdding(false);
        setTitle("");
        setFileUrl("");
        toast.success("Document added");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add document");
      }
    });
  }

  async function handleDelete(doc: SponsorDocument) {
    const ok = await confirm({
      title: "Delete Document",
      description: `Delete "${doc.title}"? This action cannot be undone.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteSponsorDocument(sponsorId, eventId, doc.id);
        setDocs(docs.filter((d) => d.id !== doc.id));
        toast.success("Document deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete document");
      }
    });
  }

  return (
    <div className="space-y-4">
      {confirmDialog}

      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">Documents</h4>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add Document
        </Button>
      </div>

      {adding && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title *</label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">File URL *</label>
            <Input
              type="url"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!title.trim() || !fileUrl.trim() || isPending}
              onClick={handleAdd}
              loading={isPending}
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {docs.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground">No documents yet.</p>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{doc.title}</p>
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:underline truncate block"
                  >
                    {doc.file_url}
                  </a>
                </div>
              </div>
              <button
                onClick={() => handleDelete(doc)}
                disabled={isPending}
                className="rounded p-1 hover:bg-destructive/10 sm:invisible sm:group-hover:visible"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
