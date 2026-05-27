import { StageVariable } from "../../types";

export const BUILTIN_STAGE_VARIABLE_IDS = {
  wrapX: "wrapX",
  wrapY: "wrapY",
} as const;

export const BUILTIN_STAGE_VARIABLES: Record<string, StageVariable> = {
  [BUILTIN_STAGE_VARIABLE_IDS.wrapX]: {
    id: "wrapX",
    name: "Wrap Horizontally",
    defaultValue: "true",
    type: "boolean",
  },
  [BUILTIN_STAGE_VARIABLE_IDS.wrapY]: {
    id: "wrapY",
    name: "Wrap Vertically",
    defaultValue: "true",
    type: "boolean",
  },
};

export function isBuiltinStageVariableId(id: string): boolean {
  return id in BUILTIN_STAGE_VARIABLES;
}

/**
 * Read a boolean stage variable, falling back to the built-in default if the
 * per-stage value or world-level definition is missing. The right-panel
 * checkbox writes "true" / "false" strings; anything else is treated as false.
 */
export function readBooleanStageVariable(
  id: string,
  values: Record<string, string> | undefined,
  definitions: Record<string, StageVariable> | undefined,
): boolean {
  const raw =
    values?.[id] ??
    definitions?.[id]?.defaultValue ??
    BUILTIN_STAGE_VARIABLES[id]?.defaultValue;
  return raw === "true";
}
