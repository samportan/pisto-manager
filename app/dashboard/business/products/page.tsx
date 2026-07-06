import type { Metadata } from "next";
import { ProductsPage } from "@/components/business/products-page";

export const metadata: Metadata = {
  title: "Products",
  description: "Business products and stock",
};

export default function ProductsPageRoute() {
  return <ProductsPage />;
}
