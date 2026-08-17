"use client";

import { useState } from "react";
import { Settings, ClipboardList, Send } from "lucide-react";
import type {
  VolunteerSettings,
  VolunteerRole,
  VolunteerQuestion,
  VolunteerApplication,
  VolunteerInvitation,
  VolunteerBreakdown,
} from "../queries";
import { SetupTab } from "./setup-tab";
import { ApplicationsTab } from "./applications-tab";
import { InvitationsTab } from "./invitations-tab";

interface VolunteerPageClientProps {
  eventId: string;
  settings: VolunteerSettings | null;
  roles: VolunteerRole[];
  questions: VolunteerQuestion[];
  applications: VolunteerApplication[];
  totalApplications: number;
  invitations: VolunteerInvitation[];
  breakdown: VolunteerBreakdown;
  applicationUrl: string | null;
}

const tabs = [
  { key: "setup" as const, label: "Setup", icon: Settings },
  { key: "applications" as const, label: "Applications", icon: ClipboardList },
  { key: "invitations" as const, label: "Invitations", icon: Send },
];

export function VolunteerPageClient({
  eventId,
  settings,
  roles,
  questions,
  applications,
  totalApplications,
  invitations,
  breakdown,
  applicationUrl,
}: VolunteerPageClientProps) {
  const [currentTab, setCurrentTab] = useState<"setup" | "applications" | "invitations">("setup");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Volunteer Manager</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Recruit, manage, and coordinate event volunteers.
        </p>
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
            {tab.key === "applications" && breakdown.pending > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {breakdown.pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {currentTab === "setup" && (
        <SetupTab
          eventId={eventId}
          settings={settings}
          roles={roles}
          questions={questions}
          applicationUrl={applicationUrl}
        />
      )}

      {currentTab === "applications" && (
        <ApplicationsTab
          eventId={eventId}
          applications={applications}
          total={totalApplications}
          roles={roles}
          breakdown={breakdown}
        />
      )}

      {currentTab === "invitations" && (
        <InvitationsTab
          eventId={eventId}
          invitations={invitations}
          applicationUrl={applicationUrl}
        />
      )}
    </div>
  );
}
