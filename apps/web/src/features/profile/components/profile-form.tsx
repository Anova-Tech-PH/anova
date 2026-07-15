"use client";

import { useState } from "react";
import { X, Camera, Link2, AtSign, Sparkles, Save } from "lucide-react";
import { toast } from "sonner";
import { updateProfile } from "../actions";
import { Avatar } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/input";
import { Card } from "@/shared/components/ui/card";

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
  const [showAvatarInput, setShowAvatarInput] = useState(false);

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
      {/* Avatar section */}
      <Card className="p-6">
        <div className="flex items-center gap-5">
          <div className="group relative">
            <Avatar src={form.avatar_url || undefined} name={form.full_name} size="lg" className="h-20 w-20 text-xl" />
            <button
              type="button"
              onClick={() => setShowAvatarInput(!showAvatarInput)}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Camera className="h-5 w-5 text-white" />
            </button>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{form.full_name || "Your Name"}</h3>
            {(form.job_title || form.company) && (
              <p className="text-sm text-muted-foreground">
                {[form.job_title, form.company].filter(Boolean).join(" at ")}
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowAvatarInput(!showAvatarInput)}
              className="mt-1 text-xs text-primary hover:underline"
            >
              {showAvatarInput ? "Hide" : "Change"} avatar
            </button>
          </div>
        </div>
        {showAvatarInput && (
          <div className="mt-4 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Avatar URL</label>
            <Input
              type="url"
              value={form.avatar_url}
              onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value }))}
              placeholder="https://..."
            />
          </div>
        )}
      </Card>

      {/* Basic info */}
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Basic Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Full name <span className="text-destructive">*</span></label>
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
              placeholder="e.g. Senior Engineer"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Company</label>
          <Input
            type="text"
            value={form.company}
            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            placeholder="Where do you work?"
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
            className="resize-none"
          />
          <div className="flex justify-end">
            <span className={`text-xs ${form.bio.length > 450 ? "text-warning" : "text-muted-foreground"}`}>
              {form.bio.length}/500
            </span>
          </div>
        </div>
      </Card>

      {/* Networking */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Networking</h3>
        </div>

        {/* Interests */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Interests</label>
          {form.interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {form.interests.map((tag, i) => (
                <span key={i} className="group flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20">
                  {tag}
                  <button type="button" onClick={() => removeTag("interests", i)} className="opacity-50 hover:opacity-100 transition-opacity">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
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
        <div className="space-y-2">
          <label className="text-sm font-medium">Looking for</label>
          {form.looking_for.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {form.looking_for.map((tag, i) => (
                <span key={i} className="group flex items-center gap-1 rounded-full bg-info-light px-3 py-1 text-xs font-medium text-info transition-colors hover:bg-info-light/80">
                  {tag}
                  <button type="button" onClick={() => removeTag("looking_for", i)} className="opacity-50 hover:opacity-100 transition-opacity">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
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
      </Card>

      {/* Social links */}
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Social Links</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-sm font-medium">
              <Link2 className="h-3.5 w-3.5 text-[#0077B5]" />
              LinkedIn
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
              <AtSign className="h-3.5 w-3.5 text-[#1DA1F2]" />
              Twitter / X
            </label>
            <Input
              type="text"
              value={form.twitter_handle}
              onChange={(e) => setForm((f) => ({ ...f, twitter_handle: e.target.value }))}
              placeholder="@handle"
            />
          </div>
        </div>
      </Card>

      <Button
        type="submit"
        disabled={loading || !form.full_name}
        loading={loading}
        className="w-full sm:w-auto"
      >
        <Save className="h-4 w-4" />
        Save Profile
      </Button>
    </form>
  );
}
