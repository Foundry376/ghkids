/* eslint-disable @typescript-eslint/no-explicit-any */

import { Game } from "../types";
import {
  BUILTIN_STAGE_VARIABLE_INITIAL_VALUES,
  BUILTIN_STAGE_VARIABLES,
} from "./utils/builtin-stage-variables";
import { migrateGameCoordinates } from "./utils/coordinate-migration";
import { makeId } from "./utils/utils";

export function applyValueChanges(value: any) {
  if (value === "none") {
    return "0";
  }
  if (`${value}`.endsWith("deg")) {
    return `${value}`.replace("deg", "");
  }
  if (value === "flip-xy") {
    return "180";
  }
  return value;
}

export function applyDataMigrations(game: Game): Game {
  const nonmigrated = JSON.stringify(game);
  const migrationErrors: Error[] = [];

  const result = JSON.parse(JSON.stringify(game), (key, value) => {
    try {
      if (key === "transform") {
        return applyValueChanges(value);
      }

      // Note this runs on each layer of the rules tree, character.rules and rule-flow-item.rules
      if (key === "rules" && value instanceof Array) {
        for (const rule of value) {
          // Jun 22 2025 Updates to Rule Actions. action.to becomes action.value and
          // action.value is now a RuleValue.
          if (!rule.actions) {
            rule.actions = [];
          }
          if (!rule.conditions) {
            rule.conditions = [];
          }
          for (const action of rule.actions) {
            if ("to" in action) {
              action.value = action.to;
              delete action.to;
            }
            if ("transform" in action && !action.value) {
              action.value = { constant: "0" };
            }
            if ("value" in action && action.value === null) {
              action.value = { constant: "0" };
            }
            if ("value" in action && typeof action.value !== "object") {
              action.value = { constant: `${applyValueChanges(action.value)}` };
            }
          }

          if (rule.conditions && !(rule.conditions instanceof Array)) {
            rule.conditions = Object.entries(rule.conditions).flatMap(
              ([actorIdOrGlobal, conditions]: [string, any]) => {
                return Object.entries(conditions).map(([conditionId, condition]: [string, any]) => {
                  // V0 => V1 - moving away from conditionIds that specify what property is being cosntrained
                  if (!("type" in condition)) {
                    condition.comparator ||= "=";
                    if (conditionId === "transform") {
                      condition.type = "transform";
                    } else if (conditionId === "appearance") {
                      condition.type = "appearance";
                    } else if (!condition.type) {
                      condition.type = "variable";
                      condition.variableId = conditionId;
                    }
                  }

                  // Jun 22 2025 - changing from "thing" + "value" to "left" + "right" and encoding both
                  // in the same style.
                  if (!("left" in condition)) {
                    if (actorIdOrGlobal === "globals") {
                      condition.left = { globalId: actorIdOrGlobal };
                      condition.right ||= condition.value;
                    }
                    if (condition.type === "transform") {
                      condition.left = { variableId: "transform", actorId: actorIdOrGlobal };
                      condition.right ||= {
                        constant: `${rule.actors[actorIdOrGlobal].transform ?? "0"}`.replace(
                          "deg",
                          "",
                        ),
                      };
                    }
                    if (condition.type === "appearance") {
                      condition.left = { variableId: "appearance", actorId: actorIdOrGlobal };
                      condition.right ||= { constant: rule.actors[actorIdOrGlobal].appearance };
                    }
                    if (condition.type === "variable") {
                      condition.left = {
                        variableId: condition.variableId,
                        actorId: actorIdOrGlobal,
                      };
                      condition.right ||= {
                        constant: `${rule.actors[actorIdOrGlobal].variableValues[condition.variableId] || "0"}`,
                      };
                    }
                    if (condition.enabled === undefined) {
                      condition.enabled = true;
                    }
                    if (!condition.right || !Object.keys(condition.right).length) {
                      throw new Error("Invalid condition right side");
                    }
                    if (!condition.left || !Object.keys(condition.left).length) {
                      throw new Error("Invalid condition left side");
                    }
                    condition.key = makeId("condition");
                    delete condition.value;
                    delete condition.type;
                    delete condition.variableId;
                  }
                  return condition;
                });
              },
            );
          }
        }
      }
    } catch (err) {
      migrationErrors.push(err as Error);
      console.error(`[Migration Error]: ${(err as Error).stack}`, key, value);
    }
    return value;
  });
  // Synthesize characterZOrder from existing characters if missing
  if (result.data && result.data.characters && !result.data.characterZOrder) {
    result.data.characterZOrder = Object.keys(result.data.characters);
  }

  // Initialize stage-scoped variable definitions and per-stage value maps on
  // older saves that pre-date the feature.
  if (result.data && result.data.world) {
    if (!result.data.world.stageVariables) {
      result.data.world.stageVariables = {};
    }
    // Ensure built-in stage variables (wrapX, wrapY, ...) exist on the world.
    for (const [id, def] of Object.entries(BUILTIN_STAGE_VARIABLES)) {
      if (!result.data.world.stageVariables[id]) {
        result.data.world.stageVariables[id] = { ...def };
      }
    }
    if (result.data.world.stages) {
      for (const stageId of Object.keys(result.data.world.stages)) {
        const s = result.data.world.stages[stageId];
        if (!s) continue;
        if (!s.variableValues) {
          s.variableValues = {};
        }
        // Fold legacy boolean Stage fields into per-stage variableValues.
        if ("wrapX" in s && s.variableValues.wrapX === undefined) {
          s.variableValues.wrapX = s.wrapX ? "true" : "false";
        }
        if ("wrapY" in s && s.variableValues.wrapY === undefined) {
          s.variableValues.wrapY = s.wrapY ? "true" : "false";
        }
        delete s.wrapX;
        delete s.wrapY;
      }
    }
    // Stage variables no longer carry a world-level default. The invariant is
    // that every defined stage variable has an explicit value on every stage.
    // For each variable, populate any stage missing it with the (legacy)
    // definition default if any, otherwise the variable's seed initial. Then
    // strip defaultValue from the definitions.
    for (const id of Object.keys(result.data.world.stageVariables)) {
      const def = result.data.world.stageVariables[id];
      const seed = def?.defaultValue ?? BUILTIN_STAGE_VARIABLE_INITIAL_VALUES[id] ?? "0";
      if (result.data.world.stages) {
        for (const stageId of Object.keys(result.data.world.stages)) {
          const s = result.data.world.stages[stageId];
          if (!s) continue;
          if (s.variableValues[id] === undefined) {
            s.variableValues[id] = seed;
          }
        }
      }
      if (def && "defaultValue" in def) {
        delete def.defaultValue;
      }
    }
  }

  const migrated = JSON.stringify(result);

  if (migrated !== nonmigrated) {
    delete result.data.ui;
    delete result.data.recording;
    console.log(result);
  }

  if (migrationErrors.length > 0) {
    console.warn(
      `[Data Migration] ${migrationErrors.length} error(s) occurred during migration. ` +
        `Some game data may not have been migrated correctly.`,
    );
  }

  // V1 -> V2 coordinate-system migration: flip stored Y values so internal
  // coordinates use Y-up with origin (0, 0) at the bottom-left. Idempotent —
  // a world already at version >= 2 is returned unchanged.
  return migrateGameCoordinates(result);
}
