/**
 * CSV import parser for sessions (RFC-4180 basic).
 */

export interface ParsedSession {
  title: string;
  description: string;
  type: string;
  start_time: string;
  end_time: string;
  location: string;
  trackNames: string[];
  speakerNames: string[];
}

const ALLOWED_TYPES = new Set(["talk", "workshop", "panel", "keynote", "break"]);

/**
 * Parse a single CSV line respecting quoted fields (RFC-4180 basic).
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        current += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
        i++;
      } else {
        current += ch;
        i++;
      }
    }
  }

  fields.push(current);
  return fields;
}

export function parseSessionsCSV(csvText: string): ParsedSession[] {
  const lines = csvText.split("\n").filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());

  const colIndex = (name: string) => headers.indexOf(name);

  const titleIdx = colIndex("title");
  const descIdx = colIndex("description");
  const typeIdx = colIndex("type");
  const trackIdx = colIndex("track");
  const startIdx = colIndex("start_time");
  const endIdx = colIndex("end_time");
  const locationIdx = colIndex("location");
  const speakersIdx = colIndex("speakers");

  if (titleIdx === -1) return [];

  const seen = new Set<string>();
  const results: ParsedSession[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const get = (idx: number) => (idx >= 0 && idx < fields.length ? fields[idx].trim() : "");

    const title = get(titleIdx);
    if (!title) continue;

    const startTime = get(startIdx);
    const dedupKey = `${title}||${startTime}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    const rawType = get(typeIdx).toLowerCase();
    const type = ALLOWED_TYPES.has(rawType) ? rawType : "talk";

    const speakersRaw = get(speakersIdx);
    const speakerNames = speakersRaw
      ? speakersRaw.split(";").map((s) => s.trim()).filter(Boolean)
      : [];

    results.push({
      title,
      description: get(descIdx),
      type,
      start_time: startTime,
      end_time: get(endIdx),
      location: get(locationIdx),
      trackNames: (() => {
        const trackRaw = get(trackIdx);
        return trackRaw
          ? trackRaw.split(";").map((s) => s.trim()).filter(Boolean)
          : [];
      })(),
      speakerNames,
    });
  }

  return results;
}
