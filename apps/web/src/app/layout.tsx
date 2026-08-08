import type { Metadata } from "next";
import { Bricolage_Grotesque, Public_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Evenstry",
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
        className={`${bricolage.variable} ${publicSans.variable} font-sans antialiased`}
      >
        {children}
        <Toaster
          position="bottom-right"
          gap={8}
          toastOptions={{
            className: "!bg-card !text-card-foreground !border-border !shadow-lg !rounded-[10px]",
            style: {
              padding: "14px 16px",
            },
          }}
        />
      </body>
    </html>
  );
}
