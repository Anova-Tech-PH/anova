"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock, ArrowRight } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Card, Button, Input } from "@attendly/ui/components";
import { createAttendeeAccount, checkUserExistsByEmail } from "@/features/attendee/actions";
import Link from "next/link";

export function QrConfirmation({
  name,
  email,
  qrCode,
  ticketName,
  orgSlug,
  eventSlug,
}: {
  name: string;
  email: string;
  qrCode: string;
  ticketName: string;
  orgSlug: string;
  eventSlug: string;
}) {
  const router = useRouter();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [existingUser, setExistingUser] = useState<boolean | null>(null);
  const portalUrl = `/${orgSlug}/${eventSlug}`;

  useEffect(() => {
    QRCode.toDataURL(qrCode, {
      width: 200,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setQrDataUrl);
  }, [qrCode]);

  useEffect(() => {
    checkUserExistsByEmail(email).then(setExistingUser);
  }, [email]);

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setAccountLoading(true);
    try {
      await createAttendeeAccount({ email, password, fullName: name });
      setAccountCreated(true);
      toast.success("Account created! Redirecting to event portal...");
      router.push(portalUrl);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create account";
      if (message === "Invalid login credentials") {
        // Account exists with a different password — redirect to login
        toast.info("You already have an account. Redirecting to login...");
        router.push(`/login?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(portalUrl)}`);
        return;
      }
      toast.error(message);
    } finally {
      setAccountLoading(false);
    }
  }

  return (
    <div className="mt-8 space-y-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-light">
        <Check className="h-6 w-6 text-success" />
      </div>

      <div>
        <h2 className="text-xl font-semibold">You&apos;re registered!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A confirmation has been sent to {email}
        </p>
      </div>

      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Ticket</p>
        <p className="font-medium">{ticketName}</p>
        <p className="mt-1 text-sm">{name}</p>

        {qrDataUrl && (
          <div className="mt-4 flex justify-center">
            <img
              src={qrDataUrl}
              alt="Registration QR Code"
              className="rounded-lg"
              width={200}
              height={200}
            />
          </div>
        )}

        <p className="mt-2 text-xs text-muted-foreground">
          Show this QR code at check-in
        </p>
      </Card>

      {accountCreated ? (
        <div className="rounded-xl border bg-primary/5 p-4 text-center space-y-3">
          <p className="text-sm font-medium">Account created!</p>
          <p className="text-xs text-muted-foreground">
            You can now access the event portal and manage your tickets.
          </p>
          <a
            href={portalUrl}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Go to Event Portal
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      ) : existingUser ? (
        <div className="rounded-xl border p-4 space-y-3 text-center">
          <p className="text-sm font-medium">You already have an account</p>
          <p className="text-xs text-muted-foreground">
            Sign in to access the event portal and manage your tickets.
          </p>
          <Link
            href={`/login?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(portalUrl)}`}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Sign in & view event
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : existingUser === false ? (
        <form onSubmit={handleCreateAccount} className="rounded-xl border p-4 space-y-3">
          <p className="text-sm font-medium">Create your account to access the event</p>
          <p className="text-xs text-muted-foreground">
            Set a password for {email} to view the full event portal, network with attendees, and manage your tickets.
          </p>
          <Input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
          <Button type="submit" loading={accountLoading} className="w-full">
            {accountLoading ? "Creating..." : "Create account & continue"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
