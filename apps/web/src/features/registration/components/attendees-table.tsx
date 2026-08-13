"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Search,
  Download,
  Upload,
  UserPlus,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Users,
  Mail,
  UserCheck,
  MoreVertical,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@attendly/ui/components";
import { Card } from "@attendly/ui/components";
import { Input } from "@attendly/ui/components";
import { cn } from "@attendly/ui/cn";
import { addAttendee, importAttendees } from "../attendees-actions";

type Attendee = {
  id: string;
  name: string;
  email: string;
  title: string | null;
  company: string | null;
  category: string | null;
  status: string;
  user_id: string | null;
  created_at: string;
};

type AttendeeStats = {
  total: number;
  withEmail: number;
  signedIn: number;
};

type Props = {
  eventId: string;
  attendees: Attendee[];
  total: number;
  categories: string[];
  stats: AttendeeStats;
  page: number;
  pageSize: number;
};

export function AttendeesTable({
  eventId,
  attendees,
  total,
  categories,
  stats,
  page,
  pageSize,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const updateUrl = useCallback(
    (params: Record<string, string | undefined>) => {
      const sp = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(params)) {
        if (value) {
          sp.set(key, value);
        } else {
          sp.delete(key);
        }
      }
      // Reset to page 1 when filters change
      if ("search" in params || "category" in params) {
        sp.delete("page");
      }
      router.replace(`${pathname}?${sp.toString()}`);
    },
    [router, pathname, searchParams]
  );

  // Debounced search
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      if (search !== (searchParams.get("search") ?? "")) {
        updateUrl({ search: search || undefined });
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [search, searchParams, updateUrl]);

  function handleCategoryChange(value: string) {
    updateUrl({ category: value || undefined });
  }

  function handlePageChange(newPage: number) {
    updateUrl({ page: newPage > 1 ? String(newPage) : undefined });
  }

  function exportCsv() {
    const headers = ["Name", "Email", "Title", "Company", "Category", "Signed In"];
    const rows = attendees.map((a) => [
      a.name,
      a.email,
      a.title ?? "",
      a.company ?? "",
      a.category ?? "",
      a.user_id ? "Yes" : "No",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendees-${eventId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const statCards = [
    { label: "Total Attendees", value: stats.total, icon: Users },
    { label: "With Email", value: stats.withEmail, icon: Mail },
    { label: "Signed In", value: stats.signedIn, icon: UserCheck },
  ];

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
        {statCards.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="text-foreground">{s.label}:</span>
            <span className="text-lg font-semibold text-foreground">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="gap-2" onClick={() => setShowImportModal(true)}>
          <Upload className="h-4 w-4" />
          Import attendees
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => setShowAddModal(true)}>
          <UserPlus className="h-4 w-4" />
          Add an attendee
        </Button>
        <Button variant="outline" className="gap-2" onClick={exportCsv}>
          <Download className="h-4 w-4" />
          Export attendees
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => router.push(`/events/${eventId}/announcements`)}
        >
          <Megaphone className="h-4 w-4" />
          Send announcement
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={searchParams.get("category") ?? ""}
          onChange={(e) => handleCategoryChange(e.target.value)}
          aria-label="Category"
          role="combobox"
          className={cn(
            "h-9 appearance-none rounded-lg border bg-background pl-3 pr-9 text-sm",
            "outline-none transition-colors",
            "focus:ring-2 focus:ring-ring focus:ring-offset-1",
            "hover:border-foreground/30"
          )}
        >
          <option value="">All Attendees</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Enter name, email, company, titles, location or category"
            className="pl-9"
          />
        </div>
      </div>

      {/* Empty State */}
      {attendees.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border py-12 text-center shadow-sm">
          <Users className="h-8 w-8 text-muted-foreground/40" />
          <p className="font-medium text-muted-foreground">No attendees yet</p>
          <p className="text-xs text-muted-foreground">
            Import or add attendees to get started.
          </p>
        </div>
      )}

      {/* Table */}
      {attendees.length > 0 && (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-x-auto rounded-xl border shadow-sm sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/60">
                  <th className="w-10 px-3 py-3" />
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Signed into the event
                  </th>
                  <th className="w-10 px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {attendees.map((attendee, index) => (
                  <tr
                    key={attendee.id}
                    className={cn(
                      "transition-colors hover:bg-primary/[0.04]",
                      index % 2 === 1 && "bg-muted/20"
                    )}
                  >
                    <td className="px-3 py-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary"
                        data-testid="avatar-initial"
                      >
                        {attendee.name.charAt(0).toUpperCase()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium text-primary underline-offset-2 hover:underline cursor-pointer">
                          {attendee.name}
                        </span>
                        <p className="text-xs text-muted-foreground">{attendee.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {attendee.title ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {attendee.company ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {attendee.category ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {attendee.user_id ? (
                        <span className="text-emerald-600 font-medium">Yes</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <button className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List */}
          <div className="space-y-3 sm:hidden">
            {attendees.map((attendee) => (
              <Card key={attendee.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary"
                    data-testid="avatar-initial"
                  >
                    {attendee.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{attendee.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{attendee.email}</p>
                    {attendee.title && (
                      <p className="mt-1 text-xs text-muted-foreground">{attendee.title}</p>
                    )}
                    {attendee.company && (
                      <p className="text-xs text-muted-foreground">{attendee.company}</p>
                    )}
                  </div>
                  <span className="text-xs shrink-0">
                    {attendee.user_id ? (
                      <span className="text-emerald-600 font-medium">Signed in</span>
                    ) : (
                      <span className="text-muted-foreground">Not signed in</span>
                    )}
                  </span>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Items {from}–{to} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                aria-label="First page"
                disabled={page <= 1}
                onClick={() => handlePageChange(1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                aria-label="Next page"
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                aria-label="Last page"
                disabled={page >= totalPages}
                onClick={() => handlePageChange(totalPages)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Add Attendee Modal */}
      {showAddModal && (
        <AddAttendeeModal
          eventId={eventId}
          categories={categories}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Import Attendees Modal */}
      {showImportModal && (
        <ImportAttendeesModal
          eventId={eventId}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
}

function AddAttendeeModal({
  eventId,
  categories,
  onClose,
}: {
  eventId: string;
  categories: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await addAttendee(eventId, {
          name: formData.get("name") as string,
          email: formData.get("email") as string,
          title: (formData.get("title") as string) || undefined,
          company: (formData.get("company") as string) || undefined,
          category: (formData.get("category") as string) || undefined,
        });
        toast.success("Attendee added");
        router.refresh();
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add attendee");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border bg-background p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add Attendee</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="add-name" className="mb-1 block text-sm font-medium">
              Name
            </label>
            <Input id="add-name" name="name" required placeholder="Full name" />
          </div>
          <div>
            <label htmlFor="add-email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <Input id="add-email" name="email" type="email" required placeholder="email@example.com" />
          </div>
          <div>
            <label htmlFor="add-title" className="mb-1 block text-sm font-medium">
              Title
            </label>
            <Input id="add-title" name="title" placeholder="Job title (optional)" />
          </div>
          <div>
            <label htmlFor="add-company" className="mb-1 block text-sm font-medium">
              Company
            </label>
            <Input id="add-company" name="company" placeholder="Organization (optional)" />
          </div>
          <div>
            <label htmlFor="add-category" className="mb-1 block text-sm font-medium">
              Category
            </label>
            <Input id="add-category" name="category" placeholder="e.g. Speaker, Staff (optional)" list="category-options" />
            <datalist id="category-options">
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding..." : "Add Attendee"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ImportAttendeesModal({
  eventId,
  onClose,
}: {
  eventId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [csvContent, setCsvContent] = useState("");
  const [fileName, setFileName] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvContent(ev.target?.result as string);
    };
    reader.readAsText(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!csvContent.trim()) {
      toast.error("Please select a CSV file");
      return;
    }
    startTransition(async () => {
      try {
        const result = await importAttendees(eventId, csvContent);
        toast.success(`Imported ${result.imported} attendee${result.imported !== 1 ? "s" : ""}`);
        if (result.errors.length > 0) {
          toast.warning(`${result.errors.length} row(s) skipped`);
        }
        router.refresh();
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Import failed");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border bg-background p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Import Attendees</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="mb-2 text-sm text-muted-foreground">
              Upload a CSV file with columns: name, email, title, company, category
            </p>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors hover:border-primary/50 hover:bg-muted/30">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {fileName || "Choose CSV file..."}
              </span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !csvContent}>
              {isPending ? "Importing..." : "Import"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
