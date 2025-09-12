import PropTypes from "prop-types";
import React from "react";

import Button from "reactstrap/lib/Button";
import { makeRequest } from "../../../helpers/api";
import { cancelRecording, finishRecording } from "../../actions/recording-actions";
import { RECORDING_PHASE } from "../../constants/constants";
import { getCurrentStageForWorld } from "../../utils/selectors";

export default class StageRecordingControls extends React.Component {
  static propTypes = {
    dispatch: PropTypes.func,
    recording: PropTypes.object,
    characters: PropTypes.object,
  };

  constructor(props, context) {
    super(props, context);
  }

  _onCancel = () => {
    this.props.dispatch(cancelRecording());
  };

  _buildNamingPayload = (recording, characters) => {
    // Create a copy of the recording data with character names instead of IDs
    const _actors = getCurrentStageForWorld(recording.beforeWorld).actors;

    // Build a mapping from actorId -> character display name, handling duplicates by appending numbers
    const characterIdToCount = {};
    const actorIdToName = {};
    Object.keys(_actors || {}).forEach((actorId) => {
      const characterId = _actors[actorId]?.characterId;
      const baseName = characters[characterId]?.name || characterId;
      const currentCount = (characterIdToCount[baseName] || 0) + 1;
      characterIdToCount[baseName] = currentCount;
      // First instance keeps base name; subsequent instances get a suffix
      const displayName = currentCount === 1 ? baseName : `${baseName} ${currentCount}`;
      actorIdToName[actorId] = displayName;
    });

    const getAppearanceNameForActorId = (actorId, appearanceId) => {
      const charId = _actors[actorId]?.characterId;
      const appearanceNames = characters[charId]?.spritesheet?.appearanceNames || {};
      return appearanceNames?.[appearanceId] || appearanceId;
    };

    const recordingWithNames = {
      characterId: characters[recording.characterId]?.name || recording.characterId,
      // Keep actorId as is since it's the specific actor instance (internal), but also map to a human-friendly name
      actorName: actorIdToName[recording.actorId] || recording.actorId,
      actions: recording.actions.map((action) => {
        // Map variable id -> variable name and metadata when applicable
        let variableName = undefined;
        if (action.type === "variable") {
          const actionActorCharId = _actors[action.actorId]?.characterId;
          const varsForChar = characters[actionActorCharId]?.variables || {};
          const varInfo = varsForChar?.[action.variable];
          variableName = varInfo?.name || action.variable;
        }
        // Translate appearance changes (value.constant is an appearanceId)
        let appearanceName = undefined;
        if (action.type === "appearance" && action.value && action.value.constant) {
          appearanceName = getAppearanceNameForActorId(action.actorId, action.value.constant);
        }
        return {
          ...action,
          // Keep actorId as is since it's the specific actor instance
          // Replace with actorName for readability in the naming model
          actorName: actorIdToName[action.actorId] || action.actorId,
          actorId: action.actorId, // Keep actorId as is since it's the specific actor instance
          name: characters[_actors[action.actorId]?.characterId]?.name,
          ...(variableName ? { variableName } : {}),
          ...(appearanceName ? { appearanceName } : {}),
        };
      }),
      conditions: recording.conditions.map((condition) => {
        // Map left side IDs to names; preserve right as-is (e.g., constants)
        const leftActorName = actorIdToName[condition.left.actorId] || condition.left.actorId;
        const leftActorCharId = _actors[condition.left.actorId]?.characterId;
        const leftVars = characters[leftActorCharId]?.variables || {};
        const leftVariableName = leftVars?.[condition.left.variableId]?.name || condition.left.variableId;
        // Translate appearance right constant to appearance name if applicable
        let right = condition.right;
        if (leftVariableName === "appearance" && right && right.constant) {
          right = { constant: getAppearanceNameForActorId(condition.left.actorId, right.constant) };
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
      mainActorName: actorIdToName[recording.actorId] || (characters[recording.characterId]?.name || recording.characterId),
    };
    
    // Build start_scene with actor positions and appearances
    const start_scene = [];

    
    // Build start_scene data for each involved actor
    Object.keys(_actors).forEach(actorId => {
      const actor = _actors[actorId];
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
          appearance: appearanceName
        });
      }
    });

    // Build the final payload for the naming request
    const payload = {
      characterId: recordingWithNames.characterId,
      // Instead of actorId and mainActorId, include actorName and mainActorName
      mainActorName: recordingWithNames.mainActorName,
      start_scene,
      actions: recordingWithNames.actions.map(({ actorName, offset, type, variableName, appearanceName, operation, value }) => ({
        type,
        actorName,
        operation,
        // Use the variable's/appearance's human-friendly name when present
        ...(variableName ? { variableName } : {}),
        ...(appearanceName ? { appearanceName } : {}),
        value,
        offset,
      })),
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

  _onNext = async () => {
    const { dispatch, recording, characters } = this.props;

    if (recording.phase === RECORDING_PHASE.RECORD) {
      let generatedName = "Untitled Rule";
      
      try {
        const payload = this._buildNamingPayload(recording, characters);

        console.log("Payload:", payload);

        const resp = await makeRequest("/generate-rule-name", {
          method: "POST",
          json: { recording: payload },
        });
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

  render() {
    const {
      characters,
      recording: { characterId, phase },
    } = this.props;

    const message = {
      [RECORDING_PHASE.RECORD]:
        "Use the handles to expand the frame and act out what you want to happen in the picture on the right.",
    }[phase];

    const next = {
      [RECORDING_PHASE.RECORD]: (
        <span>
          <i className="fa fa-checkmark" /> Save Recording
        </span>
      ),
    }[phase];

    return (
      <div className="stage-controls">
        <div className="left message">{message}</div>
        <div style={{ flex: 1 }} />
        <div className="right">
          <Button onClick={this._onCancel}>Cancel</Button>{" "}
          <Button data-tutorial-id="record-next-step" color="success" onClick={this._onNext}>
            {next}
          </Button>{" "}
        </div>
      </div>
    );
  }
}
