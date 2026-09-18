/** Named KeyboardEvent keys, with `Space` for a blank and uppercase letters. */
export const KEYCODE_TO_KEY: Record<number, string> = {
  9: "Tab",
  13: "Enter",
  32: "Space",
  37: "ArrowLeft",
  38: "ArrowUp",
  39: "ArrowRight",
  40: "ArrowDown",
  186: ";",
  187: "=",
  188: ",",
  189: "-",
  190: ".",
  191: "/",
  192: "`",
  219: "[",
  220: "\\",
  221: "]",
  222: "'",
};

export function keyCodeToKey(code: number): string {
  return KEYCODE_TO_KEY[code] || String.fromCharCode(code);
}

export function canonicalKey(key: string | number): string {
  if (typeof key === "number") {
    return canonicalKey(keyCodeToKey(key));
  }
  if (key === " ") {
    return "Space";
  }
  if (/^[a-z]$/i.test(key)) {
    return key.toUpperCase();
  }
  return key;
}
