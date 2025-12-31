import React from "react";
import { Dispatch } from "redux";

import Button from "reactstrap/lib/Button";
import { makeRequest } from "../../../helpers/api";
import { cancelRecording, finishRecording } from "../../actions/recording-actions";
import { RECORDING_PHASE } from "../../constants/constants";
import { getCurrentStageForWorld } from "../../utils/selectors";
import { Actor, Characters, RecordingState, RuleAction, RuleCondition } from "../../../types";

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

interface EnrichedAction {
  type: string;
  actorId?: string;
  actorName?: string;
  name?: string;
  variableName?: string;
  appearanceName?: string;
  offset?: { x: number; y: number };
  operation?: string;
  value?: unknown;
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

const StageRecordingControls: React.FC<StageRecordingControlsProps> = ({
  dispatch,
  recording,
  characters,
}) => {
  const onCancel = () => {
    dispatch(cancelRecording());
  };

  const buildNamingPayload = (
    recording: RecordingState,
    characters: Characters,
  ): NamingPayload => {
    // Create a copy of the recording data with character names instead of IDs
    const stage = getCurrentStageForWorld(recording.beforeWorld);
    const _actors = stage?.actors ?? {};

    // Build a mapping from actorId -> character display name, handling duplicates by appending numbers
    const characterIdToCount: Record<string, number> = {};
    const actorIdToName: Record<string, string> = {};
    Object.keys(_actors || {}).forEach((actorId) => {
      const characterId = _actors[actorId]?.characterId;
      const baseName = characters[characterId]?.name || characterId;
      const currentCount = (characterIdToCount[baseName] || 0) + 1;
      characterIdToCount[baseName] = currentCount;
      // First instance keeps base name; subsequent instances get a suffix
      const displayName = currentCount === 1 ? baseName : `${baseName} ${currentCount}`;
      actorIdToName[actorId] = displayName;
    });

    const getAppearanceNameForActorId = (actorId: string, appearanceId: string): string => {
      const charId = _actors[actorId]?.characterId;
      const appearanceNames = characters[charId]?.spritesheet?.appearanceNames || {};
      return appearanceNames?.[appearanceId] || appearanceId;
    };

    const recordingWithNames = {
      characterId: characters[recording.characterId!]?.name || recording.characterId!,
      // Keep actorId as is since it's the specific actor instance (internal), but also map to a human-friendly name
      actorName: actorIdToName[recording.actorId!] || recording.actorId!,
      actions: (recording.actions || []).map((action: RuleAction): EnrichedAction => {
        // Map variable id -> variable name and metadata when applicable
        let variableName: string | undefined = undefined;
        const actorId = "actorId" in action ? action.actorId : undefined;
        if (action.type === "variable" && actorId) {
          const actionActorCharId = _actors[actorId]?.characterId;
          const varsForChar = characters[actionActorCharId]?.variables || {};
          const varInfo = varsForChar?.[action.variable];
          variableName = varInfo?.name || action.variable;
        }
        // Translate appearance changes (value.constant is an appearanceId)
        let appearanceName: string | undefined = undefined;
        if (action.type === "appearance" && actorId && action.value && "constant" in action.value) {
          appearanceName = getAppearanceNameForActorId(actorId, action.value.constant);
        }
        // Extract optional properties if they exist on this action type
        const offset = "offset" in action ? action.offset : undefined;
        const operation = "operation" in action ? action.operation : undefined;
        const value = "value" in action ? action.value : undefined;
        return {
          type: action.type,
          // Keep actorId as is since it's the specific actor instance
          // Replace with actorName for readability in the naming model
          actorName: actorId ? (actorIdToName[actorId] || actorId) : undefined,
          actorId: actorId, // Keep actorId as is since it's the specific actor instance
          name: actorId ? characters[_actors[actorId]?.characterId]?.name : undefined,
          offset,
          operation,
          value,
          ...(variableName ? { variableName } : {}),
          ...(appearanceName ? { appearanceName } : {}),
        };
      }),
      conditions: recording.conditions.map((condition: RuleCondition) => {
        // Map left side IDs to names; preserve right as-is (e.g., constants)
        const leftActorId = "actorId" in condition.left ? condition.left.actorId : undefined;
        const leftActorName = leftActorId ? (actorIdToName[leftActorId] || leftActorId) : "";
        const leftActorCharId = leftActorId ? _actors[leftActorId]?.characterId : undefined;
        const leftVars = leftActorCharId ? (characters[leftActorCharId]?.variables || {}) : {};
        const leftVariableId = "variableId" in condition.left ? condition.left.variableId : "";
        const leftVariableName = leftVars?.[leftVariableId]?.name || leftVariableId;
        // Translate appearance right constant to appearance name if applicable
        let right = condition.right;
        if (leftVariableName === "appearance" && right && "constant" in right && leftActorId) {
          right = { constant: getAppearanceNameForActorId(leftActorId, right.constant) };
        }
        return {
          comparator: condition.comparator,
          enabled: condition.enabled,
          key: condition.key,
          left: {
            actorName: leftActorName,
            variableName: leftVariableName,
          },
          right,
        };
      }),
      extent: recording.extent,
      // Provide a name for the main actor for the naming model
      mainActorName:
        actorIdToName[recording.actorId!] ||
        characters[recording.characterId!]?.name ||
        recording.characterId!,
    };

    // Build start_scene with actor positions and appearances
    const start_scene: NamingPayload["start_scene"] = [];

    // Build start_scene data for each involved actor
    Object.keys(_actors).forEach((actorId) => {
      const actor: Actor | undefined = _actors[actorId];
      if (actor) {
        const characterId = actor.characterId;
        const characterName = characters[characterId]?.name || characterId;
        const actorName = actorIdToName[actorId] || characterName;
        const appearance = actor.appearance;
        const appearanceName = getAppearanceNameForActorId(actorId, appearance);

        start_scene.push({
          characterName,
          actorName,
          position: actor.position,
          appearance: appearanceName,
        });
      }
    });

    // Build the final payload for the naming request
    const payload: NamingPayload = {
      characterId: recordingWithNames.characterId,
      // Instead of actorId and mainActorId, include actorName and mainActorName
      mainActorName: recordingWithNames.mainActorName,
      start_scene,
      actions: recordingWithNames.actions.map(
        ({ actorName, offset, type, variableName, appearanceName, operation, value }) => ({
          type,
          actorName: actorName || "",
          operation,
          // Use the variable's/appearance's human-friendly name when present
          ...(variableName ? { variableName } : {}),
          ...(appearanceName ? { appearanceName } : {}),
          value,
          offset,
        }),
      ),
      conditions: recordingWithNames.conditions.map((c) => ({
        comparator: c.comparator,
        enabled: c.enabled,
        key: c.key,
        left: {
          actorName: c.left.actorName,
          variableName: c.left.variableName,
        },
        right: c.right,
      })),
      extent: recordingWithNames.extent,
    };

    return payload;
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
