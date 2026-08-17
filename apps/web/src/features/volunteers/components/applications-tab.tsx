"use client";

import { useState, useTransition } from "react";
import {
  Button,
  Card,
  CardContent,
  Input,
  ModalOverlay,
  useConfirm,
} from "@attendly/ui/components";
import {
  Check,
  X,
  Search,
  Eye,
  UserCheck,
  UserX,
  Clock,
  ChevronDown,
  Calendar,
  Mail,
  Phone,
  Building2,
  Plus,
  Trash2,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import type {
  VolunteerApplication,
  VolunteerRole,
  VolunteerBreakdown,
} from "../queries";
import {
  fetchApplication,
  updateApplicationStatus,
  bulkUpdateStatus,
  addOrganizerNotes,
  assignRole,
  unassignRole,
} from "../actions";

interface ApplicationsTabProps {
  eventId: string;
  applications: VolunteerApplication[];
  total: number;
  roles: VolunteerRole[];
  breakdown: VolunteerBreakdown;
  applicationUrl: string | null;
  onSwitchToInvitations: () => void;
}

export function ApplicationsTab({
  eventId,
  applications: initialApplications,
  total,
  roles,
  breakdown,
  applicationUrl,
  onSwitchToInvitations,
}: ApplicationsTabProps) {
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailApp, setDetailApp] = useState<VolunteerApplication | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [notes, setNotes] = useState("");

  // Client-side filtering (server already filtered, but we can do local search too)
  const filteredApps = initialApplications.filter((app) => {
    if (statusFilter && app.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !app.name.toLowerCase().includes(q) &&
        !app.email.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filteredApps.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredApps.map((a) => a.id)));
    }
  }

  async function handleViewDetail(applicationId: string) {
    const app = await fetchApplication(applicationId);
    if (app) {
      setDetailApp(app);
      setNotes(app.notes ?? "");
      setShowDetail(true);
    }
  }

  function handleStatusChange(
    applicationId: string,
    status: "accepted" | "rejected"
  ) {
    startTransition(async () => {
      try {
        await updateApplicationStatus(eventId, applicationId, status);
        toast.success(`Application ${status}`);
        setShowDetail(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update");
      }
    });
  }

  async function handleBulkAction(status: "accepted" | "rejected") {
    const count = selected.size;
    const action = status === "accepted" ? "accept" : "reject";
    const ok = await confirm({
      title: `Bulk ${action} ${count} applications?`,
      description: `This will ${action} ${count} selected applications and send notification emails.`,
      confirmLabel: `${action.charAt(0).toUpperCase() + action.slice(1)} All`,
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await bulkUpdateStatus(eventId, Array.from(selected), status);
        toast.success(`${count} applications ${status}`);
        setSelected(new Set());
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update");
      }
    });
  }

  function handleSaveNotes() {
    if (!detailApp) return;
    startTransition(async () => {
      try {
        await addOrganizerNotes(eventId, detailApp.id, notes);
        toast.success("Notes saved");
      } catch (err) {
        toast.error("Failed to save notes");
      }
    });
  }

  function handleAssignRole(roleId: string) {
    if (!detailApp) return;
    startTransition(async () => {
      try {
        await assignRole(eventId, detailApp.id, roleId);
        // Refresh detail
        const refreshed = await fetchApplication(detailApp.id);
        if (refreshed) setDetailApp(refreshed);
        toast.success("Role assigned");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to assign role");
      }
    });
  }

  function handleUnassignRole(roleId: string) {
    if (!detailApp) return;
    startTransition(async () => {
      try {
        await unassignRole(eventId, detailApp.id, roleId);
        const refreshed = await fetchApplication(detailApp.id);
        if (refreshed) setDetailApp(refreshed);
        toast.success("Role removed");
      } catch (err) {
        toast.error("Failed to remove role");
      }
    });
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      accepted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: breakdown.total, icon: UserCheck, color: "primary" },
          { label: "Pending", value: breakdown.pending, icon: Clock, color: "yellow" },
          { label: "Accepted", value: breakdown.accepted, icon: Check, color: "green" },
          { label: "Rejected", value: breakdown.rejected, icon: X, color: "red" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-${stat.color}-100 dark:bg-${stat.color}-900/30`}>
                <stat.icon className={`h-5 w-5 text-${stat.color}-600 dark:text-${stat.color}-400`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Role Breakdown */}
      {breakdown.byRole.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="mb-3 text-sm font-semibold">Volunteer Breakdown by Role</h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {breakdown.byRole.map((r) => (
                <div key={r.role_id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <span className="text-sm">{r.role_name}</span>
                  <span className="text-sm font-semibold">{r.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters + Bulk Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>

        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selected.size} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction("accepted")}
              disabled={isPending}
            >
              <Check className="mr-1 h-3.5 w-3.5" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction("rejected")}
              disabled={isPending}
              className="text-destructive"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Reject
            </Button>
          </div>
        )}
      </div>

      {/* Applications Table */}
      {filteredApps.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 py-12 text-center text-sm text-muted-foreground">
          {initialApplications.length === 0 ? (
            <div className="space-y-3">
              <p>No applications yet. Share the portal link or send invitations to start recruiting.</p>
              <div className="flex justify-center gap-2">
                {applicationUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(applicationUrl);
                      toast.success("Link copied to clipboard");
                    }}
                  >
                    Copy Portal Link
                  </Button>
                )}
                <Button size="sm" onClick={onSwitchToInvitations}>
                  <Send className="mr-1 h-3.5 w-3.5" />
                  Send Invitations
                </Button>
              </div>
            </div>
          ) : (
            "No applications match your filters."
          )}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selected.size === filteredApps.length && filteredApps.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Email</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Organization</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Applied</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.map((app) => (
                <tr
                  key={app.id}
                  className="border-b last:border-b-0 hover:bg-muted/20"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(app.id)}
                      onChange={() => toggleSelect(app.id)}
                      className="h-4 w-4 rounded border"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{app.name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {app.email}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {app.organization ?? "—"}
                  </td>
                  <td className="px-4 py-3">{statusBadge(app.status)}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {new Date(app.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetail(app.id)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {app.status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(app.id, "accepted")}
                            disabled={isPending}
                          >
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(app.id, "rejected")}
                            disabled={isPending}
                          >
                            <X className="h-3.5 w-3.5 text-red-600" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Slide-over */}
      {showDetail && detailApp && (
      <ModalOverlay onClose={() => setShowDetail(false)}>
          <div className="space-y-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{detailApp.name}</h3>
                {statusBadge(detailApp.status)}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetail(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Contact Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {detailApp.email}
              </div>
              {detailApp.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {detailApp.phone}
                </div>
              )}
              {detailApp.organization && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {detailApp.organization}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Applied{" "}
                {new Date(detailApp.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>

            {/* Role Preferences */}
            {detailApp.role_preferences && detailApp.role_preferences.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold">Role Preferences</h4>
                <div className="flex flex-wrap gap-2">
                  {detailApp.role_preferences.map((r) => (
                    <span
                      key={r.id}
                      className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                    >
                      {r.role_name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Availability */}
            {detailApp.availability && detailApp.availability.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold">Availability</h4>
                <div className="space-y-1">
                  {detailApp.availability.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm"
                    >
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {new Date(a.available_date + "T00:00:00").toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                      {a.start_time && a.end_time && (
                        <span className="text-muted-foreground">
                          {a.start_time.slice(0, 5)} – {a.end_time.slice(0, 5)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Answers */}
            {detailApp.answers && detailApp.answers.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold">Application Answers</h4>
                <div className="space-y-3">
                  {detailApp.answers.map((a) => (
                    <div key={a.id}>
                      <p className="text-sm font-medium">{a.question_text}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {a.answer_text || "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Role Assignments (for accepted volunteers) */}
            {detailApp.status === "accepted" && (
              <div>
                <h4 className="mb-2 text-sm font-semibold">Assigned Roles</h4>
                <div className="space-y-2">
                  {(detailApp.role_assignments ?? []).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-lg bg-green-50 dark:bg-green-900/20 px-3 py-2"
                    >
                      <span className="text-sm font-medium">{a.role_name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnassignRole(a.role_id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {/* Add role */}
                  {roles.filter(
                    (r) =>
                      !(detailApp.role_assignments ?? []).some(
                        (a) => a.role_id === r.id
                      )
                  ).length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) handleAssignRole(e.target.value);
                        e.target.value = "";
                      }}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        + Assign a role...
                      </option>
                      {roles
                        .filter(
                          (r) =>
                            !(detailApp.role_assignments ?? []).some(
                              (a) => a.role_id === r.id
                            )
                        )
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              </div>
            )}

            {/* Organizer Notes */}
            <div>
              <h4 className="mb-2 text-sm font-semibold">Organizer Notes</h4>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add private notes about this applicant..."
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
              <div className="mt-2 flex justify-end">
                <Button size="sm" onClick={handleSaveNotes} disabled={isPending}>
                  Save Notes
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            {detailApp.status === "pending" && (
              <div className="flex gap-2 border-t pt-4">
                <Button
                  className="flex-1"
                  onClick={() => handleStatusChange(detailApp.id, "accepted")}
                  disabled={isPending}
                >
                  <Check className="mr-1 h-4 w-4" />
                  Accept
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-destructive"
                  onClick={() => handleStatusChange(detailApp.id, "rejected")}
                  disabled={isPending}
                >
                  <X className="mr-1 h-4 w-4" />
                  Reject
                </Button>
              </div>
            )}
          </div>
      </ModalOverlay>
      )}

      {confirmDialog}
    </div>
  );
}
