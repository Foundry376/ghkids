/**
 * Lightweight JSON diff/unpatch for history snapshots.
 *
 * Computes a compact delta between two plain-object trees, storing only
 * the paths that changed.  `unpatch` reverses the delta to reconstruct
 * the previous state from the current state.
 *
 * Delta format (inspired by jsondiffpatch):
 *   - Modified primitive:  [oldValue, newValue]
 *   - Added key:           [newValue]           (length 1 → was absent before)
 *   - Deleted key:         [oldValue, 0, 0]     (sentinel for deletion)
 *   - Nested changes:      { key: <sub-delta> }
 *
 * Only plain objects are diffed recursively. Arrays and primitives are
 * compared by value (JSON equality for arrays).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Delta = { [key: string]: any };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object" || a === null || b === null) return false;
  // For arrays and objects, fall back to JSON comparison.
  // This is fast enough for the small leaf values in our snapshots.
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Compute a delta between `left` (before) and `right` (after).
 * Returns `undefined` if the two are identical.
 */
export function diff(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
): Delta | undefined {
  const delta: Delta = {};
  let hasChanges = false;

  const allKeys = new Set([...Object.keys(left), ...Object.keys(right)]);

  for (const key of allKeys) {
    const inLeft = key in left;
    const inRight = key in right;

    if (inLeft && !inRight) {
      // Key was deleted
      delta[key] = [left[key], 0, 0];
      hasChanges = true;
    } else if (!inLeft && inRight) {
      // Key was added
      delta[key] = [right[key]];
      hasChanges = true;
    } else {
      // Key exists in both — check for changes
      const lv = left[key];
      const rv = right[key];

      if (isPlainObject(lv) && isPlainObject(rv)) {
        const sub = diff(lv, rv);
        if (sub) {
          delta[key] = sub;
          hasChanges = true;
        }
      } else if (!valuesEqual(lv, rv)) {
        delta[key] = [lv, rv];
        hasChanges = true;
      }
    }
  }

  return hasChanges ? delta : undefined;
}

/**
 * Given the current (`right`) state and a delta produced by `diff(left, right)`,
 * reconstruct and return the previous (`left`) state.
 *
 * IMPORTANT: This returns a new object — the input is not mutated.
 */
export function unpatch(
  right: Record<string, unknown>,
  delta: Delta,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...right };

  for (const key of Object.keys(delta)) {
    const d = delta[key];

    if (Array.isArray(d)) {
      if (d.length === 1) {
        // Was added → remove it to get back to the previous state
        delete result[key];
      } else if (d.length === 3 && d[1] === 0 && d[2] === 0) {
        // Was deleted → restore old value
        result[key] = d[0];
      } else if (d.length === 2) {
        // Was modified → restore old value
        result[key] = d[0];
      }
    } else if (isPlainObject(d)) {
      // Nested changes — recurse
      const current = result[key];
      if (isPlainObject(current)) {
        result[key] = unpatch(current as Record<string, unknown>, d);
      } else {
        // Shouldn't happen if delta was produced by diff(), but be safe
        result[key] = current;
      }
    }
  }

  return result;
}
