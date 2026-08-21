/**
 * Key names in rules come in two flavors: worlds authored before the input
 * handler moved to `KeyboardEvent.key` store numeric keyCodes on their key
 * event triggers (39, 32...), and everything since stores Codako key names
 * ("ArrowRight", "Space"). Rule evaluation looks the trigger's value up
 * directly in `world.input.keys`, so input has to be recorded under both
 * spellings for a legacy world to still respond to the keyboard.
 */
export const KEYCODE_TO_KEY: Record<number, string> = {
  9: "Tab",
  13: "Enter",
  32: "Space",
  37: "ArrowLeft",
  38: "ArrowUp",
  39: "ArrowRight",
  40: "ArrowDown",
};

export function keyCodeToKey(code: number): string {
  return KEYCODE_TO_KEY[code] || String.fromCharCode(code);
}

/**
 * Every identifier a held key should be recorded under: the Codako key name,
 * the legacy numeric keyCode that means the same key, and the other case for
 * letters (rules record the key the kid pressed, which may be either).
 */
export function inputKeysForKey(key: string): string[] {
  const result = [key];

  for (const [code, name] of Object.entries(KEYCODE_TO_KEY)) {
    if (name === key) {
      result.push(code);
      break;
    }
  }
  if (key.length === 1 && key >= "A" && key <= "Z") {
    result.push(key.toLowerCase());
  }
  if (key.length === 1 && key >= "a" && key <= "z") {
    result.push(key.toUpperCase());
  }
  return result;
}
