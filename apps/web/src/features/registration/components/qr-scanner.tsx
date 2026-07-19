"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle, AlertCircle, XCircle, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Card, EmptyState } from "@/shared/components/ui";
import { checkInByQrCode } from "../actions";

type ScanResult = Awaited<ReturnType<typeof checkInByQrCode>> | null;

type CheckInSession = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string | null;
};

function formatSessionTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function QrScanner({
  eventId,
  sessions,
}: {
  eventId: string;
  sessions: CheckInSession[];
}) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const processingRef = useRef(false);

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  function handleSessionChange(sessionId: string) {
    setSelectedSessionId(sessionId);
    setCheckedInCount(0);
    setResult(null);
    setError(null);
  }

  async function startScanner() {
    if (!selectedSessionId) {
      toast.error("Please select a session first");
      return;
    }

    setResult(null);
    setError(null);
    // Show the container BEFORE starting the scanner so it has layout dimensions
    setScanning(true);

    // Wait a frame for the DOM to update and container to be visible
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const { Html5Qrcode } = await import("html5-qrcode");

    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch {}
    }

    const scanner = new Html5Qrcode("qr-reader");
    html5QrCodeRef.current = scanner;

    const scanConfig = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
    const onScan = async (decodedText: string) => {
      if (processingRef.current) return;
      processingRef.current = true;

      try {
        const checkInResult = await checkInByQrCode(decodedText, eventId, selectedSessionId);
        setResult(checkInResult);
        setError(null);

        if (!checkInResult.already_checked_in) {
          setCheckedInCount((c) => c + 1);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Check-in failed");
        setResult(null);
      }

      // Pause scanning briefly after a result
      try {
        await scanner.pause(true);
      } catch {}

      setTimeout(() => {
        processingRef.current = false;
        try {
          scanner.resume();
        } catch {}
      }, 2000);
    };
    const onScanError = () => {}; // ignore scan failures

    try {
      // Try rear camera first (mobile), fall back to any available camera
      try {
        await scanner.start({ facingMode: "environment" }, scanConfig, onScan, onScanError);
      } catch {
        await scanner.start({ facingMode: "user" }, scanConfig, onScan, onScanError);
      }
    } catch (err) {
      setScanning(false);
      toast.error("Could not access camera. Please allow camera permissions.");
    }
  }

  async function stopScanner() {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch {}
      html5QrCodeRef.current = null;
    }
    setScanning(false);
  }

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          html5QrCodeRef.current.stop();
        } catch {}
      }
    };
  }, []);

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={<ListChecks className="h-8 w-8" />}
        title="No check-in sessions"
        description="Enable check-in on sessions in the Schedule tab to start scanning attendees."
        className="py-16"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Session selector */}
      <div className="rounded-xl border bg-card p-4">
        <label className="mb-2 block text-sm font-medium">Select session to check into</label>
        <select
          value={selectedSessionId}
          onChange={(e) => handleSessionChange(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">-- Choose a session --</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title} ({formatSessionTime(s.start_time)})
            </option>
          ))}
        </select>
        {selectedSession?.location && (
          <p className="mt-1 text-xs text-muted-foreground">Location: {selectedSession.location}</p>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between rounded-xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Camera className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Checked in this session</p>
            <p className="text-xl font-bold">{checkedInCount}</p>
          </div>
        </div>
        <Button
          onClick={scanning ? stopScanner : startScanner}
          variant={scanning ? "outline" : "primary"}
          className="gap-2"
          disabled={!selectedSessionId}
        >
          <Camera className="h-4 w-4" />
          {scanning ? "Stop Scanner" : "Start Scanner"}
        </Button>
      </div>

      {/* Scanner viewport */}
      <div
        className={`mx-auto max-w-sm overflow-hidden rounded-xl border-2 border-primary/20 shadow-lg ${scanning ? "" : "hidden"}`}
      >
        <div id="qr-reader" ref={scannerRef} />
      </div>

      {!scanning && !result && !error && selectedSessionId && (
        <EmptyState
          icon={<Camera className="h-8 w-8" />}
          title="Ready to scan"
          description="Click &quot;Start Scanner&quot; to begin scanning attendee QR codes"
          className="py-16"
        />
      )}

      {/* Result */}
      {result && (
        <div
          className={`rounded-xl border-2 p-6 transition-all ${
            result.already_checked_in
              ? "border-amber-300/50 bg-amber-50"
              : "border-emerald-300/50 bg-emerald-50"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${result.already_checked_in ? "bg-amber-100" : "bg-emerald-100"}`}>
              {result.already_checked_in ? (
                <AlertCircle className="h-6 w-6 text-amber-600" />
              ) : (
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              )}
            </div>
            <div>
              <p className="font-semibold text-base">
                {result.already_checked_in ? "Already Checked In" : "Checked In Successfully"}
              </p>
              <p className="mt-1 text-sm font-medium">{result.name}</p>
              <p className="text-sm text-muted-foreground">{result.email}</p>
              {"ticket_types" in result && result.ticket_types && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Ticket: {Array.isArray(result.ticket_types) ? result.ticket_types[0]?.name : (result.ticket_types as any).name}
                </p>
              )}
              {selectedSession && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Session: {selectedSession.title}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border-2 border-red-300/50 bg-red-50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-red-700">Check-in Failed</p>
              <p className="mt-1 text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Manual entry */}
      <ManualCheckIn
        eventId={eventId}
        sessionId={selectedSessionId}
        disabled={!selectedSessionId}
        onSuccess={(r) => {
          setResult(r);
          setError(null);
          if (r && !r.already_checked_in) setCheckedInCount((c) => c + 1);
        }}
      />
    </div>
  );
}

function ManualCheckIn({
  eventId,
  sessionId,
  disabled,
  onSuccess,
}: {
  eventId: string;
  sessionId: string;
  disabled: boolean;
  onSuccess: (result: ScanResult) => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !sessionId) return;
    setLoading(true);

    try {
      const result = await checkInByQrCode(code.trim(), eventId, sessionId);
      onSuccess(result);
      setCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-muted">
          <Camera className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium">Manual Check-in</h3>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">Enter a QR code value to check in an attendee manually.</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter QR code..."
          className="flex-1"
          disabled={disabled}
        />
        <Button
          type="submit"
          disabled={!code.trim() || disabled}
          loading={loading}
        >
          {loading ? "..." : "Check In"}
        </Button>
      </form>
    </Card>
  );
}
