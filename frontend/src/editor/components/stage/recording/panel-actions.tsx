import { getCurrentStageForWorld } from "../../../utils/selectors";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Characters, EditorState, RecordingState, RuleAction } from "../../../../types";
import { updateRecordingActions } from "../../../actions/recording-actions";
import { selectToolId } from "../../../actions/ui-actions";
import { TOOLS } from "../../../constants/constants";
import { deepClone } from "../../../utils/utils";
import { ActorDeltaCanvas } from "./actor-delta-canvas";
import { ActorOffsetCanvas } from "./actor-offset-canvas";
import { ActorBlock, ActorVariableBlock, VariableBlock } from "./blocks";
import { FreeformConditionValue } from "./condition-rows";
import { getAfterWorldForRecording } from "./utils";
import { VariableActionPicker } from "./variable-action-picker";

export const RecordingActions = (props: { characters: Characters; recording: RecordingState }) => {
  const { characters, recording } = props;
  const { beforeWorld, actions, extent } = recording;
  const selectedToolId = useSelector<EditorState>((state) => state.ui.selectedToolId);
  const dispatch = useDispatch();

  const beforeStage = getCurrentStageForWorld(beforeWorld);
  let afterStage = deepClone(beforeStage);

  // In a saved rule the main actor is at 0,0, but when recording on the stage
  // the extent and the position are relative to the "current" game world.
  const mainActorBeforePosition = beforeStage!.actors[recording.actorId!].position;

  const _renderAction = (a: RuleAction, onChange: (a: RuleAction) => void) => {
    if (!beforeStage || !afterStage) {
      return;
    }
    if ("actorId" in a && a.actorId) {
      if (a.type === "create") {
        return (
          <>
            Create a
            <ActorBlock actor={a.actor} character={characters[a.actor.characterId]} />
            at
            <ActorOffsetCanvas
              actor={a.actor}
              character={characters[a.actor.characterId]}
              extent={extent}
              offset={{
                x: a.offset!.x + mainActorBeforePosition.x - extent.xmin,
                y: a.offset!.y + mainActorBeforePosition.y - extent.ymin,
              }}
            />
          </>
        );
      }
      const actor = afterStage.actors[a.actorId];
      const character = characters[actor.characterId];

      if (a.type === "move") {
        return (
          <>
            Move
            <ActorBlock actor={actor} character={character} />
            to
            {a.delta ? (
              <ActorDeltaCanvas delta={a.delta} />
            ) : (
              <ActorOffsetCanvas
                actor={actor}
                character={character}
                extent={extent}
                offset={{
                  x: a.offset!.x + mainActorBeforePosition.x - extent.xmin,
                  y: a.offset!.y + mainActorBeforePosition.y - extent.ymin,
                }}
              />
            )}
          </>
        );
      }
      if (a.type === "delete") {
        return (
          <>
            Remove
            <ActorBlock actor={actor} character={character} />
            from the stage
          </>
        );
      }

      const leftActor = "actorId" in a.value ? afterStage.actors[a.value.actorId] : null;
      const leftCharacter = leftActor && characters[leftActor.characterId];

      if (a.type === "variable") {
        return (
          <>
            <VariableActionPicker
              operation={a.operation}
              onChangeOperation={(operation) => onChange({ ...a, operation })}
            />
            <FreeformConditionValue
              value={a.value}
              actor={leftActor}
              world={beforeWorld}
              character={leftCharacter}
              onChange={(value) => onChange({ ...a, value })}
              impliedDatatype={null}
              disambiguate={false}
            />
            {{ set: "into", add: "to", subtract: "from" }[a.operation]}
            <ActorVariableBlock character={character} actor={actor} variableId={a.variable} />
          </>
        );
      }
      if (a.type === "appearance") {
        return (
          <>
            Change appearance of
            <ActorBlock character={character} actor={actor} />
            to
            <FreeformConditionValue
              value={a.value}
              actor={leftActor}
              world={beforeWorld}
              character={leftCharacter}
              onChange={(value) => onChange({ ...a, value })}
              impliedDatatype={{ type: "appearance", character }}
              disambiguate={false}
            />
          </>
        );
      }
      if (a.type === "transform") {
        return (
          <>
            Turn
            <ActorBlock character={character} actor={actor} />
            to
            <FreeformConditionValue
              value={a.value}
              actor={leftActor}
              world={beforeWorld}
              character={leftCharacter}
              onChange={(value) => onChange({ ...a, value })}
              impliedDatatype={{ type: "transform" }}
              disambiguate={false}
            />
          </>
        );
      }
    }

    if (a.type === "global") {
      const leftActor = "actorId" in a.value ? afterStage.actors[a.value.actorId] : null;
      const leftCharacter = leftActor && characters[leftActor.characterId];
      const declaration = beforeWorld.globals[a.global];

      if ("type" in declaration && declaration.type === "stage" && "constant" in a.value) {
        return (
          <>
            Set
            <VariableBlock name={"Current Stage"} />
            to
            <code>
              {beforeWorld.stages[a.value.constant] && beforeWorld.stages[a.value.constant].name}
            </code>
          </>
        );
      }
      return (
        <>
          <VariableActionPicker
            operation={a.operation}
            onChangeOperation={(operation) => onChange({ ...a, operation })}
          />
          <FreeformConditionValue
            value={a.value}
            actor={leftActor}
            world={beforeWorld}
            character={leftCharacter}
            onChange={(value) => onChange({ ...a, value })}
            impliedDatatype={null}
            disambiguate={false}
          />
          {{ set: "into", add: "to", subtract: "from" }[a.operation]}

          <VariableBlock name={declaration.name} />
        </>
      );
    }

    throw new Error(`Unknown action type: ${a.type}`);
  };

  const [droppingValue, setDroppingValue] = useState(false);

  if (!actions) {
    return <span />;
  }

  const onDropValue = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("variable")) {
      const {
        actorId,
        globalId,
        variableId,
        value: constant,
      } = JSON.parse(e.dataTransfer.getData("variable"));

      const value = { constant };

      const newAction: RuleAction | null =
        variableId === "transform"
          ? { type: "transform", actorId, value }
          : variableId === "appearance"
            ? { type: "appearance", actorId, value }
            : globalId
              ? { type: "global", operation: "set", global: globalId, value }
              : variableId
                ? { type: "variable", actorId, variable: variableId, operation: "set", value }
                : null;

      if (newAction) {
        dispatch(updateRecordingActions([...actions, newAction]));
      }
      e.stopPropagation();
    }
    setDroppingValue(false);
  };

  const onRemoveAction = (a: RuleAction) => {
    dispatch(updateRecordingActions(actions.filter((aa) => aa !== a)));
  };

  return (
    <div
      className={`panel-actions dropping-${droppingValue}`}
      style={{ flex: 1, marginLeft: 3 }}
      tabIndex={0}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(`variable`)) {
          setDroppingValue(true);
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onDragLeave={() => {
        setDroppingValue(false);
      }}
      onDrop={onDropValue}
    >
      <h2>It should...</h2>
      <ul>
        {actions.map((a, idx) => {
          afterStage = getCurrentStageForWorld(
            getAfterWorldForRecording(beforeWorld, characters, recording, idx),
          );

          const node = _renderAction(a, (modified) => {
            dispatch(updateRecordingActions(actions.map((a, i) => (i === idx ? modified : a))));
          });

          return (
            <li
              key={idx}
              className={`tool-${selectedToolId}`}
              onClick={(e) => {
                if (selectedToolId === TOOLS.TRASH) {
                  onRemoveAction(a);
                  if (!e.shiftKey) {
                    dispatch(selectToolId(TOOLS.POINTER));
                  }
                }
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 2 }}>{node}</div>
              <div style={{ flex: 1 }} />
              <div onClick={() => onRemoveAction(a)} className="condition-remove">
                <div />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
