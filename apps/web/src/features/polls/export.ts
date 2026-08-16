import type { PollWithResults } from "./queries";

export function pollsToCsv(polls: PollWithResults[]): string {
  const rows: string[][] = [
    ["Question", "Option", "Votes", "Percentage", "Status", "Session"],
  ];
  for (const poll of polls) {
    const answerType = poll.answer_type ?? "multiple_choice";

    if (answerType === "star_rating" && poll.rating_distribution) {
      for (let star = 1; star <= 5; star++) {
        const count = poll.rating_distribution[star] ?? 0;
        const pct =
          poll.total_votes > 0
            ? ((count / poll.total_votes) * 100).toFixed(1)
            : "0.0";
        rows.push([
          poll.question,
          `${star} star${star !== 1 ? "s" : ""}`,
          String(count),
          `${pct}%`,
          poll.status,
          poll.session_title ?? "",
        ]);
      }
    } else if (answerType === "short_answer" && poll.text_responses) {
      for (const response of poll.text_responses) {
        rows.push([
          poll.question,
          response,
          "1",
          "",
          poll.status,
          poll.session_title ?? "",
        ]);
      }
    } else if (answerType === "word_cloud" && poll.word_frequencies) {
      const totalWords = Object.values(poll.word_frequencies).reduce(
        (a, b) => a + b,
        0
      );
      for (const [word, count] of Object.entries(poll.word_frequencies)) {
        const pct =
          totalWords > 0
            ? ((count / totalWords) * 100).toFixed(1)
            : "0.0";
        rows.push([
          poll.question,
          word,
          String(count),
          `${pct}%`,
          poll.status,
          poll.session_title ?? "",
        ]);
      }
    } else {
      // multiple_choice and checkbox
      for (const opt of poll.options) {
        const count = poll.vote_counts[opt.id] ?? 0;
        const pct =
          poll.total_votes > 0
            ? ((count / poll.total_votes) * 100).toFixed(1)
            : "0.0";
        rows.push([
          poll.question,
          opt.text,
          String(count),
          `${pct}%`,
          poll.status,
          poll.session_title ?? "",
        ]);
      }
    }
  }
  return rows
    .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
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
