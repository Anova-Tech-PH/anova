"use client";

export function CampaignPreview({
  eventName,
  eventDate,
  eventLocation,
  subject,
  bodyHtml,
  showCta,
  ctaUrl,
}: {
  eventName: string;
  eventDate: string;
  eventLocation?: string;
  subject: string;
  bodyHtml: string;
  showCta: boolean;
  ctaUrl?: string;
}) {
  const previewBody = bodyHtml
    .replace(/\{\{first_name\}\}/g, "Jane")
    .replace(/\{\{event_name\}\}/g, eventName)
    .replace(/\{\{event_date\}\}/g, eventDate)
    .replace(/\{\{event_url\}\}/g, ctaUrl ?? "#");

  const previewSubject = subject
    .replace(/\{\{first_name\}\}/g, "Jane")
    .replace(/\{\{event_name\}\}/g, eventName);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Email Preview</h3>
      <div className="rounded-lg border bg-[#f4f4f5] p-4">
        <div className="mx-auto max-w-[600px] rounded-lg bg-white p-8 shadow-sm">
          <p className="mb-4 text-xs text-muted-foreground">
            Subject: <span className="font-medium text-foreground">{previewSubject || "(No subject)"}</span>
          </p>
          <h2 className="text-xl font-bold">{eventName}</h2>
          <p className="text-sm text-muted-foreground">
            {eventDate}{eventLocation ? ` · ${eventLocation}` : ""}
          </p>
          <hr className="my-4 border-gray-200" />
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: previewBody || "<p class='text-muted-foreground italic'>Start typing to see preview...</p>" }}
          />
          {showCta && ctaUrl && (
            <div className="mt-6 text-center">
              <span className="inline-block rounded-lg bg-[#0f766e] px-6 py-3 text-sm font-semibold text-white">
                Register
              </span>
            </div>
          )}
          <p className="mt-6 text-center text-xs text-gray-400">
            <span className="underline">Unsubscribe</span> from future emails
          </p>
        </div>
      </div>
    </div>
  );
}
