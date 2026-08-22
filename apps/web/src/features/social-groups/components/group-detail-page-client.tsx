"use client";

import { useTransition } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { Button, Card, CardContent, useConfirm } from "@attendly/ui/components";
import type { SocialGroup, SocialGroupPost, GroupMember } from "@/features/social-groups/queries";
import { deleteGroupPost } from "@/features/social-groups/actions";
import { toast } from "sonner";

interface GroupDetailPageClientProps {
  eventId: string;
  group: SocialGroup;
  posts: SocialGroupPost[];
  members: GroupMember[];
}

export function GroupDetailPageClient({
  eventId,
  group,
  posts,
  members,
}: GroupDetailPageClientProps) {
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const pathname = usePathname();
  const basePath = pathname.slice(0, pathname.indexOf(`/events/${eventId}`) + `/events/${eventId}`.length);

  async function handleDeletePost(postId: string) {
    const ok = await confirm({
      title: "Delete Post",
      description: "Are you sure you want to delete this post?",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteGroupPost(eventId, group.id, postId);
        toast.success("Post deleted");
      } catch {
        toast.error("Failed to delete post");
      }
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`${basePath}/social-groups`}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Social Groups
        </Link>
        <h2 className="text-lg font-semibold">{group.title}</h2>
        {group.description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {group.description}
          </p>
        )}
        {group.prompt && (
          <p className="mt-2 text-sm italic text-muted-foreground">
            Prompt: &ldquo;{group.prompt}&rdquo;
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{group.member_count}</p>
              <p className="text-xs text-muted-foreground">Members</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{group.post_count}</p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members section */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold">Members</h3>
        {members.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/20 py-8 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No members have joined this group yet.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.user_id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-sm font-medium">
                      {member.profiles?.full_name ?? "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {member.profiles?.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(member.joined_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Posts section */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold">Posts</h3>
        {posts.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/20 py-8 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No posts in this group yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <Card key={post.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {post.author_name ?? post.author_email ?? "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(post.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm">{post.content}</p>
                      {post.comment_count > 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {post.comment_count} {post.comment_count === 1 ? "comment" : "comments"}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePost(post.id)}
                      disabled={isPending}
                      className="text-destructive hover:text-destructive shrink-0"
                      aria-label="Delete post"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {confirmDialog}
    </div>
  );
}
