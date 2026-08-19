import type { Metadata } from "next";
import { Archivo, Source_Serif_4 } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Eventriv",
  description: "Modern event management platform",
};

const themeScript = `
(function(){
  var t = localStorage.getItem('theme');
  if (!t) t = 'light';
  if (t === 'dark') document.documentElement.classList.add('dark');
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${archivo.variable} ${sourceSerif.variable} font-sans antialiased`}
      >
        {children}
        <Toaster
          position="bottom-right"
          gap={8}
          toastOptions={{
            className: "!bg-card !text-card-foreground !border-border !shadow-lg !rounded-lg",
            style: {
              padding: "14px 16px",
            },
          }}
        />
      </body>
    </html>
  );
}
