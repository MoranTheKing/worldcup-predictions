import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const worldCupDisplay = localFont({
  src: "../fonts/FWC2026-UltraCondensedMedium.ttf",
  variable: "--font-brand",
  display: "swap",
  weight: "500",
});

export const metadata: Metadata = {
  title: "תחזיות מונדיאל 2026",
  description: "משחק תחזיות מונדיאל 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="he"
      dir="rtl"
      suppressHydrationWarning
      className={`${worldCupDisplay.variable} dark h-full`}
    >
      <body className="min-h-screen overflow-x-hidden bg-wc-bg font-sans text-wc-fg1 antialiased">
        {children}
      </body>
    </html>
  );
}
