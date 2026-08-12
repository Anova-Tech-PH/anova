"use client";

import { useState } from "react";
import { X, Linkedin, Twitter, Globe, Star } from "lucide-react";
import { Button, Input, Textarea, ModalOverlay } from "@attendly/ui/components";
import { ImageUpload } from "@/shared/components/image-upload";

type SpeakerData = {
  id?: string;
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
    linkedin_url: speaker?.linkedin_url ?? "",
    twitter_handle: speaker?.twitter_handle ?? "",
    website_url: speaker?.website_url ?? "",
    is_featured: speaker?.is_featured ?? false,
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
    <ModalOverlay onClose={onCancel}>
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

          <ImageUpload
            value={form.photo}
            onChange={(url) => setForm((f) => ({ ...f, photo: url }))}
            label="Photo"
            folder="speakers"
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Bio</label>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Social Links */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Social Links</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm font-medium">
                  <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                </label>
                <Input
                  type="url"
                  value={form.linkedin_url}
                  onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm font-medium">
                  <Twitter className="h-3.5 w-3.5" /> Twitter
                </label>
                <Input
                  type="text"
                  value={form.twitter_handle}
                  onChange={(e) => setForm((f) => ({ ...f, twitter_handle: e.target.value }))}
                  placeholder="@handle"
                />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm font-medium">
                  <Globe className="h-3.5 w-3.5" /> Website
                </label>
                <Input
                  type="url"
                  value={form.website_url}
                  onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* Featured Speaker */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <Star className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">Featured Speaker</span>
          </label>

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
    </ModalOverlay>
  );
}
