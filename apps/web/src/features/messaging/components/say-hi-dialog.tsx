"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { Avatar, Button, ModalOverlay } from "@attendly/ui/components";
import { sendMessage } from "@/features/messaging/actions";
import { toast } from "sonner";

interface SayHiDialogProps {
  eventId: string;
  recipientId: string;
  recipientName: string;
  recipientAvatarUrl: string | null;
  open: boolean;
  onClose: () => void;
}

export function SayHiDialog({
  eventId,
  recipientId,
  recipientName,
  recipientAvatarUrl,
  open,
  onClose,
}: SayHiDialogProps) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSend() {
    if (!message.trim()) return;
    startTransition(async () => {
      try {
        await sendMessage(eventId, recipientId, message);
        toast.success(`Message sent to ${recipientName}`);
        setMessage("");
        onClose();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to send message"
        );
      }
    });
  }

  if (!open) return null;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <Avatar
            src={recipientAvatarUrl}
            name={recipientName}
            size="lg"
          />
          <div>
            <h3 className="text-lg font-semibold">Say Hi</h3>
            <p className="text-sm text-muted-foreground">
              Send a message to {recipientName}
            </p>
          </div>
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Write a message to ${recipientName}...`}
          rows={4}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
          autoFocus
        />

        <div className="flex items-center justify-between gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isPending || !message.trim()}
          >
            <Send className="mr-1.5 h-4 w-4" />
            {isPending ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}
