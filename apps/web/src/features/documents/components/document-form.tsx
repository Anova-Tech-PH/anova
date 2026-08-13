"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { Button, Input, ModalOverlay } from "@attendly/ui/components";
import { createDocument, updateDocument } from "@/features/documents/actions";
import type { EventDocument } from "@/features/documents/queries";
import { toast } from "sonner";

type Session = { id: string; title: string };

interface DocumentFormProps {
  eventId: string;
  sessions: Session[];
  document?: EventDocument | null;
  open: boolean;
  onClose: () => void;
}

export function DocumentForm({ eventId, sessions, document, open, onClose }: DocumentFormProps) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"file" | "video">("file");
  const [fileUrl, setFileUrl] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [fileType, setFileType] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isEditing = !!document;

  useEffect(() => {
    if (open) {
      setTitle(document?.title ?? "");
      setType(document?.type ?? "file");
      setFileUrl(document?.file_url ?? "");
      setExternalUrl(document?.external_url ?? "");
      setFileType(document?.file_type ?? "");
      setSessionId(document?.session_id ?? "");
      setSortOrder(document?.sort_order ?? 0);
      setShowAdvanced(false);
    }
  }, [open, document]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    startTransition(async () => {
      try {
        const payload = {
          title,
          type,
          session_id: sessionId || null,
          file_url: type === "file" ? fileUrl || null : null,
          external_url: type === "video" ? externalUrl || null : null,
          file_type: type === "file" ? fileType || null : null,
          sort_order: sortOrder,
        };

        if (isEditing) {
          await updateDocument(eventId, document.id, payload);
          toast.success("Document updated");
        } else {
          await createDocument(eventId, payload);
          toast.success("Document created");
        }
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  if (!open) return null;

  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-5 rounded-xl bg-card p-6 shadow-xl">
        <h3 className="text-lg font-semibold">
          {isEditing ? "Edit Document" : "Upload Document"}
        </h3>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Title *</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Workshop Slides"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Type</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType("file")}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                type === "file"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              File
            </button>
            <button
              type="button"
              onClick={() => setType("video")}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                type === "video"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              Video
            </button>
          </div>
        </div>

        {type === "file" ? (
          <div>
            <label className="mb-1.5 block text-sm font-medium">File URL</label>
            <Input
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://example.com/slides.pdf"
            />
          </div>
        ) : (
          <div>
            <label className="mb-1.5 block text-sm font-medium">Video URL</label>
            <Input
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium">Attach to Session (optional)</label>
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Event-level (no session)</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
          Advanced options
        </button>

        {showAdvanced && (
          <div className="space-y-5">
            {type === "file" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">File Type</label>
                <Input
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value)}
                  placeholder="e.g. application/pdf"
                />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Sort Order</label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                min={0}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || !title.trim()}>
            {isPending ? "Saving..." : isEditing ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </ModalOverlay>
  );
}
