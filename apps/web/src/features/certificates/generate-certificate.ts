import { jsPDF } from "jspdf";

type CertificateInput = {
  attendeeName: string;
  eventTitle: string;
  organizationName: string;
  eventStartDate: string;
  eventEndDate: string | null;
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function generateCertificatePdf(input: CertificateInput): Uint8Array {
  const { attendeeName, eventTitle, organizationName, eventStartDate, eventEndDate } = input;

  // Landscape A4
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Outer border (double line effect)
  doc.setDrawColor(45, 55, 72); // slate-700
  doc.setLineWidth(1.5);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  doc.setLineWidth(0.5);
  doc.rect(14, 14, pageWidth - 28, pageHeight - 28);

  // Corner decorative elements
  const cornerSize = 15;
  const corners = [
    { x: 14, y: 14 },
    { x: pageWidth - 14, y: 14 },
    { x: 14, y: pageHeight - 14 },
    { x: pageWidth - 14, y: pageHeight - 14 },
  ];

  doc.setDrawColor(45, 55, 72);
  doc.setLineWidth(0.8);
  for (const corner of corners) {
    const dx = corner.x === 14 ? 1 : -1;
    const dy = corner.y === 14 ? 1 : -1;
    doc.line(corner.x, corner.y, corner.x + dx * cornerSize, corner.y);
    doc.line(corner.x, corner.y, corner.x, corner.y + dy * cornerSize);
  }

  // Top decorative line
  const centerX = pageWidth / 2;
  doc.setDrawColor(160, 140, 100); // gold accent
  doc.setLineWidth(0.6);
  doc.line(centerX - 60, 35, centerX + 60, 35);
  doc.line(centerX - 40, 37, centerX + 40, 37);

  // "Certificate of Attendance" heading
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(160, 140, 100);
  doc.text("CERTIFICATE", centerX, 50, { align: "center" });

  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(45, 55, 72);
  doc.text("of Attendance", centerX, 62, { align: "center" });

  // Decorative line below heading
  doc.setDrawColor(160, 140, 100);
  doc.setLineWidth(0.6);
  doc.line(centerX - 60, 68, centerX + 60, 68);

  // "This certifies that"
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text("This is to certify that", centerX, 82, { align: "center" });

  // Attendee name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(45, 55, 72);
  doc.text(attendeeName, centerX, 96, { align: "center" });

  // Underline for name
  const nameWidth = doc.getTextWidth(attendeeName);
  doc.setDrawColor(160, 140, 100);
  doc.setLineWidth(0.4);
  doc.line(centerX - nameWidth / 2 - 5, 99, centerX + nameWidth / 2 + 5, 99);

  // "has attended"
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text("has successfully attended", centerX, 112, { align: "center" });

  // Event title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(45, 55, 72);

  // Handle long event titles by wrapping
  const maxTitleWidth = pageWidth - 80;
  const titleLines = doc.splitTextToSize(eventTitle, maxTitleWidth);
  let titleY = 126;
  for (const line of titleLines) {
    doc.text(line, centerX, titleY, { align: "center" });
    titleY += 8;
  }

  // Date
  const dateY = titleY + 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  const dateText = eventEndDate && eventEndDate !== eventStartDate
    ? `${formatDate(eventStartDate)} - ${formatDate(eventEndDate)}`
    : formatDate(eventStartDate);
  doc.text(dateText, centerX, dateY, { align: "center" });

  // Organization name at bottom
  const orgY = pageHeight - 40;
  doc.setDrawColor(45, 55, 72);
  doc.setLineWidth(0.4);
  doc.line(centerX - 40, orgY - 2, centerX + 40, orgY - 2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(45, 55, 72);
  doc.text(organizationName, centerX, orgY + 5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(130, 130, 130);
  doc.text("Issued by", centerX, orgY + 12, { align: "center" });

  // Bottom decorative lines
  doc.setDrawColor(160, 140, 100);
  doc.setLineWidth(0.6);
  doc.line(centerX - 40, pageHeight - 22, centerX + 40, pageHeight - 22);
  doc.line(centerX - 25, pageHeight - 20, centerX + 25, pageHeight - 20);

  // Convert to Uint8Array for compatibility with NextResponse
  const arrayBuffer = doc.output("arraybuffer");
  return new Uint8Array(arrayBuffer);
}
