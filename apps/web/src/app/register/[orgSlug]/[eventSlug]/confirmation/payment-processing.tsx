"use client";

import { useEffect } from "react";

export function PaymentProcessing() {
  useEffect(() => {
    // Auto-refresh the page every 3 seconds to check if webhook has arrived
    const interval = setInterval(() => {
      window.location.reload();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto max-w-lg px-4 py-12 text-center">
      <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      <p className="text-lg font-semibold">Payment processing...</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Your payment is being confirmed. This page will update automatically.
      </p>
    </div>
  );
}
