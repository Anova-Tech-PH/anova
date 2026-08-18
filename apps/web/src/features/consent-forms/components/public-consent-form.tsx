"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@attendly/ui/components";
import { CheckCircle2, PenTool, XCircle } from "lucide-react";
import type { ConsentFormElement } from "../queries";
import { submitConsentForm } from "../actions";

interface PublicConsentFormProps {
  formId: string;
  title: string;
  description: string | null;
  elements: ConsentFormElement[];
  eventTitle: string;
  userEmail?: string;
  userName?: string;
}

export function PublicConsentForm({
  formId,
  title,
  description,
  elements,
  eventTitle,
  userEmail,
  userName,
}: PublicConsentFormProps) {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState(userName ?? "");
  const [email, setEmail] = useState(userEmail ?? "");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [signedName, setSignedName] = useState("");

  if (submitted) {
    return (
      <div className="text-center py-16">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
        <h2 className="mt-4 text-xl font-semibold">
          {alreadySigned ? "Already Signed" : "Form Submitted"}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {alreadySigned
            ? "You have already signed this form. No further action is needed."
            : "Thank you for signing this form. Your submission has been recorded."}
        </p>
      </div>
    );
  }

  function updateAnswer(elementId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [elementId]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || !email.trim()) {
      setFormError("Name and email are required.");
      return;
    }

    // Validate required elements
    for (const el of elements) {
      if (!el.is_required) continue;

      if (el.type === "checkbox") {
        if (!answers[el.id]) {
          setFormError(`Please check: "${el.label}"`);
          return;
        }
      } else if (el.type === "text" || el.type === "textarea") {
        const val = answers[el.id];
        if (!val || (typeof val === "string" && !val.trim())) {
          setFormError(`Please fill in: "${el.label}"`);
          return;
        }
      } else if (el.type === "signature") {
        if (!signedName.trim()) {
          setFormError("Please type your name in the signature field.");
          return;
        }
      }
    }

    startTransition(async () => {
      const result = await submitConsentForm(formId, {
        email: email.trim(),
        name: name.trim(),
        signed_name: signedName.trim(),
        answers,
      });

      if (result.error) {
        if (result.error.includes("already signed")) {
          setAlreadySigned(true);
          setSubmitted(true);
        } else {
          setFormError(result.error);
        }
      } else {
        setSubmitted(true);
      }
    });
  }

  const hasSignature = elements.some((el) => el.type === "signature");

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Title & Description */}
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{eventTitle}</p>
        {description && (
          <div className="mt-4 text-sm whitespace-pre-line">{description}</div>
        )}
      </div>

      {/* Personal Info */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Your Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Full Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
        </div>
      </section>

      {/* Form Elements */}
      {elements.length > 0 && (
        <section className="space-y-5">
          {elements.map((el) => (
            <div key={el.id}>
              {el.type === "description" && (
                <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground whitespace-pre-line">
                  {el.label}
                </div>
              )}

              {el.type === "checkbox" && (
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={!!answers[el.id]}
                    onChange={(e) => updateAnswer(el.id, e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border"
                  />
                  <span className="text-sm">
                    {el.label}
                    {el.is_required && (
                      <span className="text-red-500"> *</span>
                    )}
                  </span>
                </label>
              )}

              {el.type === "text" && (
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {el.label}
                    {el.is_required && (
                      <span className="text-red-500"> *</span>
                    )}
                  </label>
                  <Input
                    value={(answers[el.id] as string) ?? ""}
                    onChange={(e) => updateAnswer(el.id, e.target.value)}
                    placeholder={el.label}
                  />
                </div>
              )}

              {el.type === "textarea" && (
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {el.label}
                    {el.is_required && (
                      <span className="text-red-500"> *</span>
                    )}
                  </label>
                  <textarea
                    value={(answers[el.id] as string) ?? ""}
                    onChange={(e) => updateAnswer(el.id, e.target.value)}
                    rows={3}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder={el.label}
                  />
                </div>
              )}

              {el.type === "signature" && (
                <div className="space-y-3 rounded-lg border p-5">
                  <div className="flex items-center gap-2">
                    <PenTool className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">{el.label}</h3>
                    {el.is_required && (
                      <span className="text-red-500">*</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Type your full legal name below to serve as your electronic
                    signature.
                  </p>
                  <Input
                    value={signedName}
                    onChange={(e) => setSignedName(e.target.value)}
                    placeholder="Type your full name"
                    className="font-serif text-lg italic"
                  />
                  <p className="text-xs text-muted-foreground">
                    Date:{" "}
                    {new Date().toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Error */}
      {formError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Submit */}
      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending
          ? "Submitting..."
          : hasSignature
            ? "Sign & Submit"
            : "Submit"}
      </Button>
    </form>
  );
}
