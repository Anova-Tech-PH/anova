"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@attendly/ui/components";

export function JoinCodeCard({ joinCode }: { joinCode: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(joinCode);
    setCopied(true);
    toast.success("Join code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border p-4">
      <div className="text-sm text-muted-foreground">Join Code</div>
      <code className="text-2xl font-bold tracking-[0.3em]">{joinCode}</code>
      <Button variant="ghost" size="sm" onClick={handleCopy}>
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
