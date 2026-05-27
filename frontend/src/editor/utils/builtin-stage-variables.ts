import { Stage, StageVariable } from "../../types";

export const BUILTIN_STAGE_VARIABLE_IDS = {
  wrapX: "wrapX",
  wrapY: "wrapY",
  width: "width",
  height: "height",
} as const;

export const BUILTIN_STAGE_VARIABLES: Record<string, StageVariable> = {
  [BUILTIN_STAGE_VARIABLE_IDS.wrapX]: {
    id: "wrapX",
    name: "Wrap Horizontally",
    type: "boolean",
  },
  [BUILTIN_STAGE_VARIABLE_IDS.wrapY]: {
    id: "wrapY",
    name: "Wrap Vertically",
    type: "boolean",
  },
  [BUILTIN_STAGE_VARIABLE_IDS.width]: {
    id: "width",
    name: "Width",
    type: "number",
  },
  [BUILTIN_STAGE_VARIABLE_IDS.height]: {
    id: "height",
    name: "Height",
    type: "number",
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
  [BUILTIN_STAGE_VARIABLE_IDS.wrapX]: "true",
  [BUILTIN_STAGE_VARIABLE_IDS.wrapY]: "true",
  [BUILTIN_STAGE_VARIABLE_IDS.width]: "22",
  [BUILTIN_STAGE_VARIABLE_IDS.height]: "13",
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

/** Read stage width as a number. Throws if the value is missing or non-numeric. */
export function getStageWidth(stage: Pick<Stage, "variableValues">): number {
  const raw = getStageVariableValue(BUILTIN_STAGE_VARIABLE_IDS.width, stage.variableValues);
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Stage width "${raw}" is not a positive number.`);
  }
  return n;
}

/** Read stage height as a number. Throws if the value is missing or non-numeric. */
export function getStageHeight(stage: Pick<Stage, "variableValues">): number {
  const raw = getStageVariableValue(BUILTIN_STAGE_VARIABLE_IDS.height, stage.variableValues);
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Stage height "${raw}" is not a positive number.`);
  }
  return n;
}
