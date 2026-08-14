"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Globe,
  RotateCcw,
  Download,
  MessageSquare,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { Button, Card, CardContent, ModalOverlay, useConfirm } from "@attendly/ui/components";
import type { DiscussionTopic, PastEventTopicGroup } from "@/features/discussion-topics/queries";
import {
  deleteTopic,
  toggleTopicVisibility,
  fetchPastTopics,
  importTopics,
} from "@/features/discussion-topics/actions";
import { TopicComposer } from "./topic-composer";
import { toast } from "sonner";

interface DiscussionTopicsPageClientProps {
  eventId: string;
  customTopics: DiscussionTopic[];
  builtInTopics: DiscussionTopic[];
  total: number;
}

export function DiscussionTopicsPageClient({
  eventId,
  customTopics,
  builtInTopics,
  total,
}: DiscussionTopicsPageClientProps) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<DiscussionTopic | null>(null);
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();

  // Reuse past topics state
  const [reuseOpen, setReuseOpen] = useState(false);
  const [reuseLoading, setReuseLoading] = useState(false);
  const [pastGroups, setPastGroups] = useState<PastEventTopicGroup[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);

  function openComposerEmpty() {
    setEditDraft(null);
    setComposerOpen(true);
  }

  function handleEdit(topic: DiscussionTopic) {
    setEditDraft(topic);
    setComposerOpen(true);
  }

  function handleComposerClose() {
    setComposerOpen(false);
    setEditDraft(null);
  }

  async function handleDelete(topic: DiscussionTopic) {
    const ok = await confirm({
      title: "Delete Topic",
      description:
        "Are you sure you want to delete this topic? This action cannot be undone.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteTopic(eventId, topic.id);
        toast.success("Topic deleted");
      } catch {
        toast.error("Failed to delete topic");
      }
    });
  }

  async function handleOpenReuse() {
    setReuseOpen(true);
    setReuseLoading(true);
    setSelectedTopics(new Set());
    try {
      const groups = await fetchPastTopics(eventId);
      setPastGroups(groups);
    } catch {
      toast.error("Failed to load past topics");
      setReuseOpen(false);
    } finally {
      setReuseLoading(false);
    }
  }

  function toggleTopicSelection(key: string) {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleImportSelected() {
    const topicsToImport: { title: string; description: string | null }[] = [];
    for (const group of pastGroups) {
      for (const topic of group.topics) {
        const key = `${group.eventId}::${topic.title}`;
        if (selectedTopics.has(key)) {
          topicsToImport.push(topic);
        }
      }
    }
    if (topicsToImport.length === 0) return;

    setIsImporting(true);
    try {
      await importTopics(eventId, topicsToImport);
      toast.success(`Imported ${topicsToImport.length} topic${topicsToImport.length > 1 ? "s" : ""}`);
      setReuseOpen(false);
    } catch {
      toast.error("Failed to import topics");
    } finally {
      setIsImporting(false);
    }
  }

  function handleToggleVisibility(topic: DiscussionTopic) {
    startTransition(async () => {
      try {
        await toggleTopicVisibility(eventId, topic.id, !topic.is_visible);
        toast.success(
          topic.is_visible ? "Topic hidden" : "Topic shown"
        );
      } catch {
        toast.error("Failed to update topic visibility");
      }
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Discussion Topics</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create topics for your attendees to discuss on the Community Board.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-xs text-muted-foreground">Custom topics</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={openComposerEmpty}>
          <Plus className="mr-2 h-4 w-4" />
          Create topic
        </Button>
        <Button variant="outline" disabled title="Coming soon">
          <Globe className="mr-2 h-4 w-4" />
          From other organizers
        </Button>
        <Button variant="outline" onClick={handleOpenReuse}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reuse past topic
        </Button>
        <Button variant="outline" disabled title="Coming soon">
          <Download className="mr-2 h-4 w-4" />
          Download all posts
        </Button>
      </div>

      {/* Custom topics section */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold">Custom topics</h3>

        {customTopics.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/20 py-12 text-center">
            <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              No custom topics yet. Create one to start discussions!
            </p>
          </div>
        ) : (
          <div className="rounded-xl border">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Topic</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {customTopics.map((topic) => (
                  <tr key={topic.id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-sm font-medium">
                      {topic.title}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(topic)}
                          aria-label="Edit"
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(topic)}
                          disabled={isPending}
                          className="text-destructive hover:text-destructive"
                          aria-label="Delete"
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          {isPending ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Built-in topics section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">Built-in topics</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            These topics are built-in and specially-formatted to address the
            topic needs.
          </p>
        </div>

        <div className="rounded-xl border">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="px-4 py-3 font-medium">Topic</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {builtInTopics.map((topic) => (
                <tr
                  key={topic.id}
                  className={`border-b last:border-0 ${
                    !topic.is_visible ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-sm font-medium">
                    {topic.title}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleVisibility(topic)}
                      disabled={isPending}
                      aria-label={topic.is_visible ? "Hide" : "Show"}
                    >
                      {topic.is_visible ? (
                        <>
                          <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                          Hide
                        </>
                      ) : (
                        <>
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          Show
                        </>
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <TopicComposer
        eventId={eventId}
        open={composerOpen}
        onClose={handleComposerClose}
        draft={editDraft}
      />

      {confirmDialog}

      {reuseOpen && (
        <ModalOverlay onClose={() => setReuseOpen(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4 rounded-xl bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Reuse Past Topics</h3>
            <p className="text-sm text-muted-foreground">
              Select topics from your past events to import into this event.
            </p>

            {reuseLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : pastGroups.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/20 py-8 text-center">
                <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No custom topics found from other events in this organization.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pastGroups.map((group) => (
                  <div key={group.eventId} className="space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground">
                      {group.eventTitle}
                    </h4>
                    <div className="space-y-1">
                      {group.topics.map((topic) => {
                        const key = `${group.eventId}::${topic.title}`;
                        return (
                          <label
                            key={key}
                            className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedTopics.has(key)}
                              onChange={() => toggleTopicSelection(key)}
                              className="mt-0.5 h-4 w-4 rounded border-border"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{topic.title}</p>
                              {topic.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                  {topic.description}
                                </p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setReuseOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImportSelected}
                disabled={selectedTopics.size === 0 || isImporting || reuseLoading}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="mr-1.5 h-4 w-4" />
                    Import selected ({selectedTopics.size})
                  </>
                )}
              </Button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
