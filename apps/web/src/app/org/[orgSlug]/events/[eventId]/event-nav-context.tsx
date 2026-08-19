"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useTransition,
} from "react";
import { usePathname, useRouter } from "next/navigation";

interface EventNavContextType {
  /** The pathname to use for active state (optimistic or real) */
  activePathname: string;
  /** Navigate optimistically — tab switches instantly, content loads in background */
  navigate: (href: string) => void;
  /** True while the route transition is in progress */
  isPending: boolean;
}

const EventNavContext = createContext<EventNavContextType | null>(null);

export function EventNavProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingPathname, setPendingPathname] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activePathname = pendingPathname ?? pathname;

  // Clear pending state when the real pathname catches up
  useEffect(() => {
    setPendingPathname(null);
  }, [pathname]);

  function navigate(href: string) {
    if (href === pathname) return;
    setPendingPathname(href);
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <EventNavContext.Provider value={{ activePathname, navigate, isPending }}>
      {children}
    </EventNavContext.Provider>
  );
}

export function useEventNav() {
  const ctx = useContext(EventNavContext);
  if (!ctx) throw new Error("useEventNav must be used within EventNavProvider");
  return ctx;
}
