"use client";

import { useState, useEffect } from "react";
import { Share2, Copy, Check } from "lucide-react";
import { Button, Card } from "@attendly/ui/components";
import { getOrCreateReferralCode } from "../referral-actions";

export function ReferralShare({
  eventId,
  userId,
  baseUrl,
}: {
  eventId: string;
  userId: string;
  baseUrl: string;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getOrCreateReferralCode(eventId, userId).then((data) => {
      setCode(data.code);
      setCount(data.registrations_count);
    });
  }, [eventId, userId]);

  const referralUrl = code
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/register${baseUrl}?ref=${code}`
    : "";

  function handleCopy() {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!code) return null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Share2 className="h-5 w-5" />
        <h3 className="font-medium">Invite Friends</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Share your referral link and earn points when friends register!
      </p>
      <div className="flex gap-2">
        <input
          readOnly
          value={referralUrl}
          className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm truncate"
        />
        <Button variant="outline" onClick={handleCopy} className="shrink-0 gap-1.5">
          {copied ? (
            <>
              <Check className="h-4 w-4 text-green-600" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy
            </>
          )}
        </Button>
      </div>
      {count > 0 && (
        <p className="text-sm text-muted-foreground">
          {count} friend{count !== 1 ? "s" : ""} registered via your link
        </p>
      )}
    </Card>
  );
}
