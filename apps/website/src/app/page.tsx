import Image from "next/image";

const APP_URL = "https://app.evenstry.com";

function GridIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
    </svg>
  );
}

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14 5l7 7m0 0l-7 7m7-7H3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="bg-surface/80 backdrop-blur-md w-full top-0 sticky z-50 border-b border-outline-variant/30 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <a
              className="font-display text-2xl font-bold text-primary flex items-center gap-2 group"
              href="#"
            >
              <GridIcon className="w-6 h-6 fill-current group-hover:scale-110 transition-transform" />
              Evenstry
            </a>
            <nav className="hidden md:flex space-x-6">
              <a
                href="#features"
                className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
              >
                Features
              </a>
              <a
                href="#use-cases"
                className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
              >
                Use Cases
              </a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <a
              href={`${APP_URL}/login`}
              className="hidden sm:block text-sm font-medium text-on-surface hover:text-primary transition-colors"
            >
              Log In
            </a>
            <a
              href={`${APP_URL}/signup`}
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all active:scale-95"
            >
              Get Started
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden relative">
          <div className="absolute inset-0 mesh-gradient -z-10" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl tracking-tight text-on-surface mx-auto max-w-4xl leading-[1.1] font-bold relative [text-wrap:balance]">
              Everything your event needs.{" "}
              <br />
              <span className="text-primary">One place.</span>
            </h1>
            <p className="mt-8 text-lg md:text-xl text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
              Create, manage, and run conferences, meetups, and workshops — in
              minutes, not weeks.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href={`${APP_URL}/signup`}
                className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary/30 hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all active:scale-95 group"
              >
                Start for free
                <ArrowIcon className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
            <p className="mt-4 text-sm text-outline">
              No credit card required
            </p>

            {/* Mockup */}
            <div className="mt-20 mx-auto max-w-5xl rounded-2xl md:rounded-[2rem] bg-white/50 backdrop-blur-xl p-2 md:p-4 border border-outline-variant/30 shadow-2xl relative group hover:shadow-primary/20 transition-shadow duration-500 animate-float">
              <div className="absolute top-4 left-6 flex gap-2 z-20">
                <div className="w-3 h-3 rounded-full bg-outline-variant/50" />
                <div className="w-3 h-3 rounded-full bg-outline-variant/50" />
                <div className="w-3 h-3 rounded-full bg-outline-variant/50" />
              </div>
              <Image
                src="/screenshots/dashboard.png"
                alt="Evenstry Dashboard Interface Preview"
                width={1920}
                height={1200}
                className="w-full h-auto rounded-xl md:rounded-2xl border border-outline-variant/20 shadow-sm relative z-10 object-cover aspect-[16/10]"
                priority
              />
            </div>
          </div>

          {/* Decorative gradients */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
          >
            <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary to-primary/20 opacity-40 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
          </div>
          <div
            aria-hidden="true"
            className="absolute right-0 top-1/4 -z-10 transform-gpu overflow-hidden blur-3xl"
          >
            <div className="relative right-0 aspect-square w-[30rem] translate-x-1/3 rounded-full bg-gradient-to-br from-primary/30 to-transparent opacity-50" />
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 md:py-32 bg-primary/5 border-y border-primary/10 relative">
          <div className="absolute left-8 top-8 w-16 h-16 border-4 border-primary/10 rounded-full" />
          <div className="absolute right-12 bottom-12 w-24 h-24 bg-primary/5 rounded-full blur-xl" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-2xl mb-16">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-primary">
                How it works
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
              {[
                {
                  num: "1",
                  title: "Create your event",
                  desc: "Set up your event with tickets, schedule, and speakers in a guided flow. Publish when you\u2019re ready.",
                },
                {
                  num: "2",
                  title: "Share your page",
                  desc: "Every event gets a public page with registration, schedule, and all the details. Just share the link.",
                },
                {
                  num: "3",
                  title: "Manage everything",
                  desc: "Track registrations, check in attendees with QR codes, and communicate \u2014 all from one dashboard.",
                },
              ].map((step) => (
                <div
                  key={step.num}
                  className="relative group bg-white p-8 rounded-2xl shadow-sm border border-outline-variant/20 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                  <span className="block text-5xl font-display text-primary mb-6 font-bold transition-transform group-hover:scale-110 origin-left">
                    {step.num}
                  </span>
                  <h3 className="text-xl font-semibold text-on-surface mb-3">
                    {step.title}
                  </h3>
                  <p className="text-on-surface-variant leading-relaxed [text-wrap:balance]">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Showcases */}
        <section
          id="features"
          className="py-20 md:py-32 bg-surface relative"
        >
          <div className="absolute right-0 top-1/4 w-32 h-32 bg-primary/5 rounded-l-full blur-2xl" />
          <div className="absolute left-0 bottom-1/4 w-40 h-40 bg-primary/5 rounded-r-full blur-2xl" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-32 relative z-10">
            {/* Feature 1: Schedule */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
              <div className="order-2 lg:order-1 relative rounded-2xl bg-white border border-primary/20 p-2 shadow-xl shadow-primary/5 group hover:shadow-primary/10 transition-shadow">
                <Image
                  src="/screenshots/schedule.png"
                  alt="Interactive Schedule Builder Interface"
                  width={1920}
                  height={1080}
                  className="w-full rounded-xl border border-outline-variant/20 shadow-sm"
                />
              </div>
              <div className="order-1 lg:order-2 bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-outline-variant/20 border-l-4 border-l-primary hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <svg
                    className="w-6 h-6 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-primary mb-2">
                  Schedule
                </h2>
                <h3 className="font-display text-4xl lg:text-5xl font-medium text-on-surface mb-6 [text-wrap:balance]">
                  Your schedule, organized
                </h3>
                <p className="text-lg text-on-surface-variant leading-relaxed">
                  Build multi-track schedules with sessions, speakers, and
                  breakout rooms. Attendees see a clear timeline — you see
                  who&apos;s going where.
                </p>
              </div>
            </div>

            {/* Feature 2: Registration */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
              <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-outline-variant/20 border-r-4 border-r-primary hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <svg
                    className="w-6 h-6 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-primary mb-2">
                  Registration
                </h2>
                <h3 className="font-display text-4xl lg:text-5xl font-medium text-on-surface mb-6 [text-wrap:balance]">
                  Registration that works
                </h3>
                <p className="text-lg text-on-surface-variant leading-relaxed">
                  Create ticket types, set capacity limits, and collect the info
                  you need. Every registrant gets a QR code for check-in at the
                  door.
                </p>
              </div>
              <div className="relative rounded-2xl bg-white border border-primary/20 p-2 shadow-xl shadow-primary/5 group hover:shadow-primary/10 transition-shadow">
                <Image
                  src="/screenshots/event-detail.png"
                  alt="Event Ticketing and Registration Setup"
                  width={1920}
                  height={1080}
                  className="w-full rounded-xl border border-outline-variant/20 shadow-sm"
                />
              </div>
            </div>

            {/* Feature 3: Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
              <div className="order-2 lg:order-1 relative rounded-2xl bg-white border border-primary/20 p-2 shadow-xl shadow-primary/5 group hover:shadow-primary/10 transition-shadow">
                <Image
                  src="/screenshots/public-event.png"
                  alt="Event Analytics Dashboard"
                  width={1920}
                  height={1080}
                  className="w-full rounded-xl border border-outline-variant/20 shadow-sm"
                />
              </div>
              <div className="order-1 lg:order-2 bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-outline-variant/20 border-l-4 border-l-primary hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <svg
                    className="w-6 h-6 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold uppercase tracking-widest text-primary mb-2">
                  Dashboard
                </h2>
                <h3 className="font-display text-4xl lg:text-5xl font-medium text-on-surface mb-6 [text-wrap:balance]">
                  Know what&apos;s happening
                </h3>
                <p className="text-lg text-on-surface-variant leading-relaxed">
                  See total registrations, check-in rates, and upcoming events at
                  a glance. No digging through spreadsheets — it&apos;s all there
                  when you open the app.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Event Types Grid */}
        <section
          id="use-cases"
          className="py-20 md:py-32 bg-surface-container-low border-y border-outline-variant/20 relative"
        >
          <div className="absolute right-10 top-10 w-20 h-20 border-2 border-primary/10 rotate-12" />
          <div className="absolute left-10 bottom-10 w-16 h-16 border-2 border-primary/10 -rotate-12" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="mb-12">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-primary text-center md:text-left">
                Built for every kind of event
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {/* Conferences */}
              <div className="bg-white rounded-2xl p-8 border border-outline-variant/20 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors text-primary">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-on-surface mb-4">
                  Conferences
                </h3>
                <p className="text-on-surface-variant leading-relaxed">
                  Multi-day schedules, speaker management, tracks, breakout
                  rooms, and attendee networking built in.
                </p>
              </div>

              {/* Meetups */}
              <div className="bg-white rounded-2xl p-8 border border-outline-variant/20 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors text-primary">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-on-surface mb-4">
                  Meetups
                </h3>
                <p className="text-on-surface-variant leading-relaxed">
                  Quick setup, easy registration, and QR check-in at the door.
                  Perfect for recurring community events.
                </p>
              </div>

              {/* Workshops */}
              <div className="bg-white rounded-2xl p-8 border border-outline-variant/20 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors text-primary">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-on-surface mb-4">
                  Workshops
                </h3>
                <p className="text-on-surface-variant leading-relaxed">
                  Focused sessions, attendee limits, direct messaging, and
                  everything you need for hands-on learning.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-32 bg-primary/5 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/10 z-0" />
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl relative z-10">
            <h2 className="font-display text-4xl md:text-5xl font-medium text-on-surface mb-10 [text-wrap:balance]">
              Ready to run your next event?
            </h2>
            <a
              href={`${APP_URL}/signup`}
              className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary/30 hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all active:scale-95 group"
            >
              Start for free
              <ArrowIcon className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <p className="mt-6 text-sm text-outline">
              Free plan. No credit card. Set up in minutes.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-low border-t border-outline-variant/30 w-full pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8">
            <div className="flex flex-col items-center md:items-start">
              <a
                className="font-display text-2xl font-bold text-on-surface flex items-center gap-2 mb-4"
                href="#"
              >
                <GridIcon className="w-6 h-6 fill-current text-primary" />
                Evenstry
              </a>
            </div>
            <div className="flex flex-wrap justify-center gap-6 md:gap-8">
              <a
                href="#features"
                className="text-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                Features
              </a>
              <a
                href="#use-cases"
                className="text-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                Use Cases
              </a>
              <a
                href="#"
                className="text-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                Pricing
              </a>
              <a
                href="#"
                className="text-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="#"
                className="text-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                Terms of Service
              </a>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-outline-variant/20 flex justify-center md:justify-end">
            <p className="text-sm text-outline">
              &copy; {new Date().getFullYear()} Evenstry. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
