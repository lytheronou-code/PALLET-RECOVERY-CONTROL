"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/portal", label: "Panoramica" },
  { href: "/portal/movements", label: "Pallet" },
  { href: "/portal/vouchers", label: "Buoni" },
  { href: "/portal/recovery-cases", label: "Recuperi" },
  { href: "/portal/documents", label: "Documenti" },
];

export function PortalNav() {
  const pathname = usePathname();

  return (
    <div className="filter-bar" style={{ marginBottom: 20 }}>
      {ITEMS.map((item) => {
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
