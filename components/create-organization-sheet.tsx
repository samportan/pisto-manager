"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useOrganizations } from "@/hooks/useOrganizations";

type Props = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onCreated: (id: string) => void;
};

export function CreateOrganizationSheet({ open, onOpenChange, onCreated }: Props) {
  const { createOrganization, isCreating, createError } = useOrganizations();
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<"business" | "personal">("business");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const created = await createOrganization({
      name: name.trim(),
      type,
      base_currency: "USD",
    });
    setName("");
    onCreated(created.id);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Create organization</SheetTitle>
          <SheetDescription>
            Create org first, then unlock business modules.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme LLC"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-type">Type</Label>
            <select
              id="org-type"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as "business" | "personal")}
            >
              <option value="business">Business</option>
              <option value="personal">Personal</option>
            </select>
          </div>
          {createError ? (
            <p className="text-sm text-destructive">{createError.message}</p>
          ) : null}
          <Button className="w-full" disabled={isCreating} type="submit">
            {isCreating ? "Creating..." : "Create organization"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
