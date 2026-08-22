"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Loader2, Plus, Trash2, Eye, EyeOff, User, Phone, Briefcase, GraduationCap, Link2, Globe } from "lucide-react";
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
  phone: string | null;
  contact_email: string | null;
  address: string | null;
  show_phone: boolean;
  show_email: boolean;
  show_address: boolean;
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

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border bg-card p-5 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {subtitle && <p className="text-xs text-muted-foreground ml-6">{subtitle}</p>}
    </div>
  );
}

function LinkTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "website": return <Globe className="h-4 w-4 text-muted-foreground" />;
    default: return <Link2 className="h-4 w-4 text-muted-foreground" />;
  }
}

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
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [contactEmail, setContactEmail] = useState(profile?.contact_email ?? "");
  const [address, setAddress] = useState(profile?.address ?? "");
  const [showPhone, setShowPhone] = useState(profile?.show_phone ?? false);
  const [showEmail, setShowEmail] = useState(profile?.show_email ?? false);
  const [showAddress, setShowAddress] = useState(profile?.show_address ?? false);
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
          phone: phone.trim() || undefined,
          contact_email: contactEmail.trim() || undefined,
          address: address.trim() || undefined,
          show_phone: showPhone,
          show_email: showEmail,
          show_address: showAddress,
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
    <div className="mx-auto max-w-xl space-y-5 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Edit Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your profile information visible to other attendees.
        </p>
      </div>

      {/* Avatar Card */}
      <SectionCard>
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
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
              className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
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
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold truncate">{displayName || "Your Name"}</p>
            {(title || company) && (
              <p className="text-sm text-muted-foreground truncate">
                {[title, company].filter(Boolean).join(" at ")}
              </p>
            )}
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="mt-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
            >
              Change photo
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Basic Information */}
      <SectionCard>
        <SectionHeader icon={User} title="Basic Information" />
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Display Name <span className="text-destructive">*</span>
            </label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wide">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Software Engineer"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wide">Company</label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Acme Corp"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. San Francisco, CA"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wide">Bio</label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell other attendees about yourself..."
              rows={3}
            />
          </div>
        </div>
      </SectionCard>

      {/* Contact Information */}
      <SectionCard>
        <SectionHeader
          icon={Phone}
          title="Contact Information"
          subtitle="Toggle visibility to control what other attendees can see."
        />
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +1 (555) 123-4567"
                type="tel"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowPhone(!showPhone)}
              className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors shrink-0 ${
                showPhone
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
              title={showPhone ? "Visible to attendees" : "Hidden from attendees"}
            >
              {showPhone ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {showPhone ? "Visible" : "Hidden"}
            </button>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</label>
              <Input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="e.g. you@example.com"
                type="email"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowEmail(!showEmail)}
              className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors shrink-0 ${
                showEmail
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
              title={showEmail ? "Visible to attendees" : "Hidden from attendees"}
            >
              {showEmail ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {showEmail ? "Visible" : "Hidden"}
            </button>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wide">Address</label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 123 Main St, City, State"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowAddress(!showAddress)}
              className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors shrink-0 ${
                showAddress
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
              title={showAddress ? "Visible to attendees" : "Hidden from attendees"}
            >
              {showAddress ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {showAddress ? "Visible" : "Hidden"}
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Affiliations */}
      <SectionCard>
        <SectionHeader icon={Briefcase} title="Affiliations" />
        {affiliations.length > 0 && (
          <div className="space-y-2 mb-4">
            {affiliations.map((aff) => (
              <div key={aff.id} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
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
                  className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        {showAddAffiliation ? (
          <div className="space-y-3 rounded-lg border border-dashed p-4">
            <Input value={affOrg} onChange={(e) => setAffOrg(e.target.value)} placeholder="Organization *" maxLength={200} />
            <Input value={affRole} onChange={(e) => setAffRole(e.target.value)} placeholder="Role" maxLength={200} />
            <div className="flex gap-3">
              <Input type="month" value={affStart} onChange={(e) => setAffStart(e.target.value)} className="flex-1" />
              <Input type="month" value={affEnd} onChange={(e) => setAffEnd(e.target.value)} disabled={affPresent} className="flex-1" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={affPresent} onChange={(e) => { setAffPresent(e.target.checked); if (e.target.checked) setAffEnd(""); }} className="rounded" />
              Present
            </label>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddAffiliation}>Add</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddAffiliation(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowAddAffiliation(true)} className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Add affiliation
          </button>
        )}
      </SectionCard>

      {/* Education */}
      <SectionCard>
        <SectionHeader icon={GraduationCap} title="Education" />
        {education.length > 0 && (
          <div className="space-y-2 mb-4">
            {education.map((edu) => (
              <div key={edu.id} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                <div>
                  <p className="text-sm font-medium">{edu.school}</p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      edu.degree && edu.field_of_study ? `${edu.degree} in ${edu.field_of_study}` : edu.degree || edu.field_of_study,
                      edu.start_year && `${edu.start_year} — ${edu.end_year ?? "Present"}`,
                    ].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <button type="button" onClick={() => handleRemoveEducation(edu.id)} className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        {showAddEducation ? (
          <div className="space-y-3 rounded-lg border border-dashed p-4">
            <Input value={eduSchool} onChange={(e) => setEduSchool(e.target.value)} placeholder="School *" maxLength={200} />
            <Input value={eduDegree} onChange={(e) => setEduDegree(e.target.value)} placeholder="Degree" maxLength={200} />
            <Input value={eduField} onChange={(e) => setEduField(e.target.value)} placeholder="Field of study" maxLength={200} />
            <div className="flex gap-3">
              <Input value={eduStartYear} onChange={(e) => setEduStartYear(e.target.value)} placeholder="Start year" type="number" min={1950} max={2030} className="flex-1" />
              <Input value={eduEndYear} onChange={(e) => setEduEndYear(e.target.value)} placeholder="End year" type="number" min={1950} max={2030} disabled={eduPresent} className="flex-1" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={eduPresent} onChange={(e) => { setEduPresent(e.target.checked); if (e.target.checked) setEduEndYear(""); }} className="rounded" />
              Present
            </label>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddEducation}>Add</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddEducation(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowAddEducation(true)} className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Add education
          </button>
        )}
      </SectionCard>

      {/* Interests */}
      {interests.length > 0 && (
        <SectionCard>
          <SectionHeader icon={Globe} title="Interests" subtitle="Select topics you're interested in to help with networking." />
          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => {
              const checked = checkedInterests.has(interest.id);
              return (
                <label
                  key={interest.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors select-none ${
                    checked
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border hover:bg-accent text-muted-foreground"
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
        </SectionCard>
      )}

      {/* Links */}
      <SectionCard>
        <SectionHeader icon={Link2} title="Links" />
        {links.length > 0 && (
          <div className="space-y-2 mb-4">
            {links.map((link, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                <LinkTypeIcon type={link.type} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{link.label || link.url}</p>
                  <p className="text-xs text-muted-foreground capitalize">{link.type}</p>
                </div>
                <button type="button" onClick={() => handleRemoveLink(i)} className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        {showAddLink ? (
          <div className="space-y-3 rounded-lg border border-dashed p-4">
            <select value={linkType} onChange={(e) => setLinkType(e.target.value as ProfileLink["type"])} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
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
          <button type="button" onClick={() => setShowAddLink(true)} className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Add link
          </button>
        )}
      </SectionCard>

      {/* Directory visibility */}
      <SectionCard>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Directory Visibility</p>
            <p className="text-xs text-muted-foreground">
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
      </SectionCard>

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={isPending || uploading || !displayName.trim()}
        className="w-full"
        size="lg"
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
