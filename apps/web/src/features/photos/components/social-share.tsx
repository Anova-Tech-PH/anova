"use client";

import { useState, useEffect } from "react";
import { Share2, Copy, Check } from "lucide-react";
import { Button } from "@attendly/ui/components";
import { toast } from "sonner";

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 1.09.044 1.613.115v3.146c-.427-.044-.72-.066-.965-.066-1.372 0-1.904.52-1.904 1.871v2.492h3.727l-.64 3.667h-3.087v7.98z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
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
          <FacebookIcon className="h-5 w-5" />
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
          <LinkedInIcon className="h-5 w-5" />
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
