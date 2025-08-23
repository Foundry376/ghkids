import { DeepPartial, Dispatch } from "redux";
import { Actions } from ".";
import {
  Actor,
  PositionRelativeToRuleExtent,
  RecordingState,
  Rule,
  RuleCondition,
  RuleExtent,
  RuleTreeFlowItemCheck,
} from "../../types";
import * as types from "../constants/action-types";
import { stopPlayback } from "./ui-actions";

export function setupRecordingForActor({
  characterId,
  actor,
}: {
  characterId: string;
  actor: Actor;
}) {
  return (dispatch: Dispatch<Actions>) => {
    dispatch(stopPlayback());
    dispatch({
      type: types.SETUP_RECORDING_FOR_ACTOR,
      characterId,
      actor,
    });
  };
}

export type ActionSetupRecordingForActor = {
  type: "SETUP_RECORDING_FOR_ACTOR";
  characterId: string;
  actor: Actor;
};

export function setupRecordingForCharacter({ characterId }: { characterId: string }) {
  return (dispatch: Dispatch<Actions>) => {
    dispatch(stopPlayback());
    dispatch({
      type: types.SETUP_RECORDING_FOR_CHARACTER,
      characterId,
    });
  };
}

export type ActionSetupRecordingForCharacter = {
  type: "SETUP_RECORDING_FOR_CHARACTER";
  characterId: string;
};

export function editRuleRecording({
  characterId,
  rule,
}: {
  characterId: string;
  rule: Rule | RuleTreeFlowItemCheck;
}) {
  return (dispatch: Dispatch<Actions>) => {
    dispatch(stopPlayback());
    dispatch({
      type: types.EDIT_RULE_RECORDING,
      characterId,
      rule,
    });
  };
}

export type ActionEditRuleRecording = {
  type: "EDIT_RULE_RECORDING";
  characterId: string;
  rule: Rule | RuleTreeFlowItemCheck;
};

export function cancelRecording(): ActionCancelRecording {
  return {
    type: types.CANCEL_RECORDING,
  };
}

export type ActionCancelRecording = {
  type: "CANCEL_RECORDING";
};

export function finishRecording(): ActionFinishRecording {
  return {
    type: types.FINISH_RECORDING,
  };
}

export type ActionFinishRecording = {
  type: "FINISH_RECORDING";
};

export function setRecordingExtent(extent: RuleExtent): ActionSetRecordingExtent {
  return {
    type: types.SET_RECORDING_EXTENT,
    extent,
  };
}

export type ActionSetRecordingExtent = {
  type: "SET_RECORDING_EXTENT";
  extent: RuleExtent;
};

export function upsertRecordingCondition(condition: RuleCondition): ActionUpsertRecordingCondition {
  return {
    type: types.UPSERT_RECORDING_CONDITION,
    condition,
  };
}

export type ActionUpsertRecordingCondition = {
  type: "UPSERT_RECORDING_CONDITION";
  condition: RuleCondition & { enabled?: boolean };
};

export function updateRecordingActions(
  actions: DeepPartial<RecordingState["actions"]>,
): ActionUpdateRecordingActions {
  return {
    type: types.UPDATE_RECORDING_ACTIONS,
    actions,
  };
}

export type ActionUpdateRecordingActions = {
  type: "UPDATE_RECORDING_ACTIONS";
  actions: DeepPartial<RecordingState["actions"]>;
};

export function toggleSquareIgnored(
  position: PositionRelativeToRuleExtent,
): ActionToggleSquareIgnored {
  return {
    type: types.TOGGLE_RECORDING_SQUARE_IGNORED,
    position,
  };
}

export type ActionToggleSquareIgnored = {
  type: "TOGGLE_RECORDING_SQUARE_IGNORED";
  position: PositionRelativeToRuleExtent;
};

export type RecordingActions =
  | ActionSetupRecordingForActor
  | ActionSetupRecordingForCharacter
  | ActionEditRuleRecording
  | ActionCancelRecording
  | ActionFinishRecording
  | ActionSetRecordingExtent
  | ActionUpsertRecordingCondition
  | ActionUpdateRecordingActions
  | ActionToggleSquareIgnored;
