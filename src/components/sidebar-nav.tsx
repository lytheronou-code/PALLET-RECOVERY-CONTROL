"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ClipboardList,
  FileBarChart,
  GitCompareArrows,
  LayoutDashboard,
  Package,
  Settings,
  Ticket,
  Upload,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Control",
    items: [
      { href: "/dashboard", label: "Command center", icon: LayoutDashboard },
      { href: "/recovery-cases", label: "Recovery", icon: ClipboardList },
      { href: "/reconciliation", label: "Riconciliazione", icon: GitCompareArrows },
      { href: "/vouchers", label: "Buoni", icon: Ticket },
    ],
  },
  {
    label: "Dati",
    items: [
      { href: "/import", label: "Importazioni", icon: Upload },
      { href: "/counterparties", label: "Controparti", icon: Building2 },
      { href: "/pallet-types", label: "Tipi pallet", icon: Package },
      { href: "/report", label: "Report", icon: FileBarChart },
    ],
  },
  {
    label: "Sistema",
    items: [{ href: "/settings", label: "Impostazioni", icon: Settings }],
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="sidebar-nav" aria-label="Navigazione principale">
      {NAV_GROUPS.map((group) => (
        <div className="nav-group" key={group.label}>
          <div className="nav-group-label">{group.label}</div>
          {group.items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link key={href} href={href} className={active ? "active" : undefined}>
                <Icon size={16} strokeWidth={1.8} />
                <span className="nav-label">{label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
