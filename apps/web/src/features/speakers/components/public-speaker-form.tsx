"use client";

import { useState, useTransition } from "react";
import { Button, Input, Textarea } from "@attendly/ui/components";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { ImageUpload } from "@/shared/components/image-upload";
import { submitSpeakerForm } from "../public-form-actions";
import type { FormFieldConfig } from "../settings-constants";

type Speaker = {
  id: string;
  name: string;
  email: string | null;
  title: string | null;
  company: string | null;
  bio: string | null;
  photo: string | null;
  linkedin_url: string | null;
  twitter_handle: string | null;
  website_url: string | null;
};

type PublicSpeakerFormProps = {
  token: string;
  speaker: Speaker;
  eventName: string;
  fields: FormFieldConfig[];
};

export function PublicSpeakerForm({
  token,
  speaker,
  eventName,
  fields,
}: PublicSpeakerFormProps) {
  const [formData, setFormData] = useState<Record<string, string | null>>(() => {
    const initial: Record<string, string | null> = {};
    for (const field of fields) {
      const key = field.field_key as keyof Speaker;
      initial[field.field_key] = (speaker[key] as string | null) ?? null;
    }
    return initial;
  });
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  const visibleFields = fields.filter((f) => !f.organizer_only && f.included);

  function handleChange(key: string, value: string | null) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate required fields
    for (const field of visibleFields) {
      if (field.required && !formData[field.field_key]?.trim()) {
        toast.error(`${field.label} is required`);
        return;
      }
    }

    startTransition(async () => {
      try {
        await submitSpeakerForm(token, formData);
        setSubmitted(true);
        toast.success("Your profile has been updated!");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <CheckCircle className="h-16 w-16 text-green-500" />
        <h2 className="text-xl font-semibold">Thank you!</h2>
        <p className="text-muted-foreground">
          Your speaker profile for {eventName} has been submitted successfully.
        </p>
        <Button
          variant="outline"
          onClick={() => setSubmitted(false)}
        >
          Edit Your Profile
        </Button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-lg font-medium">{eventName}</p>
      <p className="text-muted-foreground mb-6">
        Hi {speaker.name}, please fill in your speaker details below.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {visibleFields.map((field) => {
          const value = formData[field.field_key] ?? "";

          if (field.field_type === "image") {
            return (
              <div key={field.field_key}>
                <ImageUpload
                  label={field.required ? `${field.label} *` : field.label}
                  value={value || null}
                  onChange={(url) => handleChange(field.field_key, url)}
                  folder="speakers"
                />
              </div>
            );
          }

          if (field.field_type === "textarea") {
            return (
              <div key={field.field_key}>
                <label htmlFor={field.field_key} className="block text-sm font-medium mb-1">
                  {field.label}{field.required ? " *" : ""}
                </label>
                <Textarea
                  id={field.field_key}
                  value={value}
                  onChange={(e) => handleChange(field.field_key, e.target.value)}
                  rows={4}
                />
              </div>
            );
          }

          return (
            <div key={field.field_key}>
              <label htmlFor={field.field_key} className="block text-sm font-medium mb-1">
                {field.label}{field.required ? " *" : ""}
              </label>
              <Input
                id={field.field_key}
                type={field.field_type === "url" ? "url" : "text"}
                value={value}
                onChange={(e) => handleChange(field.field_key, e.target.value)}
              />
            </div>
          );
        })}

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Saving..." : "Save Profile"}
        </Button>
      </form>
    </div>
  );
}
