"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingLabel } from "@/components/ui/pending-label";
import { NativeSelect } from "@/components/ui/select-native";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useT } from "@/hooks/useTranslations";
import type { ContactType, NewContact } from "@/lib/db/contacts";

type ContactFormValues = Omit<NewContact, "user_id" | "organization_id">;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ContactFormValues) => Promise<void>;
  isSubmitting?: boolean;
};

export function AddContactSheet({ open, onOpenChange, onSubmit, isSubmitting }: Props) {
  const { t } = useT();
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<ContactType>("customer");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setName("");
    setType("customer");
    setPhone("");
    setEmail("");
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await onSubmit({
        name: name.trim(),
        type,
        phone: phone.trim() || null,
        email: email.trim() || null,
      });
      onOpenChange(false);
    } catch {
      // keep open
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!isSubmitting) onOpenChange(o);
      }}
    >
      <SheetContent side="right" className="w-full gap-0 overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle>{t("business.newContactTitle")}</SheetTitle>
          <SheetDescription>{t("business.contactTypeDescription")}</SheetDescription>
        </SheetHeader>
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="flex max-h-[calc(100dvh-6rem)] flex-col"
        >
          <div className="space-y-4 overflow-y-auto overscroll-contain px-4 py-6">
            <fieldset disabled={isSubmitting} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="c-name">{t("business.displayName")}</Label>
              <Input
                id="c-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder={t("business.contactNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-type">{t("business.role")}</Label>
              <NativeSelect
                id="c-type"
                value={type}
                onChange={(e) => setType(e.target.value as ContactType)}
              >
                <option value="customer">{t("business.customer")}</option>
                <option value="supplier">{t("business.supplier")}</option>
                <option value="both">{t("business.both")}</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-phone">{t("business.phone")}</Label>
              <Input
                id="c-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                placeholder={t("business.optional")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-email">{t("business.email")}</Label>
              <Input
                id="c-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder={t("business.optional")}
              />
            </div>
            </fieldset>
          </div>
          <SheetFooter className="mt-auto border-t border-border bg-card/50 px-4 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <PendingLabel label={t("common.saving")} spinnerClassName="size-3.5" />
              ) : (
                t("business.saveContact")
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
