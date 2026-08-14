import type { PollWithResults } from "./queries";

export function pollsToCsv(polls: PollWithResults[]): string {
  const rows: string[][] = [
    ["Question", "Option", "Votes", "Percentage", "Status", "Session"],
  ];
  for (const poll of polls) {
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
