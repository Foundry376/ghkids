/**
 * Every user-facing value in a world — actor variables, globals, stage
 * variables — is stored as a free-form string, and rules can write anything
 * into any of them. A kid who means to set a character's color can just as
 * easily drop that color onto the stage's Width, and `applyVariableOperation`
 * will happily produce "NaN" when a rule adds 1 to a word.
 *
 * We deliberately don't validate on the write side: half-finished and
 * intentionally-weird values are part of programming by demonstration, and a
 * rule that refuses to run is harder for a kid to debug than one that runs and
 * looks wrong. Instead the invariant lives on the *read* side:
 *
 *   Any read that needs a particular shape coerces, and never throws.
 *
 * Each `coerce*` below falls back to a caller-supplied value when the raw
 * string can't be interpreted, so a nonsense value degrades the thing it feeds
 * instead of taking down the editor. Each has a matching `is*` predicate so
 * the inspector can mark the offending box as unusable — the value is still
 * stored and still shown, it just isn't being used.
 */

/**
 * True if `raw` reads as a finite number. Unlike bare `Number()`, blank and
 * whitespace-only strings are rejected rather than silently becoming 0 — an
 * empty box means "nothing here", not "zero".
 */
export function isNumericValue(raw: string | undefined | null): boolean {
  if (raw === undefined || raw === null || raw.trim() === "") {
    return false;
  }
  return Number.isFinite(Number(raw));
}

/** Read `raw` as a number, falling back when it isn't one. */
export function coerceToNumber(raw: string | undefined | null, fallback: number): number {
  return isNumericValue(raw) ? Number(raw) : fallback;
}

/**
 * True if `raw` reads as a whole number within [min, max]. Values outside the
 * range are "unacceptable" in the same sense as a color in the Width box: we
 * can parse them, but we can't use them, so they're reported as invalid and
 * coerced away rather than handed to the renderer.
 */
export function isBoundedIntegerValue(
  raw: string | undefined | null,
  { min, max }: { min: number; max: number },
): boolean {
  if (!isNumericValue(raw)) {
    return false;
  }
  const n = Number(raw);
  return n >= min && n <= max && Math.round(n) === n;
}

/**
 * Read `raw` as a whole number within [min, max]. Numbers that are merely
 * untidy (2.4, or 5000 where 1000 is the ceiling) are rounded and clamped
 * rather than discarded — the kid's intent is still legible. Anything that
 * isn't a number at all falls back.
 */
export function coerceToBoundedInteger(
  raw: string | undefined | null,
  { min, max, fallback }: { min: number; max: number; fallback: number },
): number {
  if (!isNumericValue(raw)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(Number(raw))));
}

const TRUE_VALUES = ["true", "1", "yes", "on"];
const FALSE_VALUES = ["false", "0", "no", "off", ""];

/** True if `raw` reads as a yes/no value. */
export function isBooleanValue(raw: string | undefined | null): boolean {
  if (raw === undefined || raw === null) {
    return false;
  }
  const v = raw.trim().toLowerCase();
  return TRUE_VALUES.includes(v) || FALSE_VALUES.includes(v);
}

/**
 * Read `raw` as a yes/no value. Accepts the spellings a rule is likely to
 * produce ("1" from a counter, "yes" from a kid typing) and falls back on
 * anything else.
 */
export function coerceToBoolean(raw: string | undefined | null, fallback: boolean): boolean {
  if (raw === undefined || raw === null) {
    return fallback;
  }
  const v = raw.trim().toLowerCase();
  if (TRUE_VALUES.includes(v)) {
    return true;
  }
  if (FALSE_VALUES.includes(v)) {
    return false;
  }
  return fallback;
}

/**
 * True if `raw` is usable as a CSS background — either a `url(...)` expression
 * or a color the browser understands. The color check is delegated to the
 * browser, so it stays in sync with whatever CSS actually accepts; outside a
 * browser (headless runner, tests) there's nothing to ask, so we accept.
 */
export function isCSSBackgroundValue(raw: string | undefined | null): boolean {
  if (raw === undefined || raw === null || raw.trim() === "") {
    return false;
  }
  if (raw.includes("url(")) {
    return true;
  }
  // Reached through globalThis rather than the `CSS` global directly: this
  // module is also compiled by the headless runner, which has no DOM types.
  const css = (globalThis as { CSS?: { supports?: (p: string, v: string) => boolean } }).CSS;
  if (!css || typeof css.supports !== "function") {
    return true;
  }
  return css.supports("background-color", raw);
}

/** Read `raw` as a CSS background, falling back when it isn't usable as one. */
export function coerceToCSSBackground(raw: string | undefined | null, fallback: string): string {
  return isCSSBackgroundValue(raw) ? raw! : fallback;
}
