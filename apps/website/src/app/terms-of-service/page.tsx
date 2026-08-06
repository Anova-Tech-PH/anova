import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Evenstry",
  description:
    "Terms and conditions for using the Evenstry event management platform.",
};

export default function TermsOfServicePage() {
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
            Evenstry
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
          Terms of Service
        </h1>
        <p className="text-on-surface-variant mb-12">
          Last updated: August 6, 2026
        </p>

        <div className="prose-custom space-y-10 text-on-surface-variant leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using Evenstry (&quot;the Service&quot;), you
              agree to be bound by these Terms of Service. If you do not agree to
              these terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              2. Description of Service
            </h2>
            <p>
              Evenstry is an event management platform that allows users to
              create, manage, and run events including conferences, meetups, and
              workshops. The Service includes event creation, ticketing,
              registration, scheduling, attendee check-in, and analytics
              features.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              3. User Accounts
            </h2>
            <p className="mb-3">When you create an account, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
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
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              4. Acceptable Use
            </h2>
            <p className="mb-3">You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Violate any applicable laws or regulations.
              </li>
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
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              5. Event Organizer Responsibilities
            </h2>
            <p className="mb-3">As an event organizer, you are responsible for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                The accuracy of event information including dates, venues, and
                descriptions.
              </li>
              <li>
                Compliance with local laws and regulations regarding your events.
              </li>
              <li>
                Handling attendee data in accordance with applicable privacy laws.
              </li>
              <li>
                Any obligations to attendees including refunds, if applicable.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              6. Intellectual Property
            </h2>
            <p>
              The Service and its original content, features, and functionality
              are owned by Evenstry and are protected by intellectual property
              laws. You retain ownership of all content you create or upload to
              the platform, and grant us a limited license to display and
              distribute that content as necessary to provide the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              7. Pricing and Payment
            </h2>
            <p>
              Evenstry is currently offered free of charge during the early
              access period. We reserve the right to introduce paid plans in the
              future. Any changes to pricing will be communicated in advance, and
              you will not be charged without your consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
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
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              9. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, Evenstry shall not be
              liable for any indirect, incidental, special, consequential, or
              punitive damages, including loss of profits, data, or business
              opportunities, arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              10. Termination
            </h2>
            <p>
              You may terminate your account at any time. We may suspend or
              terminate your access to the Service if you violate these Terms. Upon
              termination, your right to use the Service will immediately cease.
              We will make your data available for export for a reasonable period
              after termination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-on-surface mb-3">
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
            <h2 className="text-xl font-semibold text-on-surface mb-3">
              12. Contact Us
            </h2>
            <p>
              If you have questions about these Terms, please contact us at{" "}
              <a
                href="mailto:legal@evenstry.com"
                className="text-primary hover:text-primary-hover transition-colors underline"
              >
                legal@evenstry.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-outline-variant/30 bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex justify-between items-center">
          <p className="text-sm text-outline">
            &copy; {new Date().getFullYear()} Evenstry. All rights reserved.
          </p>
          <Link
            href="/privacy-policy"
            className="text-sm text-on-surface-variant hover:text-primary transition-colors"
          >
            Privacy Policy
          </Link>
        </div>
      </footer>
    </div>
  );
}
