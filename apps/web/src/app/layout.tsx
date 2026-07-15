import type { Metadata } from "next";
import { DM_Sans, Source_Serif_4 } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Anova",
  description: "Modern event management platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${sourceSerif.variable} font-sans antialiased`}
      >
        {children}
        <Toaster
          position="bottom-right"
          gap={8}
          toastOptions={{
            className: "!bg-card !text-card-foreground !border-border !shadow-lg !rounded-xl",
            style: {
              padding: "14px 16px",
            },
          }}
        />
      </body>
    </html>
  );
}
