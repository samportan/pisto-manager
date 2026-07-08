import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul className={cn("flex flex-row items-center gap-1", className)} {...props} />;
}

function PaginationItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li className={cn("", className)} {...props} />;
}

type PaginationLinkProps = React.ComponentProps<typeof Button> & {
  isActive?: boolean;
};

function PaginationLink({ className, isActive, size = "icon-sm", ...props }: PaginationLinkProps) {
  return (
    <Button
      type="button"
      aria-current={isActive ? "page" : undefined}
      variant={isActive ? "secondary" : "outline"}
      size={size}
      className={cn("min-w-8", className)}
      {...props}
    />
  );
}

function PaginationPrevious({ className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button type="button" variant="outline" size="sm" className={cn("gap-1", className)} {...props}>
      <ChevronLeft className="size-4" />
    </Button>
  );
}

function PaginationNext({ className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button type="button" variant="outline" size="sm" className={cn("gap-1", className)} {...props}>
      <ChevronRight className="size-4" />
    </Button>
  );
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      className={cn("flex size-8 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontal className="size-4" />
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
