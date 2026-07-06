import type { Metadata } from "next";
import { ContactsView } from "@/components/business/contacts-view";

export const metadata: Metadata = {
  title: "Contacts",
  description: "Customers and suppliers",
};

export default function ContactsPage() {
  return <ContactsView />;
}
