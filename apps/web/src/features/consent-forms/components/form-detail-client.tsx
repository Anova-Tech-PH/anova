"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft, Hammer, FileText } from "lucide-react";
import { Button } from "@attendly/ui/components";
import { FormSettings } from "./form-settings";
import { FormBuilder } from "./form-builder";
import { SubmissionsTable } from "./submissions-table";
import type { ConsentForm, ConsentFormElement, ConsentFormSubmission } from "../queries";

interface FormDetailClientProps {
  eventId: string;
  form: ConsentForm;
  elements: ConsentFormElement[];
  submissions: ConsentFormSubmission[];
  formUrl: string | null;
}

const tabs = [
  { key: "builder" as const, label: "Builder", icon: Hammer },
  { key: "submissions" as const, label: "Submissions", icon: FileText },
];

export function FormDetailClient({
  eventId,
  form,
  elements,
  submissions,
  formUrl,
}: FormDetailClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = pathname.slice(0, pathname.indexOf(`/events/${eventId}`) + `/events/${eventId}`.length);
  const [currentTab, setCurrentTab] = useState<"builder" | "submissions">(
    "builder"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            router.push(`${basePath}/release-consent-forms`)
          }
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">{form.title}</h2>
          <p className="text-sm text-muted-foreground">
            {form.status === "published" ? "Published" : "Draft"}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setCurrentTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              currentTab === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.key === "submissions" && submissions.length > 0 && (
              <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {submissions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {currentTab === "builder" && (
        <div className="space-y-6">
          <FormSettings eventId={eventId} form={form} formUrl={formUrl} />
          <FormBuilder eventId={eventId} formId={form.id} elements={elements} />
        </div>
      )}

      {currentTab === "submissions" && (
        <SubmissionsTable
          eventId={eventId}
          formId={form.id}
          submissions={submissions}
          formStatus={form.status}
        />
      )}
    </div>
  );
}
