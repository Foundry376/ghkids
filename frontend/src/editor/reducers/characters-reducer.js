import u from "updeep";

import * as Types from "../constants/action-types";
import {
  actionsForRecording,
  extentByShiftingExtent,
} from "../utils/recording-helpers";
import { getCurrentStageForWorld } from "../utils/selectors";
import { findRule, pointIsInside } from "../utils/stage-helpers";
import { CONTAINER_TYPES, FLOW_BEHAVIORS } from "../utils/world-constants";
import initialState from "./initial-state";

export default function charactersReducer(
  state = initialState.characters,
  action,
  { recording }
) {
  switch (action.type) {
    case Types.UPSERT_CHARACTER: {
      return u.updateIn(action.characterId, action.values, state);
    }

    case Types.DELETE_CHARACTER: {
      return u.omit(action.characterId, state);
    }

    case Types.CREATE_CHARACTER_VARIABLE: {
      return u.updateIn(
        action.characterId,
        {
          variables: {
            [action.variableId]: {
              defaultValue: 0,
              name: "Untitled",
              id: action.variableId,
              type: "number",
            },
          },
        },
        state
      );
    }

    case Types.DELETE_CHARACTER_VARIABLE: {
      return u.updateIn(
        action.characterId,
        {
          variables: u.omit(action.variableId),
        },
        state
      );
    }

    case Types.DELETE_CHARACTER_APPEARANCE: {
      return u.updateIn(
        action.characterId,
        {
          spritesheet: {
            appearances: u.omit(action.appearanceId),
            appearanceNames: u.omit(action.appearanceId),
          },
        },
        state
      );
    }

    case Types.CREATE_CHARACTER_EVENT_CONTAINER: {
      const { characterId, eventType, eventCode, id } = action;

      let rules = JSON.parse(JSON.stringify(state[characterId].rules));
      const hasSameAlready = rules.some(
        (r) => r.event === eventType && r.code === eventCode
      );
      const hasEvents = rules.some((r) => !!r.event);

      if (hasSameAlready) {
        return state;
      }

      const rule = {
        id: id,
        type: CONTAINER_TYPES.EVENT,
        rules: [],
        event: eventType,
        code: eventCode,
      };

      if (!hasEvents) {
        rules = [
          rule,
          {
            id: id + 1,
            type: CONTAINER_TYPES.EVENT,
            rules: rules,
            event: "idle",
          },
        ];
      } else {
        rules.unshift(rule);
      }
      return u.updateIn(action.characterId, { rules }, state);
    }

    case Types.CREATE_CHARACTER_FLOW_CONTAINER: {
      const { characterId, id } = action;
      const rules = JSON.parse(JSON.stringify(state[characterId].rules));

      const idleContainer = rules.find((r) => r.event === "idle") || { rules };
      idleContainer.rules.push({
        id,
        behavior: FLOW_BEHAVIORS.FIRST,
        name: "Untitled Group",
        type: CONTAINER_TYPES.FLOW,
        rules: [],
      });
      return u.updateIn(action.characterId, { rules }, state);
    }

    case Types.FINISH_RECORDING: {
      const rules = JSON.parse(
        JSON.stringify(state[recording.characterId].rules)
      );

      // locate the main actor in the recording to "re-center" the extent to it
      const beforeStage = getCurrentStageForWorld(recording.beforeWorld);
      const mainActor = Object.values(beforeStage.actors).find(
        (a) => a.id === recording.actorId
      );
      const recordingActors = {};

      for (const a of Object.values(beforeStage.actors)) {
        if (pointIsInside(a.position, recording.extent)) {
          recordingActors[a.id] = Object.assign({}, a, {
            position: {
              x: a.position.x - mainActor.position.x,
              y: a.position.y - mainActor.position.y,
            },
          });
        }
      }

      const recordedRule = {
        type: "rule",
        mainActorId: recording.actorId,
        conditions: recording.conditions,
        actors: recordingActors,
        actions: actionsForRecording(recording, { characters: state }),
        extent: extentByShiftingExtent(recording.extent, {
          x: -mainActor.position.x,
          y: -mainActor.position.y,
        }),
      };

      if (recording.ruleId) {
        const [existingRule, parentRule, parentIdx] = findRule(
          { rules },
          recording.ruleId
        );
        parentRule.rules[parentIdx] = Object.assign(
          {},
          existingRule,
          recordedRule
        );
        return u.updateIn(recording.characterId, { rules }, state);
      }

      const idleContainer = rules.find((r) => r.event === "idle") || { rules };
      idleContainer.rules.unshift(
        Object.assign(recordedRule, {
          id: `${Date.now()}`,
          name: "Untitled Rule",
        })
      );
      return u.updateIn(recording.characterId, { rules }, state);
    }
    default:
      return state;
  }
}
