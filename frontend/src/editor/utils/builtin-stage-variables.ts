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
 * Values used by the data migration when a pre-existing save is missing a
 * built-in's value on a stage. Brand-new worlds get these via the inline
 * `variableValues` on initial-state-stage; at runtime, built-ins are already
 * present on every stage (world init + migration), so this map is migration-
 * only — the engine never reads it.
 */
export const BUILTIN_STAGE_VARIABLE_INITIAL_VALUES: Record<string, string> = {
  [BUILTIN_STAGE_VARIABLE_IDS.wrapX]: "true",
  [BUILTIN_STAGE_VARIABLE_IDS.wrapY]: "true",
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
