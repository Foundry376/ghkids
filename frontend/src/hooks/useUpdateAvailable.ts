import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { isUpdateAvailable, onUpdateAvailable } from "../utils/update-check";

/** True once a newer release of Codako is out than the one this tab is running. */
export function useUpdateAvailable() {
  const [available, setAvailable] = useState(isUpdateAvailable);
  useEffect(() => {
    // It may have turned up between the first render and this effect.
    if (isUpdateAvailable()) setAvailable(true);
    return onUpdateAvailable(() => setAvailable(true));
  }, []);
  return available;
}

/**
 * Once an update is available, the next move to another page loads it from
 * the server instead of rendering it in the app, so the update arrives as a
 * normal page change rather than a reload that interrupts something.
 *
 * This is what `<Link reloadDocument>` does for one link, but it also covers
 * every other way of moving around: links, navigate() calls, and the browser's
 * Back and Forward buttons. React Router doesn't have a router-wide switch for
 * it. By the time this runs the URL already points at the new page, so a
 * reload loads that page. (The in-app render of it may show for a moment
 * while the reload is under way; a layout effect keeps that as short as it
 * can be.)
 */
export function useReloadOnNavigationIfUpdated() {
  const { pathname, search } = useLocation();
  const url = pathname + search;
  const previousUrl = useRef(url);

  useLayoutEffect(() => {
    if (url === previousUrl.current) return;
    previousUrl.current = url;
    if (isUpdateAvailable()) {
      window.location.reload();
    }
  }, [url]);
}
