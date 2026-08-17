"use client";

import { useState, useTransition } from "react";
import {
  Card,
  Input,
  Button,
  ModalOverlay,
  useConfirm,
} from "@attendly/ui/components";
import { ScanLine, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { EventAdmin } from "../queries";
import { addEventAdmin, removeEventAdmin } from "../actions";

export function CheckinStaffSection({
  eventId,
  checkInStaff,
}: {
  eventId: string;
  checkInStaff: EventAdmin[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();

  function handleAdd() {
    if (!email.trim()) return;
    startTransition(async () => {
      try {
        await addEventAdmin(eventId, email.trim(), "check_in");
        toast.success("Check-in staff added successfully");
        setEmail("");
        setShowAdd(false);
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to add check-in staff"
        );
      }
    });
  }

  async function handleRemove(staffId: string, staffName: string) {
    const ok = await confirm({
      title: "Remove Check-in Staff",
      description: `Remove ${staffName} from check-in staff?`,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await removeEventAdmin(staffId, eventId);
        toast.success("Check-in staff removed");
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to remove check-in staff"
        );
      }
    });
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-[oklch(0.445_0.107_195)]" />
            <h2 className="font-semibold">Check-in Staff</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            People listed here will be able to check people in at the event.
            They will not have access to any other admin tools.
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="shrink-0">
          <UserPlus className="mr-2 h-4 w-4" />
          Add Check-in Staff
        </Button>
      </div>

      {checkInStaff.length === 0 ? (
        <div className="px-6 py-12">
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border py-8 text-sm text-muted-foreground">
            No check-in staff added yet.
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left">
                <th className="px-6 py-3 font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-3 py-3 font-medium text-muted-foreground">
                  Email
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
              {checkInStaff.map((staff) => (
                <tr key={staff.id} className="hover:bg-muted/30">
                  <td className="px-6 py-3">
                    {staff.display_name ?? staff.email}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {staff.email}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {staff.added_by_name ?? "Unknown"}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() =>
                        handleRemove(
                          staff.id,
                          staff.display_name ?? staff.email
                        )
                      }
                      disabled={isPending}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      title="Remove staff"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <ModalOverlay onClose={() => setShowAdd(false)}>
          <Card className="w-full max-w-md p-6">
            <h2 className="mb-4 text-lg font-semibold">
              Add Check-in Staff
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@example.com"
                  disabled={isPending}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  This person will only be able to check attendees in. They
                  will not have access to any other admin tools.
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
