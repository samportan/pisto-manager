"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useOrganizations } from "@/hooks/useOrganizations";

const STORAGE_KEY = "pisto.active-org-id";

type ActiveOrg =
  | { kind: "personal" }
  | { kind: "business"; id: string; name: string };

type ActiveOrgContextValue = {
  activeOrg: ActiveOrg;
  activeOrgId: string | null;
  setActiveOrgId: (id: string | null) => void;
  organizations: Array<{ id: string; name: string; type: "personal" | "business" }>;
  isLoading: boolean;
};

const ActiveOrgContext = React.createContext<ActiveOrgContextValue | null>(null);

export function ActiveOrgProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { organizations, isLoading } = useOrganizations();
  const [activeOrgId, setActiveOrgIdState] = React.useState<string | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    setActiveOrgIdState(raw || null);
    setHydrated(true);
  }, []);

  const setActiveOrgId = React.useCallback((id: string | null) => {
    setActiveOrgIdState(id);
    if (id) {
      window.localStorage.setItem(STORAGE_KEY, id);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const businessOrgs = organizations.filter((item) => item.type === "business");

  React.useEffect(() => {
    if (!hydrated || isLoading) return;
    if (!pathname?.startsWith("/dashboard/business")) return;
    if (businessOrgs.length === 0) return;

    const selected = organizations.find((item) => item.id === activeOrgId);
    if (!selected || selected.type !== "business") {
      setActiveOrgId(businessOrgs[0].id);
    }
  }, [hydrated, isLoading, pathname, organizations, activeOrgId, businessOrgs, setActiveOrgId]);

  const org = organizations.find((item) => item.id === activeOrgId);
  const activeOrg: ActiveOrg = org && org.type === "business"
    ? { kind: "business", id: org.id, name: org.name }
    : { kind: "personal" };

  const value: ActiveOrgContextValue = {
    activeOrg,
    activeOrgId,
    setActiveOrgId,
    organizations: businessOrgs,
    isLoading: !hydrated || isLoading,
  };

  return <ActiveOrgContext.Provider value={value}>{children}</ActiveOrgContext.Provider>;
}

export function useActiveOrg() {
  const ctx = React.useContext(ActiveOrgContext);
  if (!ctx) throw new Error("useActiveOrg must be inside ActiveOrgProvider");
  return ctx;
}
