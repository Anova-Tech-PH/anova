import { QrScanner } from "@/features/registration/components/qr-scanner";

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Check-in</h1>
        <p className="text-sm text-muted-foreground">
          Scan QR codes to check in attendees.
        </p>
      </div>

      <QrScanner eventId={eventId} />
    </div>
  );
}
