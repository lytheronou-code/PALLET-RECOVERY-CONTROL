import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

function hrefForPage(basePath: string, params: Record<string, string | undefined>, page: number): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? basePath + "?" + query : basePath;
}

export function Pagination({
  basePath,
  params,
  page,
  pageCount,
  total,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  pageCount: number;
  total: number;
}) {
  if (pageCount <= 1) return null;

  return (
    <div className="pagination-bar">
      <span className="pagination-summary">
        Pagina {page} di {pageCount} · {total} risultati
      </span>
      <div className="pagination-controls">
        {page > 1 ? (
          <Link href={hrefForPage(basePath, params, page - 1)} className="btn btn-secondary btn-sm">
            <ChevronLeft size={14} />
            Precedente
          </Link>
        ) : (
          <span className="btn btn-secondary btn-sm disabled">
            <ChevronLeft size={14} />
            Precedente
          </span>
        )}
        {page < pageCount ? (
          <Link href={hrefForPage(basePath, params, page + 1)} className="btn btn-secondary btn-sm">
            Successiva
            <ChevronRight size={14} />
          </Link>
        ) : (
          <span className="btn btn-secondary btn-sm disabled">
            Successiva
            <ChevronRight size={14} />
          </span>
        )}
      </div>
    </div>
  );
}
