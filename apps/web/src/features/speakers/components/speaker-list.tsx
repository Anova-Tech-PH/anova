"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, User, Star, Link2, AtSign, Globe, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, Avatar, EmptyState, useConfirm } from "@attendly/ui/components";
import { SpeakerForm } from "./speaker-form";
import { SpeakerCsvImport } from "./speaker-csv-import";
import { createSpeaker, updateSpeaker, deleteSpeaker } from "../actions";

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

export function SpeakerList({
  eventId,
  initialSpeakers,
}: {
  eventId: string;
  initialSpeakers: Speaker[];
}) {
  const [speakers, setSpeakers] = useState(initialSpeakers);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();

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
      setSpeakers((prev) => [...prev, speaker].sort((a, b) => a.name.localeCompare(b.name)));
      setShowForm(false);
      toast.success("Speaker added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add speaker");
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
      toast.error(err instanceof Error ? err.message : "Failed to update speaker");
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
        toast.error(err instanceof Error ? err.message : "Failed to delete speaker");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Speakers</h3>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowImport(true)}
            size="sm"
            variant="outline"
            className="transition-all duration-200 hover:shadow-md"
          >
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </Button>
          <Button
            onClick={() => setShowForm(true)}
            size="sm"
            className="transition-all duration-200 hover:shadow-md"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Speaker
          </Button>
        </div>
      </div>

      {speakers.length === 0 ? (
        <EmptyState
          icon={<User className="h-8 w-8" />}
          title="No speakers added"
          description="Add speakers to show them on the event page."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {speakers.map((speaker, index) => (
            <Card
              key={speaker.id}
              className="group relative flex flex-col items-center p-6 text-center transition-all duration-200 hover:shadow-md"
            >
              {/* Subtle top gradient background */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-20 rounded-t-xl opacity-30"
                style={{
                  background: `linear-gradient(135deg, ${
                    ["oklch(0.445 0.107 195)", "oklch(0.55 0.12 180)", "oklch(0.50 0.10 200)", "oklch(0.48 0.09 210)"][index % 4]
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
                    {[speaker.title, speaker.company].filter(Boolean).join(" at ")}
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
            setSpeakers((prev) => [...prev, ...imported.map((s) => ({
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
            }))].sort((a, b) => a.name.localeCompare(b.name)));
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
