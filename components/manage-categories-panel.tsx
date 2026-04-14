"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CATEGORY_TYPES,
  type Category,
  type CategoryType,
  type NewCategoryFormValues,
} from "@/lib/db/categories";
import { cn } from "@/lib/utils";

const SWATCHES = [
  "#2563eb",
  "#0d9488",
  "#ca8a04",
  "#c2410c",
  "#7c3aed",
  "#64748b",
] as const;

type ManageCategoriesPanelProps = {
  id?: string;
  categories: Category[];
  onBack: () => void;
  onCreate: (values: NewCategoryFormValues) => void | Promise<void>;
  isSubmitting?: boolean;
  disabled?: boolean;
};

export function ManageCategoriesPanel({
  id = "manage-categories",
  categories,
  onBack,
  onCreate,
  isSubmitting = false,
  disabled = false,
}: ManageCategoriesPanelProps) {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<CategoryType>("expense");
  const [color, setColor] = React.useState<string>(SWATCHES[1]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    await onCreate({
      name: trimmed,
      type,
      color,
    });
    setName("");
  }

  const income = categories.filter((c) => c.type === "income");
  const expense = categories.filter((c) => c.type === "expense");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 -ml-1"
          onClick={onBack}
          aria-label="Back to transaction"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <p className="text-sm font-medium text-foreground">Categories</p>
      </div>

      <form
        id={`${id}-new`}
        onSubmit={handleSubmit}
        className="rounded-lg border border-border bg-muted/15 p-4 space-y-4"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          New category
        </p>
        <div className="space-y-2">
          <Label htmlFor={`${id}-name`}>Name</Label>
          <Input
            id={`${id}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Groceries"
            autoComplete="off"
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-type`}>Type</Label>
          <select
            id={`${id}-type`}
            value={type}
            onChange={(e) => setType(e.target.value as CategoryType)}
            disabled={disabled}
            className="h-9 w-full rounded-lg border border-border bg-card/50 px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-secondary focus-visible:ring-3 focus-visible:ring-secondary/30 disabled:opacity-50"
          >
            {CATEGORY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((hex) => (
              <button
                key={hex}
                type="button"
                title={hex}
                disabled={disabled}
                onClick={() => setColor(hex)}
                className={cn(
                  "size-8 rounded-lg border-2 transition-colors",
                  color === hex
                    ? "border-foreground"
                    : "border-transparent ring-1 ring-border"
                )}
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>
        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={disabled || isSubmitting || !name.trim()}
        >
          {isSubmitting ? "Adding…" : "Add category"}
        </Button>
      </form>

      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Your categories
        </p>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No categories yet. Add one above to use it in transactions.
          </p>
        ) : (
          <div className="space-y-6">
            {income.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold text-foreground">
                  Income
                </p>
                <ul className="divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
                  {income.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center gap-3 px-3 py-2.5"
                    >
                      <span
                        className="size-3 shrink-0 rounded-full ring-1 ring-border"
                        style={{
                          backgroundColor: c.color ?? "var(--muted)",
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {c.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className="shrink-0 font-normal bg-accent/15 text-accent-foreground"
                      >
                        Income
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {expense.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold text-foreground">
                  Expense
                </p>
                <ul className="divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
                  {expense.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center gap-3 px-3 py-2.5"
                    >
                      <span
                        className="size-3 shrink-0 rounded-full ring-1 ring-border"
                        style={{
                          backgroundColor: c.color ?? "var(--muted)",
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {c.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className="shrink-0 font-normal bg-secondary/20"
                      >
                        Expense
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
