import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Eventriv",
  description: "How Eventriv collects, uses, and protects your personal data.",
};

export default function PrivacyPolicyPage() {
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
          Privacy Policy
        </h1>
        <p className="mt-4 mb-12 text-on-surface-variant">
          Last updated: August 6, 2026
        </p>

        <div className="space-y-10 text-[15px] leading-[1.7] text-on-surface-variant">
          <section>
            <h2 className="mb-3 text-xl font-bold text-on-surface">
              1. Introduction
            </h2>
            <p>
              Eventriv (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;)
              operates the Eventriv platform at eventriv.com. This Privacy
              Policy explains how we collect, use, disclose, and safeguard your
              information when you use our service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-on-surface">
              2. Information We Collect
            </h2>
            <p className="mb-3">
              We collect information you provide directly to us:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong className="text-on-surface">Account information:</strong>{" "}
                name, email address, and password when you create an account.
              </li>
              <li>
                <strong className="text-on-surface">Event information:</strong>{" "}
                event details, schedules, speaker information, and venue details
                you provide when creating events.
              </li>
              <li>
                <strong className="text-on-surface">Registration data:</strong>{" "}
                information collected from attendees during event registration,
                including custom form fields you configure.
              </li>
              <li>
                <strong className="text-on-surface">Usage data:</strong>{" "}
                information about how you interact with the platform, including
                pages visited, features used, and actions taken.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-on-surface">
              3. How We Use Your Information
            </h2>
            <p className="mb-3">We use the information we collect to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Provide, maintain, and improve the Eventriv platform.</li>
              <li>
                Process event registrations and generate QR codes for check-in.
              </li>
              <li>
                Send transactional communications such as registration
                confirmations and event updates.
              </li>
              <li>
                Provide analytics and insights to event organizers about their
                events.
              </li>
              <li>Respond to your requests, comments, and questions.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-on-surface">
              4. Information Sharing
            </h2>
            <p className="mb-3">
              We do not sell your personal information. We may share information
              in the following circumstances:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <strong className="text-on-surface">With event organizers:</strong>{" "}
                when you register for an event, the organizer receives your
                registration details.
              </li>
              <li>
                <strong className="text-on-surface">Service providers:</strong>{" "}
                we work with third-party services that help us operate the
                platform (hosting, email delivery, analytics).
              </li>
              <li>
                <strong className="text-on-surface">Legal requirements:</strong>{" "}
                when required by law, regulation, or legal process.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-on-surface">
              5. Data Security
            </h2>
            <p>
              We implement appropriate technical and organizational measures to
              protect your personal information. This includes encryption in
              transit and at rest, access controls, and regular security reviews.
              However, no method of transmission over the Internet is 100%
              secure.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-on-surface">
              6. Data Retention
            </h2>
            <p>
              We retain your information for as long as your account is active or
              as needed to provide you services. You can request deletion of your
              account and associated data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-on-surface">
              7. Your Rights
            </h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Access the personal information we hold about you.</li>
              <li>Request correction of inaccurate information.</li>
              <li>Request deletion of your personal information.</li>
              <li>Export your data in a portable format.</li>
              <li>Withdraw consent for optional data processing.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-on-surface">
              8. Cookies
            </h2>
            <p>
              We use essential cookies to maintain your session and
              authentication state. We do not use third-party tracking cookies or
              advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-on-surface">
              9. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of any changes by posting the new policy on this page
              and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-bold text-on-surface">
              10. Contact Us
            </h2>
            <p>
              If you have questions about this Privacy Policy, please contact us
              at{" "}
              <a
                href="mailto:info@eventriv.com"
                className="text-accent-pink transition-colors hover:text-accent-pink-soft underline"
              >
                info@eventriv.com
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
            href="/terms-of-service"
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-outline transition-colors hover:text-accent-pink"
          >
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  );
}
