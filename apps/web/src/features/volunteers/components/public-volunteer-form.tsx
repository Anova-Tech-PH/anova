"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@attendly/ui/components";
import { CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react";
import type { VolunteerRole, VolunteerQuestion } from "../queries";
import { submitApplication } from "../actions";

interface PublicVolunteerFormProps {
  eventId: string;
  title: string;
  instructions: string | null;
  bannerImageUrl: string | null;
  applicationDeadline: string | null;
  roles: VolunteerRole[];
  questions: VolunteerQuestion[];
  eventDates: { start_date: string; end_date: string };
  eventTitle: string;
  userEmail?: string;
  userName?: string;
}

function getEventDays(startDate: string, endDate: string): string[] {
  const days: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    days.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  return days;
}

export function PublicVolunteerForm({
  eventId,
  title,
  instructions,
  bannerImageUrl,
  applicationDeadline,
  roles,
  questions,
  eventDates,
  eventTitle,
  userEmail,
  userName,
}: PublicVolunteerFormProps) {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState(userName ?? "");
  const [email, setEmail] = useState(userEmail ?? "");
  const [phone, setPhone] = useState("");
  const [organization, setOrganization] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const eventDays = getEventDays(eventDates.start_date, eventDates.end_date);
  const isDeadlinePassed =
    applicationDeadline && new Date(applicationDeadline) < new Date();

  if (isDeadlinePassed) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Applications Closed</h2>
        <p className="mt-2 text-muted-foreground">
          The deadline for volunteer applications has passed.
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="text-center py-16">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
        <h2 className="mt-4 text-xl font-semibold">Thank You!</h2>
        <p className="mt-2 text-muted-foreground">
          Your volunteer application has been submitted. You&apos;ll hear from us soon.
        </p>
      </div>
    );
  }

  function toggleRole(roleId: string) {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  }

  function toggleDay(day: string) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || !email.trim()) {
      setFormError("Name and email are required.");
      return;
    }

    // Validate required questions
    for (const q of questions) {
      if (q.is_required && !answers[q.id]?.trim()) {
        setFormError(`Please answer: ${q.question_text}`);
        return;
      }
    }

    startTransition(async () => {
      const result = await submitApplication(eventId, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        organization: organization.trim() || undefined,
        roleIds: Array.from(selectedRoles),
        availability: Array.from(selectedDays).map((date) => ({ date })),
        answers: Object.entries(answers)
          .filter(([, v]) => v.trim())
          .map(([questionId, answerText]) => ({ questionId, answerText })),
      });
      if (result.error) {
        setFormError(result.error);
      } else {
        setSubmitted(true);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Banner */}
      {bannerImageUrl && (
        <img
          src={bannerImageUrl}
          alt=""
          className="w-full h-48 object-cover rounded-xl"
        />
      )}

      {/* Title & Instructions */}
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{eventTitle}</p>
        {instructions && (
          <div className="mt-4 text-sm whitespace-pre-line">{instructions}</div>
        )}
        {applicationDeadline && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Applications close on{" "}
            {new Date(applicationDeadline).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        )}
      </div>

      {/* Personal Info */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Personal Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Name <span className="text-red-500">*</span>
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
          <div>
            <label className="mb-1 block text-sm font-medium">Phone</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(optional)"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Organization</label>
            <Input
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="(optional)"
            />
          </div>
        </div>
      </section>

      {/* Role Preferences */}
      {roles.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Role Preferences</h2>
          <p className="text-sm text-muted-foreground">
            Select the roles you&apos;re interested in.
          </p>
          <div className="space-y-2">
            {roles.map((role) => (
              <label
                key={role.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                  selectedRoles.has(role.id)
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedRoles.has(role.id)}
                  onChange={() => toggleRole(role.id)}
                  className="mt-0.5 h-4 w-4 rounded border"
                />
                <div>
                  <span className="font-medium text-sm">{role.name}</span>
                  {role.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {role.description}
                    </p>
                  )}
                  {role.max_volunteers && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Limited spots available
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </section>
      )}

      {/* Availability */}
      {eventDays.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Availability</h2>
          <p className="text-sm text-muted-foreground">
            Select the days you&apos;re available to volunteer.
          </p>
          <div className="flex flex-wrap gap-2">
            {eventDays.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  selectedDays.has(day)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted/50"
                }`}
              >
                {new Date(day + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Custom Questions */}
      {questions.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Additional Questions</h2>
          {questions.map((q) => (
            <div key={q.id}>
              <label className="mb-1 block text-sm font-medium">
                {q.question_text}
                {q.is_required && <span className="text-red-500"> *</span>}
              </label>
              <textarea
                value={answers[q.id] ?? ""}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                }
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                required={q.is_required}
              />
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
        {isPending ? "Submitting..." : "Submit Application"}
      </Button>
    </form>
  );
}
