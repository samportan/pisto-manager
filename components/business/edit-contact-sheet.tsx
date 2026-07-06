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
import type { Contact, ContactType, NewContact } from "@/lib/db/contacts";

type ContactFormValues = Omit<NewContact, "user_id" | "organization_id">;

type Props = {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: Partial<ContactFormValues>) => Promise<void>;
  isSubmitting?: boolean;
};

export function EditContactSheet({ contact, open, onOpenChange, onSubmit, isSubmitting }: Props) {
  const { t } = useT();
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<ContactType>("customer");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");

  React.useEffect(() => {
    if (!open || !contact) return;
    setName(contact.name);
    setType(contact.type);
    setPhone(contact.phone ?? "");
    setEmail(contact.email ?? "");
  }, [open, contact]);

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
          <SheetTitle>{t("business.editContactTitle")}</SheetTitle>
          <SheetDescription>{t("business.editContactDescriptionShort")}</SheetDescription>
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
              <Label htmlFor="ec-name">{t("business.displayName")}</Label>
              <Input
                id="ec-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder={t("business.contactNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ec-type">{t("business.role")}</Label>
              <NativeSelect
                id="ec-type"
                value={type}
                onChange={(e) => setType(e.target.value as ContactType)}
              >
                <option value="customer">{t("business.customer")}</option>
                <option value="supplier">{t("business.supplier")}</option>
                <option value="both">{t("business.both")}</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ec-phone">{t("business.phone")}</Label>
              <Input
                id="ec-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                placeholder={t("business.optional")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ec-email">{t("business.email")}</Label>
              <Input
                id="ec-email"
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
            <Button type="submit" disabled={isSubmitting || !contact}>
              {isSubmitting ? (
                <PendingLabel label={t("common.saving")} spinnerClassName="size-3.5" />
              ) : (
                t("business.saveChanges")
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
