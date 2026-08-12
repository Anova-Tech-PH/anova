"use client";

import { Card } from "@attendly/ui/components";
import { MessageSquare, Clock, CheckCircle, MessageCircle } from "lucide-react";
import type { QAStats } from "../queries";

export function QAStatsCards({ stats }: { stats: QAStats }) {
  const cards = [
    {
      label: "Total",
      value: stats.total,
      icon: MessageSquare,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Pending",
      value: stats.pending,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Approved",
      value: stats.approved,
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Answered",
      value: stats.answered,
      icon: MessageCircle,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="p-5">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${card.bg}`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs font-medium text-muted-foreground">
                {card.label}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
