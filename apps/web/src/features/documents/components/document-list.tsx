"use client";

import { useState, useTransition } from "react";
import { Button, useConfirm } from "@attendly/ui/components";
import { FileText, Video, Pencil, Trash2, Upload, Plus, Download, ExternalLink } from "lucide-react";
import { deleteDocument } from "@/features/documents/actions";
import { DocumentForm } from "./document-form";
import type { EventDocumentWithSession } from "@/features/documents/queries";
import { toast } from "sonner";

type Session = { id: string; title: string };

const MIME_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.ms-powerpoint": "PowerPoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint",
  "application/vnd.ms-excel": "Excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
  "application/msword": "Word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
  "text/plain": "Text",
  "text/csv": "CSV",
  "image/png": "Image",
  "image/jpeg": "Image",
  "image/gif": "Image",
};

function friendlyFileType(mimeType: string | null): string {
  if (!mimeType) return "File";
  return MIME_LABELS[mimeType] ?? mimeType;
}

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

  function getDownloadHref(doc: EventDocumentWithSession) {
    const url = doc.file_url;
    if (!url) return "#";
    const urlExt = url.split("/").pop()?.split("?")[0]?.match(/\.\w+$/)?.[0] ?? "";
    const filename = doc.title + urlExt;
    return `/api/documents/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
  }

  function renderActions(doc: EventDocumentWithSession) {
    const hasFileUrl = doc.type === "file" && doc.file_url;
    const hasVideoUrl = doc.type === "video" && doc.external_url;
    return (
      <span className="flex items-center justify-end gap-1">
        {hasFileUrl && (
          <a
            href={getDownloadHref(doc)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded p-1 hover:bg-muted"
            title="Download"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
          </a>
        )}
        {hasVideoUrl && (
          <a
            href={doc.external_url!}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded p-1 hover:bg-muted"
            title="Open"
          >
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </a>
        )}
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
    );
  }

  function renderEventRow(doc: EventDocumentWithSession) {
    const TypeIcon = doc.type === "video" ? Video : FileText;
    return (
      <tr key={doc.id} className="border-b last:border-b-0 hover:bg-muted/20 group">
        <td className="px-4 py-3">
          <TypeIcon className="h-4 w-4 text-muted-foreground" />
        </td>
        <td className="px-4 py-3 font-medium">{doc.title}</td>
        <td className="px-4 py-3 text-muted-foreground">
          {doc.type === "file" ? friendlyFileType(doc.file_type) : "Video"}
        </td>
        <td className="px-4 py-3 text-right">{renderActions(doc)}</td>
      </tr>
    );
  }

  function renderSessionRow(doc: EventDocumentWithSession) {
    const TypeIcon = doc.type === "video" ? Video : FileText;
    return (
      <tr key={doc.id} className="border-b last:border-b-0 hover:bg-muted/20 group">
        <td className="px-4 py-3">
          <TypeIcon className="h-4 w-4 text-muted-foreground" />
        </td>
        <td className="px-4 py-3 font-medium">{doc.title}</td>
        <td className="px-4 py-3 text-muted-foreground">
          {doc.session?.title ?? "—"}
        </td>
        <td className="px-4 py-3 text-muted-foreground">
          {doc.type === "file" ? friendlyFileType(doc.file_type) : "Video"}
        </td>
        <td className="px-4 py-3 text-right">{renderActions(doc)}</td>
      </tr>
    );
  }

  return (
    <div className="space-y-6">
      {confirmDialog}

      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Documents</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload PDFs, slides, brochures, or handouts for attendees to access directly in the app. Track attendee engagement by views and downloads.
            </p>
          </div>
          <Button onClick={() => setFormOpen(true)} className="shrink-0">
            <Upload className="mr-1.5 h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">Upload docs and slides</span>
          </Button>
        </div>

        {/* Stats bar */}
        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-3 rounded-lg border bg-muted/20 px-4 py-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Documents uploaded</p>
              <p className="text-lg font-semibold">{documents.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Event documents */}
      <div>
        <h3 className="text-base font-semibold">Event documents</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          These files are not linked to specific sessions. They appear in the event app for all attendees.
        </p>
        {eventLevelDocs.length > 0 ? (
          <div className="mt-3 rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="w-10 px-4 py-3" />
                  <th className="px-4 py-3 text-left font-medium">Title</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>{eventLevelDocs.map(renderEventRow)}</tbody>
            </table>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed bg-muted/20 py-10 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">No event documents</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setFormOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Upload document
            </Button>
          </div>
        )}
      </div>

      {/* Session documents */}
      <div>
        <h3 className="text-base font-semibold">Session documents (listed in agenda)</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          These files are linked to sessions in your agenda. You can upload them here or manage them in the Agenda Center.
        </p>
        {sessionDocs.length > 0 ? (
          <div className="mt-3 rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="w-10 px-4 py-3" />
                  <th className="px-4 py-3 text-left font-medium">Title</th>
                  <th className="px-4 py-3 text-left font-medium">Session</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>{sessionDocs.map(renderSessionRow)}</tbody>
            </table>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed bg-muted/20 py-10 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">No agenda documents</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setFormOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Upload document
            </Button>
          </div>
        )}
      </div>

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
