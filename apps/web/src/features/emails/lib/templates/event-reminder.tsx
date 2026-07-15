import {
  Html,
  Head,
  Body,
  Container,
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
  timeUntil: string;
};

export function EventReminder({
  attendeeName = "Attendee",
  eventName = "Event",
  eventDate = "",
  eventUrl = "#",
  timeUntil = "soon",
}: Props) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "system-ui, sans-serif", backgroundColor: "#f9fafb" }}>
        <Container style={{ maxWidth: "520px", margin: "40px auto", backgroundColor: "#fff", borderRadius: "8px", padding: "32px" }}>
          <Heading style={{ fontSize: "20px", marginBottom: "16px" }}>
            {eventName} starts {timeUntil}!
          </Heading>
          <Text style={{ fontSize: "14px", color: "#374151" }}>
            Hi {attendeeName}, just a reminder that <strong>{eventName}</strong> is coming up {timeUntil}.
          </Text>
          <Text style={{ fontSize: "14px", color: "#374151" }}>
            <strong>When:</strong> {eventDate}
          </Text>
          <Button
            href={eventUrl}
            style={{ backgroundColor: "#18181b", color: "#fff", padding: "10px 20px", borderRadius: "6px", fontSize: "14px", textDecoration: "none", marginTop: "16px" }}
          >
            View Event Details
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
