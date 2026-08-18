import {
  getConsentForms,
  getSubmissionCount,
} from "@/features/consent-forms/queries";
import { ConsentFormsPageClient } from "@/features/consent-forms/components/consent-forms-page-client";

export default async function ReleaseConsentFormsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const forms = await getConsentForms(eventId);

  // Fetch submission counts in parallel
  const formsWithCounts = await Promise.all(
    forms.map(async (form) => {
      const submissionCount = await getSubmissionCount(form.id);
      return { ...form, submissionCount };
    })
  );

  return (
    <ConsentFormsPageClient eventId={eventId} forms={formsWithCounts} />
  );
}
