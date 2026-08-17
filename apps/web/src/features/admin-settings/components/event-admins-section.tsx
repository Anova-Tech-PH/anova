"use client";

import { useState, useTransition } from "react";
import {
  Card,
  Input,
  Button,
  ModalOverlay,
  useConfirm,
} from "@attendly/ui/components";
import { Shield, Crown, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { EventAdmin, OrgAdmin } from "../queries";
import {
  addEventAdmin,
  updateEventAdminRole,
  removeEventAdmin,
} from "../actions";

export function EventAdminsSection({
  eventId,
  eventAdmins,
  orgAdmins,
}: {
  eventId: string;
  eventAdmins: EventAdmin[];
  orgAdmins: OrgAdmin[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const admins = eventAdmins.filter((a) => a.role === "admin");

  function handleAdd() {
    if (!email.trim()) return;
    startTransition(async () => {
      try {
        await addEventAdmin(eventId, email.trim(), "admin");
        toast.success("Admin added successfully");
        setEmail("");
        setShowAdd(false);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to add admin"
        );
      }
    });
  }

  function handleRoleChange(adminId: string, newRole: string) {
    startTransition(async () => {
      try {
        await updateEventAdminRole(adminId, eventId, newRole);
        toast.success("Role updated");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update role"
        );
      }
    });
  }

  async function handleRemove(adminId: string, adminName: string) {
    const ok = await confirm({
      title: "Remove Admin",
      description: `Remove ${adminName} from event admins?`,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await removeEventAdmin(adminId, eventId);
        toast.success("Admin removed");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to remove admin"
        );
      }
    });
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[oklch(0.445_0.107_195)]" />
            <h2 className="font-semibold">Admins</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Admins have full access to manage this event, including editing
            details, managing attendees, and configuring settings.
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="shrink-0">
          <UserPlus className="mr-2 h-4 w-4" />
          Add Admin
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-left">
              <th className="w-10 px-6 py-3" />
              <th className="px-3 py-3 font-medium text-muted-foreground">
                Name
              </th>
              <th className="px-3 py-3 font-medium text-muted-foreground">
                Email address
              </th>
              <th className="px-3 py-3 font-medium text-muted-foreground">
                Added by
              </th>
              <th className="px-3 py-3 font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orgAdmins.map((oa) => (
              <tr
                key={`org-${oa.id}`}
                className="text-muted-foreground"
              >
                <td className="px-6 py-3">
                  <Crown className="h-4 w-4 text-amber-500" />
                </td>
                <td className="px-3 py-3">
                  {oa.display_name ?? "Unknown"}
                </td>
                <td className="px-3 py-3 text-muted-foreground">--</td>
                <td className="px-3 py-3">Organization</td>
                <td className="px-3 py-3 text-xs text-muted-foreground">
                  (org-level)
                </td>
              </tr>
            ))}
            {admins.map((admin) => (
              <tr key={admin.id} className="hover:bg-muted/30">
                <td className="px-6 py-3">
                  <Shield className="h-4 w-4 text-blue-500" />
                </td>
                <td className="px-3 py-3">
                  {admin.display_name ?? admin.email}
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {admin.email}
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {admin.added_by_name ?? "Unknown"}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={admin.role}
                      onChange={(e) =>
                        handleRoleChange(admin.id, e.target.value)
                      }
                      disabled={isPending}
                      className="rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[oklch(0.445_0.107_195)]/50"
                    >
                      <option value="admin">Admin</option>
                      <option value="check_in">Check-in</option>
                    </select>
                    <button
                      onClick={() =>
                        handleRemove(
                          admin.id,
                          admin.display_name ?? admin.email
                        )
                      }
                      disabled={isPending}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      title="Remove admin"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {orgAdmins.length === 0 && admins.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-muted-foreground"
                >
                  No admins added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <ModalOverlay onClose={() => setShowAdd(false)}>
          <Card className="w-full max-w-md p-6">
            <h2 className="mb-4 text-lg font-semibold">Add Admin</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  disabled={isPending}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  The user must have an existing account.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAdd(false);
                    setEmail("");
                  }}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={isPending || !email.trim()}
                >
                  {isPending ? "Adding..." : "Add"}
                </Button>
              </div>
            </div>
          </Card>
        </ModalOverlay>
      )}

      {confirmDialog}
    </Card>
  );
}
