import { jsPDF } from "jspdf";
import QRCode from "qrcode";

type BadgeInput = {
  name: string;
  email: string;
  company?: string;
  jobTitle?: string;
  ticketType: string;
  qrCode: string;
  labels?: string[];
};

type BadgeConfig = {
  showCompany: boolean;
  showJobTitle: boolean;
  showLabels: boolean;
  colorByTicketType: boolean;
};

const TICKET_COLORS: Record<string, [number, number, number]> = {};
const COLOR_PALETTE: [number, number, number][] = [
  [45, 55, 72],
  [139, 92, 246],
  [14, 165, 233],
  [234, 88, 12],
  [22, 163, 74],
  [225, 29, 72],
];

function getTicketColor(ticketType: string): [number, number, number] {
  if (!TICKET_COLORS[ticketType]) {
    const idx = Object.keys(TICKET_COLORS).length % COLOR_PALETTE.length;
    TICKET_COLORS[ticketType] = COLOR_PALETTE[idx];
  }
  return TICKET_COLORS[ticketType];
}

export async function generateBadgesPdf(
  attendees: BadgeInput[],
  eventTitle: string,
  config: BadgeConfig
): Promise<Uint8Array> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const badgeW = 130;
  const badgeH = 90;
  const marginX = (pageWidth - badgeW * 2) / 3;
  const marginY = (pageHeight - badgeH * 2) / 3;

  const positions = [
    { x: marginX, y: marginY },
    { x: marginX + badgeW + marginX, y: marginY },
    { x: marginX, y: marginY + badgeH + marginY },
    { x: marginX + badgeW + marginX, y: marginY + badgeH + marginY },
  ];

  for (let i = 0; i < attendees.length; i++) {
    if (i > 0 && i % 4 === 0) doc.addPage();

    const pos = positions[i % 4];
    const a = attendees[i];
    const color = config.colorByTicketType
      ? getTicketColor(a.ticketType)
      : ([45, 55, 72] as [number, number, number]);

    // Badge border
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(pos.x, pos.y, badgeW, badgeH);

    // Color header strip
    doc.setFillColor(...color);
    doc.rect(pos.x, pos.y, badgeW, 5, "F");

    // QR code
    const qrSize = 28;
    const qrX = pos.x + 6;
    const qrY = pos.y + 12;

    try {
      const qrDataUrl = await QRCode.toDataURL(a.qrCode, {
        width: 200,
        margin: 0,
        errorCorrectionLevel: "M",
      });
      doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
    } catch {
      doc.setDrawColor(200, 200, 200);
      doc.rect(qrX, qrY, qrSize, qrSize);
      doc.setFontSize(6);
      doc.text("QR", qrX + qrSize / 2, qrY + qrSize / 2, {
        align: "center",
      });
    }

    // Attendee name
    const textX = pos.x + 40;
    let textY = pos.y + 16;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    const nameLines = doc.splitTextToSize(a.name, badgeW - 46);
    doc.text(nameLines, textX, textY);
    textY += nameLines.length * 6 + 2;

    // Company
    if (config.showCompany && a.company) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(a.company, textX, textY);
      textY += 5;
    }

    // Job title
    if (config.showJobTitle && a.jobTitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);
      doc.text(a.jobTitle, textX, textY);
      textY += 5;
    }

    // Divider line
    doc.setDrawColor(220, 220, 220);
    doc.line(textX, textY, pos.x + badgeW - 6, textY);
    textY += 4;

    // Ticket type
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...color);
    doc.text(a.ticketType.toUpperCase(), textX, textY);
    textY += 5;

    // Segment labels
    if (config.showLabels && a.labels && a.labels.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      let labelX = textX;
      for (const label of a.labels) {
        const labelW = doc.getTextWidth(label) + 4;
        doc.setFillColor(240, 240, 240);
        doc.roundedRect(labelX, textY - 3, labelW, 5, 1, 1, "F");
        doc.setTextColor(80, 80, 80);
        doc.text(label, labelX + 2, textY);
        labelX += labelW + 2;
      }
    }

    // Event title footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(160, 160, 160);
    doc.text(eventTitle, pos.x + badgeW / 2, pos.y + badgeH - 4, {
      align: "center",
    });
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
