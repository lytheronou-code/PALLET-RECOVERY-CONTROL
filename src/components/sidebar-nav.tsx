"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  GitCompareArrows,
  ClipboardList,
  Building2,
  Package,
  FileBarChart,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/import", label: "Import", icon: Upload },
  { href: "/reconciliation", label: "Riconciliazione", icon: GitCompareArrows },
  { href: "/recovery-cases", label: "Recovery", icon: ClipboardList },
  { href: "/counterparties", label: "Controparti", icon: Building2 },
  { href: "/pallet-types", label: "Tipi pallet", icon: Package },
  { href: "/report", label: "Report", icon: FileBarChart },
  { href: "/settings", label: "Impostazioni", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="sidebar-nav">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} className={active ? "active" : undefined}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Icon size={16} />
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
