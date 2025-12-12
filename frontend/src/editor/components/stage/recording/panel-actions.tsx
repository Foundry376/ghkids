import { getCurrentStageForWorld } from "../../../utils/selectors";

import classNames from "classnames";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "reactstrap";
import {
  Characters,
  EditorState,
  RecordingState,
  RuleAction,
  RuleValue,
  UIState,
} from "../../../../types";
import { updateRecordingActions } from "../../../actions/recording-actions";
import { changeActors } from "../../../actions/stage-actions";
import { selectToolId } from "../../../actions/ui-actions";
import { TOOLS } from "../../../constants/constants";
import { deepClone } from "../../../utils/utils";
import { TransformEditorModal } from "../../inspector/transform-editor";
import { RELATIVE_TRANSFORMS } from "../../inspector/transform-lookup";
import { ActorDeltaCanvas } from "./actor-delta-canvas";
import { ActorOffsetCanvas } from "./actor-offset-canvas";
import { ActorBlock, ActorVariableBlock, VariableBlock } from "./blocks";
import { FreeformConditionValue } from "./condition-rows";
import { TransformActionPicker } from "./transform-action-picker";
import { getAfterWorldForRecording } from "./utils";
import { VariableActionPicker } from "./variable-action-picker";

export const RecordingActions = (props: { characters: Characters; recording: RecordingState }) => {
  const { characters, recording } = props;
  const { beforeWorld, actions, extent } = recording;
  const selectedToolId = useSelector<EditorState, TOOLS>((state) => state.ui.selectedToolId);

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

      if (a.type === "variable") {
        return (
          <>
            <VariableActionPicker
              operation={a.operation}
              onChangeOperation={(operation) => onChange({ ...a, operation })}
            />
            <FreeformConditionValue
              value={a.value}
              world={beforeWorld}
              actors={afterStage.actors}
              characters={characters}
              onChange={(value) => onChange({ ...a, value })}
              impliedDatatype={null}
              comparator="="
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
              world={beforeWorld}
              actors={afterStage.actors}
              characters={characters}
              onChange={(value) => onChange({ ...a, value })}
              impliedDatatype={{ type: "appearance", character }}
              comparator="="
            />
          </>
        );
      }
      if (a.type === "transform") {
        return (
          <>
            Turn
            <ActorBlock character={character} actor={actor} />
            <TransformActionPicker
              operation={a.operation}
              onChangeOperation={(operation) => {
                if (operation === a.operation) {
                  return;
                }
                let value: RuleValue = a.value;
                if ("constant" in a.value) {
                  const v = a.value.constant;
                  if (operation === "add") {
                    const table = RELATIVE_TRANSFORMS[actor.transform ?? "0"];
                    value = { constant: Object.entries(table).find((p) => p[0] === v)![1] };
                  }
                  if (operation === "set") {
                    const table = RELATIVE_TRANSFORMS[actor.transform ?? "0"];
                    value = { constant: Object.entries(table).find((p) => p[1] === v)![0] };
                  }
                }
                onChange({ ...a, operation, value });
              }}
            />
            <FreeformConditionValue
              value={a.value}
              world={beforeWorld}
              actors={afterStage.actors}
              characters={characters}
              onChange={(value) => onChange({ ...a, value })}
              comparator="="
              impliedDatatype={{
                type: "transform",
                characterId: actor.characterId,
                appearance: actor.appearance,
              }}
            />
          </>
        );
      }
    }

    if (a.type === "global") {
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
            world={beforeWorld}
            actors={afterStage.actors}
            characters={characters}
            onChange={(value) => onChange({ ...a, value })}
            impliedDatatype={null}
            comparator="="
          />
          {{ set: "into", add: "to", subtract: "from" }[a.operation]}

          <VariableBlock name={declaration.name} />
        </>
      );
    }

    throw new Error(`Unknown action type: ${a.type}`);
  };

  const [droppingValue, setDroppingValue] = useState(false);
  const [showAnimationFrames, setShowAnimationFrames] = useState(() =>
    actions?.some((a) => a.animationStyle),
  );

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
        variableId === "appearance"
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
      style={{ flex: 1, marginLeft: 3, position: "relative" }}
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
      <StageAfterTools />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2>It should...</h2>
        <Button
          size="xs"
          style={{ padding: 4 }}
          title="Toggle visibility of animation frames"
          className={showAnimationFrames ? "selected" : ""}
          onClick={() => setShowAnimationFrames(!showAnimationFrames)}
        >
          <img
            style={{ width: 28 }}
            src={new URL("../../../img/animation-frames.svg", import.meta.url).href}
          />
        </Button>
      </div>

      <ul>
        {actions.map((a, idx) => {
          const afterWorld = getAfterWorldForRecording(beforeWorld, characters, recording, idx);
          afterStage = getCurrentStageForWorld(afterWorld);

          const node = _renderAction(a, (modified) => {
            dispatch(updateRecordingActions(actions.map((a, i) => (i === idx ? modified : a))));
          });

          return (
            <React.Fragment key={idx}>
              <li
                className={`tool-supported`}
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
                {showAnimationFrames ? (
                  <div
                    style={{ width: 60 }}
                    className={`frame-divider ${a.animationStyle}`}
                    onClick={() => {
                      dispatch(
                        updateRecordingActions(
                          actions.map((a, i) =>
                            i === idx
                              ? {
                                  ...a,
                                  animationStyle:
                                    a.animationStyle === "none"
                                      ? "skip"
                                      : a.animationStyle === "skip"
                                        ? undefined
                                        : "none",
                                }
                              : a,
                          ),
                        ),
                      );
                    }}
                  >
                    {
                      { none: "None", skip: "Skip", linear: "Animate" }[
                        a.animationStyle ?? "linear"
                      ]
                    }
                  </div>
                ) : undefined}
                <div onClick={() => onRemoveAction(a)} className="condition-remove">
                  <div />
                </div>
              </li>
            </React.Fragment>
          );
        })}
      </ul>
    </div>
  );
};

const StageAfterTools = () => {
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();

  const characters = useSelector<EditorState, Characters>((state) => state.characters);
  const selectedActors = useSelector<EditorState, UIState["selectedActors"]>(
    (state) => state.ui.selectedActors,
  );
  const recording = useSelector<EditorState, RecordingState>((state) => state.recording);
  const afterStage = getCurrentStageForWorld(
    getAfterWorldForRecording(recording.beforeWorld, characters, recording),
  );
  const actorId = selectedActors?.actorIds[0];
  const actor = actorId && afterStage?.actors[actorId];

  const enabled = actor && selectedActors.worldId === "after";

  return (
    <div
      className="floating-controls"
      style={{
        left: 0,
        zIndex: 2,
        position: "absolute",
        transform: "translate(0, -100%)",
        paddingBottom: 5,
        display: "flex",
        gap: 4,
      }}
    >
      {actor && (
        <TransformEditorModal
          open={open}
          characterId={actor.characterId}
          appearance={actor.appearance}
          value={actor.transform ?? "0"}
          onChange={(transform) => {
            setOpen(false);
            dispatch(changeActors(selectedActors!, { transform }));
          }}
        />
      )}
      <Button disabled={!enabled} className={classNames({ enabled })} onClick={() => setOpen(true)}>
        Turn…
      </Button>
    </div>
  );
};
