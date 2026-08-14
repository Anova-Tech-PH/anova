"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, Button, Input, Textarea } from "@attendly/ui/components";
import { createClient } from "@attendly/ui/supabase/client";
import { toast } from "sonner";
import { updateProfile, updateProfileInterests } from "../actions";

type Profile = {
  id: string;
  event_id: string;
  display_name: string;
  avatar_url: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  bio: string | null;
  is_visible_in_directory: boolean;
};

type Interest = {
  id: string;
  name: string;
};

export function ProfileEditor({
  profile,
  eventId,
  interests,
  selectedInterestIds,
}: {
  profile: Profile | null;
  eventId: string;
  interests: Interest[];
  selectedInterestIds: string[];
}) {
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [title, setTitle] = useState(profile?.title ?? "");
  const [company, setCompany] = useState(profile?.company ?? "");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [isVisible, setIsVisible] = useState(
    profile?.is_visible_in_directory ?? true
  );
  const [checkedInterests, setCheckedInterests] = useState<Set<string>>(
    new Set(selectedInterestIds)
  );
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function toggleInterest(id: string) {
    setCheckedInterests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `avatars/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("event-images")
        .getPublicUrl(path);

      setAvatarUrl(data.publicUrl);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Avatar upload failed"
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleSave() {
    if (!displayName.trim()) {
      toast.error("Display name is required");
      return;
    }

    startTransition(async () => {
      try {
        await updateProfile(eventId, {
          display_name: displayName.trim(),
          avatar_url: avatarUrl || undefined,
          title: title.trim() || undefined,
          company: company.trim() || undefined,
          location: location.trim() || undefined,
          bio: bio.trim() || undefined,
          is_visible_in_directory: isVisible,
        });

        await updateProfileInterests(eventId, Array.from(checkedInterests));

        toast.success("Profile saved");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save profile"
        );
      }
    });
  }

  return (
    <div className="mx-auto max-w-xl space-y-8 py-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your profile information visible to other attendees.
        </p>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <Avatar
            src={avatarUrl || null}
            name={displayName || "?"}
            size="xl"
            className="h-20 w-20 text-xl"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
        >
          Change photo
        </button>
      </div>

      {/* Form fields */}
      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Display Name <span className="text-destructive">*</span>
          </label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Software Engineer"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Company</label>
          <Input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. Acme Corp"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Location</label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. San Francisco, CA"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Bio</label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell other attendees about yourself..."
            rows={4}
          />
        </div>
      </div>

      {/* Interests */}
      {interests.length > 0 && (
        <div>
          <label className="mb-3 block text-sm font-medium">Interests</label>
          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => {
              const checked = checkedInterests.has(interest.id);
              return (
                <label
                  key={interest.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors select-none ${
                    checked
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleInterest(interest.id)}
                    className="sr-only"
                  />
                  {interest.name}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Directory visibility */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">Directory Visibility</p>
          <p className="text-sm text-muted-foreground">
            Show my profile in the attendee directory
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isVisible}
          onClick={() => setIsVisible(!isVisible)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            isVisible ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
              isVisible ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={isPending || uploading || !displayName.trim()}
        className="w-full sm:w-auto"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Profile"
        )}
      </Button>
    </div>
  );
}
