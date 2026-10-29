import { IS_IPAD } from "../hooks/useFullscreen";

/**
 * Codako opened from an icon on the Home Screen ("Add to Home Screen" in
 * Safari's share menu) rather than in a Safari tab. It then has the whole
 * screen to itself, with no address bar or tabs, and none of the gestures that
 * end Safari's fullscreen mode.
 *
 * index.html sets `home-screen-app` on <html> there, for styles that only
 * apply in the app, and lays the page out under the status bar (which it asks
 * to be translucent) and the home indicator. Pages keep clear of them with
 * env(safe-area-inset-*) padding, which is 0 everywhere else. That has to
 * happen before the first layout, so it can't wait for this bundle.
 *
 * The Home Screen app keeps its own cookies and local storage, separate from
 * Safari's: games saved on this iPad in one don't show up in the other, and
 * you sign in to each separately.
 */
export const IS_HOME_SCREEN_APP =
  typeof window !== "undefined" &&
  ((navigator as Navigator & { standalone?: boolean }).standalone === true ||
    !!window.matchMedia?.("(display-mode: standalone)").matches);

/** In Safari on an iPad, where adding Codako to the Home Screen gets you the whole screen. */
export const SUGGEST_HOME_SCREEN_APP = IS_IPAD && !IS_HOME_SCREEN_APP;
