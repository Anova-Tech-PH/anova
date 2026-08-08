"use client";

import { QrCode, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface Session {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string | null;
}

interface DoorModeProps {
  eventId: string;
  eventTitle: string;
  sessions: Session[];
}

/* ── Static demo data ─────────────────────────────────── */

const DEMO_CHECKED_IN = {
  name: "Amara Okonkwo",
  ticket: "Full Convention",
  seat: "B-114",
  time: "10:12",
};

const DEMO_LAST_SCANS = [
  {
    id: "1",
    name: "Amara Okonkwo",
    ticket: "Full Convention",
    time: "10:12",
    initials: "AO",
    recent: true,
  },
  {
    id: "2",
    name: "Jordan Reeves",
    ticket: "Day Pass",
    time: "10:08",
    initials: "JR",
    duplicate: true,
    duplicateTime: "09:04",
  },
  {
    id: "3",
    name: "Mei-Lin Chang",
    ticket: "VIP",
    time: "10:03",
    initials: "MC",
  },
  {
    id: "4",
    name: "David Asante",
    ticket: "Full Convention",
    time: "09:58",
    initials: "DA",
  },
  {
    id: "5",
    name: "Sofia Petrov",
    ticket: "Day Pass",
    time: "09:51",
    initials: "SP",
  },
];

const DEMO_COUNT = 247;

/* ── Corner bracket component ─────────────────────────── */

function CornerBracket({
  position,
}: {
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}) {
  const base = "absolute w-[42px] h-[42px] text-accent";
  const styles: Record<string, string> = {
    "top-left": `${base} top-3 left-3 border-t-[3px] border-l-[3px] border-current rounded-tl-[6px]`,
    "top-right": `${base} top-3 right-3 border-t-[3px] border-r-[3px] border-current rounded-tr-[6px]`,
    "bottom-left": `${base} bottom-3 left-3 border-b-[3px] border-l-[3px] border-current rounded-bl-[6px]`,
    "bottom-right": `${base} bottom-3 right-3 border-b-[3px] border-r-[3px] border-current rounded-br-[6px]`,
  };
  return <div className={styles[position]} />;
}

/* ── Main component ───────────────────────────────────── */

export function DoorMode({ eventId, eventTitle, sessions }: DoorModeProps) {
  const currentSession = sessions[0];

  return (
    <div className="flex min-h-[660px] flex-col bg-ink">
      {/* ── Header ──────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-white/[0.12] px-7 py-[18px]">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
            DOOR MODE {currentSession?.location ? `\u00B7 ${currentSession.location}` : ""}
          </p>
          <h1 className="text-[17px] font-bold">
            {currentSession?.title ?? eventTitle}
          </h1>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="font-display text-[32px] font-extrabold tabular-nums leading-none">
              {DEMO_COUNT}
            </p>
            <p className="text-[12px] font-semibold text-white/70">
              scanned in
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-[6px] border border-white/[0.22] px-4 py-2 text-[14px] font-semibold text-white/80 transition-colors hover:text-white"
          >
            Exit
          </Link>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────── */}
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
        {/* ── Left: Scanner ─────────────────────────── */}
        <div className="flex flex-col items-center justify-center gap-6 border-b border-white/[0.12] px-10 py-10 lg:border-b-0 lg:border-r">
          {/* QR viewport */}
          <div className="relative flex aspect-square w-full max-w-[340px] items-center justify-center overflow-hidden rounded-[16px] border-2 border-primary/50 bg-[oklch(0.26_0.035_250)]">
            {/* Center icon */}
            <QrCode className="h-[130px] w-[130px] text-white/[0.18]" strokeWidth={1.6} />

            {/* Corner brackets */}
            <CornerBracket position="top-left" />
            <CornerBracket position="top-right" />
            <CornerBracket position="bottom-left" />
            <CornerBracket position="bottom-right" />

            {/* Scan line */}
            <div className="absolute left-[10%] top-1/2 h-[2px] w-4/5 bg-accent shadow-[0_0_18px] shadow-accent" />
          </div>

          {/* Instruction */}
          <p className="text-[15px] font-semibold text-white/70">
            Hold a pass up to the camera
          </p>

          {/* Manual fallback */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="EV-____-__"
              className="w-[180px] rounded-[6px] border border-white/[0.22] bg-transparent px-3 py-2 font-mono text-[15px] text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              type="button"
              className="rounded-[6px] bg-primary px-4 py-2 text-[14px] font-bold text-white transition-colors hover:bg-primary/90"
            >
              Check in
            </button>
          </div>
        </div>

        {/* ── Right: Result area ────────────────────── */}
        <div className="flex flex-col gap-6 px-10 py-10">
          {/* Confirmation panel */}
          <div className="rounded-[14px] bg-success-solid p-7 text-white">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-7 w-7" />
              <span className="text-[13px] font-extrabold uppercase tracking-[0.14em]">
                CHECKED IN
              </span>
            </div>
            <p className="mt-3 font-display text-[44px] font-extrabold leading-tight tracking-[-0.04em]">
              {DEMO_CHECKED_IN.name}
            </p>
            <div className="mt-4 flex gap-9 border-t border-white/[0.28] pt-4">
              <div>
                <p className="text-[11px] font-bold uppercase text-white/75">
                  Ticket
                </p>
                <p className="text-[16px] font-bold">{DEMO_CHECKED_IN.ticket}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase text-white/75">
                  Seat
                </p>
                <p className="text-[16px] font-bold">{DEMO_CHECKED_IN.seat}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase text-white/75">
                  Time
                </p>
                <p className="text-[16px] font-bold">{DEMO_CHECKED_IN.time}</p>
              </div>
            </div>
          </div>

          {/* Last scans list */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-white/50">
              Last scans
            </p>
            <div className="flex flex-col">
              {DEMO_LAST_SCANS.map((scan) => (
                <div
                  key={scan.id}
                  className={`flex items-center gap-3 rounded-[8px] px-3 py-2.5 ${
                    scan.recent ? "bg-white/5" : ""
                  } ${
                    scan.duplicate
                      ? "border border-warning-dark/40 bg-warning-dark/[0.12]"
                      : ""
                  }`}
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[6px] bg-success-solid/30 text-[11px] font-bold text-[oklch(0.86_0.11_150)]">
                    {scan.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold">{scan.name}</p>
                    <p className="text-[12px] font-medium text-white/55">
                      {scan.ticket}
                      {scan.duplicate && (
                        <span className="ml-2 text-[oklch(0.88_0.11_75)]">
                          Already scanned at {scan.duplicateTime}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-[13px] font-semibold tabular-nums text-white/60">
                    {scan.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer affordance */}
          <div className="rounded-[10px] border border-dashed border-white/25 p-[18px] text-center">
            <p className="text-[14px] font-semibold">Scanning with 2 others</p>
            <p className="text-[13px] text-white/55">
              Front entrance &middot; Hall B door
            </p>
            <button
              type="button"
              className="mt-3 rounded-[6px] border border-white/[0.22] px-4 py-2 text-[13px] font-semibold text-white/70 transition-colors hover:text-white"
            >
              Invite a volunteer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
