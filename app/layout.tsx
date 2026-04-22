import localFont from "next/font/local";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { fetchAuthProfile } from "@/lib/supabase/auth-profile";
import { AuthProvider } from "@/components/auth/AuthProvider";
import AppNavbar from "@/components/AppNavbar";

const worldCupDisplay = localFont({
  src: "../fonts/FWC2026-UltraCondensedMedium.ttf",
  variable: "--font-brand",
  display: "swap",
  weight: "500",
});

export const metadata = {
  title: "תחזיות מונדיאל 2026",
  description: "משחק תחזיות מונדיאל 2026",
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

  return (
    <html
      lang="he"
      dir="rtl"
      suppressHydrationWarning
      className={`${worldCupDisplay.variable} dark h-full`}
    >
      <body className="min-h-screen overflow-x-hidden bg-wc-bg font-sans text-wc-fg1 antialiased">
        <AuthProvider initialUser={user} initialProfile={profile}>
          <AppNavbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
