import type { SurveyQuestion, SurveyResponse } from "./queries";

export function surveyResponsesToCsv(
  questions: SurveyQuestion[],
  responses: SurveyResponse[],
): string {
  const headers = ["Email", "Submitted At", ...questions.map((q) => q.label)];
  const rows = responses.map((r) => [
    r.respondent_email,
    new Date(r.created_at).toLocaleString(),
    ...questions.map((q) => String(r.answers[q.id] ?? "")),
  ]);
  return [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
