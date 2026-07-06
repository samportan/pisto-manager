export type WorkspaceMode = "personal" | "business";

export const WORKSPACE_STORAGE_KEY = "pisto.workspace";
export const ORG_STORAGE_KEY = "pisto.active-org-id";
export const WORKSPACE_COOKIE = "pisto.workspace";
export const ORG_COOKIE = "pisto.active-org-id";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type WorkspaceState = {
  mode: WorkspaceMode;
  orgId: string | null;
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function readWorkspaceClient(): WorkspaceState {
  if (typeof window === "undefined") {
    return { mode: "personal", orgId: null };
  }

  const storedMode = window.localStorage.getItem(WORKSPACE_STORAGE_KEY) as WorkspaceMode | null;
  const cookieMode = readCookie(WORKSPACE_COOKIE) as WorkspaceMode | null;
  const orgId =
    window.localStorage.getItem(ORG_STORAGE_KEY) ?? readCookie(ORG_COOKIE) ?? null;

  let mode: WorkspaceMode =
    storedMode === "business" || storedMode === "personal"
      ? storedMode
      : cookieMode === "business" || cookieMode === "personal"
        ? cookieMode
        : orgId
          ? "business"
          : "personal";

  if (mode === "business" && !orgId) {
    mode = "personal";
  }

  return { mode, orgId: mode === "business" ? orgId : null };
}

export function persistWorkspace(mode: WorkspaceMode, orgId?: string | null) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(WORKSPACE_STORAGE_KEY, mode);
  writeCookie(WORKSPACE_COOKIE, mode);

  if (mode === "business" && orgId) {
    window.localStorage.setItem(ORG_STORAGE_KEY, orgId);
    writeCookie(ORG_COOKIE, orgId);
  } else {
    window.localStorage.removeItem(ORG_STORAGE_KEY);
    deleteCookie(ORG_COOKIE);
  }
}

export function getWorkspaceModeFromRequest(
  cookies: { get: (name: string) => { value: string } | undefined }
): WorkspaceMode {
  const mode = cookies.get(WORKSPACE_COOKIE)?.value;
  if (mode === "business" || mode === "personal") return mode;
  const orgId = cookies.get(ORG_COOKIE)?.value;
  return orgId ? "business" : "personal";
}
