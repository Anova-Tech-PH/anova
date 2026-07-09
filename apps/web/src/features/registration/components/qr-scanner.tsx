"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { checkInByQrCode } from "../actions";

type ScanResult = Awaited<ReturnType<typeof checkInByQrCode>> | null;

export function QrScanner({ eventId }: { eventId: string }) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const processingRef = useRef(false);

  async function startScanner() {
    setResult(null);
    setError(null);

    const { Html5Qrcode } = await import("html5-qrcode");

    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch {}
    }

    const scanner = new Html5Qrcode("qr-reader");
    html5QrCodeRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          if (processingRef.current) return;
          processingRef.current = true;

          try {
            const checkInResult = await checkInByQrCode(decodedText);
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
        },
        () => {} // ignore scan failures
      );

      setScanning(true);
    } catch (err) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Checked in this session: <span className="font-semibold text-foreground">{checkedInCount}</span>
          </p>
        </div>
        <button
          onClick={scanning ? stopScanner : startScanner}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
            scanning
              ? "border hover:bg-accent"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          <Camera className="h-4 w-4" />
          {scanning ? "Stop Scanner" : "Start Scanner"}
        </button>
      </div>

      {/* Scanner viewport */}
      <div
        className={`mx-auto max-w-sm overflow-hidden rounded-xl border ${scanning ? "" : "hidden"}`}
      >
        <div id="qr-reader" ref={scannerRef} />
      </div>

      {!scanning && !result && !error && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Camera className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">
            Click &quot;Start Scanner&quot; to begin scanning QR codes
          </p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div
          className={`rounded-xl border p-6 ${
            result.already_checked_in
              ? "border-yellow-200 bg-yellow-50"
              : "border-green-200 bg-green-50"
          }`}
        >
          <div className="flex items-start gap-3">
            {result.already_checked_in ? (
              <AlertCircle className="h-6 w-6 shrink-0 text-yellow-600" />
            ) : (
              <CheckCircle className="h-6 w-6 shrink-0 text-green-600" />
            )}
            <div>
              <p className="font-semibold">
                {result.already_checked_in ? "Already Checked In" : "Checked In Successfully"}
              </p>
              <p className="mt-1 text-sm">{result.name}</p>
              <p className="text-sm text-muted-foreground">{result.email}</p>
              {"ticket_types" in result && result.ticket_types && (
                <p className="text-sm text-muted-foreground">
                  Ticket: {Array.isArray(result.ticket_types) ? result.ticket_types[0]?.name : (result.ticket_types as any).name}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <XCircle className="h-6 w-6 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold text-red-700">Check-in Failed</p>
              <p className="mt-1 text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Manual entry */}
      <ManualCheckIn eventId={eventId} onSuccess={(r) => {
        setResult(r);
        setError(null);
        if (r && !r.already_checked_in) setCheckedInCount((c) => c + 1);
      }} />
    </div>
  );
}

function ManualCheckIn({
  eventId,
  onSuccess,
}: {
  eventId: string;
  onSuccess: (result: ScanResult) => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);

    try {
      const result = await checkInByQrCode(code.trim());
      onSuccess(result);
      setCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="mb-3 text-sm font-medium">Manual Check-in</h3>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter QR code manually..."
          className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "..." : "Check In"}
        </button>
      </form>
    </div>
  );
}
