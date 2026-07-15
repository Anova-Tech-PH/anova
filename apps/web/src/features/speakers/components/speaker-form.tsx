"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button, Input, Textarea } from "@/shared/components/ui";

type SpeakerData = {
  id?: string;
  name: string;
  title: string;
  company: string;
  bio: string;
  photo: string;
  email: string;
};

export function SpeakerForm({
  speaker,
  onSubmit,
  onCancel,
}: {
  speaker?: SpeakerData;
  onSubmit: (data: Omit<SpeakerData, "id">) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: speaker?.name ?? "",
    title: speaker?.title ?? "",
    company: speaker?.company ?? "",
    bio: speaker?.bio ?? "",
    photo: speaker?.photo ?? "",
    email: speaker?.email ?? "",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {speaker ? "Edit Speaker" : "Add Speaker"}
          </h2>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Name *</label>
              <Input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <Input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. CTO"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Company</label>
              <Input
                type="text"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Photo URL</label>
            <Input
              type="url"
              value={form.photo}
              onChange={(e) => setForm((f) => ({ ...f, photo: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Bio</label>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!form.name}
              loading={loading}
            >
              {loading ? "Saving..." : speaker ? "Update" : "Add Speaker"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
