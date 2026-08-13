/**
 * CSV export utility for sessions.
 */

export interface SessionForExport {
  title: string;
  description: string | null;
  type: string;
  start_time: string;
  end_time: string;
  location: string | null;
  session_tracks: { tracks: { name: string } }[];
  session_speakers: { speakers: { name: string } }[];
}

function escapeCSVField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const HEADERS = ["title", "description", "type", "track", "start_time", "end_time", "location", "speakers"];

export function sessionsToCSV(sessions: SessionForExport[]): string {
  const rows = sessions.map((s) => {
    const tracks = s.session_tracks.map((st) => st.tracks.name).join(";");
    const speakers = s.session_speakers.map((ss) => ss.speakers.name).join(";");
    const fields = [
      s.title,
      s.description ?? "",
      s.type,
      tracks,
      s.start_time,
      s.end_time,
      s.location ?? "",
      speakers,
    ];
    return fields.map(escapeCSVField).join(",");
  });

  return [HEADERS.join(","), ...rows].join("\n");
}
