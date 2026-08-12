"use client";

import { useState, useTransition } from "react";
import { Button, useConfirm } from "@attendly/ui/components";
import { FileText, Video, Plus, Pencil, Trash2 } from "lucide-react";
import { deleteDocument } from "@/features/documents/actions";
import { DocumentForm } from "./document-form";
import type { EventDocumentWithSession } from "@/features/documents/queries";
import { toast } from "sonner";

type Session = { id: string; title: string };

interface DocumentListProps {
  documents: EventDocumentWithSession[];
  eventId: string;
  sessions: Session[];
}

export function DocumentList({ documents, eventId, sessions }: DocumentListProps) {
  const [isPending, startTransition] = useTransition();
  const [formOpen, setFormOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<EventDocumentWithSession | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const eventLevelDocs = documents.filter((d) => !d.session_id);
  const sessionDocs = documents.filter((d) => d.session_id);

  function handleEdit(doc: EventDocumentWithSession) {
    setEditDoc(doc);
    setFormOpen(true);
  }

  async function handleDelete(docId: string) {
    const ok = await confirm({
      title: "Delete Document",
      description: "Are you sure you want to delete this document? This action cannot be undone.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteDocument(eventId, docId);
        toast.success("Document deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  function handleCloseForm() {
    setFormOpen(false);
    setEditDoc(null);
  }

  function renderRow(doc: EventDocumentWithSession) {
    const TypeIcon = doc.type === "video" ? Video : FileText;
    return (
      <tr key={doc.id} className="border-b last:border-b-0 hover:bg-muted/20 group">
        <td className="px-4 py-3">
          <TypeIcon className="h-4 w-4 text-muted-foreground" />
        </td>
        <td className="px-4 py-3 font-medium">{doc.title}</td>
        <td className="px-4 py-3 text-muted-foreground">
          {doc.session ? doc.session.title : "Event"}
        </td>
        <td className="px-4 py-3 text-muted-foreground">
          {doc.type === "file" ? (doc.file_type ?? "File") : "Video"}
        </td>
        <td className="px-4 py-3 text-right">
          <span className="flex items-center justify-end gap-1 sm:invisible sm:group-hover:visible">
            <button
              onClick={() => handleEdit(doc)}
              className="rounded p-1 hover:bg-muted"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={() => handleDelete(doc.id)}
              className="rounded p-1 hover:bg-destructive/10"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </button>
          </span>
        </td>
      </tr>
    );
  }

  return (
    <div className="space-y-6">
      {confirmDialog}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Documents &amp; Videos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Attach files and videos to your event or specific sessions.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Document
        </Button>
      </div>

      {documents.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 py-12 text-center text-muted-foreground">
          No documents yet. Click &quot;Add Document&quot; to get started.
        </div>
      ) : (
        <div className="space-y-6">
          {eventLevelDocs.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Event-Level
              </h3>
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="w-10 px-4 py-3" />
                      <th className="px-4 py-3 text-left font-medium">Title</th>
                      <th className="px-4 py-3 text-left font-medium">Attached to</th>
                      <th className="px-4 py-3 text-left font-medium">Type</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>{eventLevelDocs.map(renderRow)}</tbody>
                </table>
              </div>
            </div>
          )}

          {sessionDocs.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Session-Attached
              </h3>
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="w-10 px-4 py-3" />
                      <th className="px-4 py-3 text-left font-medium">Title</th>
                      <th className="px-4 py-3 text-left font-medium">Attached to</th>
                      <th className="px-4 py-3 text-left font-medium">Type</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>{sessionDocs.map(renderRow)}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <DocumentForm
        eventId={eventId}
        sessions={sessions}
        document={editDoc}
        open={formOpen}
        onClose={handleCloseForm}
      />
    </div>
  );
}
