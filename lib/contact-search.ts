import type { Contact } from "@/lib/db/contacts";

function searchTokensFromQuery(q: string): string[] {
  return q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

export function filterContactsByName(contacts: Contact[], query: string): Contact[] {
  const tokens = searchTokensFromQuery(query);
  if (tokens.length === 0) return contacts;
  return contacts.filter((c) => {
    const hay = c.name.toLowerCase();
    return tokens.every((tok) => hay.includes(tok));
  });
}
