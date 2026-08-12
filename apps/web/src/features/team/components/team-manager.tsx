"use client";

import { useState, useTransition } from "react";
import {
  Button,
  Input,
  Card,
  Badge,
  ModalOverlay,
  useConfirm,
} from "@attendly/ui/components";
import { UserPlus, Trash2, Users, Crown, Shield, Edit3, ScanLine, Eye } from "lucide-react";
import type { TeamMember } from "../queries";
import {
  inviteTeamMember,
  updateMemberRole,
  removeMember,
} from "../actions";

const ROLE_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  owner: {
    label: "Owner",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    icon: <Crown className="h-3 w-3" />,
  },
  admin: {
    label: "Admin",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: <Shield className="h-3 w-3" />,
  },
  editor: {
    label: "Editor",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    icon: <Edit3 className="h-3 w-3" />,
  },
  check_in: {
    label: "Check-in",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    icon: <ScanLine className="h-3 w-3" />,
  },
  viewer: {
    label: "Viewer",
    color: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
    icon: <Eye className="h-3 w-3" />,
  },
};

const ASSIGNABLE_ROLES = ["admin", "editor", "check_in", "viewer"];

function RoleBadge({ role }: { role: string }) {
  const config = ROLE_CONFIG[role] ?? ROLE_CONFIG.viewer;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function TeamManager({
  members,
  orgId,
  currentUserId,
  currentUserRole,
}: {
  members: TeamMember[];
  orgId: string;
  currentUserId: string;
  currentUserRole: string;
}) {
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  const canManage =
    currentUserRole === "owner" || currentUserRole === "admin";

  function handleInvite() {
    if (!email.trim()) return;
    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        await inviteTeamMember(orgId, email.trim(), inviteRole);
        setSuccessMsg("Member invited successfully!");
        setEmail("");
        setInviteRole("viewer");
        setShowInvite(false);
        setTimeout(() => setSuccessMsg(null), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to invite member");
      }
    });
  }

  function handleRoleChange(memberId: string, newRole: string) {
    setError(null);
    startTransition(async () => {
      try {
        await updateMemberRole(orgId, memberId, newRole);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update role"
        );
      }
    });
  }

  async function handleRemove(memberId: string, memberName: string) {
    const ok = await confirm({
      title: "Remove Team Member",
      description: `Remove ${memberName} from the team?`,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      try {
        await removeMember(orgId, memberId);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to remove member"
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Team</h1>
          <p className="text-sm text-muted-foreground">
            Manage your organization&apos;s team members and their roles.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowInvite(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="rounded-lg border border-green-500/50 bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-300">
          {successMsg}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[oklch(0.445_0.107_195)]" />
            <h2 className="font-semibold">
              Members ({members.length})
            </h2>
          </div>
        </div>

        <div className="divide-y divide-border">
          {members.map((member) => {
            const isCurrentUser = member.user_id === currentUserId;
            const isOwner = member.role === "owner";

            return (
              <div
                key={member.id}
                className={`flex items-center gap-4 px-6 py-4 transition-colors ${
                  isCurrentUser
                    ? "bg-[oklch(0.445_0.107_195)]/5"
                    : "hover:bg-muted/30"
                }`}
              >
                {/* Avatar */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[oklch(0.445_0.107_195)]/10 text-sm font-semibold text-[oklch(0.445_0.107_195)]">
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    getInitials(member.name)
                  )}
                </div>

                {/* Name & email */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">
                      {member.name}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (you)
                        </span>
                      )}
                    </p>
                  </div>
                  {member.email && (
                    <p className="truncate text-sm text-muted-foreground">
                      {member.email}
                    </p>
                  )}
                </div>

                {/* Role badge or selector */}
                <div className="flex items-center gap-3">
                  {canManage && !isOwner && !isCurrentUser ? (
                    <select
                      value={member.role}
                      onChange={(e) =>
                        handleRoleChange(member.id, e.target.value)
                      }
                      disabled={isPending}
                      className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[oklch(0.445_0.107_195)]/50"
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_CONFIG[r].label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <RoleBadge role={member.role} />
                  )}

                  {/* Joined date */}
                  <span className="hidden text-xs text-muted-foreground sm:block">
                    Joined {formatDate(member.created_at)}
                  </span>

                  {/* Remove button */}
                  {canManage && !isOwner && !isCurrentUser && (
                    <button
                      onClick={() => handleRemove(member.id, member.name)}
                      disabled={isPending}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      title="Remove member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {members.length === 0 && (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              No team members found.
            </div>
          )}
        </div>
      </Card>

      {/* Invite Modal */}
      {showInvite && (
        <ModalOverlay onClose={() => setShowInvite(false)}>
          <Card className="w-full max-w-md p-6">
            <h2 className="mb-4 text-lg font-semibold">Invite Team Member</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  disabled={isPending}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  The user must have an existing account.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[oklch(0.445_0.107_195)]/50"
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_CONFIG[r].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role descriptions */}
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p><strong>Admin</strong> — Full access, can manage team</p>
                <p><strong>Editor</strong> — Can create and edit events</p>
                <p><strong>Check-in</strong> — Can manage event check-ins</p>
                <p><strong>Viewer</strong> — Read-only access</p>
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowInvite(false);
                    setError(null);
                  }}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={isPending || !email.trim()}
                >
                  {isPending ? "Inviting..." : "Send Invite"}
                </Button>
              </div>
            </div>
          </Card>
        </ModalOverlay>
      )}

      {confirmDialog}
    </div>
  );
}
