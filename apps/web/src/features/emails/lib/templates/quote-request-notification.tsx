import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Hr,
} from "@react-email/components";

type Props = {
  name: string;
  email: string;
  organizationName?: string;
  eventName: string;
  phone?: string;
  eventFormat: string;
  eventDuration: string;
  expectedAttendees: string;
  eventsPerYear: string;
  budgetRange?: string;
  message?: string;
};

export function QuoteRequestNotificationEmail({
  name = "Unknown",
  email = "",
  organizationName,
  eventName = "Event",
  phone,
  eventFormat = "",
  eventDuration = "",
  expectedAttendees = "",
  eventsPerYear = "",
  budgetRange,
  message,
}: Props) {
  return (
    <Html>
      <Head />
      <Body
        style={{
          fontFamily: "system-ui, sans-serif",
          backgroundColor: "#f9fafb",
        }}
      >
        <Container
          style={{
            maxWidth: "520px",
            margin: "40px auto",
            backgroundColor: "#fff",
            borderRadius: "8px",
            padding: "32px",
          }}
        >
          <Heading style={{ fontSize: "20px", marginBottom: "16px" }}>
            New Quote Request
          </Heading>
          <Text style={{ fontSize: "14px", color: "#374151" }}>
            A new quote request has been submitted for{" "}
            <strong>{eventName}</strong>.
          </Text>

          <Section
            style={{
              backgroundColor: "#f3f4f6",
              borderRadius: "6px",
              padding: "16px",
              margin: "16px 0",
            }}
          >
            <Text style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 4px" }}>
              Name
            </Text>
            <Text style={{ fontSize: "14px", fontWeight: "600", margin: "0 0 12px" }}>
              {name}
            </Text>

            <Text style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 4px" }}>
              Email
            </Text>
            <Text style={{ fontSize: "14px", margin: "0 0 12px" }}>{email}</Text>

            {phone && (
              <>
                <Text style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 4px" }}>
                  Phone
                </Text>
                <Text style={{ fontSize: "14px", margin: "0 0 12px" }}>
                  {phone}
                </Text>
              </>
            )}

            {organizationName && (
              <>
                <Text style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 4px" }}>
                  Organization
                </Text>
                <Text style={{ fontSize: "14px", margin: "0 0 12px" }}>
                  {organizationName}
                </Text>
              </>
            )}
          </Section>

          <Section
            style={{
              backgroundColor: "#f3f4f6",
              borderRadius: "6px",
              padding: "16px",
              margin: "16px 0",
            }}
          >
            <Text style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 4px" }}>
              Event Name
            </Text>
            <Text style={{ fontSize: "14px", fontWeight: "600", margin: "0 0 12px" }}>
              {eventName}
            </Text>

            <Text style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 4px" }}>
              Event Format
            </Text>
            <Text style={{ fontSize: "14px", margin: "0 0 12px" }}>
              {eventFormat}
            </Text>

            <Text style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 4px" }}>
              Event Duration
            </Text>
            <Text style={{ fontSize: "14px", margin: "0 0 12px" }}>
              {eventDuration}
            </Text>

            <Text style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 4px" }}>
              Expected Attendees
            </Text>
            <Text style={{ fontSize: "14px", margin: "0 0 12px" }}>
              {expectedAttendees}
            </Text>

            <Text style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 4px" }}>
              Events Per Year
            </Text>
            <Text style={{ fontSize: "14px", margin: "0 0 12px" }}>
              {eventsPerYear}
            </Text>

            {budgetRange && (
              <>
                <Text style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 4px" }}>
                  Budget Range
                </Text>
                <Text style={{ fontSize: "14px", margin: "0 0 12px" }}>
                  {budgetRange}
                </Text>
              </>
            )}
          </Section>

          {message && (
            <Section
              style={{
                backgroundColor: "#f3f4f6",
                borderRadius: "6px",
                padding: "16px",
                margin: "16px 0",
              }}
            >
              <Text style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 4px" }}>
                Additional Message
              </Text>
              <Text style={{ fontSize: "14px", margin: "0" }}>{message}</Text>
            </Section>
          )}

          <Hr style={{ margin: "24px 0", borderColor: "#e5e7eb" }} />
          <Text style={{ fontSize: "12px", color: "#9ca3af" }}>
            Eventriv - Event Management Platform
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
