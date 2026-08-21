/**
 * Tracks the keys the player is physically holding down.
 *
 * `world.input.keys` is only the input the *next* tick will see: tick() clears
 * it so that a quick tap fires exactly one action even if the key is released
 * before the tick happens. That means a key which is still held after a tick
 * has to be put back, or holding it down produces a single action instead of
 * continuous motion.
 *
 * The keyboard handler and the on-screen touch keys record what's held here,
 * and the playback loop merges it into the input ahead of every tick.
 */
const heldKeys = new Set<string>();

/** Marks keys as held. Returns true if anything changed. */
export function holdKeys(keys: string[]): boolean {
  let changed = false;
  for (const key of keys) {
    if (!heldKeys.has(key)) {
      heldKeys.add(key);
      changed = true;
    }
  }
  return changed;
}

/** Marks keys as no longer held. Returns true if anything changed. */
export function releaseKeys(keys: string[]): boolean {
  let changed = false;
  for (const key of keys) {
    if (heldKeys.delete(key)) {
      changed = true;
    }
  }
  return changed;
}

/** Releases everything, eg: when the window loses focus. Returns true if anything changed. */
export function releaseAllKeys(): boolean {
  if (heldKeys.size === 0) {
    return false;
  }
  heldKeys.clear();
  return true;
}

export function isKeyHeld(key: string): boolean {
  return heldKeys.has(key);
}

/** The held keys in the shape `world.input.keys` expects. */
export function heldKeysAsInput(): { [key: string]: true } {
  const keys: { [key: string]: true } = {};
  heldKeys.forEach((key) => {
    keys[key] = true;
  });
  return keys;
}
