import Link from "next/link";
import { Logo } from "@/shared/components/logo";
import { Button } from "@/shared/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <Logo size="sm" />
        <nav className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Log in
          </Link>
          <Link href="/signup">
            <Button size="sm">Get Started</Button>
          </Link>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 text-center">
        <div className="max-w-2xl space-y-4">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Event management,
            <br />
            simplified.
          </h2>
          <p className="text-lg text-muted-foreground">
            Create beautiful events, manage registrations, and connect attendees
            — all in one modern platform.
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/signup">
            <Button size="lg">Create your first event</Button>
          </Link>
        </div>
      </main>

      <footer className="border-t px-6 py-4 text-center text-sm text-muted-foreground">
        <Logo size="sm" className="mx-auto opacity-50" />
      </footer>
    </div>
  );
}
