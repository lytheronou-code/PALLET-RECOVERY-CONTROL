"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type PortalNavLabels = {
  overview: string;
  vouchers: string;
  movements: string;
  recoveryCases: string;
  documents: string;
};

export function PortalNav({ labels }: { labels: PortalNavLabels }) {
  const pathname = usePathname();
  const items = [
    { href: "/portal", label: labels.overview },
    { href: "/portal/movements", label: labels.movements },
    { href: "/portal/vouchers", label: labels.vouchers },
    { href: "/portal/recovery-cases", label: labels.recoveryCases },
    { href: "/portal/documents", label: labels.documents },
  ];

  return (
    <div className="filter-bar" style={{ marginBottom: 20 }}>
      {items.map((item) => {
        const active = item.href === "/portal" ? pathname === "/portal" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={"filter-pill" + (active ? " active" : "")}>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
