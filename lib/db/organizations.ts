import { createClient } from "../client";

export const ORGANIZATION_TYPES = ["personal", "business"] as const;
export const ORGANIZATION_ROLES = [
  "owner",
  "admin",
  "accountant",
  "seller",
  "viewer",
] as const;

export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export type Organization = {
  id: string;
  owner_user_id: string;
  name: string;
  type: OrganizationType;
  legal_name: string | null;
  tax_id: string | null;
  base_currency: string;
  created_at: string;
};

export type OrganizationMembership = {
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  organizations: Organization | null;
};

export type NewOrganization = {
  owner_user_id: string;
  name: string;
  type: OrganizationType;
  legal_name?: string | null;
  tax_id?: string | null;
  base_currency?: string;
};

export async function getOrganizationsForUser(
  userId: string
): Promise<OrganizationMembership[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("organization_users")
    .select(
      `
      organization_id,
      user_id,
      role,
      organizations (*)
    `
    )
    .eq("user_id", userId);

  if (error) throw error;
  return (data ?? []) as unknown as OrganizationMembership[];
}

export async function createOrganization(
  input: NewOrganization
): Promise<Organization> {
  const supabase = createClient();
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      owner_user_id: input.owner_user_id,
      name: input.name,
      type: input.type,
      legal_name: input.legal_name ?? null,
      tax_id: input.tax_id ?? null,
      base_currency: input.base_currency ?? "USD",
    })
    .select("*")
    .single();

  if (orgError) throw orgError;

  const { error: memberError } = await supabase.from("organization_users").insert({
    organization_id: org.id,
    user_id: input.owner_user_id,
    role: "owner",
  });

  if (memberError) throw memberError;
  return org as Organization;
}
