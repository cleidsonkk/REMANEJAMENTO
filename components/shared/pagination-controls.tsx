import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaginationControlsProps = {
  pathname: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  query?: Record<string, string | undefined>;
};

function buildPageHref(
  pathname: string,
  query: Record<string, string | undefined> | undefined,
  page: number,
) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) {
      search.set(key, value);
    }
  }

  if (page > 1) {
    search.set("page", String(page));
  }

  const searchString = search.toString();
  return searchString ? `${pathname}?${searchString}` : pathname;
}

function getVisiblePages(page: number, totalPages: number) {
  const candidates = new Set([1, page - 1, page, page + 1, totalPages]);
  return Array.from(candidates)
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((left, right) => left - right);
}

export function PaginationControls({
  pathname,
  page,
  pageSize,
  total,
  totalPages,
  query,
}: PaginationControlsProps) {
  if (total <= pageSize) {
    return null;
  }

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-600">
        Exibindo <span className="font-semibold text-slate-900">{start}</span> a{" "}
        <span className="font-semibold text-slate-900">{end}</span> de{" "}
        <span className="font-semibold text-slate-900">{total}</span> registros.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          aria-disabled={page === 1}
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            page === 1 && "pointer-events-none opacity-50",
          )}
          href={buildPageHref(pathname, query, page - 1)}
        >
          Anterior
        </Link>

        {visiblePages.map((visiblePage, index) => {
          const previous = visiblePages[index - 1];
          const shouldShowGap = typeof previous === "number" && visiblePage - previous > 1;

          return (
            <div key={visiblePage} className="flex items-center gap-2">
              {shouldShowGap ? <span className="px-1 text-sm text-slate-500">...</span> : null}
              <Link
                aria-current={visiblePage === page ? "page" : undefined}
                className={buttonVariants({
                  size: "sm",
                  variant: visiblePage === page ? "default" : "outline",
                })}
                href={buildPageHref(pathname, query, visiblePage)}
              >
                {visiblePage}
              </Link>
            </div>
          );
        })}

        <Link
          aria-disabled={page === totalPages}
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            page === totalPages && "pointer-events-none opacity-50",
          )}
          href={buildPageHref(pathname, query, page + 1)}
        >
          Próxima
        </Link>
      </div>
    </div>
  );
}
