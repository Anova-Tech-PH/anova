"use client";

import { useState, useTransition } from "react";
import { RotateCcw, X, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Badge, ModalOverlay } from "@attendly/ui/components";
import { fetchPastSurveys, duplicateSurvey } from "../actions";
import type { PastSurvey } from "../queries";

export function ReuseSurveyDialog({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [pastSurveys, setPastSurveys] = useState<PastSurvey[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleOpen() {
    setOpen(true);
    setLoading(true);
    try {
      const surveys = await fetchPastSurveys(eventId);
      setPastSurveys(surveys);
    } catch {
      toast.error("Failed to load past surveys");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setPastSurveys([]);
  }

  function handleSelect(survey: PastSurvey) {
    startTransition(async () => {
      try {
        await duplicateSurvey(eventId, survey.title, survey.questions);
        toast.success(`Survey "${survey.title}" duplicated as draft`);
        handleClose();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to duplicate survey"
        );
      }
    });
  }

  // Group surveys by event
  const grouped = pastSurveys.reduce<
    Record<string, { eventTitle: string; surveys: PastSurvey[] }>
  >((acc, survey) => {
    if (!acc[survey.event_id]) {
      acc[survey.event_id] = {
        eventTitle: survey.event_title,
        surveys: [],
      };
    }
    acc[survey.event_id].surveys.push(survey);
    return acc;
  }, {});

  return (
    <>
      <Button variant="outline" onClick={handleOpen}>
        <RotateCcw className="mr-1.5 h-4 w-4" />
        Reuse survey
      </Button>

      {open && (
        <ModalOverlay onClose={handleClose}>
          <div className="w-full max-w-lg rounded-lg border bg-background shadow-lg">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="text-lg font-semibold">
                Reuse a survey from a past event
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="max-h-96 overflow-y-auto p-4">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {!loading && pastSurveys.length === 0 && (
                <div className="py-12 text-center">
                  <FileText className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    No surveys found in other events.
                  </p>
                </div>
              )}

              {!loading &&
                Object.entries(grouped).map(
                  ([eventId, { eventTitle, surveys }]) => (
                    <div key={eventId} className="mb-4 last:mb-0">
                      <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {eventTitle}
                      </h4>
                      <div className="space-y-2">
                        {surveys.map((survey) => (
                          <button
                            key={survey.id}
                            type="button"
                            onClick={() => handleSelect(survey)}
                            disabled={isPending}
                            className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {survey.title}
                              </span>
                              <Badge variant="outline">
                                {survey.questions.length} question
                                {survey.questions.length !== 1 ? "s" : ""}
                              </Badge>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                )}
            </div>
          </div>
        </ModalOverlay>
      )}
    </>
  );
}
