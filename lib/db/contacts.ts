import { createClient } from "../client";

export const CONTACT_TYPES = ["customer", "supplier", "both"] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export type Contact = {
  id: string;
  user_id: string;
  organization_id: string;
  name: string;
  type: ContactType;
  phone: string | null;
  email: string | null;
  created_at: string;
  deleted_at: string | null;
};

export type NewContact = Omit<Contact, "id" | "created_at" | "deleted_at">;

export type ListContactsOptions = { includeDeleted?: boolean };

export async function getContactsByOrgId(
  orgId: string,
  opts?: ListContactsOptions
): Promise<Contact[]> {
  const supabase = createClient();
  let q = supabase.from("contacts").select("*").eq("organization_id", orgId);
  if (!opts?.includeDeleted) {
    q = q.is("deleted_at", null);
  }
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Contact[];
}

export async function createContact(payload: NewContact): Promise<Contact> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contacts")
    .insert({ ...payload, deleted_at: null })
    .select("*")
    .single();
  if (error) throw error;
  return data as Contact;
}

export async function updateContact(
  id: string,
  patch: Partial<NewContact>
): Promise<Contact> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contacts")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Contact;
}

export async function softDeleteContact(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("contacts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export const deleteContact = softDeleteContact;
