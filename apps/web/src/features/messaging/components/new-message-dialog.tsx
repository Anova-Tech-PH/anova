"use client";

import { useState, useTransition } from "react";
import { Search, Send, ArrowLeft } from "lucide-react";
import { Avatar, Button, ModalOverlay } from "@attendly/ui/components";
import { sendMessage } from "@/features/messaging/actions";
import { toast } from "sonner";

interface Attendee {
  id: string;
  display_name: string;
  avatar_url: string | null;
  title: string | null;
  company: string | null;
}

interface NewMessageDialogProps {
  eventId: string;
  attendees: Attendee[];
  open: boolean;
  onClose: () => void;
}

export function NewMessageDialog({
  eventId,
  attendees,
  open,
  onClose,
}: NewMessageDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<Attendee | null>(
    null
  );
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  const filtered = searchQuery.trim()
    ? attendees.filter((a) =>
        a.display_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : attendees;

  function handleSelectRecipient(attendee: Attendee) {
    setSelectedRecipient(attendee);
    setSearchQuery("");
  }

  function handleBack() {
    setSelectedRecipient(null);
    setMessage("");
  }

  function handleClose() {
    setSelectedRecipient(null);
    setMessage("");
    setSearchQuery("");
    onClose();
  }

  function handleSend() {
    if (!selectedRecipient || !message.trim()) return;
    startTransition(async () => {
      try {
        await sendMessage(eventId, selectedRecipient.id, message.trim());
        toast.success(`Message sent to ${selectedRecipient.display_name}`);
        handleClose();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to send message"
        );
      }
    });
  }

  return (
    <ModalOverlay onClose={handleClose}>
      <div className="w-full max-w-md rounded-xl bg-card shadow-xl">
        {selectedRecipient ? (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="rounded-md p-1.5 transition-colors hover:bg-accent"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <Avatar
                src={selectedRecipient.avatar_url}
                name={selectedRecipient.display_name}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold truncate">
                  {selectedRecipient.display_name}
                </h3>
                {(selectedRecipient.title || selectedRecipient.company) && (
                  <p className="text-xs text-muted-foreground truncate">
                    {[selectedRecipient.title, selectedRecipient.company]
                      .filter(Boolean)
                      .join(" @ ")}
                  </p>
                )}
              </div>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a message..."
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />

            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" onClick={handleClose}>
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
        ) : (
          <div>
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-lg font-semibold">New Message</h2>
              <button
                onClick={handleClose}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>

            <div className="relative px-5 py-3">
              <Search className="absolute left-8 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search attendees..."
                className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-border">
              {filtered.length > 0 ? (
                filtered.map((attendee) => {
                  const subtitle = [attendee.title, attendee.company]
                    .filter(Boolean)
                    .join(" @ ");
                  return (
                    <button
                      key={attendee.id}
                      onClick={() => handleSelectRecipient(attendee)}
                      className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-accent/50"
                    >
                      <Avatar
                        src={attendee.avatar_url}
                        name={attendee.display_name}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {attendee.display_name}
                        </p>
                        {subtitle && (
                          <p className="text-xs text-muted-foreground truncate">
                            {subtitle}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No attendees found.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
