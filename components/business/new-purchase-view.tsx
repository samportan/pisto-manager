"use client";

import { useRouter } from "next/navigation";

import { AddPurchaseForm } from "@/components/business/add-purchase-form";
import { useContacts } from "@/hooks/useContacts";
import { useProducts } from "@/hooks/useProducts";
import { usePurchases } from "@/hooks/usePurchases";

export function NewPurchaseView() {
  const router = useRouter();
  const { createPurchaseWithItems, isCreating } = usePurchases();
  const { contacts } = useContacts();
  const { products } = useProducts();

  const suppliers = contacts.filter((c) => c.type === "supplier" || c.type === "both");

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
