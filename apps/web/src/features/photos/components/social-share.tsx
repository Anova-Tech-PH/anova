"use client";

import { useState, useEffect } from "react";
import { Share2, Facebook, Linkedin, Copy, Check } from "lucide-react";
import { Button } from "@attendly/ui/components";
import { toast } from "sonner";

// X (Twitter) icon — lucide-react doesn't have one
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

interface SocialShareProps {
  photoUrl: string;
  onClose: () => void;
}

export function SocialShare({ photoUrl, onClose }: SocialShareProps) {
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  async function handleNativeShare() {
    try {
      await navigator.share({
        title: "Check out this photo!",
        url: photoUrl,
      });
    } catch (err) {
      // User cancelled or share failed — ignore AbortError
      if (err instanceof Error && err.name !== "AbortError") {
        toast.error("Sharing failed");
      }
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(photoUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }

  function openShareWindow(url: string) {
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
  }

  const encodedUrl = encodeURIComponent(photoUrl);

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <p className="text-sm text-muted-foreground">
        Share this photo with friends
      </p>

      {canNativeShare && (
        <Button onClick={handleNativeShare} className="w-full">
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            openShareWindow(
              `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
            )
          }
          aria-label="Share on Facebook"
        >
          <Facebook className="h-5 w-5" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            openShareWindow(
              `https://twitter.com/intent/tweet?url=${encodedUrl}`
            )
          }
          aria-label="Share on X"
        >
          <XIcon className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            openShareWindow(
              `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
            )
          }
          aria-label="Share on LinkedIn"
        >
          <Linkedin className="h-5 w-5" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={handleCopyLink}
          aria-label="Copy link"
        >
          {copied ? (
            <Check className="h-5 w-5 text-green-500" />
          ) : (
            <Copy className="h-5 w-5" />
          )}
        </Button>
      </div>

      <Button variant="ghost" onClick={onClose} className="mt-1">
        Done
      </Button>
    </div>
  );
}
