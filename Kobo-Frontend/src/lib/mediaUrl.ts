import { getApiBase } from "./api";

/** Avatar / placeholder URLs that must not be rewritten. */
const PASS_THROUGH_PREFIXES = ["https://picsum.photos", "https://ui-avatars.com/api"];

/**
 * Laravel often emits absolute URLs from APP_URL (e.g. http://localhost/storage/...)
 * while dev servers listen on another port (e.g. :8000). Rewrite storage URLs to the
 * same origin the SPA uses for API calls. Relative `/storage/...` paths get the API base.
 */
export function resolveOutletMediaUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (PASS_THROUGH_PREFIXES.some((p) => trimmed.startsWith(p))) {
    return trimmed;
  }

  const base = getApiBase().replace(/\/$/, "");
  let apiOrigin: URL;
  try {
    apiOrigin = new URL(base);
  } catch {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const local =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    const defaultHttpPort =
      parsed.protocol === "http:" && (parsed.port === "" || parsed.port === "80");
    const targetsStorage = parsed.pathname.startsWith("/storage");
    if (local && defaultHttpPort && targetsStorage) {
      return `${apiOrigin.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    /* relative */
  }

  if (trimmed.startsWith("/storage")) {
    return `${base}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
  }

  return trimmed;
}

/**
 * Next.js `/_next/image` fetches remote URLs from the Next server process. For Laravel
 * `storage` URLs on localhost, that fetch often fails while the user's browser can load
 * the same URL. Bypass optimization for local HTTP `/storage/` assets (and picsum).
 */
export function outletMediaBypassNextOptimizer(src: string): boolean {
  if (!src) {
    return false;
  }
  if (src.includes("picsum.photos")) {
    return true;
  }
  try {
    const u = new URL(src);
    if (u.protocol !== "http:" || !u.pathname.startsWith("/storage")) {
      return false;
    }
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}
