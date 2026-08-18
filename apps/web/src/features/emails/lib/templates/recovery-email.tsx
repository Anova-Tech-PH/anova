import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Hr,
  Link,
} from "@react-email/components";

type Props = {
  eventName: string;
  eventDate: string;
  venueName?: string;
  ticketName: string;
  registrationUrl: string;
  unsubscribeUrl: string;
};

export function RecoveryEmail({
  eventName = "Event",
  eventDate = "",
  venueName,
  ticketName = "General",
  registrationUrl = "#",
  unsubscribeUrl = "#",
}: Props) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "system-ui, sans-serif", backgroundColor: "#f9fafb" }}>
        <Container style={{ maxWidth: "520px", margin: "40px auto", backgroundColor: "#fff", borderRadius: "8px", padding: "32px" }}>
          <Heading style={{ fontSize: "20px", marginBottom: "16px" }}>
            Complete your registration
          </Heading>
          <Text style={{ fontSize: "14px", color: "#374151" }}>
            You started registering for <strong>{eventName}</strong> but didn&apos;t finish.
            Your spot is still available!
          </Text>
          <Text style={{ fontSize: "14px", color: "#374151" }}>
            <strong>When:</strong> {eventDate}
          </Text>
          {venueName && (
            <Text style={{ fontSize: "14px", color: "#374151" }}>
              <strong>Where:</strong> {venueName}
            </Text>
          )}
          <Text style={{ fontSize: "14px", color: "#374151" }}>
            <strong>Ticket:</strong> {ticketName}
          </Text>
          <Button
            href={registrationUrl}
            style={{
              backgroundColor: "#18181b",
              color: "#fff",
              padding: "12px 24px",
              borderRadius: "6px",
              fontSize: "14px",
              textDecoration: "none",
              marginTop: "16px",
              display: "inline-block",
            }}
          >
            Complete Registration
          </Button>
          <Hr style={{ margin: "24px 0", borderColor: "#e5e7eb" }} />
          <Text style={{ fontSize: "12px", color: "#9ca3af" }}>
            If you&apos;ve already registered, you can ignore this email.
          </Text>
          <Link href={unsubscribeUrl} style={{ fontSize: "12px", color: "#9ca3af" }}>
            Don&apos;t want these emails? Unsubscribe
          </Link>
          <Text style={{ fontSize: "11px", color: "#d1d5db", marginTop: "8px" }}>
            Eventriv - Event Management Platform
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
