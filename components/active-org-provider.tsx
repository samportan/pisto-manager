"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useOrganizations } from "@/hooks/useOrganizations";
import {
  persistWorkspace,
  readWorkspaceClient,
  type WorkspaceMode,
} from "@/lib/workspace";

type ActiveOrg =
  | { kind: "personal" }
  | { kind: "business"; id: string; name: string };

type ActiveOrgContextValue = {
  activeOrg: ActiveOrg;
  activeOrgId: string | null;
  workspaceMode: WorkspaceMode;
  setWorkspace: (mode: WorkspaceMode, orgId?: string | null) => void;
  setActiveOrgId: (id: string | null) => void;
  organizations: Array<{ id: string; name: string; type: "personal" | "business" }>;
  isLoading: boolean;
};

const ActiveOrgContext = React.createContext<ActiveOrgContextValue | null>(null);

export function ActiveOrgProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { organizations, isLoading: orgsLoading } = useOrganizations();
  const [workspace, setWorkspaceState] = React.useState(() => readWorkspaceClient());
  const [migrated, setMigrated] = React.useState(false);

  React.useEffect(() => {
    const initial = readWorkspaceClient();
    setWorkspaceState(initial);
    if (!window.localStorage.getItem("pisto.workspace")) {
      persistWorkspace(initial.mode, initial.orgId);
    }
    setMigrated(true);
  }, []);

  const businessOrgs = organizations.filter((item) => item.type === "business");

  const setWorkspace = React.useCallback((mode: WorkspaceMode, orgId?: string | null) => {
    const nextOrgId = mode === "business" ? orgId ?? null : null;
    setWorkspaceState({ mode, orgId: nextOrgId });
    persistWorkspace(mode, nextOrgId);
  }, []);

  const setActiveOrgId = React.useCallback(
    (id: string | null) => {
      if (id) {
        setWorkspace("business", id);
      } else {
        setWorkspace("personal");
      }
    },
    [setWorkspace]
  );

  React.useEffect(() => {
    if (!migrated || orgsLoading) return;
    if (!pathname?.startsWith("/dashboard/business")) return;
    if (businessOrgs.length === 0) return;

    const selected = organizations.find((item) => item.id === workspace.orgId);
    if (!selected || selected.type !== "business") {
      setWorkspace("business", businessOrgs[0].id);
    }
  }, [
    migrated,
    orgsLoading,
    pathname,
    organizations,
    workspace.orgId,
    businessOrgs,
    setWorkspace,
  ]);

  React.useEffect(() => {
    if (!migrated || orgsLoading) return;
    if (workspace.mode !== "business" || !workspace.orgId) return;
    const selected = organizations.find((item) => item.id === workspace.orgId);
    if (!selected || selected.type !== "business") {
      if (businessOrgs.length > 0) {
        setWorkspace("business", businessOrgs[0].id);
      } else {
        setWorkspace("personal");
      }
    }
  }, [migrated, orgsLoading, workspace, organizations, businessOrgs, setWorkspace]);

  const org = organizations.find((item) => item.id === workspace.orgId);
  const activeOrg: ActiveOrg =
    workspace.mode === "business" && org && org.type === "business"
      ? { kind: "business", id: org.id, name: org.name }
      : { kind: "personal" };

  const value: ActiveOrgContextValue = {
    activeOrg,
    activeOrgId: activeOrg.kind === "business" ? activeOrg.id : null,
    workspaceMode: activeOrg.kind === "business" ? "business" : "personal",
    setWorkspace,
    setActiveOrgId,
    organizations: businessOrgs,
    isLoading: !migrated || orgsLoading,
  };

  return <ActiveOrgContext.Provider value={value}>{children}</ActiveOrgContext.Provider>;
}

export function useActiveOrg() {
  const ctx = React.useContext(ActiveOrgContext);
  if (!ctx) throw new Error("useActiveOrg must be inside ActiveOrgProvider");
  return ctx;
}
