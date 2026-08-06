"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input, Textarea, Button, Card } from "@attendly/ui/components";
import { updateMyProfile } from "@/features/attendee/actions";

type Profile = {
  full_name: string;
  bio: string | null;
  company: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  twitter_handle: string | null;
  interests: string[] | null;
  looking_for: string[] | null;
};

export function ProfileForm({ profile, email }: { profile: Profile; email: string }) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [company, setCompany] = useState(profile.company ?? "");
  const [jobTitle, setJobTitle] = useState(profile.job_title ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedin_url ?? "");
  const [twitterHandle, setTwitterHandle] = useState(profile.twitter_handle ?? "");
  const [interests, setInterests] = useState((profile.interests ?? []).join(", "));
  const [lookingFor, setLookingFor] = useState((profile.looking_for ?? []).join(", "));
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await updateMyProfile({
        full_name: fullName,
        bio: bio || undefined,
        company: company || undefined,
        job_title: jobTitle || undefined,
        linkedin_url: linkedinUrl || undefined,
        twitter_handle: twitterHandle || undefined,
        interests: interests ? interests.split(",").map((s) => s.trim()).filter(Boolean) : [],
        looking_for: lookingFor ? lookingFor.split(",").map((s) => s.trim()).filter(Boolean) : [],
      });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mt-6 p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Email</label>
          <Input type="email" value={email} disabled />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Full name *</label>
          <Input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Company</label>
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Inc."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Job title</label>
            <Input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Software Engineer"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Bio</label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Tell other attendees about yourself..."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">LinkedIn URL</label>
            <Input
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Twitter / X</label>
            <Input
              value={twitterHandle}
              onChange={(e) => setTwitterHandle(e.target.value)}
              placeholder="@handle"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Interests</label>
          <Input
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            placeholder="AI, Cloud, DevOps (comma-separated)"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Looking for</label>
          <Input
            value={lookingFor}
            onChange={(e) => setLookingFor(e.target.value)}
            placeholder="Networking, Hiring, Learning (comma-separated)"
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" loading={loading}>
            {loading ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
