"use client";

import * as React from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateOrganizationSheet } from "@/components/create-organization-sheet";
import { useActiveOrganization } from "@/hooks/useActiveOrganization";
import { cn } from "@/lib/utils";

export function TeamSwitcher() {
  const { activeOrg, organizations, setActiveOrgId } = useActiveOrganization();
  const [open, setOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const boxRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onOutsideClick(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, [open]);

  return (
    <>
      <div className="relative" ref={boxRef}>
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-full justify-between border border-sidebar-border/60 px-2 py-2"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="truncate text-left text-sm font-semibold">
            {activeOrg.kind === "business" ? activeOrg.name : "Personal"}
          </span>
          <ChevronDown className="size-4 opacity-70" />
        </Button>
        {open ? (
          <div className="absolute z-50 mt-2 w-full rounded-md border border-border bg-popover p-1 shadow-lg">
            <button
              className={cn(
                "w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted",
                activeOrg.kind === "personal" && "bg-muted"
              )}
              onClick={() => {
                setActiveOrgId(null);
                setOpen(false);
              }}
            >
              Personal
            </button>
            {organizations.map((org) => (
              <button
                key={org.id}
                className={cn(
                  "w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted",
                  activeOrg.kind === "business" && activeOrg.id === org.id && "bg-muted"
                )}
                onClick={() => {
                  setActiveOrgId(org.id);
                  setOpen(false);
                }}
              >
                {org.name}
              </button>
            ))}
            <div className="my-1 border-t border-border" />
            <button
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => {
                setOpen(false);
                setCreateOpen(true);
              }}
            >
              <Plus className="size-4" />
              Create organization
            </button>
          </div>
        ) : null}
      </div>
      <CreateOrganizationSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => setActiveOrgId(id)}
      />
    </>
  );
}
