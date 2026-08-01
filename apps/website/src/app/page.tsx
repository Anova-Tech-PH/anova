import { ArrowRight } from "lucide-react";
import Image from "next/image";

const APP_URL = "https://app.evenstry.com";

function Logo() {
  return (
    <picture>
      <source srcSet="/logo.svg" type="image/svg+xml" />
      <img
        src="/logo.png"
        alt="Evenstry"
        width={120}
        height={40}
        className="block object-contain"
      />
    </picture>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <div className="flex items-center gap-8">
          <a
            href="#features"
            className="hidden text-[15px] text-muted-foreground hover:text-foreground transition-colors sm:block"
          >
            Features
          </a>
          <a
            href="#use-cases"
            className="hidden text-[15px] text-muted-foreground hover:text-foreground transition-colors sm:block"
          >
            Use Cases
          </a>
          <a
            href={`${APP_URL}/login`}
            className="text-[15px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Log in
          </a>
          <a
            href={`${APP_URL}/signup`}
            className="rounded-full bg-foreground px-5 py-2.5 text-[15px] font-medium text-background hover:bg-foreground/85 transition-colors"
          >
            Get Started
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pt-20 pb-16 text-center sm:pt-28 sm:pb-20">
        <h1 className="font-serif text-[clamp(2.5rem,6vw,4.25rem)] font-700 leading-[1.08] tracking-tight text-foreground">
          Everything your event needs.
          <br />
          One place.
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-[17px] leading-relaxed text-muted-foreground">
          Create, manage, and run conferences, meetups, and workshops — in
          minutes, not weeks.
        </p>
        <div className="mt-10 flex items-center justify-center gap-5">
          <a
            href={`${APP_URL}/signup`}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-[15px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Start for free
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <p className="mt-4 text-[13px] text-muted-foreground/70">
          No credit card required
        </p>
      </section>

      {/* Product Screenshot */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-[0_2px_40px_-12px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-border" />
            <span className="h-3 w-3 rounded-full bg-border" />
            <span className="h-3 w-3 rounded-full bg-border" />
            <span className="ml-3 text-xs text-muted-foreground/50">
              app.evenstry.com
            </span>
          </div>
          <Image
            src="/screenshots/dashboard.png"
            alt="Evenstry dashboard showing event overview, registrations, and recent events"
            width={1920}
            height={1080}
            className="w-full"
            priority
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-border/60 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <p className="text-[13px] font-medium tracking-widest text-muted-foreground/60 uppercase">
            How it works
          </p>
          <div className="mt-12 grid gap-12 sm:grid-cols-3 sm:gap-8">
            <div>
              <span className="font-serif text-[40px] font-600 leading-none text-primary/25">
                1
              </span>
              <h3 className="mt-3 text-lg font-semibold text-foreground">
                Create your event
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                Set up your event with tickets, schedule, and speakers in a
                guided flow. Publish when you're ready.
              </p>
            </div>
            <div>
              <span className="font-serif text-[40px] font-600 leading-none text-primary/25">
                2
              </span>
              <h3 className="mt-3 text-lg font-semibold text-foreground">
                Share your page
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                Every event gets a public page with registration, schedule, and
                all the details. Just share the link.
              </p>
            </div>
            <div>
              <span className="font-serif text-[40px] font-600 leading-none text-primary/25">
                3
              </span>
              <h3 className="mt-3 text-lg font-semibold text-foreground">
                Manage everything
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                Track registrations, check in attendees with QR codes, and
                communicate — all from one dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 1 — Schedule */}
      <section id="features" className="border-t border-border/60">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="text-[13px] font-medium tracking-widest text-primary uppercase">
                Schedule
              </p>
              <h2 className="mt-3 font-serif text-[clamp(1.75rem,3vw,2.5rem)] font-700 leading-tight tracking-tight">
                Your schedule, organized
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed text-muted-foreground">
                Build multi-track schedules with sessions, speakers, and
                breakout rooms. Attendees see a clear timeline — you see who's
                going where.
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-white shadow-[0_1px_20px_-8px_rgba(0,0,0,0.06)]">
              <Image
                src="/screenshots/schedule.png"
                alt="Schedule view with tracks, speakers, and sessions organized by day"
                width={1920}
                height={1080}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2 — Registration */}
      <section className="border-t border-border/60 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="order-2 lg:order-1 overflow-hidden rounded-xl border border-border shadow-[0_1px_20px_-8px_rgba(0,0,0,0.06)]">
              <Image
                src="/screenshots/event-detail.png"
                alt="Event detail view with overview, schedule, tickets, and registrations tabs"
                width={1920}
                height={1080}
                className="w-full"
              />
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-[13px] font-medium tracking-widest text-primary uppercase">
                Registration
              </p>
              <h2 className="mt-3 font-serif text-[clamp(1.75rem,3vw,2.5rem)] font-700 leading-tight tracking-tight">
                Registration that works
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed text-muted-foreground">
                Create ticket types, set capacity limits, and collect the info
                you need. Every registrant gets a QR code for check-in at the
                door.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3 — Dashboard */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="text-[13px] font-medium tracking-widest text-primary uppercase">
                Dashboard
              </p>
              <h2 className="mt-3 font-serif text-[clamp(1.75rem,3vw,2.5rem)] font-700 leading-tight tracking-tight">
                Know what's happening
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed text-muted-foreground">
                See total registrations, check-in rates, and upcoming events at
                a glance. No digging through spreadsheets — it's all there when
                you open the app.
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-white shadow-[0_1px_20px_-8px_rgba(0,0,0,0.06)]">
              <Image
                src="/screenshots/public-event.png"
                alt="Analytics dashboard showing event stats and registration data"
                width={1920}
                height={1080}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section
        id="use-cases"
        className="border-t border-border/60 bg-white"
      >
        <div className="mx-auto max-w-5xl px-6 py-24">
          <p className="text-[13px] font-medium tracking-widest text-muted-foreground/60 uppercase">
            Built for every kind of event
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-border p-8">
              <h3 className="text-lg font-semibold text-foreground">
                Conferences
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                Multi-day schedules, speaker management, tracks, breakout rooms,
                and attendee networking built in.
              </p>
            </div>
            <div className="rounded-xl border border-border p-8">
              <h3 className="text-lg font-semibold text-foreground">
                Meetups
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                Quick setup, easy registration, and QR check-in at the door.
                Perfect for recurring community events.
              </p>
            </div>
            <div className="rounded-xl border border-border p-8">
              <h3 className="text-lg font-semibold text-foreground">
                Workshops
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                Focused sessions, attendee limits, direct messaging, and
                everything you need for hands-on learning.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-2xl px-6 py-28 text-center">
          <h2 className="font-serif text-[clamp(1.75rem,4vw,2.75rem)] font-700 leading-tight tracking-tight">
            Ready to run your next event?
          </h2>
          <div className="mt-8">
            <a
              href={`${APP_URL}/signup`}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-[15px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Start for free
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <p className="mt-4 text-[13px] text-muted-foreground/70">
            Free plan. No credit card. Set up in minutes.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
          <div className="flex items-center gap-3">
            <picture>
              <source srcSet="/logo.svg" type="image/svg+xml" />
              <img
                src="/logo.png"
                alt="Evenstry"
                width={90}
                height={28}
                className="block object-contain opacity-50"
              />
            </picture>
          </div>
          <p className="text-[13px] text-muted-foreground/60">
            &copy; {new Date().getFullYear()} Evenstry
          </p>
        </div>
      </footer>
    </div>
  );
}
