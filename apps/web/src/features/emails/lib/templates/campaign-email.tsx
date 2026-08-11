import { Html, Head, Body, Container, Heading, Text, Button, Hr, Section } from "@react-email/components";

type CampaignEmailProps = {
  eventName: string;
  eventDate: string;
  eventLocation?: string;
  bodyHtml: string;
  ctaUrl?: string;
  ctaLabel?: string;
  unsubscribeUrl?: string;
};

export function CampaignEmail({
  eventName,
  eventDate,
  eventLocation,
  bodyHtml,
  ctaUrl,
  ctaLabel = "Register",
  unsubscribeUrl,
}: CampaignEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#f4f4f5", fontFamily: "system-ui, sans-serif", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
          <Section style={{ backgroundColor: "#ffffff", borderRadius: "8px", padding: "32px", marginBottom: "16px" }}>
            <Heading style={{ fontSize: "24px", fontWeight: "bold", color: "#111827", margin: "0 0 4px" }}>
              {eventName}
            </Heading>
            <Text style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 8px" }}>
              {eventDate}{eventLocation ? ` · ${eventLocation}` : ""}
            </Text>
            <Hr style={{ borderColor: "#e5e7eb", margin: "16px 0" }} />
            <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            {ctaUrl && (
              <Section style={{ textAlign: "center", marginTop: "24px" }}>
                <Button
                  href={ctaUrl}
                  style={{
                    backgroundColor: "#0f766e",
                    color: "#ffffff",
                    padding: "12px 24px",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "600",
                    textDecoration: "none",
                  }}
                >
                  {ctaLabel}
                </Button>
              </Section>
            )}
          </Section>
          {unsubscribeUrl && (
            <Text style={{ fontSize: "12px", color: "#9ca3af", textAlign: "center" }}>
              <a href={unsubscribeUrl} style={{ color: "#9ca3af" }}>Unsubscribe</a> from future emails
            </Text>
          )}
        </Container>
      </Body>
    </Html>
  );
}
