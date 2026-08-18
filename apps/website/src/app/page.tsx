import Image from "next/image";
import { HeroVideo } from "@/components/hero-video";

const APP_URL = "https://app.eventriv.com";

const STATS = [
  { num: "5min", label: "From signup to a live event page" },
  { num: "1", label: "Tool instead of five" },
  { num: "\u221E", label: "Events — no per-ticket fees" },
  { num: "24h", label: "Custom quote turnaround" },
];

const STEPS = [
  {
    num: "01",
    title: "Create the event",
    copy: "Tickets, schedule, speakers, and the details attendees ask about \u2014 set up in one guided flow and published when you decide.",
  },
  {
    num: "02",
    title: "Share one link",
    copy: "Every event gets a public page carrying registration, programme, and venue information. Send the link; that is the whole distribution step.",
  },
  {
    num: "03",
    title: "Run the day",
    copy: "Track registrations, scan people in with QR codes, and message attendees from the same dashboard you built the event in.",
  },
];

const USE_CASES = [
  {
    title: "Conferences",
    copy: "Multi-day programmes, speaker management, parallel tracks, and breakout rooms that stay in sync.",
    tags: ["Multi-day", "Tracks", "Speakers"],
  },
  {
    title: "Meetups",
    copy: "Duplicate last month\u2019s event, open registration, scan people in at the door. Recurring without the admin.",
    tags: ["Recurring", "QR check-in"],
  },
  {
    title: "Workshops",
    copy: "Hard capacity caps, prerequisites collected up front, and direct messaging to everyone in the room.",
    tags: ["Capacity caps", "Messaging"],
  },
];

const PLAN_FEATURES = [
  "Unlimited events",
  "Ticketing and registration",
  "Multi-track schedules",
  "Speaker management",
  "QR code check-in",
  "Attendee messaging",
  "Analytics dashboard",
  "Public event pages",
];

const FAQS = [
  {
    q: "How does pricing work?",
    a: "We offer custom per-event pricing based on your event size and needs. No per-ticket fees, no hidden charges. Request a quote and we\u2019ll get back to you within 24 hours.",
  },
  {
    q: "How long does setup take?",
    a: "Under five minutes. Create the event, add tickets and a schedule, publish the page. Everything else can be filled in later.",
  },
  {
    q: "Do I need technical skills?",
    a: "No. If you can fill out a form, you can run an event on Eventriv.",
  },
  {
    q: "What kinds of events fit?",
    a: "Conferences, meetups, workshops, seminars, and community events \u2014 from ten people to ten thousand.",
  },
  {
    q: "How does QR check-in work?",
    a: "Each registrant gets a unique code. At the door, scan it with any phone camera or the built-in scanner. No extra hardware.",
  },
  {
    q: "Can I customise the event page?",
    a: "Yes. Every event gets a public page with details, schedule, speakers, and registration, and you control what appears on it.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 h-[74px] border-b border-white/10 [background:rgba(8,8,10,0.82)] [backdrop-filter:blur(14px)]">
        <div className="mx-auto flex h-full max-w-[1240px] items-center gap-9 [padding:0_clamp(20px,5vw,64px)]">
          <a
            href="#"
            className="text-[20px] font-[800] tracking-[-0.04em] text-on-surface"
          >
            EVEN
            <span className="bg-[image:var(--gradient-brand)] bg-clip-text text-transparent [--gradient-brand:linear-gradient(100deg,#8b3dff,#ff2f92_60%,#ff8a3d)]">
              TRIV
            </span>
          </a>
          <nav className="mr-auto hidden items-center gap-[30px] text-[11px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant md:flex">
            <a href="#product" className="transition-colors hover:text-accent-pink">
              Product
            </a>
            <a href="#use-cases" className="transition-colors hover:text-accent-pink">
              Use cases
            </a>
            <a href={`${APP_URL}/pricing`} className="transition-colors hover:text-accent-pink">
              Pricing
            </a>
            <a href="#faq" className="transition-colors hover:text-accent-pink">
              FAQ
            </a>
          </nav>
          <a
            href={`${APP_URL}/login`}
            className="hidden text-[13px] font-semibold text-on-surface-variant transition-colors hover:text-accent-pink sm:block"
          >
            Log in
          </a>
          <a
            href={`${APP_URL}/signup`}
            className="rounded-[2px] px-5 py-[11px] text-[13px] font-bold text-white [background:linear-gradient(100deg,#8b3dff,#ff2f92_62%,#ff8a3d)] hover:brightness-[0.94] transition-[filter]"
          >
            Get started
          </a>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="relative overflow-hidden border-b border-white/10">
          {/* Radial glows */}
          <div
            className="pointer-events-none absolute"
            style={{
              top: "-30%",
              left: "-10%",
              width: "70vw",
              height: "120%",
              background:
                "radial-gradient(closest-side, rgba(139,61,255,0.22), transparent)",
            }}
          />
          <div
            className="pointer-events-none absolute"
            style={{
              top: "10%",
              right: "-15%",
              width: "60vw",
              height: "100%",
              background:
                "radial-gradient(closest-side, rgba(255,47,146,0.16), transparent)",
            }}
          />

          <div className="relative mx-auto max-w-[1240px] [padding:clamp(64px,9vw,120px)_clamp(20px,5vw,64px)_0]">
            {/* Meta row */}
            <div className="flex flex-wrap justify-between gap-4 text-[11px] font-semibold uppercase tracking-[0.24em]">
              <span className="text-outline">Event operations 0.1</span>
              <span className="text-on-surface-variant">
                Conferences / Meetups / Workshops
              </span>
            </div>

            {/* Hairline */}
            <div className="my-[26px] h-px bg-white/10 [margin-bottom:clamp(48px,7vw,84px)]" />

            {/* H1 */}
            <h1 className="font-[800] uppercase leading-[0.86] tracking-[-0.05em] [font-size:clamp(52px,10.5vw,168px)] [margin-left:-0.05em]">
              <span className="block">Everything</span>
              <span className="block">your event</span>
              <span className="block bg-[image:linear-gradient(96deg,#8b3dff_4%,#ff2f92_48%,#ff8a3d_92%)] bg-clip-text text-transparent">
                needs.
              </span>
            </h1>

            {/* Two-column: copy + buttons */}
            <div className="mt-[clamp(40px,5vw,64px)] grid items-end gap-8 pb-[clamp(48px,7vw,88px)] [grid-template-columns:1fr] md:gap-[32px_clamp(32px,6vw,96px)] md:[grid-template-columns:1fr_1fr]">
              <p className="m-0 max-w-[52ch] text-[17px] leading-[1.65] text-on-surface-variant">
                Ticketing, multi-track schedules, speaker management, and door
                check-in in one place. Set up in under five minutes — not weeks
                of spreadsheets, email threads, and five different tools.
              </p>
              <div className="flex flex-col items-start gap-4">
                <div className="flex flex-wrap gap-3">
                  <a
                    href={`${APP_URL}/signup`}
                    className="rounded-[2px] px-[26px] py-[15px] text-[14px] font-bold text-white [background:linear-gradient(100deg,#8b3dff,#ff2f92_62%,#ff8a3d)] hover:brightness-[0.94] transition-[filter]"
                  >
                    Start an event
                  </a>
                  <a
                    href="#product"
                    className="rounded-[2px] border border-white/[0.22] px-[26px] py-[15px] text-[14px] font-bold text-on-surface transition-colors hover:border-white/[0.38]"
                  >
                    See how it works
                  </a>
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-outline">
                  Custom pricing — no per-ticket fees
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Hero Video ── */}
        <HeroVideo />

        {/* ── Stat Row ── */}
        <section className="mx-auto max-w-[1240px] border-b border-white/10 [padding:clamp(48px,6vw,72px)_clamp(20px,5vw,64px)]">
          <div className="grid grid-cols-2 gap-9 md:grid-cols-4 md:gap-[36px_28px]">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <p className="m-0 font-[800] leading-none tracking-[-0.045em] [font-size:clamp(34px,4vw,58px)] [margin-left:-0.04em] bg-[image:linear-gradient(100deg,#8b3dff,#ff2f92_60%,#ff8a3d)] bg-clip-text text-transparent">
                  {stat.num}
                </p>
                <p className="mt-4 text-[11px] font-semibold leading-[1.5] uppercase tracking-[0.2em] text-outline">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How It Works ── */}
        <section
          id="product"
          className="mx-auto max-w-[1240px] [padding:clamp(64px,8vw,104px)_clamp(20px,5vw,64px)_clamp(40px,5vw,64px)]"
        >
          <span className="mb-[18px] block text-[11px] font-semibold uppercase tracking-[0.24em] text-outline">
            How it works
          </span>
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="grid items-baseline gap-5 border-t border-white/10 py-9 [grid-template-columns:1fr] md:gap-[20px_clamp(24px,4vw,72px)] md:[grid-template-columns:minmax(56px,120px)_minmax(0,400px)_minmax(0,1fr)]"
            >
              <p className="m-0 text-[13px] font-[800] tracking-[0.18em] text-accent-pink [font-feature-settings:'tnum'_1]">
                {step.num}
              </p>
              <h2 className="m-0 font-[800] leading-[1.15] tracking-[-0.03em] [font-size:clamp(22px,2.4vw,30px)] [margin-left:-0.03em]">
                {step.title}
              </h2>
              <p className="m-0 max-w-[54ch] text-[15.5px] leading-[1.7] text-on-surface-variant">
                {step.copy}
              </p>
            </div>
          ))}
        </section>

        {/* ── Product Sections ── */}
        <section className="mx-auto max-w-[1240px] [padding:0_clamp(20px,5vw,64px)_clamp(64px,8vw,96px)]">
          {/* Schedule */}
          <div className="grid items-center gap-8 border-t border-white/10 [padding:clamp(48px,6vw,72px)_0] [grid-template-columns:1fr] lg:gap-[32px_clamp(32px,5vw,88px)] lg:[grid-template-columns:minmax(0,5fr)_minmax(0,7fr)]">
            <div>
              <span className="mb-[18px] block text-[11px] font-semibold uppercase tracking-[0.24em] text-accent-pink">
                Schedule
              </span>
              <h2 className="font-[800] leading-[1.04] tracking-[-0.04em] [font-size:clamp(28px,3.4vw,44px)] [margin-left:-0.03em]">
                Multi-track, one timeline
              </h2>
              <p className="mt-[22px] max-w-[46ch] text-[15.5px] leading-[1.7] text-on-surface-variant">
                Build sessions, tracks, and breakout rooms against a single
                clock. Attendees read one clear timeline; you see who is going
                where and what is about to fill up.
              </p>
            </div>
            <div className="overflow-hidden rounded-[3px] border border-white/[0.14] bg-surface-container">
              <Image
                src="/screenshots/schedule.png"
                alt="Multi-track schedule builder"
                width={1920}
                height={1080}
                className="w-full"
              />
            </div>
          </div>

          {/* Registration */}
          <div className="grid items-center gap-8 border-t border-white/10 [padding:clamp(48px,6vw,72px)_0] [grid-template-columns:1fr] lg:gap-[32px_clamp(32px,5vw,88px)] lg:[grid-template-columns:minmax(0,7fr)_minmax(0,5fr)]">
            <div className="order-2 lg:order-1 overflow-hidden rounded-[3px] border border-white/[0.14] bg-surface-container">
              <Image
                src="/screenshots/event-detail.png"
                alt="Ticket types and QR check-in"
                width={1920}
                height={1080}
                className="w-full"
              />
            </div>
            <div className="order-1 lg:order-2">
              <span className="mb-[18px] block text-[11px] font-semibold uppercase tracking-[0.24em] text-accent-pink">
                Registration
              </span>
              <h2 className="font-[800] leading-[1.04] tracking-[-0.04em] [font-size:clamp(28px,3.4vw,44px)] [margin-left:-0.03em]">
                Doors that move fast
              </h2>
              <p className="mt-[22px] max-w-[46ch] text-[15.5px] leading-[1.7] text-on-surface-variant">
                Set ticket types, capacity limits, and the questions you need
                answered. Every registrant arrives with a QR code, and any phone
                becomes the scanner at the door.
              </p>
            </div>
          </div>

          {/* Dashboard */}
          <div className="grid items-center gap-8 border-t border-white/10 [padding:clamp(48px,6vw,72px)_0_0] [grid-template-columns:1fr] lg:gap-[32px_clamp(32px,5vw,88px)] lg:[grid-template-columns:minmax(0,5fr)_minmax(0,7fr)]">
            <div>
              <span className="mb-[18px] block text-[11px] font-semibold uppercase tracking-[0.24em] text-accent-pink">
                Dashboard
              </span>
              <h2 className="font-[800] leading-[1.04] tracking-[-0.04em] [font-size:clamp(28px,3.4vw,44px)] [margin-left:-0.03em]">
                The numbers, before you ask
              </h2>
              <p className="mt-[22px] max-w-[46ch] text-[15.5px] leading-[1.7] text-on-surface-variant">
                Registrations, check-in rate, and what is coming next — on
                screen when you open the app. No exports, no reconciling between
                tools.
              </p>
            </div>
            <div className="overflow-hidden rounded-[3px] border border-white/[0.14] bg-surface-container">
              <Image
                src="/screenshots/dashboard.png"
                alt="Event analytics dashboard"
                width={1920}
                height={1080}
                className="w-full"
              />
            </div>
          </div>
        </section>

        {/* ── Use Cases ── */}
        <section
          id="use-cases"
          className="mx-auto max-w-[1240px] border-t border-white/10 [padding:clamp(64px,8vw,96px)_clamp(20px,5vw,64px)]"
        >
          <span className="mb-[18px] block text-[11px] font-semibold uppercase tracking-[0.24em] text-outline">
            Use cases
          </span>
          <h2 className="font-[800] uppercase leading-[1.02] tracking-[-0.045em] [font-size:clamp(30px,4vw,56px)] [margin-left:-0.03em]">
            Built for every
            <br />
            kind of gathering
          </h2>

          <div className="mt-[clamp(40px,5vw,64px)] grid grid-cols-1 divide-y divide-white/10 md:-ml-[30px] md:grid-cols-3 md:divide-x md:divide-y-0 md:[background:rgba(255,255,255,0.1)] md:[gap:1px]">
            {USE_CASES.map((uc) => (
              <div
                key={uc.title}
                className="bg-surface p-[34px_0px] md:p-[34px_30px]"
              >
                <h3 className="text-[22px] font-[800] tracking-[-0.03em]">
                  {uc.title}
                </h3>
                <p className="mt-4 mb-[22px] text-[15px] leading-[1.7] text-on-surface-variant">
                  {uc.copy}
                </p>
                <div className="flex flex-wrap gap-2">
                  {uc.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-[2px] border border-white/[0.18] px-[10px] py-[6px] text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing ── */}
        <section
          id="pricing"
          className="mx-auto max-w-[1240px] border-t border-white/10 [padding:clamp(64px,8vw,96px)_clamp(20px,5vw,64px)]"
        >
          <div className="grid grid-cols-1 gap-10 lg:gap-[40px_clamp(32px,5vw,88px)] lg:[grid-template-columns:minmax(0,5fr)_minmax(0,7fr)]">
            {/* Left */}
            <div>
              <span className="mb-[18px] block text-[11px] font-semibold uppercase tracking-[0.24em] text-outline">
                Pricing
              </span>
              <h2 className="font-[800] uppercase leading-[0.98] tracking-[-0.05em] [font-size:clamp(32px,4.2vw,60px)] [margin-left:-0.04em]">
                <span className="block">Custom pricing</span>
                <span className="block bg-[image:linear-gradient(100deg,#8b3dff,#ff2f92_58%,#ff8a3d)] bg-clip-text text-transparent">
                  for every event.
                </span>
              </h2>
              <p className="mt-[26px] max-w-[38ch] text-[15.5px] leading-[1.7] text-on-surface-variant">
                Every event is unique. Tell us about yours and we&apos;ll create
                a custom package — no per-ticket fees, no hidden charges.
              </p>
            </div>

            {/* Right — pricing CTA panel */}
            <div className="overflow-hidden rounded-[3px] border border-white/[0.16] bg-surface-container">
              {/* Header */}
              <div className="border-b border-white/[0.14] p-[26px]">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-pink">
                  Per-event pricing
                </div>
                <div className="mt-[10px] text-[26px] font-[800] tracking-[-0.03em]">
                  Tailored to your needs
                </div>
                <p className="mt-[12px] text-[14px] leading-[1.7] text-[#d4d4d8]">
                  Get a custom quote based on your event size, format, and features.
                  Most quotes delivered within 24 hours.
                </p>
              </div>

              {/* Features */}
              <ul className="m-0 grid list-none grid-cols-1 gap-x-7 p-[10px_26px] sm:grid-cols-2">
                {PLAN_FEATURES.map((feat) => (
                  <li
                    key={feat}
                    className="flex items-baseline gap-3 border-b border-white/[0.08] py-[10px] text-[14.5px] leading-[1.7] text-[#d4d4d8]"
                  >
                    <span className="relative top-[9px] block h-[6px] w-[6px] shrink-0 rounded-full bg-accent-pink" />
                    {feat}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="p-[26px]">
                <a
                  href={`${APP_URL}/pricing`}
                  className="block rounded-[2px] px-[22px] py-[15px] text-center text-[14px] font-bold text-white [background:linear-gradient(100deg,#8b3dff,#ff2f92_62%,#ff8a3d)] hover:brightness-[0.94] transition-[filter]"
                >
                  Get your quote
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section
          id="faq"
          className="mx-auto max-w-[1240px] border-t border-white/10 [padding:clamp(64px,8vw,96px)_clamp(20px,5vw,64px)]"
        >
          <span className="mb-[18px] block text-[11px] font-semibold uppercase tracking-[0.24em] text-outline">
            FAQ
          </span>
          <h2 className="mb-[clamp(32px,4vw,52px)] font-[800] uppercase leading-[1.02] tracking-[-0.045em] [font-size:clamp(30px,4vw,56px)] [margin-left:-0.03em]">
            Questions organisers ask
          </h2>
          <div className="grid grid-cols-1 gap-x-[clamp(32px,5vw,88px)] border-t border-white/10 md:grid-cols-2">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="border-b border-white/10"
              >
                <summary className="flex items-baseline gap-4 py-[22px] text-[16.5px] font-bold leading-[1.5] tracking-[-0.02em] select-none">
                  <span className="flex-1">{faq.q}</span>
                  <span className="faq-plus text-[20px] font-[800] leading-none text-accent-pink">
                    +
                  </span>
                </summary>
                <p className="m-0 pb-[22px] pr-12 text-[15px] leading-[1.7] text-on-surface-variant">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Closing CTA ── */}
        <section className="relative overflow-hidden border-t border-white/10 bg-surface-container-low">
          <div className="pointer-events-none absolute inset-0 [background:linear-gradient(104deg,rgba(139,61,255,0.42),rgba(255,47,146,0.32)_52%,rgba(255,138,61,0.28))]" />
          <div className="relative mx-auto max-w-[1240px] [padding:clamp(72px,9vw,120px)_clamp(20px,5vw,64px)]">
            <h2 className="font-[800] uppercase leading-[0.92] tracking-[-0.05em] [font-size:clamp(34px,5.6vw,84px)] [margin-left:-0.05em]">
              Open registration
              <br />
              today.
            </h2>
            <div className="mt-[clamp(32px,4vw,48px)] flex flex-wrap items-center gap-[14px]">
              <a
                href={`${APP_URL}/pricing`}
                className="rounded-[2px] bg-on-surface px-7 py-4 text-[14px] font-bold text-surface"
              >
                Get your quote
              </a>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
                Custom pricing — no per-ticket fees
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-baseline gap-[24px_40px] [padding:clamp(40px,5vw,64px)_clamp(20px,5vw,64px)]">
          <a
            href="#"
            className="text-[19px] font-[800] tracking-[-0.04em] text-on-surface"
          >
            EVEN
            <span className="bg-[image:linear-gradient(100deg,#8b3dff,#ff2f92_60%,#ff8a3d)] bg-clip-text text-transparent">
              TRIV
            </span>
          </a>
          <nav className="mr-auto flex flex-wrap gap-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-outline">
            <a href="#product" className="transition-colors hover:text-accent-pink">
              Product
            </a>
            <a href="#use-cases" className="transition-colors hover:text-accent-pink">
              Use cases
            </a>
            <a href={`${APP_URL}/pricing`} className="transition-colors hover:text-accent-pink">
              Pricing
            </a>
            <a href="#faq" className="transition-colors hover:text-accent-pink">
              FAQ
            </a>
            <a href="/privacy-policy" className="transition-colors hover:text-accent-pink">
              Privacy
            </a>
            <a href="/terms-of-service" className="transition-colors hover:text-accent-pink">
              Terms
            </a>
          </nav>
          <span className="text-[11px] uppercase tracking-[0.14em] text-muted">
            &copy; {new Date().getFullYear()} Eventriv
          </span>
        </div>
      </footer>
    </div>
  );
}
