import type { Metadata } from "next";
import { OverviewDashboard } from "@/components/dashboard/overview-dashboard";

export const metadata: Metadata = {
  title: "Overview",
  description: "Your Pisto overview",
};

export default function DashboardPage() {
  return <OverviewDashboard />;
}
