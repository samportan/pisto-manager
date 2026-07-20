"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Search, Trash2, Wallet } from "lucide-react";

import { AddContactSheet } from "@/components/business/add-contact-sheet";
import { CustomerDebtSheet } from "@/components/business/customer-debt-sheet";
import { EditContactSheet } from "@/components/business/edit-contact-sheet";
import { PageHeader } from "@/components/business/page-header";
import { DataTable } from "@/components/business/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { useContacts } from "@/hooks/useContacts";
import { useCustomerBalances } from "@/hooks/useSales";
import { useT } from "@/hooks/useTranslations";
import { useAppToast } from "@/hooks/useAppToast";
import type { Contact } from "@/lib/db/contacts";
import { formatMoneyDisplay } from "@/lib/format-money";

function typeVariant(t: Contact["type"]): "secondary" | "outline" | "accent" {
  if (t === "customer") return "secondary";
  if (t === "supplier") return "outline";
  return "accent";
}

function isCustomerContact(c: Contact): boolean {
  return c.type === "customer" || c.type === "both";
}

export function ContactsView() {
  const { t, intlLocale, currency } = useT();
  const toast = useAppToast();
  const fmt = (v: number) => formatMoneyDisplay(v, { currency, locale: intlLocale });
  const { contacts, createContact, updateContact, deleteContact, isCreating, isUpdating, isDeleting, isLoading } =
    useContacts();
  const { balanceByCustomer } = useCustomerBalances();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editContact, setEditContact] = React.useState<Contact | null>(null);
  const [debtContact, setDebtContact] = React.useState<Contact | null>(null);
  const [search, setSearch] = React.useState("");
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const contactTypeLabel = React.useCallback(
    (type: Contact["type"]) => {
      if (type === "customer") return t("business.customer");
      if (type === "supplier") return t("business.supplier");
      return t("business.both");
    },
    [t]
  );

  const columns = React.useMemo<ColumnDef<Contact>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("business.name"),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "type",
        header: t("business.type"),
        cell: ({ row }) => (
          <Badge variant={typeVariant(row.original.type)}>
            {contactTypeLabel(row.original.type)}
          </Badge>
        ),
      },
      {
        id: "balance",
        header: t("business.balanceDue"),
        cell: ({ row }) => {
          const c = row.original;
          if (!isCustomerContact(c)) return t("common.empty");
          const bal = balanceByCustomer.get(c.id);
          if (!bal || bal.balance_due <= 0) return t("common.empty");
          return (
            <button
              type="button"
              className="tabular-nums font-medium text-amber-600 hover:underline dark:text-amber-400"
              onClick={() => setDebtContact(c)}
            >
              {fmt(bal.balance_due)}
            </button>
          );
        },
      },
      {
        accessorKey: "phone",
        header: t("business.phone"),
        cell: ({ row }) => row.original.phone ?? t("common.empty"),
      },
      {
        accessorKey: "email",
        header: t("business.email"),
        cell: ({ row }) => (
          <span className="max-w-[12rem] truncate text-muted-foreground">
            {row.original.email ?? t("common.empty")}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const c = row.original;
          const bal = balanceByCustomer.get(c.id);
          const canCollect = isCustomerContact(c) && !!bal && bal.balance_due > 0;
          return (
            <div className="flex justify-end gap-1">
              {canCollect ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  title={t("business.collectCustomerDebt")}
                  aria-label={t("business.collectCustomerDebt")}
                  onClick={() => setDebtContact(c)}
                >
                  <Wallet className="size-4" />
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditContact(c)}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteId(c.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [balanceByCustomer, contactTypeLabel, fmt, t]
  );

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <PageHeader
          title={t("business.contactsTitle")}
          description={t("business.contactsSubtitle")}
          actions={
            <Button type="button" size="sm" className="gap-1.5" onClick={() => setSheetOpen(true)}>
              <Plus className="size-4" aria-hidden />
              {t("business.newContact")}
            </Button>
          }
        />

        <div className="mb-6 space-y-1.5">
          <label
            htmlFor="contacts-search"
            className="text-xs text-muted-foreground"
          >
            {t("common.search")}
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="contacts-search"
              type="search"
              placeholder={t("business.searchContacts")}
              className="h-10 pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <DataTable
          data={contacts}
          columns={columns}
          globalFilter={search}
          isLoading={isLoading}
          emptyLabel={t("business.noContacts")}
        />
      </div>

      <CustomerDebtSheet
        contact={debtContact}
        open={!!debtContact}
        onOpenChange={(o) => !o && setDebtContact(null)}
      />

      <EditContactSheet
        contact={editContact}
        open={!!editContact}
        onOpenChange={(o) => !o && setEditContact(null)}
        isSubmitting={isUpdating}
        onSubmit={async (values) => {
          if (!editContact) return;
          try {
            await updateContact({ id: editContact.id, patch: values });
            toast.success("toast.contactUpdated");
            setEditContact(null);
          } catch (e) {
            toast.errorFrom(e);
            throw e;
          }
        }}
      />

      <AddContactSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        isSubmitting={isCreating}
        onSubmit={async (values) => {
          try {
            await createContact(values);
            toast.success("toast.contactSaved");
            setSheetOpen(false);
          } catch (e) {
            toast.errorFrom(e);
            throw e;
          }
        }}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => {
          if (!o && !isDeleting) setDeleteId(null);
        }}
        title={t("business.removeContactTitle")}
        description={t("business.removeContactDescription")}
        confirmLabel={t("business.remove")}
        pendingLabel={t("common.deleting")}
        variant="destructive"
        isPending={isDeleting}
        onConfirm={async () => {
          if (deleteId) {
            await deleteContact(deleteId);
            toast.success("toast.contactDeleted");
          }
        }}
        onError={(err) => toast.errorFrom(err, "delete")}
      />
    </div>
  );
}
