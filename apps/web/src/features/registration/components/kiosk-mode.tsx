"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, AlertCircle, XCircle, Search, QrCode, ArrowLeft, AlertTriangle } from "lucide-react";
import { checkInByQrCode, checkInByRegistrationId, searchRegistrations } from "../actions";
import { fetchPendingConsentForms } from "@/features/consent-forms/actions";

type CheckInSession = { id: string; title: string; start_time: string };
type SearchResult = { id: string; name: string; email: string; status: string; ticket_types: { name: string } | { name: string }[] };

type KioskState =
  | { mode: "idle" }
  | { mode: "scanning" }
  | { mode: "searching" }
  | { mode: "success"; name: string; ticketType: string; alreadyCheckedIn: boolean }
  | { mode: "error"; message: string }
  | { mode: "consent_warning"; name: string; pendingForms: { id: string; title: string }[] };

function getTicketName(tt: { name: string } | { name: string }[] | null): string {
  if (!tt) return "General";
  if (Array.isArray(tt)) return tt[0]?.name ?? "General";
  return tt.name ?? "General";
}

export function KioskMode({
  eventId,
  eventTitle,
  sessions,
}: {
  eventId: string;
  eventTitle: string;
  sessions: CheckInSession[];
}) {
  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? "");
  const [state, setState] = useState<KioskState>({ mode: "idle" });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const scannerRef = useRef<any>(null);
  const processingRef = useRef(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function resetToIdle() {
    setState({ mode: "idle" });
    setSearchQuery("");
    setSearchResults([]);
  }

  function scheduleReset() {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(resetToIdle, 4000);
  }

  async function handleCheckInResult(result: { name: string; email: string; already_checked_in: boolean; ticket_types: any }) {
    // Check for pending consent forms (non-blocking — show success first if none)
    try {
      const pending = await fetchPendingConsentForms(eventId, result.email);
      if (pending.length > 0) {
        setState({
          mode: "consent_warning",
          name: result.name,
          pendingForms: pending,
        });
        return; // Don't auto-reset — user must dismiss
      }
    } catch {
      // If consent check fails, proceed with normal success flow
    }

    setState({
      mode: "success",
      name: result.name,
      ticketType: getTicketName(result.ticket_types),
      alreadyCheckedIn: result.already_checked_in,
    });
    scheduleReset();
  }

  async function handleQrScan(decodedText: string) {
    if (processingRef.current || !sessionId) return;
    processingRef.current = true;

    try {
      const result = await checkInByQrCode(decodedText, eventId, sessionId);
      await handleCheckInResult(result);
    } catch (err) {
      setState({ mode: "error", message: err instanceof Error ? err.message : "Check-in failed" });
      scheduleReset();
    }

    setTimeout(() => { processingRef.current = false; }, 2000);
  }

  async function startScanner() {
    setState({ mode: "scanning" });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const { Html5Qrcode } = await import("html5-qrcode");
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
    }

    const scanner = new Html5Qrcode("kiosk-qr-reader");
    scannerRef.current = scanner;

    try {
      try {
        await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 300, height: 300 } }, handleQrScan, () => {});
      } catch {
        await scanner.start({ facingMode: "user" }, { fps: 10, qrbox: { width: 300, height: 300 } }, handleQrScan, () => {});
      }
    } catch {
      setState({ mode: "error", message: "Could not access camera" });
      scheduleReset();
    }
  }

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (query.length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const results = await searchRegistrations(eventId, query);
      setSearchResults(results);
    } catch { setSearchResults([]); }
    setSearchLoading(false);
  }

  async function handleSelectAttendee(regId: string) {
    if (!sessionId) return;
    try {
      const result = await checkInByRegistrationId(regId, eventId, sessionId);
      await handleCheckInResult(result);
    } catch (err) {
      setState({ mode: "error", message: err instanceof Error ? err.message : "Check-in failed" });
      scheduleReset();
    }
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current) { try { scannerRef.current.stop(); } catch {} }
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (state.mode === "idle" && sessionId) startScanner();
  }, [state.mode, sessionId]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-xl font-bold">{eventTitle}</h1>
          <p className="text-sm text-muted-foreground">Self-Service Check-in</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
          <a
            href={`/events/${eventId}/check-in`}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" /> Exit Kiosk
          </a>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 items-center justify-center p-8">
        {/* Success */}
        {state.mode === "success" && (
          <div className="text-center space-y-4 animate-in fade-in duration-300">
            <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full ${state.alreadyCheckedIn ? "bg-amber-100" : "bg-emerald-100"}`}>
              {state.alreadyCheckedIn ? (
                <AlertCircle className="h-12 w-12 text-amber-600" />
              ) : (
                <CheckCircle className="h-12 w-12 text-emerald-600" />
              )}
            </div>
            <h2 className="text-4xl font-bold">
              {state.alreadyCheckedIn ? "Already Checked In" : "Welcome!"}
            </h2>
            <p className="text-2xl">{state.name}</p>
            <p className="text-lg text-muted-foreground">{state.ticketType}</p>
          </div>
        )}

        {/* Consent Warning */}
        {state.mode === "consent_warning" && (
          <div className="text-center space-y-4 animate-in fade-in duration-300">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-yellow-100">
              <AlertTriangle className="h-12 w-12 text-yellow-600" />
            </div>
            <h2 className="text-3xl font-bold text-yellow-700">Action Required</h2>
            <p className="text-2xl">{state.name}</p>
            <p className="text-lg text-muted-foreground">
              The following consent form(s) must be completed:
            </p>
            <ul className="mx-auto max-w-md space-y-2 text-left">
              {state.pendingForms.map((form) => (
                <li
                  key={form.id}
                  className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-800"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="font-medium">{form.title}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={resetToIdle}
              className="mt-4 rounded-xl border-2 px-8 py-3 text-lg font-medium hover:bg-muted transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Error */}
        {state.mode === "error" && (
          <div className="text-center space-y-4 animate-in fade-in duration-300">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            <h2 className="text-3xl font-bold text-red-700">Check-in Failed</h2>
            <p className="text-lg text-red-600">{state.message}</p>
          </div>
        )}

        {/* Idle / Scanning */}
        {(state.mode === "idle" || state.mode === "scanning") && (
          <div className="w-full max-w-lg space-y-8 text-center">
            <div className="space-y-2">
              <QrCode className="mx-auto h-12 w-12 text-muted-foreground" />
              <h2 className="text-3xl font-bold">Scan Your QR Code</h2>
              <p className="text-muted-foreground">Hold your QR code in front of the camera</p>
            </div>

            <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border-2 border-primary/20 shadow-lg">
              <div id="kiosk-qr-reader" />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-4 text-sm text-muted-foreground">or</span>
              </div>
            </div>

            <button
              onClick={() => setState({ mode: "searching" })}
              className="mx-auto flex items-center gap-2 rounded-xl border-2 px-8 py-4 text-lg font-medium hover:bg-muted transition-colors"
            >
              <Search className="h-5 w-5" /> Search by Name
            </button>
          </div>
        )}

        {/* Searching */}
        {state.mode === "searching" && (
          <div className="w-full max-w-lg space-y-6">
            <button onClick={resetToIdle} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to scanner
            </button>

            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Type your name or email..."
              className="w-full rounded-xl border-2 px-6 py-4 text-lg outline-none focus:border-primary focus:ring-2 focus:ring-ring"
            />

            {searchLoading && <p className="text-center text-muted-foreground">Searching...</p>}

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleSelectAttendee(r.id)}
                    className="w-full rounded-xl border p-4 text-left hover:bg-muted transition-colors"
                  >
                    <p className="font-medium text-lg">{r.name}</p>
                    <p className="text-sm text-muted-foreground">{r.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">{getTicketName(r.ticket_types)}</p>
                  </button>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && !searchLoading && searchResults.length === 0 && (
              <p className="text-center text-muted-foreground">No attendees found</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
