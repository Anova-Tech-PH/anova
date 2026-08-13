function getUTCOffset(tz: string): string {
  try {
    // Use a fixed reference date to get deterministic results across server/client
    const ref = new Date("2025-01-15T12:00:00Z");
    const utcStr = ref.toLocaleString("en-US", { timeZone: "UTC" });
    const tzStr = ref.toLocaleString("en-US", { timeZone: tz });
    const utcDate = new Date(utcStr);
    const tzDate = new Date(tzStr);
    const diffMinutes = Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
    if (diffMinutes === 0) return "UTC";
    const sign = diffMinutes > 0 ? "+" : "-";
    const absMinutes = Math.abs(diffMinutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    return mins > 0 ? `UTC${sign}${hours}:${String(mins).padStart(2, "0")}` : `UTC${sign}${hours}`;
  } catch {
    return "UTC";
  }
}

export const TIMEZONE_OPTIONS = Intl.supportedValuesOf("timeZone").map((tz) => ({
  value: tz,
  label: `(${getUTCOffset(tz)}) ${tz.replace(/_/g, " ")}`,
}));

export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16);
}
