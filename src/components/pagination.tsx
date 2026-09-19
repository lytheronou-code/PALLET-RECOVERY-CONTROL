import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Translator } from "@/i18n/translator";

function hrefForPage(basePath: string, params: Record<string, string | undefined>, page: number): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? basePath + "?" + query : basePath;
}

// No "use client" directive -- every current caller is a Server Component,
// so t is passed straight through as a regular prop (ordinary RSC
// composition, not a client/server serialization boundary).
export function Pagination({
  basePath,
  params,
  page,
  pageCount,
  total,
  t,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  pageCount: number;
  total: number;
  t: Translator;
}) {
  if (pageCount <= 1) return null;

  return (
    <div className="pagination-bar">
      <span className="pagination-summary">
        {t("common.pagination.page")} {page} {t("common.pagination.of")} {pageCount} · {total}{" "}
        {t("common.pagination.results")}
      </span>
      <div className="pagination-controls">
        {page > 1 ? (
          <Link href={hrefForPage(basePath, params, page - 1)} className="btn btn-secondary btn-sm">
            <ChevronLeft size={14} />
            {t("common.pagination.previous")}
          </Link>
        ) : (
          <span className="btn btn-secondary btn-sm disabled">
            <ChevronLeft size={14} />
            {t("common.pagination.previous")}
          </span>
        )}
        {page < pageCount ? (
          <Link href={hrefForPage(basePath, params, page + 1)} className="btn btn-secondary btn-sm">
            {t("common.pagination.next")}
            <ChevronRight size={14} />
          </Link>
        ) : (
          <span className="btn btn-secondary btn-sm disabled">
            {t("common.pagination.next")}
            <ChevronRight size={14} />
          </span>
        )}
      </div>
    </div>
  );
}
