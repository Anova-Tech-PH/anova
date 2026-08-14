"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button, Badge, Card, ConfirmDialog } from "@attendly/ui/components";
import { deleteSurvey, toggleSurveyStatus } from "../actions";
import { SurveyBuilder } from "./survey-builder";
import { SurveyResults } from "./survey-results";
import type { Survey, SurveyQuestion, SurveyResponse } from "../queries";

type SurveyStatsData = {
  totalResponses: number;
  questionStats: Record<string, unknown>;
  responses?: SurveyResponse[];
};

const statusVariant: Record<string, "success" | "outline" | "warning"> = {
  active: "success",
  draft: "outline",
  closed: "warning",
};

export function SurveyList({
  eventId,
  surveys,
  statsMap,
}: {
  eventId: string;
  surveys: Survey[];
  statsMap: Record<string, SurveyStatsData>;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  async function handleDelete(surveyId: string) {
    setDeleting(surveyId);
    try {
      await deleteSurvey(eventId, surveyId);
      toast.success("Survey deleted");
      setConfirmDeleteId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete survey");
    } finally {
      setDeleting(null);
    }
  }

  async function handleStatusChange(
    surveyId: string,
    newStatus: "draft" | "active" | "closed"
  ) {
    setTogglingStatus(surveyId);
    try {
      await toggleSurveyStatus(eventId, surveyId, newStatus);
      toast.success(`Survey status changed to ${newStatus}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setTogglingStatus(null);
    }
  }

  const nextStatus: Record<string, "draft" | "active" | "closed"> = {
    draft: "active",
    active: "closed",
    closed: "draft",
  };

  const statusAction: Record<string, string> = {
    draft: "Activate",
    active: "Close",
    closed: "Reopen as Draft",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Surveys</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create feedback surveys for your attendees. Share the link after your event.
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Create Survey
        </Button>
      </div>

      {showCreate && (
        <SurveyBuilder eventId={eventId} initialSurvey={null} mode="create" />
      )}

      {surveys.length === 0 && !showCreate && (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">No surveys yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Click &quot;Create Survey&quot; to get started.
          </p>
        </Card>
      )}

      {surveys.map((survey) => {
        const stats = statsMap[survey.id];
        const isExpanded = expandedId === survey.id;

        return (
          <Card key={survey.id} className="overflow-hidden">
            <button
              type="button"
              onClick={() => toggleExpand(survey.id)}
              className="flex w-full items-center gap-4 p-5 text-left hover:bg-muted/30 transition-colors"
            >
              <div className="text-muted-foreground">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{survey.title}</h3>
                  <Badge variant={statusVariant[survey.status] ?? "outline"}>
                    {survey.status}
                  </Badge>
                </div>
                {survey.description && (
                  <p className="mt-0.5 text-sm text-muted-foreground truncate">
                    {survey.description}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{stats?.totalResponses ?? 0} response{(stats?.totalResponses ?? 0) !== 1 ? "s" : ""}</span>
                  <span>{survey.questions.length} question{survey.questions.length !== 1 ? "s" : ""}</span>
                  <span>Created {new Date(survey.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange(survey.id, nextStatus[survey.status])}
                  disabled={togglingStatus === survey.id}
                >
                  {statusAction[survey.status]}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setConfirmDeleteId(survey.id)}
                  className="h-8 w-8"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t p-5">
                <div className="grid gap-8 lg:grid-cols-2">
                  <SurveyBuilder
                    eventId={eventId}
                    initialSurvey={survey}
                    mode="edit"
                  />
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Results</h3>
                    {stats && stats.totalResponses > 0 ? (
                      <SurveyResults
                        stats={stats as Parameters<typeof SurveyResults>[0]["stats"]}
                        questions={survey.questions}
                        responses={stats.responses ?? []}
                        surveyTitle={survey.title}
                      />
                    ) : (
                      <div className="rounded-xl border border-dashed bg-muted/20 py-12 text-center text-muted-foreground">
                        No responses yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
        );
      })}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete Survey"
        description="Are you sure you want to delete this survey? All responses will be permanently lost."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
