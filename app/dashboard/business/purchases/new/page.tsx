import type { Metadata } from "next";
import { NewPurchaseView } from "@/components/business/new-purchase-view";

export const metadata: Metadata = {
  title: "New purchase",
  description: "Create a new purchase",
};

export default function NewPurchasePage() {
  return <NewPurchaseView />;
}
