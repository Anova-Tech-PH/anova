import Link from "next/link";
import { Logo } from "@attendly/ui/logo";
import { Button } from "@attendly/ui/components";
import { Calendar, Users, QrCode, BarChart3, MessageCircle, Zap, ArrowRight, Check } from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Event Creation",
    description: "Multi-step wizard with schedule builder, speaker management, and track organization.",
  },
  {
    icon: Users,
    title: "Registration & Ticketing",
    description: "Custom ticket types, QR code generation, and registration forms that actually work.",
  },
  {
    icon: QrCode,
    title: "QR Check-in",
    description: "Scan QR codes at the door for instant check-in with real-time tracking.",
  },
  {
    icon: MessageCircle,
    title: "Social & Networking",
    description: "Activity feed, direct messaging, and attendee connections at every event.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Registration trends, ticket breakdowns, revenue tracking, and check-in rates.",
  },
  {
    icon: Zap,
    title: "Breakout Rooms",
    description: "Organize focused discussions and workshops within your larger events.",
  },
];

const highlights = [
  "Unlimited events",
  "QR code check-in",
  "Real-time analytics",
  "Attendee networking",
  "Custom registration fields",
  "Email automations",
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b bg-background/80 px-6 py-4 backdrop-blur-lg">
        <Logo size="sm" />
        <nav className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Log in
          </Link>
          <Link href="/signup">
            <Button size="sm">Get Started</Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-primary/2 to-transparent" />
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle at 25% 0%, oklch(0.445 0.107 195 / 0.08) 0%, transparent 50%), radial-gradient(circle at 75% 100%, oklch(0.55 0.12 180 / 0.06) 0%, transparent 50%)",
          }} />
          <div className="relative mx-auto max-w-4xl px-4 py-24 text-center sm:py-32">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Now with QR check-in
            </div>
            <h1 className="mt-8 text-5xl font-bold tracking-tight font-serif sm:text-6xl lg:text-7xl">
              Run events without{" "}
              <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
                the chaos.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed">
              Tickets, registrations, schedules, check-ins, and attendee networking — in one place. No more duct-taping five tools together.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="gap-2 px-8 text-base shadow-lg shadow-primary/20">
                  Start for free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Already have an account?
              </Link>
            </div>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {highlights.map((item) => (
                <span key={item} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t bg-muted/30 px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight font-serif">What you get out of the box</h2>
              <p className="mt-3 text-muted-foreground">
                Six things you'd otherwise build yourself or pay three vendors for.
              </p>
            </div>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-lg border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-20">
          <div className="mx-auto max-w-2xl rounded-lg bg-gradient-to-br from-primary/10 via-primary/5 to-info/5 border p-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight font-serif">Your next event starts here</h2>
            <p className="mt-3 text-muted-foreground">
              Free plan. No credit card. Set up in 5 minutes.
            </p>
            <Link href="/signup" className="mt-8 inline-block">
              <Button size="lg" className="gap-2 px-8">
                Create your first event
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t px-6 py-6 text-center">
        <Logo size="xs" className="mx-auto opacity-40" />
        <p className="mt-2 text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Evenstry. All rights reserved.</p>
      </footer>
    </div>
  );
}
