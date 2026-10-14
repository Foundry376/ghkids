let states: { [id: string]: boolean } | null = null;
let setorder: string[] | null = null;

/** This implements a small LRU cache that saves the last 1000
 * toggled disclosure states to local storage. (to avoid taking
 * too much space)
 *
 * Older versions only stored `true` (collapsed) and treated a missing entry as
 * expanded, so a missing entry means "never toggled" and falls back to the
 * caller's default.
 */

function ensureLoadedFromStorage() {
  if (states) {
    return;
  }
  try {
    const val = JSON.parse(
      window.localStorage.getItem("codako-collapsed") || '{"states": {}, "setorder": []}',
    );
    states = val.states;
    setorder = val.setorder;
  } catch (err) {
    console.warn(`Error loading collapsed states: ${err}`);
  }
}

function saveToStorage() {
  try {
    window.localStorage.setItem("codako-collapsed", JSON.stringify({ states, setorder }));
  } catch (err) {
    console.error(err);
  }
}
export function isCollapsePersisted(id: string, defaultCollapsed = false) {
  ensureLoadedFromStorage();
  return id in states! ? states![id] : defaultCollapsed;
}

export function persistCollapsedState(id: string, val: boolean, defaultCollapsed = false) {
  ensureLoadedFromStorage();
  if (val !== defaultCollapsed) {
    states![id] = val;
    setorder = setorder!.filter((l) => l !== id).concat([id]);
    if (setorder.length > 1000) {
      const oldestId = setorder.shift();
      if (oldestId) {
        delete states![oldestId];
      }
    }
  } else {
    delete states![id];
    setorder = setorder!.filter((l) => l !== id);
  }
  saveToStorage();
}
