"use client";

import * as React from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select-native";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useT } from "@/hooks/useTranslations";
import { cn } from "@/lib/utils";

export type FilterChip = {
  id: string;
  label: string;
  onRemove: () => void;
};

type SearchField = {
  type: "search";
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
};

type DateField = {
  type: "date";
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
};

type SelectField = {
  type: "select";
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
};

export type FilterField = SearchField | DateField | SelectField;

type ListFilterBarProps = {
  fields: FilterField[];
  chips?: FilterChip[];
  activeFilterCount?: number;
  onClear?: () => void;
  className?: string;
};

function SearchInput({
  field,
  className,
}: {
  field: SearchField;
  className?: string;
}) {
  const { t } = useT();
  const label = field.label ?? t("common.search");

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={field.id ?? "list-search"} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id={field.id ?? "list-search"}
          type="search"
          placeholder={field.placeholder}
          className="h-10 pl-9"
          value={field.value}
          onChange={(e) => field.onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function DateInput({ field }: { field: DateField }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.id} className="text-xs text-muted-foreground">
        {field.label}
      </Label>
      <Input
        id={field.id}
        type="date"
        className="h-10"
        value={field.value}
        onChange={(e) => field.onChange(e.target.value)}
      />
    </div>
  );
}

function SelectInput({ field }: { field: SelectField }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.id} className="text-xs text-muted-foreground">
        {field.label}
      </Label>
      <NativeSelect
        id={field.id}
        value={field.value}
        onChange={(e) => field.onChange(e.target.value)}
        className="h-10 w-full min-w-[10rem]"
      >
        {field.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

function FilterFieldInput({ field }: { field: Exclude<FilterField, SearchField> }) {
  if (field.type === "date") return <DateInput field={field} />;
  return <SelectInput field={field} />;
}

function FilterChips({
  chips,
  onClear,
}: {
  chips: FilterChip[];
  onClear?: () => void;
}) {
  const { t } = useT();
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Badge key={chip.id} variant="secondary" className="gap-1 pr-1">
          {chip.label}
          <button
            type="button"
            className="rounded-full p-0.5 hover:bg-muted"
            aria-label={`${t("common.remove")}: ${chip.label}`}
            onClick={chip.onRemove}
          >
            <X className="size-3" aria-hidden />
          </button>
        </Badge>
      ))}
      {onClear ? (
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClear}>
          {t("business.clearFilters")}
        </Button>
      ) : null}
    </div>
  );
}

export function ListFilterBar({
  fields,
  chips = [],
  activeFilterCount = 0,
  onClear,
  className,
}: ListFilterBarProps) {
  const { t } = useT();
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const searchField = fields.find((f): f is SearchField => f.type === "search");
  const secondaryFields = fields.filter((f) => f.type !== "search");
  const filterCount = activeFilterCount > 0 ? activeFilterCount : chips.length;

  return (
    <div className={cn("mb-6 space-y-3", className)}>
      {searchField ? <SearchInput field={searchField} /> : null}

      {secondaryFields.length > 0 ? (
        <>
          <div className="hidden flex-wrap items-end gap-3 md:flex">
            {secondaryFields.map((field) => (
              <FilterFieldInput key={field.id} field={field} />
            ))}
            {onClear && filterCount > 0 ? (
              <Button type="button" variant="outline" size="sm" className="h-10" onClick={onClear}>
                {t("business.clearFilters")}
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 gap-2"
              onClick={() => setSheetOpen(true)}
            >
              <SlidersHorizontal className="size-4" aria-hidden />
              {t("business.filters")}
              {filterCount > 0 ? (
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
                  {filterCount}
                </Badge>
              ) : null}
            </Button>
            {onClear && filterCount > 0 ? (
              <Button type="button" variant="ghost" size="sm" className="h-10" onClick={onClear}>
                {t("business.clearFilters")}
              </Button>
            ) : null}
          </div>

          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent side="bottom" className="max-h-[85vh] gap-0 overflow-y-auto p-0">
              <SheetHeader className="border-b border-border px-4 py-4 text-left">
                <SheetTitle>{t("business.filters")}</SheetTitle>
                <SheetDescription>{t("business.activeFilters")}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 p-4">
                {secondaryFields.map((field) => (
                  <FilterFieldInput key={field.id} field={field} />
                ))}
                {onClear && filterCount > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      onClear();
                      setSheetOpen(false);
                    }}
                  >
                    {t("business.clearFilters")}
                  </Button>
                ) : null}
              </div>
            </SheetContent>
          </Sheet>
        </>
      ) : null}

      <FilterChips chips={chips} onClear={onClear && filterCount > 0 ? undefined : onClear} />
    </div>
  );
}
