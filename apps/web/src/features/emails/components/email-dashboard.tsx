"use client";

import { Mail, Send, AlertTriangle, CheckCircle } from "lucide-react";
import { Card } from "@/shared/components/ui/card";

type EmailStats = {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
};

export function EmailDashboard({ stats }: { stats: EmailStats }) {
  const cards = [
    { label: "Total Sent", value: stats.total, icon: Mail },
    { label: "Delivered", value: stats.sent + stats.delivered, icon: CheckCircle },
    { label: "Failed", value: stats.failed, icon: AlertTriangle },
    { label: "Bounced", value: stats.bounced, icon: Send },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
