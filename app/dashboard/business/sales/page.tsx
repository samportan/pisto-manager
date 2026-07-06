import type { Metadata } from "next";
import { SalesView } from "@/components/business/sales-view";

export const metadata: Metadata = {
  title: "Sales",
  description: "Sales records",
};

export default function SalesPage() {
  return <SalesView />;
}
