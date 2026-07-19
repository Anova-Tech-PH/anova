"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/shared/components/ui";

export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex gap-2 shrink-0">
      <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied!" : "Copy"}
      </Button>
      <Button variant="outline" size="sm" onClick={() => window.open(path, "_blank")} className="gap-2">
        <ExternalLink className="h-3.5 w-3.5" />
        Open
      </Button>
    </div>
  );
}
