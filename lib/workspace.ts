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
    return { mode: "business", orgId: null };
  }

  const orgId =
    window.localStorage.getItem(ORG_STORAGE_KEY) ?? readCookie(ORG_COOKIE) ?? null;

  return { mode: "business", orgId };
}

export function persistWorkspace(_mode: WorkspaceMode, orgId?: string | null) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(WORKSPACE_STORAGE_KEY, "business");
  writeCookie(WORKSPACE_COOKIE, "business");

  if (orgId) {
    window.localStorage.setItem(ORG_STORAGE_KEY, orgId);
    writeCookie(ORG_COOKIE, orgId);
  } else {
    window.localStorage.removeItem(ORG_STORAGE_KEY);
    deleteCookie(ORG_COOKIE);
  }
}

export function getWorkspaceModeFromRequest(
  _cookies: { get: (name: string) => { value: string } | undefined }
): WorkspaceMode {
  return "business";
}
