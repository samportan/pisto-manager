"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CreateAccountForm } from "@/components/create-account-form";
import type { NewAccountFormValues } from "@/lib/db/accounts";

type CreateAccountSheetProps = {
  onCreate?: (values: NewAccountFormValues) => void | Promise<void>;
  disabled?: boolean;
  isSubmitting?: boolean;
};

export function CreateAccountSheet({
  onCreate,
  disabled = false,
  isSubmitting = false,
}: CreateAccountSheetProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button disabled={disabled} />}>
        Add account
      </SheetTrigger>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle>New account</SheetTitle>
          <SheetDescription>
            Name, type, starting balance, color, and active status.
          </SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto px-4 py-6">
          <CreateAccountForm
            id="create-account-sheet"
            submitLabel={isSubmitting ? "Creating…" : "Create"}
            submitDisabled={isSubmitting}
            onCancel={() => setOpen(false)}
            onSubmit={async (values) => {
              if (!onCreate) {
                setOpen(false);
                return;
              }
              try {
                await onCreate(values);
                setOpen(false);
              } catch {
                // keep sheet open on error
              }
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
