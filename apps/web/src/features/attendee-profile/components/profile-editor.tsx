"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Loader2, Plus, Trash2 } from "lucide-react";
import { Avatar, Button, Input, Textarea } from "@attendly/ui/components";
import { createClient } from "@attendly/ui/supabase/client";
import { toast } from "sonner";
import { updateProfile, updateProfileInterests, addAffiliation, removeAffiliation, addEducation, removeEducation, updateProfileLinks } from "../actions";

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

type Affiliation = {
  id: string;
  organization: string;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
};

type Education = {
  id: string;
  school: string;
  degree: string | null;
  field_of_study: string | null;
  start_year: number | null;
  end_year: number | null;
};

type ProfileLink = {
  type: "linkedin" | "twitter" | "github" | "website" | "other";
  url: string;
  label?: string;
};

export function ProfileEditor({
  profile,
  eventId,
  interests,
  selectedInterestIds,
  affiliations: initialAffiliations = [],
  education: initialEducation = [],
}: {
  profile: Profile | null;
  eventId: string;
  interests: Interest[];
  selectedInterestIds: string[];
  affiliations?: Affiliation[];
  education?: Education[];
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

  // Affiliations
  const [affiliations, setAffiliations] = useState<Affiliation[]>(initialAffiliations);
  const [showAddAffiliation, setShowAddAffiliation] = useState(false);
  const [affOrg, setAffOrg] = useState("");
  const [affRole, setAffRole] = useState("");
  const [affStart, setAffStart] = useState("");
  const [affEnd, setAffEnd] = useState("");
  const [affPresent, setAffPresent] = useState(false);

  // Education
  const [education, setEducation] = useState<Education[]>(initialEducation);
  const [showAddEducation, setShowAddEducation] = useState(false);
  const [eduSchool, setEduSchool] = useState("");
  const [eduDegree, setEduDegree] = useState("");
  const [eduField, setEduField] = useState("");
  const [eduStartYear, setEduStartYear] = useState("");
  const [eduEndYear, setEduEndYear] = useState("");
  const [eduPresent, setEduPresent] = useState(false);

  // Links
  const [links, setLinks] = useState<ProfileLink[]>(
    (profile as (Profile & { links?: ProfileLink[] }) | null)?.links ?? []
  );
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkType, setLinkType] = useState<ProfileLink["type"]>("website");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");

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

  async function handleAddAffiliation() {
    if (!affOrg.trim()) { toast.error("Organization is required"); return; }
    try {
      await addAffiliation(eventId, {
        organization: affOrg.trim(),
        role: affRole.trim() || undefined,
        start_date: affStart || null,
        end_date: affPresent ? null : affEnd || null,
      });
      setAffiliations(prev => [...prev, {
        id: crypto.randomUUID(),
        organization: affOrg.trim(),
        role: affRole.trim() || null,
        start_date: affStart || null,
        end_date: affPresent ? null : affEnd || null,
      }]);
      setAffOrg(""); setAffRole(""); setAffStart(""); setAffEnd(""); setAffPresent(false);
      setShowAddAffiliation(false);
      toast.success("Affiliation added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add affiliation");
    }
  }

  async function handleRemoveAffiliation(id: string) {
    try {
      await removeAffiliation(id);
      setAffiliations(prev => prev.filter(a => a.id !== id));
      toast.success("Affiliation removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    }
  }

  async function handleAddEducation() {
    if (!eduSchool.trim()) { toast.error("School is required"); return; }
    try {
      await addEducation(eventId, {
        school: eduSchool.trim(),
        degree: eduDegree.trim() || undefined,
        field_of_study: eduField.trim() || undefined,
        start_year: eduStartYear ? parseInt(eduStartYear) : undefined,
        end_year: eduPresent ? null : eduEndYear ? parseInt(eduEndYear) : undefined,
      });
      setEducation(prev => [...prev, {
        id: crypto.randomUUID(),
        school: eduSchool.trim(),
        degree: eduDegree.trim() || null,
        field_of_study: eduField.trim() || null,
        start_year: eduStartYear ? parseInt(eduStartYear) : null,
        end_year: eduPresent ? null : eduEndYear ? parseInt(eduEndYear) : null,
      }]);
      setEduSchool(""); setEduDegree(""); setEduField(""); setEduStartYear(""); setEduEndYear(""); setEduPresent(false);
      setShowAddEducation(false);
      toast.success("Education added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add education");
    }
  }

  async function handleRemoveEducation(id: string) {
    try {
      await removeEducation(id);
      setEducation(prev => prev.filter(e => e.id !== id));
      toast.success("Education removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    }
  }

  async function handleAddLink() {
    if (!linkUrl.trim()) { toast.error("URL is required"); return; }
    if (!linkUrl.startsWith("https://") && !linkUrl.startsWith("http://")) {
      toast.error("URL must start with https:// or http://"); return;
    }
    const newLinks = [...links, { type: linkType, url: linkUrl.trim(), label: linkLabel.trim() || undefined }];
    if (newLinks.length > 10) { toast.error("Maximum 10 links"); return; }
    try {
      await updateProfileLinks(eventId, newLinks);
      setLinks(newLinks);
      setLinkUrl(""); setLinkLabel(""); setLinkType("website");
      setShowAddLink(false);
      toast.success("Link added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add link");
    }
  }

  async function handleRemoveLink(index: number) {
    const newLinks = links.filter((_, i) => i !== index);
    try {
      await updateProfileLinks(eventId, newLinks);
      setLinks(newLinks);
      toast.success("Link removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove link");
    }
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

      {/* Affiliations */}
      <div>
        <label className="mb-3 block text-sm font-medium">Affiliations</label>
        {affiliations.length > 0 && (
          <div className="space-y-2 mb-3">
            {affiliations.map((aff) => (
              <div key={aff.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{aff.organization}</p>
                  <p className="text-xs text-muted-foreground">
                    {[aff.role, aff.start_date && `${aff.start_date} — ${aff.end_date ?? "Present"}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveAffiliation(aff.id)}
                  className="text-xs text-destructive hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        {showAddAffiliation ? (
          <div className="space-y-3 rounded-lg border p-4">
            <Input value={affOrg} onChange={(e) => setAffOrg(e.target.value)} placeholder="Organization *" maxLength={200} />
            <Input value={affRole} onChange={(e) => setAffRole(e.target.value)} placeholder="Role" maxLength={200} />
            <div className="flex gap-3">
              <Input type="month" value={affStart} onChange={(e) => setAffStart(e.target.value)} className="flex-1" />
              <Input type="month" value={affEnd} onChange={(e) => setAffEnd(e.target.value)} disabled={affPresent} className="flex-1" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={affPresent} onChange={(e) => { setAffPresent(e.target.checked); if (e.target.checked) setAffEnd(""); }} />
              Present
            </label>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddAffiliation}>Add</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddAffiliation(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowAddAffiliation(true)} className="text-sm font-medium text-primary hover:text-primary/80">
            + Add affiliation
          </button>
        )}
      </div>

      {/* Education */}
      <div>
        <label className="mb-3 block text-sm font-medium">Education</label>
        {education.length > 0 && (
          <div className="space-y-2 mb-3">
            {education.map((edu) => (
              <div key={edu.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{edu.school}</p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      edu.degree && edu.field_of_study ? `${edu.degree} in ${edu.field_of_study}` : edu.degree || edu.field_of_study,
                      edu.start_year && `${edu.start_year} — ${edu.end_year ?? "Present"}`,
                    ].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <button type="button" onClick={() => handleRemoveEducation(edu.id)} className="text-xs text-destructive hover:underline">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        {showAddEducation ? (
          <div className="space-y-3 rounded-lg border p-4">
            <Input value={eduSchool} onChange={(e) => setEduSchool(e.target.value)} placeholder="School *" maxLength={200} />
            <Input value={eduDegree} onChange={(e) => setEduDegree(e.target.value)} placeholder="Degree" maxLength={200} />
            <Input value={eduField} onChange={(e) => setEduField(e.target.value)} placeholder="Field of study" maxLength={200} />
            <div className="flex gap-3">
              <Input value={eduStartYear} onChange={(e) => setEduStartYear(e.target.value)} placeholder="Start year" type="number" min={1950} max={2030} className="flex-1" />
              <Input value={eduEndYear} onChange={(e) => setEduEndYear(e.target.value)} placeholder="End year" type="number" min={1950} max={2030} disabled={eduPresent} className="flex-1" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={eduPresent} onChange={(e) => { setEduPresent(e.target.checked); if (e.target.checked) setEduEndYear(""); }} />
              Present
            </label>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddEducation}>Add</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddEducation(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowAddEducation(true)} className="text-sm font-medium text-primary hover:text-primary/80">
            + Add education
          </button>
        )}
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

      {/* Links */}
      <div>
        <label className="mb-3 block text-sm font-medium">Links</label>
        {links.length > 0 && (
          <div className="space-y-2 mb-3">
            {links.map((link, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{link.label || link.url}</p>
                  <p className="text-xs text-muted-foreground capitalize">{link.type}</p>
                </div>
                <button type="button" onClick={() => handleRemoveLink(i)} className="text-xs text-destructive hover:underline shrink-0 ml-2">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        {showAddLink ? (
          <div className="space-y-3 rounded-lg border p-4">
            <select value={linkType} onChange={(e) => setLinkType(e.target.value as ProfileLink["type"])} className="w-full rounded-md border px-3 py-2 text-sm">
              <option value="linkedin">LinkedIn</option>
              <option value="twitter">Twitter / X</option>
              <option value="github">GitHub</option>
              <option value="website">Website</option>
              <option value="other">Other</option>
            </select>
            <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
            <Input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Label (optional)" />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddLink}>Add</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddLink(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowAddLink(true)} className="text-sm font-medium text-primary hover:text-primary/80">
            + Add link
          </button>
        )}
      </div>

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
