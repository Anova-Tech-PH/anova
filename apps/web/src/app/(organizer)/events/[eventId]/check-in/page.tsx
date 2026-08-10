import { QrScanner } from "@/features/registration/components/qr-scanner";
import { CheckInStats } from "@/features/registration/components/check-in-stats";
import { createClient } from "@attendly/ui/supabase/server";
import Link from "next/link";
import { ScanLine, Monitor } from "lucide-react";

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: checkInSessions } = await supabase
    .from("sessions")
    .select("id, title, start_time, end_time, location")
    .eq("event_id", eventId)
    .eq("enable_check_in", true)
    .order("start_time", { ascending: true });

  return (
    <div className="space-y-6">
      {/* Gradient accent bar */}
      <div className="h-1 w-full rounded-full bg-gradient-to-r from-[oklch(0.445_0.107_195)] via-[oklch(0.545_0.107_195)] to-[oklch(0.445_0.107_195_/_0.2)]" />

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(0.445_0.107_195_/_0.1)]">
          <ScanLine className="h-5 w-5 text-[oklch(0.445_0.107_195)]" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Check-in</h1>
          <p className="text-sm text-muted-foreground">
            Scan attendee QR codes to verify and record check-ins in real time.
          </p>
        </div>
      </div>

      <Link
        href={`/events/${eventId}/check-in/kiosk`}
        className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
      >
        <Monitor className="h-4 w-4" />
        Launch Kiosk Mode
      </Link>

      <QrScanner eventId={eventId} sessions={checkInSessions ?? []} />

      <CheckInStats eventId={eventId} />
    </div>
  );
}
