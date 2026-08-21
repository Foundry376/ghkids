import { Stage, StageVariable } from "../../types";
import {
  coerceToBoolean,
  coerceToBoundedInteger,
  coerceToCSSBackground,
  isBooleanValue,
  isBoundedIntegerValue,
  isCSSBackgroundValue,
} from "./variable-coercion";

export const BUILTIN_STAGE_VARIABLE_IDS = {
  width: "width",
  wrapX: "wrapX",
  height: "height",
  wrapY: "wrapY",
  tileSize: "tileSize",
  background: "background",
} as const;

// Order here drives the row order in the right-panel Level section. The
// flex-wrap grid puts items left-to-right then wraps, so:
//   Width      | Wrap Horizontally
//   Height     | Wrap Vertically
//   Tile Size  | Background
export const BUILTIN_STAGE_VARIABLES: Record<string, StageVariable> = {
  [BUILTIN_STAGE_VARIABLE_IDS.width]: {
    id: "width",
    name: "Width",
    type: "number",
  },
  [BUILTIN_STAGE_VARIABLE_IDS.wrapX]: {
    id: "wrapX",
    name: "Wrap Horizontally",
    type: "boolean",
  },
  [BUILTIN_STAGE_VARIABLE_IDS.height]: {
    id: "height",
    name: "Height",
    type: "number",
  },
  [BUILTIN_STAGE_VARIABLE_IDS.wrapY]: {
    id: "wrapY",
    name: "Wrap Vertically",
    type: "boolean",
  },
  [BUILTIN_STAGE_VARIABLE_IDS.tileSize]: {
    id: "tileSize",
    name: "Tile Size",
    type: "number",
  },
  [BUILTIN_STAGE_VARIABLE_IDS.background]: {
    id: "background",
    name: "Background",
    type: "background",
  },
};

/**
 * Values used by the data migration when a pre-existing save is missing a
 * built-in's value on a stage. Brand-new worlds get these via the inline
 * `variableValues` on initial-state-stage; at runtime, built-ins are already
 * present on every stage (world init + migration), so this map is migration-
 * only — the engine never reads it.
 */
export const BUILTIN_STAGE_VARIABLE_INITIAL_VALUES: Record<string, string> = {
  [BUILTIN_STAGE_VARIABLE_IDS.width]: "22",
  [BUILTIN_STAGE_VARIABLE_IDS.wrapX]: "true",
  [BUILTIN_STAGE_VARIABLE_IDS.height]: "13",
  [BUILTIN_STAGE_VARIABLE_IDS.wrapY]: "true",
  [BUILTIN_STAGE_VARIABLE_IDS.tileSize]: "40",
  [BUILTIN_STAGE_VARIABLE_IDS.background]: "url('/src/editor/img/backgrounds/Layer0_2.png')",
};

export function isBuiltinStageVariableId(id: string): boolean {
  return id in BUILTIN_STAGE_VARIABLES;
}

/**
 * Bounds for the numeric built-ins. Rules can write any string into these, so
 * the ceilings aren't style guidance — a stage that claims to be a million
 * cells wide lays out a div millions of pixels across and takes the browser
 * with it.
 */
export const BUILTIN_STAGE_VARIABLE_BOUNDS = {
  [BUILTIN_STAGE_VARIABLE_IDS.width]: { min: 1, max: 1000 },
  [BUILTIN_STAGE_VARIABLE_IDS.height]: { min: 1, max: 1000 },
  [BUILTIN_STAGE_VARIABLE_IDS.tileSize]: { min: 1, max: 400 },
} as const;

/**
 * Values the readers below fall back to when a stage's value can't be used —
 * a rule wrote a color into Width, a subtraction produced "NaN", a migration
 * missed a stage. These are the same values a brand-new stage starts with, so
 * a broken value leaves the kid with a stage that still looks and plays like a
 * stage (and, importantly, doesn't collapse every actor into one square the
 * way a 1x1 fallback would once wrapping kicks in). The inspector marks the
 * variable so it's clear the stored value isn't the one in effect.
 */
export const BUILTIN_STAGE_VARIABLE_FALLBACKS = {
  [BUILTIN_STAGE_VARIABLE_IDS.width]: 22,
  [BUILTIN_STAGE_VARIABLE_IDS.height]: 13,
  [BUILTIN_STAGE_VARIABLE_IDS.tileSize]: 40,
  [BUILTIN_STAGE_VARIABLE_IDS.wrapX]: true,
  [BUILTIN_STAGE_VARIABLE_IDS.wrapY]: true,
  [BUILTIN_STAGE_VARIABLE_IDS.background]:
    BUILTIN_STAGE_VARIABLE_INITIAL_VALUES[BUILTIN_STAGE_VARIABLE_IDS.background],
} as const;

/**
 * Read a stage variable's value, asserting it's present. Every defined stage
 * variable is required to have a value on every stage — reducers, migrations,
 * and world initialization all maintain that invariant. A missing value here
 * means an invariant violation, not a "use the default" situation.
 *
 * Note that this says nothing about the *shape* of the value: rules can store
 * anything in any variable, so callers that need a number, a boolean or a
 * color must go through the typed readers below (or coerce themselves) rather
 * than trusting the string.
 */
export function getStageVariableValue(id: string, values: Record<string, string>): string {
  const value = values[id];
  if (value === undefined) {
    throw new Error(
      `Stage variable "${id}" has no value on the current stage. Every defined stage variable must be seeded on every stage.`,
    );
  }
  return value;
}

function readBoundedInteger(
  id: keyof typeof BUILTIN_STAGE_VARIABLE_BOUNDS,
  values: Record<string, string>,
) {
  return coerceToBoundedInteger(values[id], {
    ...BUILTIN_STAGE_VARIABLE_BOUNDS[id],
    fallback: BUILTIN_STAGE_VARIABLE_FALLBACKS[id],
  });
}

/** Read stage width in cells. Falls back to the default width if unusable. */
export function getStageWidth(stage: Pick<Stage, "variableValues">): number {
  return readBoundedInteger(BUILTIN_STAGE_VARIABLE_IDS.width, stage.variableValues);
}

/** Read stage height in cells. Falls back to the default height if unusable. */
export function getStageHeight(stage: Pick<Stage, "variableValues">): number {
  return readBoundedInteger(BUILTIN_STAGE_VARIABLE_IDS.height, stage.variableValues);
}

/** Read the per-stage tile size in pixels. Falls back to the default if unusable. */
export function getStageTileSize(stage: Pick<Stage, "variableValues">): number {
  return readBoundedInteger(BUILTIN_STAGE_VARIABLE_IDS.tileSize, stage.variableValues);
}

/** Read whether the stage wraps horizontally. */
export function getStageWrapX(stage: Pick<Stage, "variableValues">): boolean {
  return coerceToBoolean(
    stage.variableValues[BUILTIN_STAGE_VARIABLE_IDS.wrapX],
    BUILTIN_STAGE_VARIABLE_FALLBACKS.wrapX,
  );
}

/** Read whether the stage wraps vertically. */
export function getStageWrapY(stage: Pick<Stage, "variableValues">): boolean {
  return coerceToBoolean(
    stage.variableValues[BUILTIN_STAGE_VARIABLE_IDS.wrapY],
    BUILTIN_STAGE_VARIABLE_FALLBACKS.wrapY,
  );
}

/**
 * Read the per-stage background as a CSS-ready string — either a color
 * (`"#005392"`) or a CSS url(...) expression. Falls back to the default
 * background when the value isn't usable as either, which keeps a bad value
 * from leaving a canvas painted in whatever color was last set.
 */
export function getStageBackground(stage: Pick<Stage, "variableValues">): string {
  return coerceToCSSBackground(
    stage.variableValues[BUILTIN_STAGE_VARIABLE_IDS.background],
    BUILTIN_STAGE_VARIABLE_FALLBACKS.background,
  );
}

/**
 * The boolean the engine will actually use for a built-in boolean stage
 * variable (Wrap Horizontally / Wrap Vertically). The inspector renders this
 * rather than its own reading of the string, so its checkbox can never
 * disagree with the stage the kid is looking at.
 */
export function getStageVariableBooleanInEffect(
  definition: StageVariable,
  raw: string | undefined,
): boolean {
  const fallback =
    "type" in definition && definition.type === "boolean"
      ? BUILTIN_STAGE_VARIABLE_FALLBACKS[definition.id]
      : false;
  return coerceToBoolean(raw, fallback);
}

/**
 * Whether a stage's stored value for a variable is actually usable, i.e.
 * whether the readers above return it or substitute a fallback. Custom (user
 * created) stage variables have no required shape, so they're always valid.
 */
export function isStageVariableValueValid(
  definition: StageVariable,
  raw: string | undefined,
): boolean {
  if (!("type" in definition)) {
    return true;
  }
  switch (definition.type) {
    case "number":
      return isBoundedIntegerValue(raw, BUILTIN_STAGE_VARIABLE_BOUNDS[definition.id]);
    case "boolean":
      return isBooleanValue(raw);
    case "background":
      return isCSSBackgroundValue(raw);
    default:
      return true;
  }
}
