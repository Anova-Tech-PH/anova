"use client";

import { CheckCircle2, Stamp } from "lucide-react";
import { Card } from "@attendly/ui/components";

type Sponsor = { id: string; name: string; logo_url: string | null };

export function PassportCard({
  sponsors,
  collectedIds,
}: {
  sponsors: Sponsor[];
  collectedIds: string[];
}) {
  const collected = new Set(collectedIds);
  const progress = collectedIds.length;
  const total = sponsors.length;
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Stamp className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Exhibitor Passport</h1>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span>
            {progress} of {total} stamps
          </span>
          <span>{percentage}%</span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${percentage}%`,
              backgroundColor: "oklch(0.445 0.107 195)",
            }}
          />
        </div>
      </div>

      {/* Sponsor grid */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
        {sponsors.map((sponsor) => {
          const isCollected = collected.has(sponsor.id);
          return (
            <Card
              key={sponsor.id}
              className={`p-4 text-center transition-all ${
                isCollected
                  ? "border-green-300 bg-green-50"
                  : "opacity-50 grayscale"
              }`}
            >
              {sponsor.logo_url ? (
                <img
                  src={sponsor.logo_url}
                  alt={sponsor.name}
                  className="mx-auto h-12 w-12 rounded object-contain"
                />
              ) : (
                <div className="mx-auto h-12 w-12 rounded bg-muted flex items-center justify-center text-lg font-bold">
                  {sponsor.name.charAt(0)}
                </div>
              )}
              <p className="mt-2 text-sm font-medium truncate">
                {sponsor.name}
              </p>
              {isCollected && (
                <CheckCircle2 className="mx-auto mt-1 h-5 w-5 text-green-600" />
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
