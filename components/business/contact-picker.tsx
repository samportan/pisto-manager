"use client";

import * as React from "react";
import { ChevronDown, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useT } from "@/hooks/useTranslations";
import type { Contact } from "@/lib/db/contacts";
import { filterContactsByName } from "@/lib/contact-search";
import { cn } from "@/lib/utils";

type ContactPickerProps = {
  contacts: Contact[];
  value: string;
  onValueChange: (contactId: string) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
  searchPlaceholder?: string;
  noMatchLabel?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
};

export function ContactPicker({
  contacts,
  value,
  onValueChange,
  allowEmpty,
  emptyLabel,
  searchPlaceholder,
  noMatchLabel,
  className,
  disabled,
  id,
}: ContactPickerProps) {
  const { t } = useT();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [panelStyle, setPanelStyle] = React.useState<React.CSSProperties>({});
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const selected = React.useMemo(
    () => contacts.find((c) => c.id === value),
    [contacts, value]
  );

  const filteredContacts = React.useMemo(
    () => filterContactsByName(contacts, query),
    [contacts, query]
  );

  const closePanel = React.useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const openPanel = React.useCallback(() => {
    if (disabled) return;
    setQuery("");
    setOpen(true);
  }, [disabled]);

  function selectContact(id: string) {
    onValueChange(id);
    closePanel();
  }

  React.useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    if (!trigger) return;

    const updatePosition = () => {
      const rect = trigger.getBoundingClientRect();
      const estimatedPanelHeight = 300;
      const spaceBelow = window.innerHeight - rect.bottom - 4;
      const spaceAbove = rect.top - 4;
      const openUpward = spaceBelow < estimatedPanelHeight && spaceAbove > spaceBelow;
      const left = Math.max(4, Math.min(rect.left, window.innerWidth - rect.width - 4));
      setPanelStyle(
        openUpward
          ? {
              position: "fixed",
              bottom: window.innerHeight - rect.top + 4,
              top: "auto",
              left,
              width: rect.width,
              zIndex: 50,
            }
          : {
              position: "fixed",
              top: rect.bottom + 4,
              bottom: "auto",
              left,
              width: rect.width,
              zIndex: 50,
            }
      );
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  React.useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) closePanel();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closePanel();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closePanel]);

  const resolvedEmptyLabel = emptyLabel ?? t("business.noSupplier");
  const resolvedSearchPlaceholder = searchPlaceholder ?? t("business.searchContacts");
  const resolvedNoMatchLabel = noMatchLabel ?? t("business.noContactsMatch");

  const triggerLabel = selected ? selected.name : resolvedEmptyLabel;

  const showEmptyOption =
    allowEmpty && (!query.trim() || resolvedEmptyLabel.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => (open ? closePanel() : openPanel())}
        className={cn(
          "relative flex w-full min-w-0 items-center justify-between rounded-lg border border-border bg-card/50 py-2 pr-9 pl-3 text-left text-sm outline-none transition-colors focus-visible:border-secondary focus-visible:ring-3 focus-visible:ring-secondary/30 disabled:opacity-50",
          className
        )}
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>{triggerLabel}</span>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
      </button>

      {open ? (
        <div style={panelStyle} className="rounded-lg border border-border bg-card shadow-lg">
          <div className="relative border-b border-border p-2">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              ref={searchRef}
              type="search"
              placeholder={resolvedSearchPlaceholder}
              className="h-9 pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ul role="listbox" className="max-h-60 overflow-y-auto p-1">
            {showEmptyOption ? (
              <li role="option" aria-selected={!value}>
                <button
                  type="button"
                  className={cn(
                    "flex min-h-11 w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted md:min-h-9",
                    !value && "bg-muted"
                  )}
                  onClick={() => selectContact("")}
                >
                  <span className="truncate text-muted-foreground">{resolvedEmptyLabel}</span>
                </button>
              </li>
            ) : null}
            {filteredContacts.length === 0 && !showEmptyOption ? (
              <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                {resolvedNoMatchLabel}
              </li>
            ) : (
              filteredContacts.map((c) => (
                <li key={c.id} role="option" aria-selected={c.id === value}>
                  <button
                    type="button"
                    className={cn(
                      "flex min-h-11 w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted md:min-h-9",
                      c.id === value && "bg-muted"
                    )}
                    onClick={() => selectContact(c.id)}
                  >
                    <span className="truncate font-medium">{c.name}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
