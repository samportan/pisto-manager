/**
 * Validates and sanitizes internal application redirect paths to prevent
 * Open Redirect vulnerabilities (CWE-601).
 *
 * Rejects:
 * - Absolute URLs with protocols (http:, https:, javascript:, data:)
 * - Protocol-relative URLs (//evil.com)
 * - Backslash bypass tricks (/\\evil.com, /\\evil.com)
 * - Control characters or CRLF
 */
export function getSafeRedirectUrl(
  target: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!target || typeof target !== "string") {
    return fallback;
  }

  const trimmed = target.trim();
  if (!trimmed) {
    return fallback;
  }

  // Must begin with a single '/' and not with '//', '/\\', or contain '\\'
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.includes("\\")
  ) {
    return fallback;
  }

  // Check against control characters or CRLF injection
  if (/[\r\n\t\0]/.test(trimmed)) {
    return fallback;
  }

  try {
    // Resolve against a dummy local base
    const parsed = new URL(trimmed, "http://localhost");

    // Ensure origin was not spoofed
    if (parsed.origin !== "http://localhost") {
      return fallback;
    }

    // Ensure pathname still starts with a single '/' and not '//'
    if (!parsed.pathname.startsWith("/") || parsed.pathname.startsWith("//")) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
