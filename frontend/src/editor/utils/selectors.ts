import { EditorState, Stage, World } from "../../types";

export function getStages(state: EditorState) {
  return state.world.stages;
}

export function getStagesList(state: EditorState) {
  return Object.values(state.world.stages).sort((a, b) => a.order - b.order);
}

export function getCurrentStage(state: EditorState) {
  return getCurrentStageForWorld(state.world);
}

export function getCurrentStageForWorld(world: Pick<World, "stages" | "globals">): Stage | null {
  if (!world) {
    return null;
  }
  const stageIds = Object.keys(world.stages);
  if (stageIds.length === 0) {
    return null;
  }

  const currentId = world.globals.selectedStageId?.value ?? stageIds[0];
  // Fall back to first stage if selected stage was deleted
  return world.stages[currentId] ?? world.stages[stageIds[0]] ?? null;
}
