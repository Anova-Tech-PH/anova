"use client";

import { useEffect, useState } from "react";
import { Check, UserPlus, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Card, Button, Input } from "@attendly/ui/components";
import { createAttendeeAccount } from "@/features/attendee/actions";

export function QrConfirmation({
  name,
  email,
  qrCode,
  ticketName,
}: {
  name: string;
  email: string;
  qrCode: string;
  ticketName: string;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [password, setPassword] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(qrCode, {
      width: 200,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setQrDataUrl);
  }, [qrCode]);

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setAccountLoading(true);
    try {
      await createAttendeeAccount({ email, password, fullName: name });
      setAccountCreated(true);
      toast.success("Account created!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create account");
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
        <div className="rounded-xl border bg-primary/5 p-4 text-center">
          <p className="text-sm font-medium">Account created!</p>
          <Link
            href="/my"
            className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
          >
            Go to My Tickets <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : showAccountForm ? (
        <form onSubmit={handleCreateAccount} className="rounded-xl border p-4 space-y-3">
          <p className="text-sm font-medium">Set a password to create your account</p>
          <p className="text-xs text-muted-foreground">{email}</p>
          <Input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
          <Button type="submit" loading={accountLoading} className="w-full">
            {accountLoading ? "Creating..." : "Create account"}
          </Button>
        </form>
      ) : (
        <button
          onClick={() => setShowAccountForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Create an account to manage your tickets
        </button>
      )}
    </div>
  );
}
