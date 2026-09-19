"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ClipboardList,
  FileBarChart,
  GitCompareArrows,
  LayoutDashboard,
  MapPin,
  Package,
  Settings,
  Ticket,
  Upload,
  ArrowLeftRight,
} from "lucide-react";

export type SidebarNavLabels = {
  ariaLabel: string;
  groups: { control: string; data: string; system: string };
  items: {
    dashboard: string;
    recoveryCases: string;
    reconciliation: string;
    vouchers: string;
    movements: string;
    import: string;
    counterparties: string;
    sites: string;
    palletTypes: string;
    report: string;
    settings: string;
  };
};

function buildNavGroups(labels: SidebarNavLabels) {
  return [
    {
      label: labels.groups.control,
      items: [
        { href: "/dashboard", label: labels.items.dashboard, icon: LayoutDashboard },
        { href: "/recovery-cases", label: labels.items.recoveryCases, icon: ClipboardList },
        { href: "/reconciliation", label: labels.items.reconciliation, icon: GitCompareArrows },
        { href: "/vouchers", label: labels.items.vouchers, icon: Ticket },
      ],
    },
    {
      label: labels.groups.data,
      items: [
        { href: "/movements", label: labels.items.movements, icon: ArrowLeftRight },
        { href: "/import", label: labels.items.import, icon: Upload },
        { href: "/counterparties", label: labels.items.counterparties, icon: Building2 },
        { href: "/sites", label: labels.items.sites, icon: MapPin },
        { href: "/pallet-types", label: labels.items.palletTypes, icon: Package },
        { href: "/report", label: labels.items.report, icon: FileBarChart },
      ],
    },
    {
      label: labels.groups.system,
      items: [{ href: "/settings", label: labels.items.settings, icon: Settings }],
    },
  ];
}

export function SidebarNav({ labels }: { labels: SidebarNavLabels }) {
  const pathname = usePathname();
  const navGroups = buildNavGroups(labels);

  return (
    <nav className="sidebar-nav" aria-label={labels.ariaLabel}>
      {navGroups.map((group) => (
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
