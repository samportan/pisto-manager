"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Search, Trash2 } from "lucide-react";

import { AddContactSheet } from "@/components/business/add-contact-sheet";
import { EditContactSheet } from "@/components/business/edit-contact-sheet";
import { PageHeader } from "@/components/business/page-header";
import { ResponsiveList } from "@/components/business/responsive-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { useContacts } from "@/hooks/useContacts";
import type { Contact } from "@/lib/db/contacts";

function typeLabel(t: Contact["type"]) {
  if (t === "customer") return "Customer";
  if (t === "supplier") return "Supplier";
  return "Both";
}

function typeVariant(t: Contact["type"]): "secondary" | "outline" | "accent" {
  if (t === "customer") return "secondary";
  if (t === "supplier") return "outline";
  return "accent";
}

export function ContactsView() {
  const { contacts, createContact, updateContact, deleteContact, isCreating, isUpdating, isLoading } =
    useContacts();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editContact, setEditContact] = React.useState<Contact | null>(null);
  const [search, setSearch] = React.useState("");
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const columns = React.useMemo<ColumnDef<Contact>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <Badge variant={typeVariant(row.original.type)}>{typeLabel(row.original.type)}</Badge>
        ),
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => row.original.phone ?? "—",
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="max-w-[12rem] truncate text-muted-foreground">
            {row.original.email ?? "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditContact(row.original)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteId(row.original.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <PageHeader
          title="Contacts"
          description="Customers and suppliers feed optional links on sales and purchases."
          actions={
            <Button type="button" size="sm" className="gap-1.5" onClick={() => setSheetOpen(true)}>
              <Plus className="size-4" aria-hidden />
              New contact
            </Button>
          }
        />

        {formError ? (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}

        <div className="relative mb-6">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Search contacts…"
            className="h-10 pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <ResponsiveList
          data={contacts}
          columns={columns}
          globalFilter={search}
          isLoading={isLoading}
          emptyLabel="No contacts yet."
          getRowKey={(c) => c.id}
          renderCard={(c) => (
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{c.name}</p>
                <Badge variant={typeVariant(c.type)}>{typeLabel(c.type)}</Badge>
              </div>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd>{c.phone ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="truncate text-right">{c.email ?? "—"}</dd>
                </div>
              </dl>
              <div className="mt-3 flex justify-end gap-2 border-t border-border pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditContact(c)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setDeleteId(c.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          )}
        />
      </div>

      <EditContactSheet
        contact={editContact}
        open={!!editContact}
        onOpenChange={(o) => !o && setEditContact(null)}
        isSubmitting={isUpdating}
        onSubmit={async (values) => {
          if (!editContact) return;
          setFormError(null);
          try {
            await updateContact({ id: editContact.id, patch: values });
          } catch (e) {
            setFormError(e instanceof Error ? e.message : "Could not save");
            throw e;
          }
        }}
      />

      <AddContactSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        isSubmitting={isCreating}
        onSubmit={async (values) => {
          setFormError(null);
          try {
            await createContact(values);
          } catch (e) {
            setFormError(e instanceof Error ? e.message : "Could not save");
            throw e;
          }
        }}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Remove contact?"
        description="Soft-deleted from lists. Past sale/purchase headers keep the link."
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={async () => {
          if (deleteId) await deleteContact(deleteId);
        }}
      />
    </div>
  );
}
