"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, Avatar, EmptyState } from "@/shared/components/ui";
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
        <Button
          onClick={() => setShowForm(true)}
          size="sm"
          className="transition-all duration-200 hover:shadow-md"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Speaker
        </Button>
      </div>

      {speakers.length === 0 ? (
        <EmptyState
          icon={<User className="h-8 w-8" />}
          title="No speakers yet"
          description="Add your first speaker."
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
                    ["oklch(0.445 0.107 195)", "oklch(0.5 0.1 260)", "oklch(0.5 0.1 320)", "oklch(0.5 0.1 50)"][index % 4]
                  } 0%, transparent 100%)`,
                }}
              />

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
