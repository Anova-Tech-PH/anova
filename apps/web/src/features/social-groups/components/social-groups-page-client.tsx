"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Globe,
  RotateCcw,
  Download,
  Users,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";
import { Button, Card, CardContent, useConfirm } from "@attendly/ui/components";
import type { SocialGroup } from "@/features/social-groups/queries";
import { deleteGroup } from "@/features/social-groups/actions";
import { GroupComposer } from "./group-composer";
import { toast } from "sonner";

interface SocialGroupsPageClientProps {
  eventId: string;
  groups: SocialGroup[];
  total: number;
}

export function SocialGroupsPageClient({
  eventId,
  groups,
  total,
}: SocialGroupsPageClientProps) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<SocialGroup | null>(null);
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const pathname = usePathname();
  const basePath = pathname.slice(0, pathname.indexOf(`/events/${eventId}`) + `/events/${eventId}`.length);

  function openComposerEmpty() {
    setEditDraft(null);
    setComposerOpen(true);
  }

  function handleEdit(group: SocialGroup) {
    setEditDraft(group);
    setComposerOpen(true);
  }

  function handleComposerClose() {
    setComposerOpen(false);
    setEditDraft(null);
  }

  async function handleDelete(group: SocialGroup) {
    const ok = await confirm({
      title: "Delete Group",
      description:
        "Are you sure you want to delete this group? This action cannot be undone.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteGroup(eventId, group.id);
        toast.success("Group deleted");
      } catch {
        toast.error("Failed to delete group");
      }
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Social Groups</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Large groups can be overwhelming. Creating small groups in the
          community board will help attendees find people of similar background
          or interests.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-xs text-muted-foreground">Social groups</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={openComposerEmpty}>
          <Plus className="mr-2 h-4 w-4" />
          Create group
        </Button>
        <Button variant="outline" disabled title="Coming soon">
          <Globe className="mr-2 h-4 w-4" />
          From other organizers
        </Button>
        <Button variant="outline" disabled title="Coming soon">
          <RotateCcw className="mr-2 h-4 w-4" />
          Reuse past group
        </Button>
        <Button variant="outline" disabled title="Coming soon">
          <Download className="mr-2 h-4 w-4" />
          Download all posts
        </Button>
      </div>

      <div className="space-y-4">
        {groups.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/20 py-12 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              What do your attendees have in common? Create social groups to
              help attendees find others with similar interests!
            </p>
          </div>
        ) : (
          <div className="rounded-xl border">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Group</th>
                  <th className="px-4 py-3 font-medium">Members</th>
                  <th className="px-4 py-3 font-medium">Posts</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-sm font-medium">
                      {group.title}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {group.member_count} members
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {group.post_count} posts
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`${basePath}/social-groups/${group.id}`}
                          aria-label="View"
                          className="inline-flex items-center justify-center rounded-lg text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm h-8 px-3"
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          View
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(group)}
                          aria-label="Edit"
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(group)}
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

      <GroupComposer
        eventId={eventId}
        open={composerOpen}
        onClose={handleComposerClose}
        draft={editDraft}
      />

      {confirmDialog}
    </div>
  );
}
