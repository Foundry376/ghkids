import { Stage, StageVariable } from "../../types";

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
 * Read a stage variable's value, asserting it's present. Every defined stage
 * variable is required to have a value on every stage — reducers, migrations,
 * and world initialization all maintain that invariant. A missing value here
 * means an invariant violation, not a "use the default" situation.
 */
export function getStageVariableValue(
  id: string,
  values: Record<string, string>,
): string {
  const value = values[id];
  if (value === undefined) {
    throw new Error(
      `Stage variable "${id}" has no value on the current stage. Every defined stage variable must be seeded on every stage.`,
    );
  }
  return value;
}

function readPositiveNumber(id: string, values: Record<string, string>, label: string): number {
  const raw = getStageVariableValue(id, values);
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Stage ${label} "${raw}" is not a positive number.`);
  }
  return n;
}

/** Read stage width as a number. Throws if the value is missing or non-numeric. */
export function getStageWidth(stage: Pick<Stage, "variableValues">): number {
  return readPositiveNumber(BUILTIN_STAGE_VARIABLE_IDS.width, stage.variableValues, "width");
}

/** Read stage height as a number. Throws if the value is missing or non-numeric. */
export function getStageHeight(stage: Pick<Stage, "variableValues">): number {
  return readPositiveNumber(BUILTIN_STAGE_VARIABLE_IDS.height, stage.variableValues, "height");
}

/** Read the per-stage tile size in pixels. Throws if missing or non-numeric. */
export function getStageTileSize(stage: Pick<Stage, "variableValues">): number {
  return readPositiveNumber(BUILTIN_STAGE_VARIABLE_IDS.tileSize, stage.variableValues, "tile size");
}

/**
 * Read the per-stage background as a CSS-ready string — either a color
 * (`"#005392"`) or a CSS url(...) expression. Throws if missing.
 */
export function getStageBackground(stage: Pick<Stage, "variableValues">): string {
  return getStageVariableValue(BUILTIN_STAGE_VARIABLE_IDS.background, stage.variableValues);
}
