import Link from "next/link";
import { ArrowRight, Copy, ScanLine, BarChart3, Check } from "lucide-react";

const APP_URL = "https://app.evenstry.com";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* ── Nav ── */}
      <header className="h-[66px] w-full bg-ink">
        <div className="mx-auto flex h-full max-w-[1300px] items-center justify-between px-9">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="font-display text-[22px] font-extrabold uppercase tracking-[-0.03em] text-white"
            >
              EVENSTRY
            </Link>
            <nav className="hidden items-center gap-6 md:flex">
              <a
                href="#features"
                className="text-[14px] text-white/70 hover:text-white"
              >
                Product
              </a>
              <a
                href="#features"
                className="text-[14px] text-white/70 hover:text-white"
              >
                Check-in
              </a>
              <a
                href="#features"
                className="text-[14px] text-white/70 hover:text-white"
              >
                Templates
              </a>
              <a
                href="#pricing"
                className="text-[14px] text-white/70 hover:text-white"
              >
                Pricing
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={`${APP_URL}/login`}
              className="text-[14px] text-white/70 hover:text-white"
            >
              Sign in
            </a>
            <a
              href={`${APP_URL}/signup`}
              className="rounded-[6px] bg-primary px-[18px] py-[10px] text-[14px] font-bold text-white"
            >
              Get started
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="w-full bg-primary">
          <div className="mx-auto grid max-w-[1300px] grid-cols-1 items-start px-9 lg:grid-cols-2">
            {/* Left column */}
            <div className="py-20 pr-0 lg:pr-14">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
                ONE WORKSPACE PER EVENT
              </p>
              <h1 className="mt-5 font-display text-[68px] font-extrabold leading-[1.0] tracking-[-0.045em] text-white [text-wrap:balance]">
                Run the whole event from a single screen.
              </h1>
              <p className="mt-6 max-w-[44ch] text-[18px] font-medium leading-[1.6] text-white/[0.88]">
                Schedule, registrations, check-in, and live stats in one
                workspace. No tab-juggling, no spreadsheet wrangling — just
                the event, under control.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href={`${APP_URL}/signup`}
                  className="inline-flex items-center gap-2 rounded-[6px] bg-white px-[26px] py-[15px] text-[15px] font-bold text-primary"
                >
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#features"
                  className="rounded-[6px] border-[1.5px] border-white/40 px-[26px] py-[15px] text-[15px] font-semibold text-white"
                >
                  See a live event
                </a>
              </div>
              <div className="mt-10 grid grid-cols-3 gap-8 border-t border-white/[0.22] pt-8">
                {[
                  { value: "4 min", label: "Median setup" },
                  { value: "1", label: "Screen to manage" },
                  { value: "0", label: "Spreadsheets needed" },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="font-display text-[30px] font-extrabold text-white">
                      {stat.value}
                    </p>
                    <p className="text-[13px] font-medium text-white/[0.78]">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column — app window preview */}
            <div className="hidden pt-14 lg:block">
              <div className="overflow-hidden rounded-t-[12px] bg-card text-ink shadow-[0_-12px_48px_rgba(0,0,0,0.22)]">
                {/* Titlebar */}
                <div className="flex h-[38px] items-center gap-[6px] px-3">
                  <span className="h-[9px] w-[9px] rounded-full bg-gray-300" />
                  <span className="h-[9px] w-[9px] rounded-full bg-gray-300" />
                  <span className="h-[9px] w-[9px] rounded-full bg-gray-300" />
                  <span className="ml-3 font-mono text-[11px] text-muted-foreground">
                    app.evenstry.com
                  </span>
                </div>

                {/* Event header */}
                <div className="border-t border-border px-5 py-4">
                  <div className="flex items-center gap-3">
                    <h3 className="font-display text-[17px] font-extrabold">
                      Lagos Design Week 2026
                    </h3>
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">
                      Live
                    </span>
                  </div>
                </div>

                {/* 4-up stat grid */}
                <div className="grid grid-cols-4 divide-x divide-border border-y border-border">
                  {[
                    { value: "1,204", label: "Registered" },
                    { value: "867", label: "Checked in" },
                    { value: "72%", label: "Attendance" },
                    { value: "₦2.4M", label: "Revenue" },
                  ].map((s) => (
                    <div key={s.label} className="px-4 py-3 text-center">
                      <p className="font-display text-[18px] font-extrabold">
                        {s.value}
                      </p>
                      <p className="text-[11px] font-medium text-muted-foreground">
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* 3-row attendee table */}
                <div className="divide-y divide-border">
                  {[
                    {
                      name: "Amina Bakare",
                      email: "amina@hey.com",
                      status: "Checked in",
                    },
                    {
                      name: "Tunde Osei",
                      email: "tunde@gmail.com",
                      status: "Checked in",
                    },
                    {
                      name: "Fatima Diallo",
                      email: "fatima@outlook.com",
                      status: "Registered",
                    },
                  ].map((row) => (
                    <div
                      key={row.name}
                      className="flex items-center justify-between px-5 py-3"
                    >
                      <div>
                        <p className="text-[13px] font-semibold">{row.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {row.email}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          row.status === "Checked in"
                            ? "bg-green-50 text-green-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {row.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="bg-background">
          <div className="mx-auto max-w-[1300px] px-9 py-[72px]">
            <h2 className="font-display text-[38px] font-extrabold tracking-[-0.04em]">
              Twelve tabs become three panes
            </h2>
            <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
              {[
                {
                  icon: Copy,
                  title: "Start from a template",
                  body: "Conference, meetup, workshop — pick a blueprint and customise. You're live in minutes, not days.",
                },
                {
                  icon: ScanLine,
                  title: "Door mode for volunteers",
                  body: "Hand any phone to a volunteer. They scan QR codes and see real-time counts — no training needed.",
                },
                {
                  icon: BarChart3,
                  title: "Numbers where you work",
                  body: "Registration pace, check-in rate, revenue — all on the same screen you already have open.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-[10px] border border-border bg-card p-6"
                >
                  <card.icon
                    className="h-[22px] w-[22px] text-primary"
                    strokeWidth={2.2}
                  />
                  <h3 className="mt-4 font-display text-[19px] font-extrabold">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-[14px] font-medium text-muted-strong">
                    {card.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="bg-background">
          <div className="mx-auto max-w-[1300px] px-9 py-[72px]">
            <div className="grid grid-cols-1 overflow-hidden rounded-[10px] border border-border bg-card lg:grid-cols-2">
              {/* Left */}
              <div className="p-12">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  PRICING
                </p>
                <h3 className="mt-4 font-display text-[40px] font-extrabold leading-[1.1] tracking-[-0.03em]">
                  Free while we&apos;re in early access.
                </h3>
                <p className="mt-4 max-w-[42ch] text-[15px] font-medium leading-[1.6] text-muted-strong">
                  Every feature, every event, zero cost. We&apos;ll introduce
                  plans later — early users keep their perks.
                </p>
                <div className="mt-8 flex items-baseline gap-2">
                  <span className="font-display text-[60px] font-extrabold tracking-[-0.05em]">
                    &#8358;0
                  </span>
                  <span className="text-[16px] font-medium text-muted-foreground">
                    / month
                  </span>
                </div>
                <a
                  href={`${APP_URL}/signup`}
                  className="mt-8 inline-flex items-center gap-2 rounded-[6px] bg-primary px-[26px] py-[15px] text-[15px] font-bold text-white"
                >
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              {/* Right — checklist */}
              <div className="bg-background p-12">
                <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                  {[
                    "Unlimited events",
                    "Ticketing & registration",
                    "Multi-track schedules",
                    "Speaker management",
                    "QR code check-in",
                    "Attendee messaging",
                    "Analytics dashboard",
                    "Public event pages",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <Check
                        className="h-[18px] w-[18px] shrink-0 text-success"
                        strokeWidth={2.6}
                      />
                      <span className="text-[14px] font-semibold">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA + Footer ── */}
        <section className="w-full bg-ink text-white">
          <div className="mx-auto max-w-[1300px] px-9 py-16">
            {/* CTA row */}
            <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <h3 className="max-w-[22ch] font-display text-[46px] font-extrabold leading-[1.1] tracking-[-0.04em]">
                Your next gathering, in one screen.
              </h3>
              <a
                href={`${APP_URL}/signup`}
                className="inline-flex shrink-0 items-center gap-2 rounded-[6px] bg-primary px-[26px] py-[15px] text-[15px] font-bold text-white"
              >
                Get started free
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            {/* Rule */}
            <div className="my-12 h-px w-full bg-white/[0.14]" />

            {/* Footer */}
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <span className="font-display text-[22px] font-extrabold uppercase tracking-[-0.03em]">
                EVENSTRY
              </span>
              <div className="flex flex-wrap items-center gap-6">
                <a
                  href="#features"
                  className="text-[13px] text-white/60 hover:text-white"
                >
                  Product
                </a>
                <a
                  href="#pricing"
                  className="text-[13px] text-white/60 hover:text-white"
                >
                  Pricing
                </a>
                <Link
                  href="/privacy-policy"
                  className="text-[13px] text-white/60 hover:text-white"
                >
                  Privacy
                </Link>
                <Link
                  href="/terms-of-service"
                  className="text-[13px] text-white/60 hover:text-white"
                >
                  Terms
                </Link>
              </div>
              <p className="text-[13px] text-white/[0.45]">
                &copy; {new Date().getFullYear()} Evenstry. All rights reserved.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
