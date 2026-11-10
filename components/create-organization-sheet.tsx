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
import { useT } from "@/hooks/useTranslations";

type Props = {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onCreated: (id: string) => void;
};

export function CreateOrganizationSheet({ open, onOpenChange, onCreated }: Props) {
  const { t } = useT();
  const { createOrganization, isCreating, createError } = useOrganizations();
  const [name, setName] = React.useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const created = await createOrganization({
      name: name.trim(),
      type: "business",
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
          <SheetTitle>{t("nav.createBusiness")}</SheetTitle>
          <SheetDescription>{t("nav.needBusinessBody")}</SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">{t("business.name")}</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme LLC"
              required
            />
          </div>
          {createError ? (
            <p className="text-sm text-destructive">{createError.message}</p>
          ) : null}
          <Button className="w-full" disabled={isCreating} type="submit">
            {isCreating ? t("common.saving") : t("nav.createBusiness")}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
