import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Hr,
} from "@react-email/components";

type Props = {
  attendeeName: string;
  eventName: string;
};

export function PostEvent({
  attendeeName = "Attendee",
  eventName = "Event",
}: Props) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "system-ui, sans-serif", backgroundColor: "#f9fafb" }}>
        <Container style={{ maxWidth: "520px", margin: "40px auto", backgroundColor: "#fff", borderRadius: "8px", padding: "32px" }}>
          <Heading style={{ fontSize: "20px", marginBottom: "16px" }}>
            Thanks for attending {eventName}!
          </Heading>
          <Text style={{ fontSize: "14px", color: "#374151" }}>
            Hi {attendeeName}, thank you for attending <strong>{eventName}</strong>. We hope you had a great experience!
          </Text>
          <Text style={{ fontSize: "14px", color: "#374151" }}>
            We'd love to hear your feedback. Stay tuned for a follow-up survey.
          </Text>
          <Hr style={{ margin: "24px 0", borderColor: "#e5e7eb" }} />
          <Text style={{ fontSize: "12px", color: "#9ca3af" }}>
            Anova - Event Management Platform
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
