"use client";

import { useState, useMemo, useTransition } from "react";
import { usePathname } from "next/navigation";
import {
  Plus,
  Upload,
  Settings,
  Download,
  Mail,
  Search,
  List,
  LayoutGrid,
  Pencil,
  Trash2,
  Star,
  Users,
  UserCheck,
  Link2,
  AtSign,
  Globe,
  User,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button, Card, Avatar, EmptyState, useConfirm } from "@attendly/ui/components";
import { cn } from "@attendly/ui/cn";
import { SpeakerForm } from "./speaker-form";
import { SpeakerCsvImport } from "./speaker-csv-import";
import { createSpeaker, updateSpeaker, deleteSpeaker } from "../actions";
import { sendSpeakerFormInvitation, sendSpeakerFormToAll } from "../settings-actions";

type Speaker = {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  photo: string | null;
  email: string | null;
  linkedin_url: string | null;
  twitter_handle: string | null;
  website_url: string | null;
  is_featured: boolean;
};

export function SpeakerManager({
  eventId,
  initialSpeakers,
}: {
  eventId: string;
  initialSpeakers: Speaker[];
}) {
  const [speakers, setSpeakers] = useState(initialSpeakers);
  const [view, setView] = useState<"table" | "cards">("table");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const filtered = useMemo(() => {
    let result = speakers;

    // Search by name or email
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.email && s.email.toLowerCase().includes(q))
      );
    }

    // Filter
    switch (filter) {
      case "has_photo":
        result = result.filter((s) => s.photo);
        break;
      case "no_photo":
        result = result.filter((s) => !s.photo);
        break;
      case "featured":
        result = result.filter((s) => s.is_featured);
        break;
      case "not_featured":
        result = result.filter((s) => !s.is_featured);
        break;
    }

    return result;
  }, [speakers, search, filter]);

  const stats = useMemo(() => {
    const total = speakers.length;
    const complete = speakers.filter(
      (s) => s.photo && s.bio && s.company
    ).length;
    const featured = speakers.filter((s) => s.is_featured).length;
    return { total, complete, featured };
  }, [speakers]);

  async function handleCreate(data: {
    name: string;
    title: string;
    company: string;
    bio: string;
    photo: string;
    email: string;
    linkedin_url: string;
    twitter_handle: string;
    website_url: string;
    is_featured: boolean;
  }) {
    try {
      const speaker = await createSpeaker(eventId, {
        name: data.name,
        title: data.title || undefined,
        company: data.company || undefined,
        bio: data.bio || undefined,
        photo: data.photo || undefined,
        email: data.email || undefined,
        linkedin_url: data.linkedin_url || undefined,
        twitter_handle: data.twitter_handle || undefined,
        website_url: data.website_url || undefined,
        is_featured: data.is_featured,
      });
      setSpeakers((prev) =>
        [...prev, speaker].sort((a, b) => a.name.localeCompare(b.name))
      );
      setShowForm(false);
      toast.success("Speaker added");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add speaker"
      );
    }
  }

  async function handleUpdate(data: {
    name: string;
    title: string;
    company: string;
    bio: string;
    photo: string;
    email: string;
    linkedin_url: string;
    twitter_handle: string;
    website_url: string;
    is_featured: boolean;
  }) {
    if (!editingSpeaker) return;
    try {
      await updateSpeaker(eventId, editingSpeaker.id, {
        name: data.name,
        title: data.title || undefined,
        company: data.company || undefined,
        bio: data.bio || undefined,
        photo: data.photo || undefined,
        email: data.email || undefined,
        linkedin_url: data.linkedin_url || undefined,
        twitter_handle: data.twitter_handle || undefined,
        website_url: data.website_url || undefined,
        is_featured: data.is_featured,
      });
      setSpeakers((prev) =>
        prev
          .map((s) => (s.id === editingSpeaker.id ? { ...s, ...data } : s))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingSpeaker(null);
      toast.success("Speaker updated");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update speaker"
      );
    }
  }

  async function handleDelete(speaker: Speaker) {
    const ok = await confirm({
      title: "Delete Speaker",
      description: `Delete speaker "${speaker.name}"? This action cannot be undone.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteSpeaker(eventId, speaker.id);
        setSpeakers((prev) => prev.filter((s) => s.id !== speaker.id));
        toast.success("Speaker deleted");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to delete speaker"
        );
      }
    });
  }

  function exportCsv() {
    const headers = [
      "Name",
      "Email",
      "Title",
      "Company",
      "Bio",
      "LinkedIn",
      "Twitter",
      "Website",
      "Featured",
    ];
    const rows = filtered.map((s) => [
      s.name,
      s.email ?? "",
      s.title ?? "",
      s.company ?? "",
      s.bio ?? "",
      s.linkedin_url ?? "",
      s.twitter_handle ?? "",
      s.website_url ?? "",
      s.is_featured ? "Yes" : "No",
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `speakers-${eventId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const statCards = [
    {
      label: "Total Speakers",
      value: stats.total,
      gradient: "from-slate-100 to-slate-50 dark:from-slate-900/50 dark:to-slate-800/30",
      iconColor: "text-slate-600 dark:text-slate-400",
      icon: Users,
    },
    {
      label: "Complete Profiles",
      value: stats.complete,
      gradient: "from-emerald-100 to-emerald-50 dark:from-emerald-900/50 dark:to-emerald-800/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      icon: UserCheck,
    },
    {
      label: "Featured Speakers",
      value: stats.featured,
      gradient: "from-amber-100 to-amber-50 dark:from-amber-900/50 dark:to-amber-800/30",
      iconColor: "text-amber-600 dark:text-amber-400",
      icon: Star,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map((stat) => (
          <Card
            key={stat.label}
            className={cn(
              "relative overflow-hidden border p-4 bg-gradient-to-br",
              stat.gradient
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums">
                  {stat.value}
                </p>
              </div>
              <div
                className={cn(
                  "rounded-lg bg-white/60 p-2 dark:bg-white/10",
                  stat.iconColor
                )}
              >
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Toolbar row */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus className="h-3.5 w-3.5" />
          Add Speaker
        </Button>
        <Button
          onClick={() => setShowImport(true)}
          size="sm"
          variant="outline"
        >
          <Upload className="h-3.5 w-3.5" />
          Import CSV
        </Button>
        <Link
          href={`${pathname.replace(/\/speakers$/, "")}/speakers/settings`}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          <Settings className="h-3.5 w-3.5" />
          Settings
        </Link>
        <Button onClick={exportCsv} size="sm" variant="outline">
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
        <Button
          onClick={() => toast.info("Email reminder coming soon")}
          size="sm"
          variant="outline"
        >
          <Mail className="h-3.5 w-3.5" />
          Email Reminder
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            const speakersWithEmail = speakers.filter((s) => s.email);
            if (speakersWithEmail.length === 0) {
              toast.error("No speakers have email addresses");
              return;
            }
            const ok = await confirm({
              title: "Send Form to All Speakers",
              description: `This will send a form invitation email to ${speakersWithEmail.length} speaker(s) with email addresses. Continue?`,
              confirmLabel: "Send",
            });
            if (!ok) return;
            startTransition(async () => {
              try {
                const results = await sendSpeakerFormToAll(eventId);
                toast.success(`Form sent to ${results.sent} speaker(s)${results.failed > 0 ? `, ${results.failed} failed` : ""}`);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to send forms");
              }
            });
          }}
          disabled={isPending}
        >
          <Send className="mr-1.5 h-4 w-4" />
          {isPending ? "Sending..." : "Send Form"}
        </Button>
      </div>

      {/* Search + Filter + View Toggle row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Speakers</option>
          <option value="has_photo">Has Photo</option>
          <option value="no_photo">No Photo</option>
          <option value="featured">Featured</option>
          <option value="not_featured">Not Featured</option>
        </select>
        <div className="hidden shrink-0 items-center gap-1 rounded-md border bg-background p-0.5 sm:flex">
          <button
            onClick={() => setView("table")}
            className={cn(
              "rounded p-1.5 transition-colors",
              view === "table"
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Table view"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("cards")}
            className={cn(
              "rounded p-1.5 transition-colors",
              view === "cards"
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Card view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<User className="h-8 w-8" />}
          title="No speakers found"
          description={
            search || filter !== "all"
              ? "Try adjusting your search or filter."
              : "Add speakers to show them on the event page."
          }
        />
      ) : view === "table" ? (
        /* Table view */
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Speaker
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Featured
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((speaker) => (
                <tr
                  key={speaker.id}
                  className="border-t hover:bg-muted/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={speaker.photo}
                        name={speaker.name}
                        size="sm"
                      />
                      <div>
                        <p className="font-medium">{speaker.name}</p>
                        {(speaker.title || speaker.company) && (
                          <p className="text-xs text-muted-foreground">
                            {[speaker.title, speaker.company]
                              .filter(Boolean)
                              .join(" at ")}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {speaker.email ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {speaker.company ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    {speaker.is_featured && (
                      <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingSpeaker(speaker)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(speaker)}
                        disabled={isPending}
                        className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      {speaker.email && (
                        <button
                          onClick={() => {
                            startTransition(async () => {
                              try {
                                await sendSpeakerFormInvitation(eventId, speaker.id);
                                toast.success(`Form invitation sent to ${speaker.name}`);
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Failed to send form");
                              }
                            });
                          }}
                          disabled={isPending}
                          className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
                          title="Send form invitation"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Card view */
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((speaker, index) => (
            <Card
              key={speaker.id}
              className="group relative flex flex-col items-center p-6 text-center transition-all duration-200 hover:shadow-md"
            >
              {/* Subtle top gradient background */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-20 rounded-t-xl opacity-30"
                style={{
                  background: `linear-gradient(135deg, ${
                    [
                      "oklch(0.445 0.107 195)",
                      "oklch(0.55 0.12 180)",
                      "oklch(0.50 0.10 200)",
                      "oklch(0.48 0.09 210)",
                    ][index % 4]
                  } 0%, transparent 100%)`,
                }}
              />

              {/* Featured star */}
              {speaker.is_featured && (
                <div className="absolute left-2 top-2 z-20">
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                </div>
              )}

              {/* Avatar with ring */}
              <div className="relative z-10 mb-3 rounded-full ring-2 ring-muted ring-offset-2 ring-offset-background">
                <Avatar src={speaker.photo} name={speaker.name} size="lg" />
              </div>

              <div className="relative z-10 min-w-0 w-full">
                <p className="font-medium truncate">{speaker.name}</p>
                {(speaker.title || speaker.company) && (
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">
                    {[speaker.title, speaker.company]
                      .filter(Boolean)
                      .join(" at ")}
                  </p>
                )}
              </div>

              {/* Actions - visible on hover */}
              <div className="absolute right-2 top-2 flex gap-1 rounded-lg bg-background/80 p-0.5 opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
                {speaker.linkedin_url && (
                  <a
                    href={speaker.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </a>
                )}
                {speaker.twitter_handle && (
                  <a
                    href={`https://twitter.com/${speaker.twitter_handle.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <AtSign className="h-3.5 w-3.5" />
                  </a>
                )}
                {speaker.website_url && (
                  <a
                    href={speaker.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <Globe className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  onClick={() => setEditingSpeaker(speaker)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(speaker)}
                  disabled={isPending}
                  className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <SpeakerForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {showImport && (
        <SpeakerCsvImport
          eventId={eventId}
          onClose={() => setShowImport(false)}
          onImported={(imported) => {
            setSpeakers((prev) =>
              [
                ...prev,
                ...imported.map((s) => ({
                  id: s.id,
                  name: s.name,
                  title: (s.title as string) ?? null,
                  company: (s.company as string) ?? null,
                  bio: (s.bio as string) ?? null,
                  photo: (s.photo as string) ?? null,
                  email: (s.email as string) ?? null,
                  linkedin_url: (s.linkedin_url as string) ?? null,
                  twitter_handle: (s.twitter_handle as string) ?? null,
                  website_url: (s.website_url as string) ?? null,
                  is_featured: (s.is_featured as boolean) ?? false,
                })),
              ].sort((a, b) => a.name.localeCompare(b.name))
            );
            setShowImport(false);
          }}
        />
      )}

      {confirmDialog}

      {editingSpeaker && (
        <SpeakerForm
          speaker={{
            id: editingSpeaker.id,
            name: editingSpeaker.name,
            title: editingSpeaker.title ?? "",
            company: editingSpeaker.company ?? "",
            bio: editingSpeaker.bio ?? "",
            photo: editingSpeaker.photo ?? "",
            email: editingSpeaker.email ?? "",
            linkedin_url: editingSpeaker.linkedin_url ?? "",
            twitter_handle: editingSpeaker.twitter_handle ?? "",
            website_url: editingSpeaker.website_url ?? "",
            is_featured: editingSpeaker.is_featured ?? false,
          }}
          onSubmit={handleUpdate}
          onCancel={() => setEditingSpeaker(null)}
        />
      )}
    </div>
  );
}
