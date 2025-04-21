import { getCurrentStageForWorld } from "../../../utils/selectors";

import { useDispatch } from "react-redux";
import { Characters, RecordingState, RuleAction } from "../../../../types";
import { updateRecordingActions } from "../../../actions/recording-actions";
import { deepClone } from "../../../utils/utils";
import { ActorDeltaCanvas } from "./actor-delta-canvas";
import { ActorOffsetCanvas } from "./actor-offset-canvas";
import { ActorBlock, AppearanceBlock, TransformBlock, VariableBlock } from "./blocks";
import { getAfterWorldForRecording } from "./utils";
import { VariableActionPicker } from "./variable-action-picker";

export const RecordingActions = (props: { characters: Characters; recording: RecordingState }) => {
  const dispatch = useDispatch();
  const { characters, recording } = props;
  const { beforeWorld, actions, extent } = recording;

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
              value={a.value}
              operation={a.operation}
              onChangeValue={(v) => onChange({ ...a, value: v })}
              onChangeOperation={(operation) => onChange({ ...a, operation })}
            />
            <VariableBlock name={character.variables[a.variable].name} />
            of
            <ActorBlock character={character} actor={actor} />
          </>
        );
      }
      if (a.type === "appearance") {
        return (
          <>
            Change appearance of
            <ActorBlock character={character} actor={actor} />
            to
            <AppearanceBlock
              character={character}
              appearanceId={a.to}
              transform={actor.transform}
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
            <TransformBlock
              character={character}
              appearanceId={actor.appearance}
              transform={a.to}
            />
          </>
        );
      }
    }

    if (a.type === "global") {
      const declaration = beforeWorld.globals[a.global];
      if (declaration.type === "stage") {
        return (
          <>
            Set
            <VariableBlock name={"Current Stage"} />
            to
            <code>{beforeWorld.stages[a.value] && beforeWorld.stages[a.value].name}</code>
          </>
        );
      }
      return (
        <>
          <VariableActionPicker
            value={a.value}
            operation={a.operation}
            onChangeValue={(v) => onChange({ ...a, value: v })}
            onChangeOperation={(operation) => onChange({ ...a, operation })}
          />
          <VariableBlock name={declaration.name} />
        </>
      );
    }

    throw new Error(`Unknown action type: ${a.type}`);
  };

  return (
    <div className="panel-actions" style={{ flex: 1, marginLeft: 3 }}>
      <h2>It should...</h2>
      <ul>
        {actions.map((a, idx) => {
          const node = _renderAction(a, (modified) => {
            dispatch(updateRecordingActions(actions.map((a, i) => (i === idx ? modified : a))));
          });

          afterStage = getCurrentStageForWorld(
            getAfterWorldForRecording(beforeWorld, characters, recording, idx),
          );
          return (
            <li key={idx}>
              <div className="left" style={{ display: "flex", alignItems: "center", gap: 2 }}>
                {node}
              </div>
              <div
                onClick={() => dispatch(updateRecordingActions(actions.filter((aa) => aa !== a)))}
                className="condition-remove"
              >
                <div />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
