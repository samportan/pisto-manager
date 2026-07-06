"use client";

import { useRouter } from "next/navigation";

import { AddPurchaseForm } from "@/components/business/add-purchase-form";
import { Skeleton } from "@/components/ui/skeleton";
import { useContacts } from "@/hooks/useContacts";
import { useProducts } from "@/hooks/useProducts";
import { usePurchases } from "@/hooks/usePurchases";

export function NewPurchaseView() {
  const router = useRouter();
  const { createPurchaseWithItems, isCreating } = usePurchases();
  const { contacts, isLoading: contactsLoading } = useContacts();
  const { products, isLoading: productsLoading } = useProducts();

  const suppliers = contacts.filter((c) => c.type === "supplier" || c.type === "both");

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
    <AddPurchaseForm
      products={products}
      suppliers={suppliers}
      isSubmitting={isCreating}
      onCancel={() => router.push("/dashboard/business/purchases")}
      onSubmit={async (payload) => {
        await createPurchaseWithItems(payload);
        router.push("/dashboard/business/purchases");
      }}
    />
  );
}
