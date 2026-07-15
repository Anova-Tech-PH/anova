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
} from "@react-email/components";

type Props = {
  attendeeName: string;
  eventName: string;
  eventDate: string;
  eventUrl: string;
  ticketType: string;
};

export function RegistrationConfirmation({
  attendeeName = "Attendee",
  eventName = "Event",
  eventDate = "",
  eventUrl = "#",
  ticketType = "General",
}: Props) {
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
          <Button
            href={eventUrl}
            style={{ backgroundColor: "#18181b", color: "#fff", padding: "10px 20px", borderRadius: "6px", fontSize: "14px", textDecoration: "none" }}
          >
            View Event
          </Button>
          <Hr style={{ margin: "24px 0", borderColor: "#e5e7eb" }} />
          <Text style={{ fontSize: "12px", color: "#9ca3af" }}>
            Attendly - Event Management Platform
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
