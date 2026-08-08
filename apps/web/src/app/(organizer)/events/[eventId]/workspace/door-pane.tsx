"use client";

type Ticket = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
};

interface DoorPaneProps {
  checkedInCount: number;
  totalCapacity: number;
  tickets: Ticket[];
}

export function DoorPane({ checkedInCount, totalCapacity, tickets }: DoorPaneProps) {
  const pct = totalCapacity > 0 ? Math.round((checkedInCount / totalCapacity) * 100) : 0;

  return (
    <div className="bg-[oklch(0.98_0.005_250)] p-4 lg:p-[18px] flex flex-col gap-4">
      {/* Count card */}
      <div className="rounded-[10px] border border-border bg-card p-5 text-center">
        <div className="text-[12px] font-semibold text-muted-foreground">Scanned in</div>
        <div className="font-display text-[42px] font-extrabold tabular-nums mt-1">{checkedInCount}</div>
        {/* Progress bar */}
        <div className="mt-3 h-[5px] w-full rounded-full bg-[oklch(0.93_0.01_250)] overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-[12px] text-muted-foreground mt-2">{pct}% of {totalCapacity} registered</div>
      </div>

      {/* Last scan (demo) */}
      <div className="rounded-[10px] bg-success-bg border border-success-solid/[0.35] p-4">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <span className="text-[13px] font-extrabold text-success">Checked in</span>
        </div>
        <div className="font-display text-[16px] font-extrabold mt-1">Latest attendee</div>
      </div>

      {/* Volunteers */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">Volunteers scanning</div>
        <div className="space-y-1.5">
          {["Front entrance", "Hall B door"].map((v) => (
            <div key={v} className="flex items-center justify-between text-[13px] font-semibold">
              <span>{v}</span>
              <span className="text-success">online</span>
            </div>
          ))}
          <div className="flex items-center justify-between text-[13px] font-semibold">
            <span>Annexe</span>
            <span className="text-muted-foreground">offline</span>
          </div>
        </div>
      </div>

      {/* Tickets */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">Tickets</div>
        <div className="space-y-3">
          {tickets.map((t, i) => (
            <div key={t.id}>
              <div className="flex items-center justify-between text-[13px] font-semibold mb-1">
                <span>{t.name}</span>
                <span className="tabular-nums">{t.sold}/{t.quantity}</span>
              </div>
              <div className="h-[5px] w-full rounded-full bg-[oklch(0.93_0.01_250)] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${i === 0 ? "bg-primary" : "bg-accent-ink"}`}
                  style={{ width: `${t.quantity > 0 ? Math.round((t.sold / t.quantity) * 100) : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
