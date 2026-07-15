import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Hr,
  Img,
} from "@react-email/components";

type Props = {
  attendeeName: string;
  eventName: string;
  eventDate: string;
  eventUrl: string;
  ticketType: string;
  qrCode?: string;
};

export function RegistrationConfirmation({
  attendeeName = "Attendee",
  eventName = "Event",
  eventDate = "",
  eventUrl = "#",
  ticketType = "General",
  qrCode,
}: Props) {
  const qrImageUrl = qrCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`
    : null;
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "system-ui, sans-serif", backgroundColor: "#f9fafb" }}>
        <Container style={{ maxWidth: "520px", margin: "40px auto", backgroundColor: "#fff", borderRadius: "8px", padding: "32px" }}>
          <Heading style={{ fontSize: "20px", marginBottom: "16px" }}>
            You're registered!
          </Heading>
          <Text style={{ fontSize: "14px", color: "#374151" }}>
            Hi {attendeeName}, your registration for <strong>{eventName}</strong> is confirmed.
          </Text>
          <Section style={{ backgroundColor: "#f3f4f6", borderRadius: "6px", padding: "16px", margin: "16px 0" }}>
            <Text style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 4px" }}>Event</Text>
            <Text style={{ fontSize: "14px", fontWeight: "600", margin: "0 0 8px" }}>{eventName}</Text>
            <Text style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 4px" }}>Date</Text>
            <Text style={{ fontSize: "14px", margin: "0 0 8px" }}>{eventDate}</Text>
            <Text style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 4px" }}>Ticket</Text>
            <Text style={{ fontSize: "14px", margin: "0" }}>{ticketType}</Text>
          </Section>
          {qrImageUrl && (
            <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
              <Text style={{ fontSize: "14px", fontWeight: "600", color: "#374151", margin: "0 0 8px" }}>
                Your Check-in QR Code
              </Text>
              <Img
                src={qrImageUrl}
                alt="Check-in QR Code"
                width="200"
                height="200"
                style={{ margin: "0 auto", borderRadius: "8px", border: "1px solid #e5e7eb" }}
              />
              <Text style={{ fontSize: "12px", color: "#9ca3af", margin: "8px 0 0" }}>
                Show this QR code at the event entrance for check-in
              </Text>
            </Section>
          )}
          <Button
            href={eventUrl}
            style={{ backgroundColor: "#18181b", color: "#fff", padding: "10px 20px", borderRadius: "6px", fontSize: "14px", textDecoration: "none" }}
          >
            View Event
          </Button>
          <Hr style={{ margin: "24px 0", borderColor: "#e5e7eb" }} />
          <Text style={{ fontSize: "12px", color: "#9ca3af" }}>
            Anova - Event Management Platform
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
