import React from "react";
import { Dispatch } from "redux";

import Button from "reactstrap/lib/Button";
import { makeRequest } from "../../../helpers/api";
import { cancelRecording, finishRecording } from "../../actions/recording-actions";
import { RECORDING_PHASE } from "../../constants/constants";
import { getCurrentStageForWorld } from "../../utils/selectors";
import { Actor, Characters, RecordingState, RuleAction, RuleCondition, Stage } from "../../../types";

interface StageRecordingControlsProps {
  dispatch: Dispatch;
  recording: RecordingState;
  characters: Characters;
}

interface NamingPayloadAction {
  type: string;
  actorName: string;
  operation?: string;
  variableName?: string;
  appearanceName?: string;
  value?: unknown;
  offset?: { x: number; y: number };
}

interface NamingPayloadCondition {
  comparator: string;
  enabled: boolean;
  key: string;
  left: {
    actorName: string;
    variableName: string;
  };
  right: unknown;
}

interface NamingPayload {
  characterId: string;
  mainActorName: string;
  start_scene: Array<{
    characterName: string;
    actorName: string;
    position: { x: number; y: number };
    appearance: string;
  }>;
  actions: NamingPayloadAction[];
  conditions: NamingPayloadCondition[];
  extent: RecordingState["extent"];
}

/** Build a mapping from actorId -> display name (e.g., "Cat", "Cat 2") */
function buildActorIdToNameMap(
  actors: Stage["actors"],
  characters: Characters
): Record<string, string> {
  const nameCount: Record<string, number> = {};
  const actorIdToName: Record<string, string> = {};

  for (const actorId of Object.keys(actors)) {
    const charId = actors[actorId]?.characterId;
    const baseName = characters[charId]?.name || charId;
    const count = (nameCount[baseName] || 0) + 1;
    nameCount[baseName] = count;
    actorIdToName[actorId] = count === 1 ? baseName : `${baseName} ${count}`;
  }
  return actorIdToName;
}

/** Get the appearance display name for an actor */
function getAppearanceName(
  actors: Stage["actors"],
  characters: Characters,
  actorId: string,
  appearanceId: string
): string {
  const charId = actors[actorId]?.characterId;
  return characters[charId]?.spritesheet?.appearanceNames?.[appearanceId] || appearanceId;
}

/** Get the variable display name for an actor's character */
function getVariableName(
  actors: Stage["actors"],
  characters: Characters,
  actorId: string,
  variableId: string
): string {
  const charId = actors[actorId]?.characterId;
  return characters[charId]?.variables?.[variableId]?.name || variableId;
}

/** Build payload for the rule naming API with human-readable names instead of IDs */
// eslint-disable-next-line react-refresh/only-export-components
export function buildNamingPayload(
  recording: RecordingState,
  characters: Characters
): NamingPayload {
  const stage = getCurrentStageForWorld(recording.beforeWorld);
  const actors = stage?.actors ?? {};
  const actorIdToName = buildActorIdToNameMap(actors, characters);

  const getActorName = (actorId: string) => actorIdToName[actorId] || actorId;
  const getCharName = (charId: string) => characters[charId]?.name || charId;

  const mainActorName =
    actorIdToName[recording.actorId!] || getCharName(recording.characterId!);

  const mappedActions: NamingPayloadAction[] = (recording.actions || []).map(
    (action: RuleAction) => {
      const actorId = "actorId" in action ? action.actorId : undefined;

      let variableName: string | undefined;
      if (action.type === "variable" && actorId) {
        variableName = getVariableName(actors, characters, actorId, action.variable);
      }

      let appearanceName: string | undefined;
      if (action.type === "appearance" && actorId && action.value && "constant" in action.value) {
        appearanceName = getAppearanceName(actors, characters, actorId, action.value.constant);
      }

      return {
        type: action.type,
        actorName: actorId ? getActorName(actorId) : "",
        ...("offset" in action && { offset: action.offset }),
        ...("operation" in action && { operation: action.operation }),
        ...("value" in action && { value: action.value }),
        ...(variableName && { variableName }),
        ...(appearanceName && { appearanceName }),
      };
    }
  );

  const mappedConditions: NamingPayloadCondition[] = recording.conditions.map(
    (condition: RuleCondition) => {
      const leftActorId = "actorId" in condition.left ? condition.left.actorId : undefined;
      const leftActorName = leftActorId ? getActorName(leftActorId) : "";
      const leftVariableId = "variableId" in condition.left ? condition.left.variableId : "";
      const leftVariableName = leftActorId
        ? getVariableName(actors, characters, leftActorId, leftVariableId)
        : leftVariableId;

      // Translate appearance constant to display name
      let right = condition.right;
      if (leftVariableName === "appearance" && leftActorId && right && "constant" in right) {
        right = { constant: getAppearanceName(actors, characters, leftActorId, right.constant) };
      }

      return {
        comparator: condition.comparator,
        enabled: condition.enabled,
        key: condition.key,
        left: { actorName: leftActorName, variableName: leftVariableName },
        right,
      };
    }
  );

  const start_scene: NamingPayload["start_scene"] = Object.entries(actors).map(
    ([actorId, actor]: [string, Actor]) => ({
      characterName: getCharName(actor.characterId),
      actorName: getActorName(actorId),
      position: actor.position,
      appearance: getAppearanceName(actors, characters, actorId, actor.appearance),
    })
  );

  return {
    characterId: getCharName(recording.characterId!),
    mainActorName,
    start_scene,
    actions: mappedActions,
    conditions: mappedConditions,
    extent: recording.extent,
  };
}

const StageRecordingControls: React.FC<StageRecordingControlsProps> = ({
  dispatch,
  recording,
  characters,
}) => {
  const onCancel = () => {
    dispatch(cancelRecording());
  };

  const onNext = async () => {
    if (recording.phase === RECORDING_PHASE.RECORD) {
      let generatedName = "Untitled Rule";

      try {
        const payload = buildNamingPayload(recording, characters);

        console.log("Payload:", payload);

        const resp = (await makeRequest("/generate-rule-name", {
          method: "POST",
          json: { recording: payload },
        })) as { name?: string } | null;
        if (resp && resp.name) {
          generatedName = resp.name;
          console.log("Suggested rule name:", generatedName);
        }
      } catch (err) {
        console.error("Failed to auto-generate rule name:", err);
      }

      dispatch(finishRecording(generatedName));
    }
  };

  const { phase } = recording;

  const message: Record<string, string> = {
    [RECORDING_PHASE.RECORD]:
      "Use the handles to expand the frame and act out what you want to happen in the picture on the right.",
  };

  const next: Record<string, React.ReactNode> = {
    [RECORDING_PHASE.RECORD]: (
      <span>
        <i className="fa fa-checkmark" />{" "}
        {recording.actions ? "Save Recording" : "Save Conditions"}
      </span>
    ),
  };

  return (
    <div className="stage-controls">
      <div className="left message">{message[phase]}</div>
      <div style={{ flex: 1 }} />
      <div className="right">
        <Button onClick={onCancel}>Cancel</Button>{" "}
        <Button data-tutorial-id="record-next-step" color="success" onClick={onNext}>
          {next[phase]}
        </Button>{" "}
      </div>
    </div>
  );
};

export default StageRecordingControls;
