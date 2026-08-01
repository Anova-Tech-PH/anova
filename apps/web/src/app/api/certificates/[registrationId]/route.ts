import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@attendly/ui/supabase/server";
import { getCertificateData } from "@/features/certificates/queries";
import { generateCertificatePdf } from "@/features/certificates/generate-certificate";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ registrationId: string }> }
) {
  try {
    const { registrationId } = await params;
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch certificate data
    const certData = await getCertificateData(registrationId);

    // Authorization: check if user is the attendee (by email) or an org member
    const isAttendee = certData.registration.email === user.email;

    let isOrgMember = false;
    if (!isAttendee) {
      const { data: membership } = await supabase
        .from("organization_members")
        .select("id")
        .eq("organization_id", certData.event.organizationId)
        .eq("user_id", user.id)
        .maybeSingle();

      isOrgMember = !!membership;
    }

    if (!isAttendee && !isOrgMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate PDF
    const pdfBuffer = generateCertificatePdf({
      attendeeName: certData.registration.name,
      eventTitle: certData.event.title,
      organizationName: certData.organization.name,
      eventStartDate: certData.event.startDate,
      eventEndDate: certData.event.endDate,
    });

    // Sanitize filename
    const safeName = certData.registration.name
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase();

    return new Response(pdfBuffer.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="certificate-${safeName}.pdf"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate certificate";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
