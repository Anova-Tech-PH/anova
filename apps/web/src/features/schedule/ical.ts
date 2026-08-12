/**
 * iCal (.ics) generation utility for sessions.
 */

export interface ICalSession {
  id: string;
  title: string;
  description?: string | null;
  start_time: string; // ISO 8601
  end_time: string;   // ISO 8601
  location?: string | null;
}

function escapeIcalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatIcalDate(isoDate: string): string {
  // Convert to UTC format: YYYYMMDDTHHMMSSZ
  const d = new Date(isoDate);
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function generateSessionIcs(session: ICalSession): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Attendly//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${session.id}@attendly`,
    `DTSTART:${formatIcalDate(session.start_time)}`,
    `DTEND:${formatIcalDate(session.end_time)}`,
    `SUMMARY:${escapeIcalText(session.title)}`,
  ];

  if (session.description) {
    lines.push(`DESCRIPTION:${escapeIcalText(session.description)}`);
  }

  if (session.location) {
    lines.push(`LOCATION:${escapeIcalText(session.location)}`);
  }

  lines.push(`DTSTAMP:${formatIcalDate(new Date().toISOString())}`);
  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

export function generateSessionIcsUrl(session: ICalSession): string {
  const icsContent = generateSessionIcs(session);
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
}
