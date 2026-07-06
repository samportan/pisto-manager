import type { Metadata } from "next";
import { NewSaleView } from "@/components/business/new-sale-view";

export const metadata: Metadata = {
  title: "New sale",
  description: "Create a new sale",
};

export default function NewSalePage() {
  return <NewSaleView />;
}
