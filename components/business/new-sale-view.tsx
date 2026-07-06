"use client";

import { useRouter } from "next/navigation";

import { AddSaleForm } from "@/components/business/add-sale-form";
import { useContacts } from "@/hooks/useContacts";
import { useProducts } from "@/hooks/useProducts";
import { useSales } from "@/hooks/useSales";

export function NewSaleView() {
  const router = useRouter();
  const { createSaleWithItems, isCreating } = useSales();
  const { contacts } = useContacts();
  const { products } = useProducts();

  const customers = contacts.filter((c) => c.type === "customer" || c.type === "both");

  return (
    <AddSaleForm
      products={products}
      customers={customers}
      isSubmitting={isCreating}
      onCancel={() => router.push("/dashboard/business/sales")}
      onSubmit={async (payload) => {
        await createSaleWithItems(payload);
        router.push("/dashboard/business/sales");
      }}
    />
  );
}
