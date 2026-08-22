"use client";

import { useState } from "react";
import { Button, Input, useConfirm } from "@attendly/ui/components";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteOrganization } from "../actions";

export function DeleteOrgSection({
  orgId,
  orgName,
  eventCount,
}: {
  orgId: string;
  orgName: string;
  eventCount: number;
}) {
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const { confirm, dialog } = useConfirm();

  const hasEvents = eventCount > 0;
  const nameMatches = confirmName.trim().toLowerCase() === orgName.trim().toLowerCase();

  async function handleDelete() {
    if (!nameMatches) return;

    const ok = await confirm({
      title: "Delete organization permanently?",
      description: `This will permanently delete "${orgName}" and all associated data. This action cannot be undone.`,
      confirmLabel: "Delete forever",
      variant: "destructive",
    });

    if (!ok) return;

    setDeleting(true);
    try {
      await deleteOrganization(orgId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete organization");
      setDeleting(false);
    }
  }

  return (
    <>
      {dialog}
      <div className="rounded-xl border-2 border-destructive/40 bg-gradient-to-br from-destructive/5 to-destructive/10 p-6 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-destructive" />
          <h2 className="text-lg font-semibold">Delete Organization</h2>
        </div>

        {hasEvents ? (
          <p className="text-sm text-muted-foreground">
            This organization has {eventCount} event{eventCount !== 1 ? "s" : ""}. Delete
            all events before you can delete the organization.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Permanently delete this organization and all its data. This cannot be undone.
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium">
                Type <span className="font-semibold text-destructive">{orgName}</span> to
                confirm
              </label>
              <Input
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={orgName}
                className="max-w-sm"
              />
              <Button
                variant="destructive"
                disabled={!nameMatches || deleting}
                onClick={handleDelete}
              >
                {deleting ? "Deleting..." : "Delete organization"}
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
