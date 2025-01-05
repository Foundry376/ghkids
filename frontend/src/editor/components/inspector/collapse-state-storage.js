let states = null;
let setorder = null;

/** This implements a small LRU cache that saves the last 1000 
 * toggled disclosure states to local storage. (to avoid taking
 * too much space)
 */

function ensureLoadedFromStorage() {
  if (states) {
    return;
  }
  try {
    const val = JSON.parse(
      window.localStorage.getItem("codako-collapsed") ||
        '{"states": {}, "setorder": []}'
    );
    states = val.states;
    setorder = val.setorder;
  } catch (err) {
    console.warn(`Error loading collapsed states: ${err}`);
  }
}

function saveToStorage() {
  try {
    window.localStorage.setItem(
      "codako-collapsed",
      JSON.stringify({ states, setorder })
    );
  } catch (err) {
    console.error(err);
  }
}
export function isCollapsePersisted(id) {
  ensureLoadedFromStorage();
  return states[id] || false;
}

export function persistCollapsedState(id, val) {
  ensureLoadedFromStorage();
  if (val) {
    states[id] = true;
    setorder = setorder.filter((l) => l !== id).concat([id]);
    if (setorder.length > 1000) {
        const oldestId = setorder.shift();
        delete states[oldestId];
    }
  } else {
    delete states[id];
  }
  saveToStorage();
}
