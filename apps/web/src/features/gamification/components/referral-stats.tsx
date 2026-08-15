"use client";

import { Share2 } from "lucide-react";
import { Card, EmptyState } from "@attendly/ui/components";

type ReferralStat = {
  user_id: string;
  code: string;
  registrations_count: number;
  full_name: string | null;
};

export function ReferralStats({
  stats,
}: {
  stats: ReferralStat[];
}) {
  const totalReferrals = stats.reduce(
    (sum, s) => sum + s.registrations_count,
    0
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Referral Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Track how attendees are sharing your event.
        </p>
      </div>

      {/* Summary */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Share2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold">{totalReferrals}</p>
            <p className="text-sm text-muted-foreground">
              Total referral registrations
            </p>
          </div>
        </div>
      </Card>

      {stats.length === 0 ? (
        <EmptyState
          icon={<Share2 className="h-8 w-8" />}
          title="No referrals yet"
          description="Referral data will appear here as attendees share their codes and new people register."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2 text-right">Registrations</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((stat) => (
                <tr key={stat.code} className="border-b last:border-b-0">
                  <td className="px-4 py-2.5 font-medium">
                    {stat.full_name ?? "Unknown"}
                  </td>
                  <td className="px-4 py-2.5">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                      {stat.code}
                    </code>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {stat.registrations_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
