import type { Metadata } from "next";
import { BusinessOverview } from "@/components/business/business-overview";

export const metadata: Metadata = {
  title: "Business Overview",
  description: "Business finance KPIs",
};

export default function BusinessOverviewPage() {
  return <BusinessOverview />;
}
