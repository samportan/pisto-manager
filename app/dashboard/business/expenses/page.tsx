import type { Metadata } from "next";
import { ExpensesView } from "@/components/business/expenses-view";

export const metadata: Metadata = {
  title: "Expenses",
  description: "Operating, financial, and owner expenses",
};

export default function ExpensesPage() {
  return <ExpensesView />;
}
