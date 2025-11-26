import { getCurrentStageForWorld } from "../../../utils/selectors";

import u from "updeep";
import {
  Actor,
  Characters,
  RecordingState,
  Rule,
  RuleExtent,
  Stage,
  World,
  WorldMinimal,
} from "../../../../types";
import { WORLDS } from "../../../constants/constants";
import { extentByShiftingExtent } from "../../../utils/recording-helpers";
import { actorFilledPoints, pointIsInside } from "../../../utils/stage-helpers";
import WorldOperator from "../../../utils/world-operator";

export function offsetForEditingRule(extent: RuleExtent, world: WorldMinimal) {
  const stage = getCurrentStageForWorld(world);

  const ex = extent.xmax - extent.xmin;
  const ey = extent.ymax - extent.ymin;
  return {
    x: Math.round(stage!.width / 2 + ex / 2),
    y: Math.round(stage!.height / 2 + ey / 2),
  };
}

export function getAfterWorldForRecording(
  beforeWorld: WorldMinimal,
  characters: Characters,
  recording: RecordingState,
  actionSteps?: number,
) {
  const cloned = u({ id: WORLDS.AFTER }, beforeWorld) as World;

  const beforeStage = getCurrentStageForWorld(beforeWorld);
  if (!beforeStage) {
    return cloned;
  }
  if (!recording?.actions) {
    return cloned;
  }
  const recordedRule = ruleFromRecordingState(beforeStage, characters, recording);
  if (!recordedRule) {
    return cloned;
  }

  // Note: When we go from the real stage to the before world, we use the `offset`
  // to center the world around the recording extent. When we go from before world
  // to after world, we are stacking another change ON TOP of the before world.
  //
  // This offset undoes the shift in `ruleFromRecordingState` below and removes any
  // adjustment we made to put the main actor at 0,0. (I think, I have a 6mo old
  // and I'm tired.)
  //
  const offset = {
    x: recording.extent.xmin - recordedRule.extent.xmin,
    y: recording.extent.ymin - recordedRule.extent.ymin,
  };

  return WorldOperator(cloned, characters).resetForRule(
    {
      ...recordedRule,
      actions:
        actionSteps !== undefined
          ? recordedRule.actions
              .slice(0, actionSteps)
              .map((f) => ({ ...f, noAnimationFrame: false }))
          : recordedRule.actions,
      id: "T",
      name: "T",
    },
    {
      offset: offset,
      applyActions: true,
    },
  ) as WorldMinimal;
}

export function ruleFromRecordingState(
  beforeStage: Stage,
  characters: Characters,
  recording: RecordingState,
) {
  const mainActor = Object.values(beforeStage.actors).find((a) => a.id === recording.actorId);
  if (!mainActor) {
    return null;
  }

  const recordingActors: { [actorId: string]: Actor } = {};

  // In a saved rule the main actor is at 0,0, but when recording on the stage
  // the extent and the position are relative to the "current" game world. Convert
  // to main-actor relative positions and extent.

  for (const a of Object.values(beforeStage.actors)) {
    if (actorFilledPoints(a, characters).some((p) => pointIsInside(p, recording.extent))) {
      recordingActors[a.id] = Object.assign({}, a, {
        position: {
          x: a.position.x - mainActor.position.x,
          y: a.position.y - mainActor.position.y,
        },
      });
    }
  }

  const recordedRule: Omit<Rule, "id" | "name"> = {
    type: "rule" as const,
    mainActorId: recording.actorId!,
    conditions: recording.conditions,
    actors: recordingActors,
    actions: recording.actions!,
    extent: extentByShiftingExtent(recording.extent, {
      x: -mainActor.position.x,
      y: -mainActor.position.y,
    }),
  };
  return recordedRule;
}
