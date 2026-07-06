"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select-native";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ContactType, NewContact } from "@/lib/db/contacts";

type ContactFormValues = Omit<NewContact, "user_id" | "organization_id">;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ContactFormValues) => Promise<void>;
  isSubmitting?: boolean;
};

export function AddContactSheet({ open, onOpenChange, onSubmit, isSubmitting }: Props) {
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle>New contact</SheetTitle>
          <SheetDescription>
            Customer, supplier, or both. Used on sales and purchase headers.
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="flex max-h-[calc(100dvh-6rem)] flex-col"
        >
          <div className="space-y-4 overflow-y-auto overscroll-contain px-4 py-6">
            <div className="space-y-2">
              <Label htmlFor="c-name">Display name</Label>
              <Input
                id="c-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Company or person"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-type">Role</Label>
              <NativeSelect
                id="c-type"
                value={type}
                onChange={(e) => setType(e.target.value as ContactType)}
              >
                <option value="customer">Customer</option>
                <option value="supplier">Supplier</option>
                <option value="both">Both</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-phone">Phone</Label>
              <Input
                id="c-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-email">Email</Label>
              <Input
                id="c-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="Optional"
              />
            </div>
          </div>
          <SheetFooter className="mt-auto border-t border-border bg-card/50 px-4 py-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save contact"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
