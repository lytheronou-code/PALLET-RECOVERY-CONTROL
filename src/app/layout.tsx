import type { Metadata } from "next";
import "./globals.css";
import { resolveLocale } from "@/i18n/resolve";

export const metadata: Metadata = {
  applicationName: "Pallet Recovery Control",
  title: {
    default: "Pallet Recovery Control",
    template: "%s · Pallet Recovery Control",
  },
  description: "Pallet leakage, reconciliation and recovery operations",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // No organization is known at this shared root (it wraps auth pages,
  // onboarding, and both workspace types), so this is the user's own
  // preferred_locale or the unauthenticated cookie/Accept-Language fallback
  // -- never an organization default. Route groups that do know their
  // organization (src/app/(app)/layout.tsx, src/app/(portal)/portal/layout.tsx)
  // resolve the full hierarchy themselves for actual page content; this only
  // sets the <html lang> attribute, so the gap between the two is at most a
  // cosmetic a11y/SEO hint, never a rendered-content mismatch.
  const locale = await resolveLocale();

  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
