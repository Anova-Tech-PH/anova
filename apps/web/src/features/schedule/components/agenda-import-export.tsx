"use client";

import { useState, useRef, useTransition } from "react";
import { Download, Upload, Calendar, FileSpreadsheet, X } from "lucide-react";
import { toast } from "sonner";
import { Button, ModalOverlay } from "@attendly/ui/components";
import { sessionsToCSV, type SessionForExport } from "../csv-export";
import { parseSessionsCSV, type ParsedSession } from "../csv-import";
import { generateSessionIcs, type ICalSession } from "../ical";
import { bulkImportSessions } from "../actions";

interface AgendaImportExportProps {
  eventId: string;
  sessions: SessionForExport[];
}

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  // Defer cleanup so the browser has time to initiate the download
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

export function AgendaImportExport({ eventId, sessions }: AgendaImportExportProps) {
  const [showImportModal, setShowImportModal] = useState(false);
  const [parsedSessions, setParsedSessions] = useState<ParsedSession[]>([]);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExportCSV() {
    const csv = sessionsToCSV(sessions);
    triggerDownload(csv, "agenda.csv", "text/csv;charset=utf-8");
    toast.success("CSV exported successfully");
  }

  function handleExportICal() {
    const icalSessions: ICalSession[] = sessions.map((s, i) => ({
      id: `session-${i}`,
      title: s.title,
      description: s.description,
      start_time: s.start_time,
      end_time: s.end_time,
      location: s.location,
    }));

    // Generate a combined calendar
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Attendly//Events//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    for (const session of icalSessions) {
      const singleIcs = generateSessionIcs(session);
      // Extract just the VEVENT portion
      const veventMatch = singleIcs.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/);
      if (veventMatch) {
        lines.push(veventMatch[0]);
      }
    }

    lines.push("END:VCALENDAR");
    const icsContent = lines.join("\r\n");

    triggerDownload(icsContent, "agenda.ics", "text/calendar;charset=utf-8");
    toast.success("iCal exported successfully");
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseSessionsCSV(text);
      if (parsed.length === 0) {
        toast.error("No valid sessions found in CSV");
        return;
      }
      setParsedSessions(parsed);
      setShowImportModal(true);
    };
    reader.readAsText(file);

    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleConfirmImport() {
    startTransition(async () => {
      try {
        await bulkImportSessions(eventId, parsedSessions);
        toast.success(`Imported ${parsedSessions.length} sessions`);
        setShowImportModal(false);
        setParsedSessions([]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Import failed");
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <FileSpreadsheet className="mr-1.5 h-4 w-4" />
          Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportICal}>
          <Calendar className="mr-1.5 h-4 w-4" />
          Export iCal
        </Button>
        <label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 cursor-pointer">
            <Upload className="mr-1.5 h-4 w-4" />
            Import CSV
          </span>
        </label>
      </div>

      {showImportModal && (
        <ModalOverlay onClose={() => setShowImportModal(false)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Import Preview ({parsedSessions.length} sessions)
              </h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="rounded p-1 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium">Title</th>
                    <th className="pb-2 pr-4 font-medium">Type</th>
                    <th className="pb-2 pr-4 font-medium">Track</th>
                    <th className="pb-2 pr-4 font-medium">Start</th>
                    <th className="pb-2 font-medium">Speakers</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedSessions.map((s, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-4">{s.title}</td>
                      <td className="py-2 pr-4">{s.type}</td>
                      <td className="py-2 pr-4">{s.trackName || "-"}</td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {s.start_time ? new Date(s.start_time).toLocaleString() : "-"}
                      </td>
                      <td className="py-2">{s.speakerNames.join(", ") || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowImportModal(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmImport} disabled={isPending}>
                {isPending ? "Importing..." : `Import ${parsedSessions.length} Sessions`}
              </Button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </>
  );
}
