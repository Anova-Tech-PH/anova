"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, ExternalLink, Unplug, ArrowRight, Loader2 } from "lucide-react";
import { Button, useConfirm } from "@attendly/ui/components";
import { toast } from "sonner";
import {
  ConnectComponentsProvider,
  ConnectAccountOnboarding,
} from "@stripe/react-connect-js";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import { disconnectStripe } from "../actions";

type Props = {
  organizationId: string;
  orgSlug: string;
  eventId: string;
  status: {
    connected: boolean;
    accountId: string | null;
    chargesEnabled: boolean;
    email: string | null;
  };
};

export function StripeConnectCard({
  organizationId,
  orgSlug,
  eventId,
  status,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [connectInstance, setConnectInstance] = useState<ReturnType<
    typeof loadConnectAndInitialize
  > | null>(null);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirm();

  const basePath = `/org/${orgSlug}/events/${eventId}`;

  const handleConnect = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      const { accountId, error } = await res.json();
      if (error) throw new Error(error);

      const instance = loadConnectAndInitialize({
        publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
        fetchClientSecret: async () => {
          const sessionRes = await fetch("/api/stripe/account-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accountId }),
          });
          const { client_secret, error: sessionError } =
            await sessionRes.json();
          if (sessionError) throw new Error(sessionError);
          return client_secret;
        },
        appearance: {
          overlays: "dialog",
          variables: {
            colorPrimary: "#7c3aed",
          },
        },
      });

      setConnectInstance(instance);
      setShowOnboarding(true);
      setIframeLoading(true);
    } catch {
      toast.error("Failed to connect Stripe. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  async function handleDisconnect() {
    const ok = await confirm({
      title: "Disconnect Stripe",
      description:
        "This will disconnect your Stripe account. You won't be able to accept payments until you reconnect. Existing orders are not affected.",
      confirmLabel: "Disconnect",
    });
    if (!ok) return;
    startTransition(async () => {
      await disconnectStripe(organizationId, eventId);
      toast.success("Stripe disconnected successfully.");
    });
  }

  // Connected state
  if (status.connected && status.chargesEnabled) {
    return (
      <div className="rounded-xl border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CreditCard className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold">Stripe Connected</p>
            <p className="text-sm text-muted-foreground">{status.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(
                `https://dashboard.stripe.com/${status.accountId}`,
                "_blank"
              )
            }
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Stripe Dashboard
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            disabled={isPending}
            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Unplug className="mr-1.5 h-3.5 w-3.5" />
            Disconnect
          </Button>
        </div>
        <div className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Next steps</p>
          <ul className="mt-1.5 space-y-1">
            <li className="flex items-center gap-1.5">
              <ArrowRight className="h-3 w-3" />
              <Link
                href={`${basePath}/tickets`}
                className="underline hover:text-foreground"
              >
                Set up paid tickets
              </Link>
            </li>
            <li className="flex items-center gap-1.5">
              <ArrowRight className="h-3 w-3" />
              <Link
                href={`${basePath}/orders`}
                className="underline hover:text-foreground"
              >
                View orders & transactions
              </Link>
            </li>
          </ul>
        </div>
        {dialog}
      </div>
    );
  }

  // Embedded onboarding state
  if (showOnboarding && connectInstance) {
    return (
      <div className="rounded-xl border p-6 space-y-4">
        <div>
          <p className="font-semibold">Complete your Stripe setup</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Fill in the details below to start accepting payments.
          </p>
        </div>
        {iframeLoading && (
          <div className="flex items-center gap-2 py-8 justify-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading Stripe onboarding...
          </div>
        )}
        <ConnectComponentsProvider connectInstance={connectInstance}>
          <ConnectAccountOnboarding
            onExit={() => {
              setShowOnboarding(false);
              setConnectInstance(null);
              toast.success("Stripe setup complete!");
              router.refresh();
            }}
            onLoaderStart={() => setIframeLoading(false)}
          />
        </ConnectComponentsProvider>
      </div>
    );
  }

  // Not connected state
  return (
    <div className="rounded-xl border border-dashed p-6 space-y-4">
      <div>
        <p className="font-semibold">Connect Stripe to accept payments</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Link your Stripe account to collect payments for paid tickets. Funds
          go directly to your bank account.
        </p>
      </div>
      <Button onClick={handleConnect} loading={loading}>
        <CreditCard className="mr-1.5 h-4 w-4" />
        Connect Stripe
      </Button>
      {status.connected && !status.chargesEnabled && (
        <p className="text-sm text-amber-600">
          Your Stripe account setup is incomplete.{" "}
          <button onClick={handleConnect} className="underline">
            Continue setup
          </button>
        </p>
      )}
    </div>
  );
}
