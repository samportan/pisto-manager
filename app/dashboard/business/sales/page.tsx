import type { Metadata } from "next";
import { SalesPage } from "@/components/business/sales-page";

export const metadata: Metadata = {
  title: "Sales",
  description: "Sales records",
};

export default function BusinessSalesPage() {
  return <SalesPage />;
}
