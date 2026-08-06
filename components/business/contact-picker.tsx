"use client";

import * as React from "react";
import { ChevronDown, Search } from "lucide-react";

import { MobilePickerSheet } from "@/components/business/mobile-picker-sheet";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const isMobile = useIsMobile();
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
    if (!open || isMobile) return;
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
  }, [open, isMobile]);

  React.useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      searchRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, isMobile]);

  React.useEffect(() => {
    if (!open || isMobile) return;

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
  }, [open, isMobile, closePanel]);

  const resolvedEmptyLabel = emptyLabel ?? t("business.noSupplier");
  const resolvedSearchPlaceholder = searchPlaceholder ?? t("business.searchContacts");
  const resolvedNoMatchLabel = noMatchLabel ?? t("business.noContactsMatch");

  const triggerLabel = selected ? selected.name : resolvedEmptyLabel;

  const showEmptyOption =
    allowEmpty && (!query.trim() || resolvedEmptyLabel.toLowerCase().includes(query.trim().toLowerCase()));

  function renderSearchField() {
    return (
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          ref={searchRef}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={resolvedSearchPlaceholder}
          className={cn("h-9 pl-9", isMobile && "h-11 text-base")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
    );
  }

  function renderOptionsList(scrollable: boolean) {
    return (
      <ul role="listbox" className={cn("p-1", scrollable && "max-h-60 overflow-y-auto")}>
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
    );
  }

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

      {open && !isMobile ? (
        <div style={panelStyle} className="rounded-lg border border-border bg-card shadow-lg">
          <div className="border-b border-border p-2">{renderSearchField()}</div>
          {renderOptionsList(true)}
        </div>
      ) : null}

      {open && isMobile ? (
        <MobilePickerSheet
          open
          onClose={closePanel}
          title={resolvedSearchPlaceholder.replace(/[.…]+$/, "")}
          closeLabel={t("common.close")}
          search={renderSearchField()}
        >
          {renderOptionsList(false)}
        </MobilePickerSheet>
      ) : null}
    </div>
  );
}
