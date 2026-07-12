"use client";

import { useRouter } from "next/navigation";

import { AddSaleForm } from "@/components/business/add-sale-form";
import { Skeleton } from "@/components/ui/skeleton";
import { useContacts } from "@/hooks/useContacts";
import { useProducts } from "@/hooks/useProducts";
import { useSales } from "@/hooks/useSales";
import { useAppToast } from "@/hooks/useAppToast";

export function NewSaleView() {
  const router = useRouter();
  const toast = useAppToast();
  const { createSaleWithItems, isCreating } = useSales();
  const { contacts, isLoading: contactsLoading } = useContacts();
  const { products, isLoading: productsLoading } = useProducts();

  const customers = contacts.filter((c) => c.type === "customer" || c.type === "both");

  if (productsLoading || contactsLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-8 sm:px-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <AddSaleForm
      products={products}
      customers={customers}
      isSubmitting={isCreating}
      onCancel={() => router.push("/dashboard/business/sales")}
      onSubmit={async (payload) => {
        await createSaleWithItems(payload);
        toast.success("toast.saleSaved");
        router.push("/dashboard/business/sales");
      }}
    />
  );
}
