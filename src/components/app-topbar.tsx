"use client";

import Link from "next/link";
import { Bell, Plus, Search } from "lucide-react";

export function AppTopbar({ organizationName }: { organizationName: string }) {
  return (
    <header className="topbar">
      <form className="global-search" action="/search" method="get">
        <Search size={15} strokeWidth={2} />
        <input
          type="search"
          name="q"
          aria-label="Ricerca globale"
          placeholder="Cerca pratica, controparte o buono…"
          autoComplete="off"
        />
        <span className="search-hint">SEARCH</span>
      </form>

      <div className="topbar-spacer" />

      <span className="muted" style={{ fontSize: 11, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {organizationName}
      </span>

      <Link href="/dashboard#action-center" className="topbar-icon" aria-label="Azioni urgenti">
        <Bell size={16} />
      </Link>

      <Link href="/recovery-cases/new" className="btn btn-primary">
        <Plus size={14} />
        Nuova pratica
      </Link>
    </header>
  );
}
