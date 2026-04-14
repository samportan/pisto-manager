"use client";

import { Badge } from "@/components/ui/badge";
import type { TransactionRow } from "@/lib/transaction-display";
import { cn } from "@/lib/utils";

type TransactionListRowProps = {
  row: TransactionRow;
  showAvatar?: boolean;
};

export function TransactionListRow({
  row,
  showAvatar = false,
}: TransactionListRowProps) {
  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-muted/40 transition-colors",
        showAvatar && "items-start"
      )}
    >
      {showAvatar ? (
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary/15 text-xs font-bold text-secondary">
            {row.title.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">{row.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge
                variant="secondary"
                className="font-normal bg-accent/20 text-accent-foreground hover:bg-accent/30"
              >
                {row.categoryLabel}
              </Badge>
              <span>{row.accountLabel}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{row.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{row.dateLabel}</span>
            <Badge
              variant="secondary"
              className="font-normal bg-accent/20 text-accent-foreground hover:bg-accent/30"
            >
              {row.categoryLabel}
            </Badge>
            <span>{row.accountLabel}</span>
          </div>
        </div>
      )}
      <p
        className={cn(
          "shrink-0 text-sm font-bold tabular-nums",
          row.signedAmount >= 0 ? "text-accent" : "text-destructive"
        )}
      >
        {row.signedAmount >= 0 ? "+" : ""}
        {new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(row.signedAmount)}
      </p>
    </li>
  );
}
