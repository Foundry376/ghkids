import { useDispatch } from "react-redux";
import { RecordingActions } from "./recording/panel-actions";
import { RecordingConditions } from "./recording/panel-conditions";
import Stage from "./stage";
import StageControls from "./stage-controls";
import StageRecordingControls from "./stage-recording-controls";
import StageRecordingTools from "./stage-recording-tools";

import { useEffect, useRef, useState } from "react";
import * as Types from "../../../types";
import { EvaluatedRuleDetailsMap, EvaluatedSquare, UIState } from "../../../types";
import { useEditorSelector } from "../../../hooks/redux";
import { RECORDING_PHASE } from "../../constants/constants";
import { getCurrentStageForWorld } from "../../utils/selectors";
import { Library } from "../library";

/**
 * Gets the evaluated squares for a rule by looking up evaluation data from the
 * main world. Tries the selected actor on the main stage first, then falls back
 * to finding any actor with data for this rule.
 */
function getEvaluatedSquares(
  ruleId: string | null,
  evaluatedRuleDetails: EvaluatedRuleDetailsMap,
  selectedActors: UIState["selectedActors"],
): EvaluatedSquare[] {
  if (!ruleId) {
    return [];
  }

  // Try to get evaluation data from the selected actor on the main stage
  let evalActorId: string | null = null;

  if (selectedActors?.worldId === "root" && selectedActors.actorIds[0]) {
    evalActorId = selectedActors.actorIds[0];
  } else {
    // Fall back: find any actor that has evaluation data for this rule
    for (const actorId of Object.keys(evaluatedRuleDetails || {})) {
      if (evaluatedRuleDetails[actorId]?.[ruleId]) {
        evalActorId = actorId;
        break;
      }
    }
  }

  if (!evalActorId) {
    return [];
  }

  return evaluatedRuleDetails[evalActorId]?.[ruleId]?.squares || [];
}

const StageContainer = ({ readonly }: { readonly?: boolean }) => {
  const dispatch = useDispatch();
  const recording = useEditorSelector((state) => state.recording);
  const characters = useEditorSelector((state) => state.characters);
  const world = useEditorSelector((state) => state.world);
  const playback = useEditorSelector((state) => state.ui.playback);
  const selectedActors = useEditorSelector((state) => state.ui.selectedActors);

  let stageA: React.ReactNode | null = null;
  let stageB: React.ReactNode | null = null;
  let actions: React.ReactNode | null = null;
  let controls: React.ReactNode | null = null;

  if (recording.characterId) {
    controls = (
      <StageRecordingControls characters={characters} dispatch={dispatch} recording={recording} />
    );
    if (recording.phase === RECORDING_PHASE.RECORD) {
      const evaluatedSquares = getEvaluatedSquares(
        recording.ruleId,
        world.evaluatedRuleDetails,
        selectedActors,
      );

      stageA = (
        <Stage
          style={{ marginRight: 2 }}
          world={recording.beforeWorld}
          stage={getCurrentStageForWorld(recording.beforeWorld)!}
          recordingExtent={recording.extent}
          recordingCentered
          evaluatedSquares={evaluatedSquares}
        />
      );
      if (recording.actions !== null) {
        stageB = (
          <Stage
            style={{ marginLeft: 2 }}
            world={recording.afterWorld}
            stage={getCurrentStageForWorld(recording.afterWorld)!}
            recordingExtent={recording.extent}
            recordingCentered
          />
        );
      }
      actions = (
        <div className="recording-specifics">
          <div
            style={{
              position: "absolute",
              zIndex: 2,
              transform: "translate(0, -100%)",
              paddingBottom: 5,
            }}
          >
            <StageRecordingTools />
          </div>
          <RecordingConditions characters={characters} recording={recording} />
          {recording.actions !== null && (
            <RecordingActions characters={characters} recording={recording} />
          )}
        </div>
      );
    }
  }

  /**
   * The central game state, including undo and forward/back, operate in terms of "ticks".
   * Within a tick there are individual frames of animation.
   *
   * This useEffect takes the world's stage and evaluatedTickFrames and briefly sets
   * `current` to each frame before landing on the final frame. After it's finished,
   * it stops using the frame data and just displays `getCurrentStageForWorld`. It keeps
   * the last drawn frameId in the `current` state to make sure the frames for a tick do
   * not play more than once as re-renders are triggered. When the game advances a tick,
   * the new tick frames are given new IDs which kicks off another animation cycle.
   */
  const stage = getCurrentStageForWorld(world)!;
  const [current, setCurrent] = useState<{ stage: Types.Stage; frameId?: number }>({ stage });
  const intervalRef = useRef<number>();

  useEffect(() => {
    if (world.evaluatedTickFrames) {
      const frames = world.evaluatedTickFrames;
      const setNext = () => {
        setCurrent((current) => {
          const nextIdx = frames.findIndex((f) => current.frameId === f.id) + 1;
          const frame = frames[nextIdx] || null;
          if (!frame) {
            clearTimeout(intervalRef.current);
            return { stage, frameId: current.frameId };
          }
          return { stage: { ...stage, actors: frame.actors }, frameId: frame.id };
        });
      };

      setNext();

      const framerate = playback.running ? playback.speed / frames.length : 100;
      intervalRef.current = setInterval(setNext, framerate);
    } else {
      setCurrent({ stage });
    }

    return () => {
      clearTimeout(intervalRef.current);
    };
  }, [playback.running, playback.speed, stage, world.evaluatedTickFrames]);

  return (
    <div className="stage-container">
      <div className="panel stages">
        <div className="stages-horizontal-flex">
          {stageA || <Stage world={world} stage={current.stage} readonly={readonly} />}
          {stageB || <Stage stage={0 as never} world={0 as never} style={{ flex: 0 }} />}
        </div>
        {actions || <div className="recording-specifics" style={{ height: 0 }} />}
        {controls || (
          <StageControls {...playback} dispatch={dispatch} world={world} readonly={readonly} />
        )}
      </div>
      {!readonly && <Library />}
    </div>
  );
};

export default StageContainer;
