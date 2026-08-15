"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type WallRefreshWrapperProps = {
  children: React.ReactNode;
  intervalMs?: number;
};

export function WallRefreshWrapper({
  children,
  intervalMs = 60_000,
}: WallRefreshWrapperProps) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [router, intervalMs]);

  return <>{children}</>;
}
