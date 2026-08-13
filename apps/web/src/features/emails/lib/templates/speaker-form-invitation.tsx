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
export type SpeakerFormInvitationProps = {
  speakerName: string;
  eventName: string;
  formLink: string;
  bodyText: string;
};

export function SpeakerFormInvitation({
  speakerName = "Speaker",
  eventName = "Event",
  formLink = "#",
  bodyText = "",
}: SpeakerFormInvitationProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "system-ui, sans-serif", backgroundColor: "#f9fafb" }}>
        <Container style={{ maxWidth: "520px", margin: "40px auto", backgroundColor: "#fff", borderRadius: "8px", padding: "32px" }}>
          <Heading style={{ fontSize: "20px", marginBottom: "16px" }}>
            Speaker Profile Request
          </Heading>
          <Text style={{ fontSize: "14px", color: "#374151" }}>
            Hi {speakerName},
          </Text>
          {bodyText && (
            <Text style={{ fontSize: "14px", color: "#374151", whiteSpace: "pre-line" }}>
              {bodyText}
            </Text>
          )}
          <Section style={{ backgroundColor: "#f3f4f6", borderRadius: "6px", padding: "16px", margin: "16px 0" }}>
            <Text style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 4px" }}>Event</Text>
            <Text style={{ fontSize: "14px", fontWeight: "600", margin: "0" }}>{eventName}</Text>
          </Section>
          <Button
            href={formLink}
            style={{ backgroundColor: "#18181b", color: "#fff", padding: "10px 20px", borderRadius: "6px", fontSize: "14px", textDecoration: "none" }}
          >
            Complete Your Speaker Profile
          </Button>
          <Hr style={{ margin: "24px 0", borderColor: "#e5e7eb" }} />
          <Text style={{ fontSize: "12px", color: "#9ca3af" }}>
            Evenstry - Event Management Platform
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

