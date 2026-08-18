import {
  Ticket,
  Calendar,
  QrCode,
  Megaphone,
  Users,
  Gamepad2,
  BarChart3,
  MessageSquare,
  CheckCircle2,
  ChevronDown,
  Quote,
} from "lucide-react";
import { QuoteRequestForm } from "@/features/pricing/components/quote-request-form";

export const metadata = {
  title: "Pricing | Eventriv",
  description:
    "Get a custom quote for your event. No per-ticket fees, all features included.",
};

/* ---------- Social Proof ---------- */

const TESTIMONIALS = [
  {
    quote:
      "Eventriv handled our 1,500-person conference flawlessly. The custom pricing meant we only paid for what we needed.",
    author: "Sarah M.",
    role: "Conference Director",
  },
  {
    quote:
      "Switching from per-ticket pricing saved us thousands. The engagement features are best-in-class.",
    author: "James R.",
    role: "Event Manager",
  },
];

const WHY_CHOOSE_US = [
  "No per-ticket fees",
  "Enterprise-grade infrastructure",
  "All engagement features included",
  "Discounts for nonprofits",
  "Quotes within 24 hours",
];

/* ---------- Features ---------- */

const FEATURES = [
  {
    icon: Ticket,
    title: "Registration & Ticketing",
    description: "Flexible ticket types, promo codes, and group registrations.",
  },
  {
    icon: Calendar,
    title: "Multi-track Schedules",
    description:
      "Build complex agendas with multiple tracks, rooms, and speakers.",
  },
  {
    icon: QrCode,
    title: "QR Code Check-in",
    description: "Fast, contactless check-in with real-time attendance tracking.",
  },
  {
    icon: Megaphone,
    title: "Live Polls & Feedback",
    description: "Engage attendees with live polls, Q&A, and session feedback.",
  },
  {
    icon: Users,
    title: "Breakout Rooms",
    description:
      "Create focused group sessions with capacity limits and scheduling.",
  },
  {
    icon: Gamepad2,
    title: "Gamification",
    description:
      "Leaderboards, trivia, contests, and sponsor passport challenges.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description:
      "Real-time insights on attendance, engagement, and registrations.",
  },
  {
    icon: MessageSquare,
    title: "Attendee Messaging",
    description:
      "Direct messaging, announcements, and community discussion boards.",
  },
];

/* ---------- FAQ ---------- */

const FAQ_ITEMS = [
  {
    question: "How does pricing work?",
    answer:
      "We offer custom pricing based on your event size, format, and duration. There are no per-ticket fees. You tell us about your event, and we create a package that fits your needs and budget.",
  },
  {
    question: "Do you offer discounts for nonprofits?",
    answer:
      "Yes! We offer special pricing for nonprofits, educational institutions, and community organizations. Mention it in your quote request and we will apply the appropriate discount.",
  },
  {
    question: "How quickly will I receive my quote?",
    answer:
      "We respond to all quote requests within 24 hours during business days. For urgent events, let us know in the message field and we will prioritize your request.",
  },
  {
    question: "Can I try before I buy?",
    answer:
      "Absolutely. We offer a free sandbox environment where you can explore all features, build a test event, and see the platform in action before committing.",
  },
  {
    question: "What is included in every plan?",
    answer:
      "Every plan includes all features: registration, ticketing, scheduling, check-in, engagement tools, analytics, messaging, and more. We never gate features behind higher tiers.",
  },
];

/* ---------- Components ---------- */

function FAQItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <details className="group border-b border-border last:border-b-0">
      <summary className="flex cursor-pointer items-center justify-between py-5 text-left text-base font-medium text-foreground transition-colors hover:text-primary">
        {question}
        <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <p className="pb-5 text-sm leading-relaxed text-muted-foreground">
        {answer}
      </p>
    </details>
  );
}

/* ---------- Page ---------- */

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Section 1: Hero + Form + Social Proof */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          {/* Hero Text */}
          <div className="text-center mb-12 lg:mb-16">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Let&apos;s Build Your Perfect Event
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Every event is unique. Tell us about yours and we&apos;ll create a
              custom package.
            </p>
          </div>

          {/* Two-column: Social Proof + Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Left: Social Proof */}
            <div className="space-y-10">
              {/* Testimonials */}
              <div className="space-y-6">
                {TESTIMONIALS.map((t) => (
                  <div
                    key={t.author}
                    className="rounded-xl border border-border bg-card p-6 space-y-3"
                  >
                    <Quote className="h-5 w-5 text-primary/60" />
                    <p className="text-sm leading-relaxed text-foreground">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <div className="text-sm">
                      <span className="font-medium text-foreground">
                        {t.author}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        &middot; {t.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Why choose us */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Why organizers choose us
                </h3>
                <ul className="space-y-3">
                  {WHY_CHOOSE_US.map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-foreground">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right: Form */}
            <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-foreground mb-6">
                Get a Custom Quote
              </h2>
              <QuoteRequestForm />
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Features Grid */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything You Need to Run a Great Event
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              All features included. No per-ticket fees.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-card p-6 space-y-3 transition-colors hover:border-primary/30"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: FAQ */}
      <section>
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="rounded-xl border border-border bg-card px-6">
            {FAQ_ITEMS.map((item) => (
              <FAQItem
                key={item.question}
                question={item.question}
                answer={item.answer}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
