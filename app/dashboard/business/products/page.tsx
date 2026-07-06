import type { Metadata } from "next";
import { ProductsView } from "@/components/business/products-view";

export const metadata: Metadata = {
  title: "Products",
  description: "Business products and stock",
};

export default function ProductsPage() {
  return <ProductsView />;
}
