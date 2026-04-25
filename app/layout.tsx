import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { getServerMfaGateState } from "@/lib/auth/mfa-server";
import { createClient } from "@/lib/supabase/server";
import { fetchAuthProfile } from "@/lib/supabase/auth-profile";
import { AuthProvider, type MfaGateState } from "@/components/auth/AuthProvider";
import AppNavbar from "@/components/AppNavbar";

const worldCupDisplay = localFont({
  src: "../fonts/FWC2026-UltraCondensedMedium.ttf",
  variable: "--font-brand",
  display: "swap",
  weight: "500",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://moran65.com"),
  applicationName: "Moran 65 - ניחושי מונדיאל 2026",
  title: {
    default: "Moran 65 - ניחושי מונדיאל 2026",
    template: "%s | Moran 65",
  },
  description: "משחק ניחושי מונדיאל 2026 בעברית עם פרופילים, ליגות פרטיות וטבלת ניקוד.",
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [{ url: "/icon.png", type: "image/png" }],
  },
  openGraph: {
    title: "Moran 65 - ניחושי מונדיאל 2026",
    description:
      "חוויית ניחושי מונדיאל 2026 עם תוצאות לייב, פרופילי שחקנים, טבלאות ודירוגים.",
    url: "https://moran65.com",
    siteName: "Moran 65",
    images: [
      {
        url: "/brand/moran65-landing.png",
        width: 1023,
        height: 1537,
        alt: "Moran65 World Cup 2026",
      },
    ],
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Moran 65 - ניחושי מונדיאל 2026",
    description: "אפליקציית ניחושי מונדיאל 2026 בעברית.",
    images: ["/brand/moran65-landing.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await fetchAuthProfile(supabase, user.id) : null;
  const initialMfaGateState: MfaGateState = user
    ? await getServerMfaGateState(supabase)
    : "clear";

  return (
    <html
      lang="he"
      dir="rtl"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${worldCupDisplay.variable} dark h-full`}
    >
      <body className="min-h-screen overflow-x-hidden bg-wc-bg font-sans text-wc-fg1 antialiased">
        <AuthProvider
          initialMfaGateState={initialMfaGateState}
          initialUser={user}
          initialProfile={profile}
        >
          <AppNavbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
