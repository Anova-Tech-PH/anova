import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Eventriv",
  description: "How Eventriv collects, uses, and protects your personal data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Nav */}
      <header className="bg-surface/80 backdrop-blur-md w-full top-0 sticky z-50 border-b border-outline-variant/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <Link
            href="/"
            className="font-display text-2xl font-bold text-primary flex items-center gap-2"
          >
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
            </svg>
            Eventriv
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
          >
            &larr; Back to home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-on-surface mb-4">
          Privacy Policy
        </h1>
        <p className="text-on-surface-variant mb-12">
          Last updated: August 6, 2026
        </p>

        <div className="prose-custom space-y-10 text-on-surface-variant leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
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
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              2. Information We Collect
            </h2>
            <p className="mb-3">
              We collect information you provide directly to us:
            </p>
            <ul className="list-disc pl-6 space-y-2">
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
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              3. How We Use Your Information
            </h2>
            <p className="mb-3">We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
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
              <li>
                Respond to your requests, comments, and questions.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              4. Information Sharing
            </h2>
            <p className="mb-3">
              We do not sell your personal information. We may share information
              in the following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2">
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
            <h2 className="text-xl font-semibold text-on-surface mb-3">
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
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              6. Data Retention
            </h2>
            <p>
              We retain your information for as long as your account is active or
              as needed to provide you services. You can request deletion of your
              account and associated data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              7. Your Rights
            </h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access the personal information we hold about you.</li>
              <li>Request correction of inaccurate information.</li>
              <li>Request deletion of your personal information.</li>
              <li>Export your data in a portable format.</li>
              <li>Withdraw consent for optional data processing.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              8. Cookies
            </h2>
            <p>
              We use essential cookies to maintain your session and
              authentication state. We do not use third-party tracking cookies or
              advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              9. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of any changes by posting the new policy on this page
              and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              10. Contact Us
            </h2>
            <p>
              If you have questions about this Privacy Policy, please contact us
              at{" "}
              <a
                href="mailto:privacy@eventriv.com"
                className="text-primary hover:text-primary-hover transition-colors underline"
              >
                privacy@eventriv.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-outline-variant/30 bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex justify-between items-center">
          <p className="text-sm text-outline">
            &copy; {new Date().getFullYear()} Eventriv. All rights reserved.
          </p>
          <Link
            href="/terms-of-service"
            className="text-sm text-on-surface-variant hover:text-primary transition-colors"
          >
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  );
}
