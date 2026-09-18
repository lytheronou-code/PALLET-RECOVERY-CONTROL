import type { Metadata } from "next";
import "./globals.css";

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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
