"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { NativeSelect } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/hooks/useTranslations";
import { cn } from "@/lib/utils";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

type DataTableProps<T> = {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  globalFilter?: string;
  isLoading?: boolean;
  emptyLabel?: string;
  className?: string;
  manualPagination?: boolean;
  pageCount?: number;
  pageIndex?: number;
  pageSize?: number;
  onPaginationChange?: (pageIndex: number, pageSize: number) => void;
  totalRows?: number;
};

export function DataTable<T>({
  data,
  columns,
  globalFilter = "",
  isLoading,
  emptyLabel = "No rows.",
  className,
  manualPagination = false,
  pageCount,
  pageIndex: controlledPageIndex,
  pageSize: controlledPageSize,
  onPaginationChange,
  totalRows,
}: DataTableProps<T>) {
  const { t } = useT();
  const resolvedEmptyLabel = emptyLabel ?? t("common.noRows");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: controlledPageIndex ?? 0,
    pageSize: controlledPageSize ?? 10,
  });

  React.useEffect(() => {
    if (controlledPageIndex !== undefined || controlledPageSize !== undefined) {
      setPagination((prev) => ({
        pageIndex: controlledPageIndex ?? prev.pageIndex,
        pageSize: controlledPageSize ?? prev.pageSize,
      }));
    }
  }, [controlledPageIndex, controlledPageSize]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater(pagination) : updater;
      setPagination(next);
      onPaginationChange?.(next.pageIndex, next.pageSize);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
    manualPagination,
    pageCount: manualPagination ? pageCount : undefined,
    globalFilterFn: "includesString",
  });

  const rows = table.getRowModel().rows;
  const currentPage = pagination.pageIndex;
  const totalPages = manualPagination
    ? (pageCount ?? 1)
    : table.getPageCount();
  const rowTotal = manualPagination ? (totalRows ?? 0) : table.getFilteredRowModel().rows.length;

  if (isLoading) {
    return (
      <div className={cn("space-y-2 rounded-xl border border-border p-4", className)}>
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  if (data.length === 0 && !manualPagination) {
    return (
      <p
        className={cn(
          "rounded-xl border border-dashed border-border bg-muted/20 px-5 py-12 text-center text-sm text-muted-foreground",
          className
        )}
      >
        {resolvedEmptyLabel}
      </p>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {manualPagination ? resolvedEmptyLabel : t("common.noMatches")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="align-top">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {t("business.tableShowing", {
            from: String(rowTotal === 0 ? 0 : currentPage * pagination.pageSize + 1),
            to: String(
              Math.min((currentPage + 1) * pagination.pageSize, rowTotal)
            ),
            total: String(rowTotal),
          })}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <NativeSelect
            value={String(pagination.pageSize)}
            onChange={(e) => {
              const size = Number(e.target.value);
              table.setPageSize(size);
              table.setPageIndex(0);
            }}
            className="h-8 w-auto text-xs"
            aria-label={t("business.rowsPerPage")}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {t("business.rowsPerPageOption", { count: String(size) })}
              </option>
            ))}
          </NativeSelect>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  disabled={currentPage <= 0}
                  onClick={() => table.previousPage()}
                  aria-label={t("business.prevPage")}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i;
                } else if (currentPage < 3) {
                  page = i;
                } else if (currentPage > totalPages - 4) {
                  page = totalPages - 5 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={page === currentPage}
                      onClick={() => table.setPageIndex(page)}
                    >
                      {page + 1}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => table.nextPage()}
                  aria-label={t("business.nextPage")}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  );
}
