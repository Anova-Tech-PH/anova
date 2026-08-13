"use client";

import { useState, useRef } from "react";
import { X, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button, ModalOverlay } from "@attendly/ui/components";
import { bulkImportSpeakers } from "../actions";

type ParsedRow = {
  name: string;
  title?: string;
  company?: string;
  bio?: string;
  email?: string;
  linkedin_url?: string;
  twitter_handle?: string;
  website_url?: string;
};

function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIdx = headers.indexOf("name");
  if (nameIdx === -1) return [];

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const name = values[nameIdx]?.trim();
    if (!name) continue;

    const row: ParsedRow = { name };
    const fieldMap: Record<string, keyof ParsedRow> = {
      title: "title",
      company: "company",
      bio: "bio",
      email: "email",
      linkedin_url: "linkedin_url",
      twitter_handle: "twitter_handle",
      website_url: "website_url",
    };

    for (const [header, field] of Object.entries(fieldMap)) {
      const idx = headers.indexOf(header);
      if (idx !== -1 && values[idx]?.trim()) {
        row[field] = values[idx].trim();
      }
    }
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}

export function SpeakerCsvImport({
  eventId,
  onClose,
  onImported,
}: {
  eventId: string;
  onClose: () => void;
  onImported: (speakers: Array<{ id: string; name: string; [key: string]: unknown }>) => void;
}) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a .csv file");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        toast.error("No valid rows found. Ensure the CSV has a 'name' column header.");
        return;
      }
      setRows(parsed);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setLoading(true);
    try {
      const imported = await bulkImportSpeakers(eventId, rows);
      toast.success(`Imported ${imported.length} speakers`);
      onImported(imported);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-full max-w-2xl rounded-xl border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Import Speakers from CSV</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a CSV file with columns: <strong>name</strong> (required), title, company, bio,
              email, linkedin_url, twitter_handle, website_url
            </p>
            <div
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              <Upload className="h-8 w-8" />
              <p className="text-sm font-medium">
                {fileName ?? "Click to upload or drag a .csv file"}
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              {fileName} - {rows.length} rows parsed
            </div>

            <div className="max-h-64 overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-left font-medium">Title</th>
                    <th className="px-3 py-2 text-left font-medium">Company</th>
                    <th className="px-3 py-2 text-left font-medium">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2">{row.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.title ?? "-"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.company ?? "-"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.email ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setRows([]);
                  setFileName(null);
                }}
              >
                Clear
              </Button>
              <Button onClick={handleImport} loading={loading} disabled={loading}>
                {loading ? "Importing..." : `Import ${rows.length} Speakers`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
