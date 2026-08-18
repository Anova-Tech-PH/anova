import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Eventriv",
  description:
    "Terms and conditions for using the Eventriv event management platform.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-30 h-[74px] border-b border-white/10 [background:rgba(8,8,10,0.82)] [backdrop-filter:blur(14px)]">
        <div className="mx-auto flex h-full max-w-[1240px] items-center justify-between [padding:0_clamp(20px,5vw,64px)]">
          <Link
            href="/"
            className="text-[20px] font-[800] tracking-[-0.04em] text-on-surface"
          >
            EVEN
            <span className="bg-[image:linear-gradient(100deg,#8b3dff,#ff2f92_60%,#ff8a3d)] bg-clip-text text-transparent">
              TRIV
            </span>
          </Link>
          <Link
            href="/"
            className="text-[13px] font-semibold text-on-surface-variant transition-colors hover:text-accent-pink"
          >
            &larr; Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <h1 className="text-4xl font-[800] tracking-[-0.03em] text-on-surface md:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-4 mb-12 text-on-surface-variant">
          Last updated: August 6, 2026
        </p>

        <div className="space-y-10 text-[15px] leading-[1.7] text-on-surface-variant">
          <section>
            <h2 className="mb-3 text-xl font-bold text-on-surface">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using Eventriv (&quot;the Service&quot;), you
              agree to be bound by these Terms of Service. If you do not agree to
              these terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-on-surface">
              2. Description of Service
            </h2>
            <p>
              Eventriv is an event management platform that allows users to
              create, manage, and run events including conferences, meetups, and
              workshops. The Service includes event creation, ticketing,
              registration, scheduling, attendee check-in, and analytics
              features.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-on-surface">
              3. User Accounts
            </h2>
            <p className="mb-3">When you create an account, you agree to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Provide accurate and complete information.</li>
              <li>Maintain the security of your account credentials.</li>
              <li>
                Promptly notify us of any unauthorized use of your account.
              </li>
              <li>
                Accept responsibility for all activities that occur under your
                account.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-on-surface">
              4. Acceptable Use
            </h2>
            <p className="mb-3">You agree not to use the Service to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Violate any applicable laws or regulations.</li>
              <li>
                Create events that promote illegal activities, violence, or
                discrimination.
              </li>
              <li>
                Collect personal information from attendees for purposes beyond
                event management without their consent.
              </li>
              <li>
                Send spam or unsolicited communications through the platform.
              </li>
              <li>
                Attempt to interfere with or disrupt the Service or its
                infrastructure.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-on-surface">
              5. Event Organizer Responsibilities
            </h2>
            <p className="mb-3">
              As an event organizer, you are responsible for:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                The accuracy of event information including dates, venues, and
                descriptions.
              </li>
              <li>
                Compliance with local laws and regulations regarding your events.
              </li>
              <li>
                Handling attendee data in accordance with applicable privacy
                laws.
              </li>
              <li>
                Any obligations to attendees including refunds, if applicable.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-on-surface">
              6. Intellectual Property
            </h2>
            <p>
              The Service and its original content, features, and functionality
              are owned by Eventriv and are protected by intellectual property
              laws. You retain ownership of all content you create or upload to
              the platform, and grant us a limited license to display and
              distribute that content as necessary to provide the Service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-on-surface">
              7. Pricing and Payment
            </h2>
            <p>
              Eventriv is currently offered free of charge during the early
              access period. We reserve the right to introduce paid plans in the
              future. Any changes to pricing will be communicated in advance, and
              you will not be charged without your consent.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-on-surface">
              8. Service Availability
            </h2>
            <p>
              We strive to maintain high availability of the Service but do not
              guarantee uninterrupted access. We may temporarily suspend the
              Service for maintenance, updates, or other operational reasons. We
              will make reasonable efforts to notify users of planned downtime.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-on-surface">
              9. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, Eventriv shall not be
              liable for any indirect, incidental, special, consequential, or
              punitive damages, including loss of profits, data, or business
              opportunities, arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-on-surface">
              10. Termination
            </h2>
            <p>
              You may terminate your account at any time. We may suspend or
              terminate your access to the Service if you violate these Terms.
              Upon termination, your right to use the Service will immediately
              cease. We will make your data available for export for a reasonable
              period after termination.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-on-surface">
              11. Changes to Terms
            </h2>
            <p>
              We may modify these Terms at any time. We will provide notice of
              material changes by posting the updated Terms on this page and
              updating the &quot;Last updated&quot; date. Continued use of the
              Service after changes constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-on-surface">
              12. Contact Us
            </h2>
            <p>
              If you have questions about these Terms, please contact us at{" "}
              <a
                href="mailto:legal@eventriv.com"
                className="text-accent-pink transition-colors hover:text-accent-pink-soft underline"
              >
                legal@eventriv.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between [padding:clamp(40px,5vw,64px)_clamp(20px,5vw,64px)]">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
            &copy; {new Date().getFullYear()} Eventriv
          </p>
          <Link
            href="/privacy-policy"
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-outline transition-colors hover:text-accent-pink"
          >
            Privacy Policy
          </Link>
        </div>
      </footer>
    </div>
  );
}
