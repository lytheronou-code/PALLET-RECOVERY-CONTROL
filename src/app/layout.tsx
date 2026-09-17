import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pallet Recovery Control",
  description: "Pallet leakage, reconciliation and recovery operations",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
