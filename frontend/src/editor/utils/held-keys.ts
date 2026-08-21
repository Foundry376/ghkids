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
 *
 * Holds are kept per source rather than in one flat set, because several
 * sources are live at once - the keyboard, the touch keys, and one handler per
 * mounted stage. A key stays held while any of them still has it, so releasing
 * the on-screen button doesn't cancel a physical key that's still down, and a
 * stage unmounting doesn't cancel a hold another stage is still tracking.
 */

/** An opaque per-component token. Any stable object identity will do. */
export type KeySource = object;

const holdsBySource = new Map<KeySource, Set<string>>();

/** Records that `source` is holding `keys`. Returns true if anything changed. */
export function holdKeys(source: KeySource, keys: string[]): boolean {
  let held = holdsBySource.get(source);
  if (!held) {
    held = new Set();
    holdsBySource.set(source, held);
  }
  let changed = false;
  for (const key of keys) {
    if (!held.has(key)) {
      held.add(key);
      changed = true;
    }
  }
  return changed;
}

/** Records that `source` has let go of `keys`. Returns true if anything changed. */
export function releaseKeys(source: KeySource, keys: string[]): boolean {
  const held = holdsBySource.get(source);
  if (!held) {
    return false;
  }
  let changed = false;
  for (const key of keys) {
    if (held.delete(key)) {
      changed = true;
    }
  }
  return changed;
}

/**
 * Drops everything `source` holds - on window blur, or when the component
 * behind it goes away. Returns true if it was holding anything.
 */
export function releaseSource(source: KeySource): boolean {
  const held = holdsBySource.get(source);
  holdsBySource.delete(source);
  return held !== undefined && held.size > 0;
}

export function isKeyHeld(key: string): boolean {
  for (const held of holdsBySource.values()) {
    if (held.has(key)) {
      return true;
    }
  }
  return false;
}

/** Every source's holds together, in the shape `world.input.keys` expects. */
export function heldKeysAsInput(): { [key: string]: true } {
  const keys: { [key: string]: true } = {};
  for (const held of holdsBySource.values()) {
    held.forEach((key) => {
      keys[key] = true;
    });
  }
  return keys;
}
