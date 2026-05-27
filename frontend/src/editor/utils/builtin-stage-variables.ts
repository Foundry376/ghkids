import { StageVariable } from "../../types";

export const BUILTIN_STAGE_VARIABLE_IDS = {
  wrapX: "wrapX",
  wrapY: "wrapY",
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
};

/**
 * Values written into a stage's `variableValues` when a stage variable is first
 * introduced (new world, new stage with no source to copy from, or migration
 * backfill). Stage variables are not allowed to fall back to a world-level
 * default at read time, so these are seed-only — never consulted by the engine.
 */
export const BUILTIN_STAGE_VARIABLE_INITIAL_VALUES: Record<string, string> = {
  [BUILTIN_STAGE_VARIABLE_IDS.wrapX]: "true",
  [BUILTIN_STAGE_VARIABLE_IDS.wrapY]: "true",
};

/** Initial value to seed when a brand-new user-created stage variable is added. */
export const USER_STAGE_VARIABLE_INITIAL_VALUE = "0";

export function isBuiltinStageVariableId(id: string): boolean {
  return id in BUILTIN_STAGE_VARIABLES;
}

export function initialValueForStageVariable(id: string): string {
  return BUILTIN_STAGE_VARIABLE_INITIAL_VALUES[id] ?? USER_STAGE_VARIABLE_INITIAL_VALUE;
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
