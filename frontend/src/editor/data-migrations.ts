/* eslint-disable @typescript-eslint/no-explicit-any */

import { Game } from "../types";
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
      console.error(`[Migration Error]: ${(err as Error).stack}`, key, value);
    }
    return value;
  });
  const migrated = JSON.stringify(result);

  if (migrated !== nonmigrated) {
    delete result.data.ui;
    delete result.data.recording;
    console.log(result);
  }

  return result;
}
