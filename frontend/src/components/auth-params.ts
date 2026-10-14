import { useMemo } from "react";
import { useLocation } from "react-router-dom";

/**
 * What the sign-in pages were opened for, read from the URL:
 *
 *   redirectTo  where to go once you're in. Pages that need an account send
 *               it as a query param (/login?redirectTo=/dashboard); older
 *               callers pass it in router state, which still works.
 *   why         the end of a heading, e.g. ` to save "My Game"` from the
 *               editor's "Create Account" button.
 *
 * `linkTo` builds a link to another sign-in page that keeps both, so hopping
 * from "Sign in" to "Create an account" doesn't lose where you were going.
 */
export function useAuthParams() {
  const location = useLocation();
  const state = location.state as { redirectTo?: string } | null;

  return useMemo(() => {
    const search = new URLSearchParams(location.search);
    const redirectTo = search.get("redirectTo") || state?.redirectTo || "";
    const why = search.get("why") || "";

    const carried = new URLSearchParams();
    if (redirectTo) carried.set("redirectTo", redirectTo);
    if (why) carried.set("why", why);
    const qs = carried.toString();

    const linkTo = (pathname: string) => ({ pathname, search: qs ? `?${qs}` : "" });

    return { search, redirectTo, why, linkTo };
  }, [location.search, state?.redirectTo]);
}

/**
 * makeRequest() rejects with the server's own message, or with the browser's
 * when the request never got there ("Failed to fetch"). Turn the second kind
 * into something a kid can act on.
 */
export function friendlyErrorMessage(err: unknown) {
  const message = err instanceof Error ? err.message : "";
  if (
    !message ||
    err instanceof TypeError ||
    /failed to fetch|networkerror|load failed/i.test(message)
  ) {
    return "We couldn't reach Codako. Check your internet connection and try again.";
  }
  // A reply that wasn't JSON: the server is down or mid-deploy.
  if (err instanceof SyntaxError) {
    return "Something went wrong on Codako's end. Please try again in a minute.";
  }
  return message;
}
