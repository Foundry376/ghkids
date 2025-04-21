import u from "updeep";

import { EditorState, RuleTreeEventItem, RuleTreeItem } from "../../types";
import { Actions } from "../actions";
import { ruleFromRecordingState } from "../components/stage/recording/utils";
import * as Types from "../constants/action-types";
import { getCurrentStageForWorld } from "../utils/selectors";
import { findRule } from "../utils/stage-helpers";
import { deepClone } from "../utils/utils";
import { CONTAINER_TYPES, FLOW_BEHAVIORS } from "../utils/world-constants";
import initialState from "./initial-state";

export default function charactersReducer(
  state = initialState.characters,
  action: Actions,
  { recording }: EditorState,
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
        state,
      );
    }

    case Types.DELETE_CHARACTER_VARIABLE: {
      return u.updateIn(
        action.characterId,
        {
          variables: u.omit(action.variableId),
        },
        state,
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
        state,
      );
    }

    case Types.CREATE_CHARACTER_EVENT_CONTAINER: {
      const { characterId, eventType, eventCode, id } = action;

      let rules: RuleTreeItem[] = deepClone(state[characterId].rules);
      const hasSameAlready = rules.some(
        (r) => "event" in r && r.event === eventType && r.code === eventCode,
      );
      const hasEvents = rules.some((r) => "event" in r);

      if (hasSameAlready) {
        return state;
      }

      const rule: RuleTreeEventItem = {
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
            event: "idle" as const,
          },
        ];
      } else {
        rules.unshift(rule);
      }
      return u.updateIn(action.characterId, { rules }, state);
    }

    case Types.CREATE_CHARACTER_FLOW_CONTAINER: {
      const { characterId, id } = action;
      const rules = deepClone(state[characterId].rules);

      const idleContainer = rules.find(
        (r) => "event" in r && r.event === "idle",
      ) as RuleTreeEventItem;
      const rulesWithinIdle: RuleTreeItem[] = idleContainer ? idleContainer.rules : rules;

      rulesWithinIdle.push({
        id,
        behavior: FLOW_BEHAVIORS.FIRST,
        name: "Untitled Group",
        type: CONTAINER_TYPES.FLOW,
        rules: [],
      });
      return u.updateIn(action.characterId, { rules }, state);
    }

    case Types.FINISH_RECORDING: {
      const rules = deepClone(state[recording.characterId!].rules);

      // locate the main actor in the recording to "re-center" the extent to it
      const beforeStage = getCurrentStageForWorld(recording.beforeWorld);
      if (!beforeStage) {
        return state;
      }
      const recordedRule = ruleFromRecordingState(beforeStage, state, recording);
      if (!recordedRule) {
        return state;
      }

      if (recording.ruleId) {
        const match = findRule({ rules }, recording.ruleId);
        if (!match) return state;
        const [existingRule, parentRule, parentIdx] = match;
        parentRule.rules[parentIdx] = Object.assign({}, existingRule, recordedRule);
        return u.updateIn(recording.characterId, { rules }, state);
      }

      const idleContainer = rules.find(
        (r) => "event" in r && r.event === "idle",
      ) as RuleTreeEventItem;
      const rulesWithinIdle: RuleTreeItem[] = idleContainer ? idleContainer.rules : rules;

      rulesWithinIdle.unshift({ ...recordedRule, id: `${Date.now()}`, name: "Untitled Rule" });
      return u.updateIn(recording.characterId, { rules }, state);
    }
    default:
      return state;
  }
}
