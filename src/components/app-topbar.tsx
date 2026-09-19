"use client";

import Link from "next/link";
import { Bell, Plus, Search } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { Locale } from "@/i18n/locale";

export type AppTopbarLabels = {
  searchPlaceholder: string;
  searchAriaLabel: string;
  searchHint: string;
  urgentActions: string;
  newCase: string;
  language: string;
};

export function AppTopbar({
  organizationName,
  locale,
  labels,
}: {
  organizationName: string;
  locale: Locale;
  labels: AppTopbarLabels;
}) {
  return (
    <header className="topbar">
      <form className="global-search" action="/search" method="get">
        <Search size={15} strokeWidth={2} />
        <input
          type="search"
          name="q"
          aria-label={labels.searchAriaLabel}
          placeholder={labels.searchPlaceholder}
          autoComplete="off"
        />
        <span className="search-hint">{labels.searchHint}</span>
      </form>

      <div className="topbar-spacer" />

      <span className="muted" style={{ fontSize: 11, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {organizationName}
      </span>

      <LanguageSwitcher locale={locale} ariaLabel={labels.language} />

      <Link href="/dashboard#action-center" className="topbar-icon" aria-label={labels.urgentActions}>
        <Bell size={16} />
      </Link>

      <Link href="/recovery-cases/new" className="btn btn-primary">
        <Plus size={14} />
        {labels.newCase}
      </Link>
    </header>
  );
}
