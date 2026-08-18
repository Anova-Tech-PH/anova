import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Eventriv — Event management that just works",
  description:
    "Create, manage, and run conferences, meetups, and workshops. Registrations, tickets, schedules, check-ins — one platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${archivo.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
