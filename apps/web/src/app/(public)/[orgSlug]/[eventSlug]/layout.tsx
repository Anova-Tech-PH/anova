import Link from "next/link";
import { Logo } from "@attendly/ui/logo";
import { EventNav } from "./event-nav";

export default function PublicEventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/">
            <Logo size="sm" />
          </Link>
          <EventNav params={params} />
        </div>
      </header>
      {children}
    </div>
  );
}
