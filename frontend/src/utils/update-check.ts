/**
 * Notices when a new release of Codako is out while a tab is still running
 * the old one.
 *
 * Every build writes its ID to /version.json (see vite.config.ts). This page
 * knows its own ID as __BUILD_ID__. Now and then, and whenever someone comes
 * back to the tab, we fetch the file; if the IDs differ, an update is
 * available. Nothing reloads by itself mid-task: the banner offers a reload
 * (components/update-banner.tsx), and the next move to another page does a
 * full page load instead of an in-app one (useReloadOnNavigationIfUpdated).
 */

/** How often an open, visible tab checks. */
const CHECK_INTERVAL = 10 * 60 * 1000;

/** Returning to the tab checks right away, but not more than this often. */
const MIN_TIME_BETWEEN_CHECKS = 60 * 1000;

/** A chunk that won't load reloads the page, but only once in this window, so a
 *  chunk that's actually broken can't put the page into a reload loop. */
const CHUNK_RELOAD_GUARD = 60 * 1000;
const CHUNK_RELOAD_KEY = "codako-chunk-error-reload";

let updateAvailable = false;
let lastCheck = 0;
const listeners = new Set<() => void>();

export function isUpdateAvailable() {
  return updateAvailable;
}

/** Calls `listener` once, when an update turns up. Returns an unsubscribe. */
export function onUpdateAvailable(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function markUpdateAvailable() {
  if (updateAvailable) return;
  updateAvailable = true;
  listeners.forEach((listener) => listener());
}

async function checkForUpdate() {
  if (updateAvailable || !navigator.onLine) return;
  const now = Date.now();
  if (now - lastCheck < MIN_TIME_BETWEEN_CHECKS) return;
  lastCheck = now;

  try {
    const response = await fetch("/version.json", { cache: "no-store" });
    if (!response.ok) return;
    const { buildId } = await response.json();
    if (typeof buildId === "string" && buildId !== __BUILD_ID__) {
      markUpdateAvailable();
    }
  } catch {
    // Offline, or caught mid-deploy. The next check will try again.
  }
}

function checkIfVisible() {
  if (document.visibilityState === "visible") {
    void checkForUpdate();
  }
}

/**
 * A lazily loaded file (a lesson's world, say) failed to load. After a release
 * that nearly always means this tab is old and the file it wants is gone: the
 * server only has the new build's files. Reload to get the new build. The
 * editor holds work that isn't saved yet, so there we only show the banner.
 */
function onChunkLoadError() {
  markUpdateAvailable();
  if (window.location.pathname.startsWith("/editor/")) return;

  try {
    const lastReload = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY));
    if (lastReload && Date.now() - lastReload < CHUNK_RELOAD_GUARD) return;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, `${Date.now()}`);
  } catch {
    // No sessionStorage (private browsing): no loop guard, so don't reload.
    return;
  }
  window.location.reload();
}

export function startCheckingForUpdates() {
  // The dev server has no version.json, and hot reloading keeps it current.
  if (!import.meta.env.PROD) return;

  window.setInterval(checkIfVisible, CHECK_INTERVAL);
  // Coming back to the tab is the likeliest moment to have missed a release:
  // laptops shut overnight, tabs left open from yesterday's class.
  document.addEventListener("visibilitychange", checkIfVisible);
  window.addEventListener("focus", checkIfVisible);
  window.addEventListener("online", checkIfVisible);
  window.addEventListener("vite:preloadError", onChunkLoadError);
}
