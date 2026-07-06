import type { Metadata } from "next";
import { PurchasesView } from "@/components/business/purchases-view";

export const metadata: Metadata = {
  title: "Purchases",
  description: "Purchase records",
};

export default function PurchasesPage() {
  return <PurchasesView />;
}
