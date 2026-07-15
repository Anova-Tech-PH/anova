"use client";

import { useState } from "react";
import { User, X } from "lucide-react";
import { toast } from "sonner";
import { updateProfile } from "../actions";
import { Avatar } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/input";

type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  company: string | null;
  job_title: string | null;
  interests: string[];
  looking_for: string[];
  linkedin_url: string | null;
  twitter_handle: string | null;
};

export function ProfileForm({ profile }: { profile: Profile }) {
  const [form, setForm] = useState({
    full_name: profile.full_name,
    avatar_url: profile.avatar_url ?? "",
    bio: profile.bio ?? "",
    company: profile.company ?? "",
    job_title: profile.job_title ?? "",
    interests: profile.interests ?? [],
    looking_for: profile.looking_for ?? [],
    linkedin_url: profile.linkedin_url ?? "",
    twitter_handle: profile.twitter_handle ?? "",
  });
  const [interestInput, setInterestInput] = useState("");
  const [lookingForInput, setLookingForInput] = useState("");
  const [loading, setLoading] = useState(false);

  function addTag(field: "interests" | "looking_for", value: string) {
    const trimmed = value.trim();
    if (!trimmed || form[field].includes(trimmed)) return;
    setForm((f) => ({ ...f, [field]: [...f[field], trimmed] }));
  }

  function removeTag(field: "interests" | "looking_for", index: number) {
    setForm((f) => ({ ...f, [field]: f[field].filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({
        full_name: form.full_name,
        avatar_url: form.avatar_url || undefined,
        bio: form.bio || undefined,
        company: form.company || undefined,
        job_title: form.job_title || undefined,
        interests: form.interests,
        looking_for: form.looking_for,
        linkedin_url: form.linkedin_url || undefined,
        twitter_handle: form.twitter_handle || undefined,
      });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar preview */}
      <div className="flex items-center gap-4">
        <Avatar src={form.avatar_url || undefined} name={form.full_name} size="lg" />
        <div className="flex-1 space-y-1.5">
          <label className="text-sm font-medium">Avatar URL</label>
          <Input
            type="url"
            value={form.avatar_url}
            onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value }))}
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Full name *</label>
          <Input
            type="text"
            required
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Job title</label>
          <Input
            type="text"
            value={form.job_title}
            onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Company</label>
        <Input
          type="text"
          value={form.company}
          onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Bio</label>
        <Textarea
          value={form.bio}
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          rows={3}
          maxLength={500}
          placeholder="Tell others about yourself..."
        />
        <p className="text-xs text-muted-foreground">{form.bio.length}/500</p>
      </div>

      {/* Interests */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Interests</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {form.interests.map((tag, i) => (
            <span key={i} className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {tag}
              <button type="button" onClick={() => removeTag("interests", i)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <Input
          type="text"
          value={interestInput}
          onChange={(e) => setInterestInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag("interests", interestInput);
              setInterestInput("");
            }
          }}
          placeholder="Type and press Enter..."
        />
      </div>

      {/* Looking for */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Looking for</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {form.looking_for.map((tag, i) => (
            <span key={i} className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium">
              {tag}
              <button type="button" onClick={() => removeTag("looking_for", i)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <Input
          type="text"
          value={lookingForInput}
          onChange={(e) => setLookingForInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag("looking_for", lookingForInput);
              setLookingForInput("");
            }
          }}
          placeholder="e.g. Co-founder, Mentor, Investor..."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">LinkedIn URL</label>
          <Input
            type="url"
            value={form.linkedin_url}
            onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))}
            placeholder="https://linkedin.com/in/..."
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Twitter / X handle</label>
          <Input
            type="text"
            value={form.twitter_handle}
            onChange={(e) => setForm((f) => ({ ...f, twitter_handle: e.target.value }))}
            placeholder="@handle"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading || !form.full_name}
      >
        {loading ? "Saving..." : "Save Profile"}
      </Button>
    </form>
  );
}
