"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { toggleEmailAutomation, deleteEmailAutomation } from "../actions";

type Automation = {
  id: string;
  trigger: string;
  enabled: boolean;
  email_templates: { name: string; subject: string } | null;
};

const triggerLabels: Record<string, string> = {
  on_registration: "On Registration",
  pre_event_24h: "24 Hours Before Event",
  pre_event_1h: "1 Hour Before Event",
  post_event: "After Event Ends",
};

export function AutomationList({
  initialAutomations,
}: {
  initialAutomations: Automation[];
}) {
  const [automations, setAutomations] = useState(initialAutomations);
  const [isPending, startTransition] = useTransition();

  function handleToggle(id: string, enabled: boolean) {
    startTransition(async () => {
      try {
        await toggleEmailAutomation(id, !enabled);
        setAutomations((prev) =>
          prev.map((a) => (a.id === id ? { ...a, enabled: !enabled } : a))
        );
        toast.success(enabled ? "Automation disabled" : "Automation enabled");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this automation?")) return;
    startTransition(async () => {
      try {
        await deleteEmailAutomation(id);
        setAutomations((prev) => prev.filter((a) => a.id !== id));
        toast.success("Automation deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  if (automations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No automations configured.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {automations.map((auto) => (
        <Card key={auto.id} className="flex items-center justify-between p-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{triggerLabels[auto.trigger] ?? auto.trigger}</h3>
              <Badge variant={auto.enabled ? "success" : "default"}>
                {auto.enabled ? "Active" : "Disabled"}
              </Badge>
            </div>
            {auto.email_templates && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                Template: {auto.email_templates.name}
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-1 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggle(auto.id, auto.enabled)}
              disabled={isPending}
            >
              {auto.enabled ? "Disable" : "Enable"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(auto.id)}
              disabled={isPending}
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
