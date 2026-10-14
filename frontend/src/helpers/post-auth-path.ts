// Kids land back on the home menu, where the identity bubble shows they're in.
export const DEFAULT_POST_AUTH_PATH = "/";

/**
 * Where to go after signing in or joining. `redirectTo` arrives in the URL, so
 * only follow it within Codako ("/dashboard"), never off-site ("//evil.com",
 * "https://…").
 *
 * Resolving it the way the browser will, then comparing origins, also catches
 * tricks a prefix check misses — browsers drop tabs and newlines from URLs, so
 * "/\t/evil.com" becomes "//evil.com".
 */
export function postAuthPath(
  redirectTo: string | null | undefined,
  origin: string = window.location.origin,
) {
  if (!redirectTo || !redirectTo.startsWith("/")) {
    return DEFAULT_POST_AUTH_PATH;
  }
  try {
    const url = new URL(redirectTo, origin);
    if (url.origin === origin) {
      return url.pathname + url.search + url.hash;
    }
  } catch {
    // Not a URL at all; fall through to the default.
  }
  return DEFAULT_POST_AUTH_PATH;
}
