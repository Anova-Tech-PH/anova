"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { SpeakerForm } from "./speaker-form";
import { createSpeaker, updateSpeaker, deleteSpeaker } from "../actions";

type Speaker = {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  photo: string | null;
  email: string | null;
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
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleCreate(data: {
    name: string;
    title: string;
    company: string;
    bio: string;
    photo: string;
    email: string;
  }) {
    try {
      const speaker = await createSpeaker(eventId, {
        name: data.name,
        title: data.title || undefined,
        company: data.company || undefined,
        bio: data.bio || undefined,
        photo: data.photo || undefined,
        email: data.email || undefined,
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

  function handleDelete(speaker: Speaker) {
    if (!confirm(`Delete speaker "${speaker.name}"?`)) return;
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
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Speaker
        </button>
      </div>

      {speakers.length === 0 ? (
        <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
          No speakers yet. Add your first speaker.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {speakers.map((speaker) => (
            <div
              key={speaker.id}
              className="flex items-start gap-3 rounded-xl border bg-card p-4"
            >
              {speaker.photo ? (
                <img
                  src={speaker.photo}
                  alt={speaker.name}
                  className="h-12 w-12 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{speaker.name}</p>
                {(speaker.title || speaker.company) && (
                  <p className="text-xs text-muted-foreground truncate">
                    {[speaker.title, speaker.company].filter(Boolean).join(" at ")}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => setEditingSpeaker(speaker)}
                  className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(speaker)}
                  disabled={isPending}
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <SpeakerForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

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
          }}
          onSubmit={handleUpdate}
          onCancel={() => setEditingSpeaker(null)}
        />
      )}
    </div>
  );
}
