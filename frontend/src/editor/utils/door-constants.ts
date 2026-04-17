import { Character, Characters, Position, WorldMinimal } from "../../types";
import { getVariableValue } from "./stage-helpers";

export const DOOR_VARIABLE_IDS = {
  destinationX: "door-dest-x",
  destinationY: "door-dest-y",
  destinationStage: "door-dest-stage",
} as const;

export function isDoorCharacter(character: Character | undefined): boolean {
  return character?.kind === "door";
}

/**
 * A newly placed door defaults to teleporting one square to the right,
 * unless it is at the right edge of the stage — in which case we fall
 * back to one square to the left so the destination is always on-stage.
 */
export function computeDoorDefaultDestination(
  position: Position,
  stageWidth: number,
): { x: number; y: number } {
  if (position.x + 1 < stageWidth) {
    return { x: position.x + 1, y: position.y };
  }
  return { x: Math.max(0, position.x - 1), y: position.y };
}

/**
 * A door on some source stage whose destination variables point to a
 * different stage. We surface these to the destination stage's Stage
 * component so that cross-stage destinations stay visible even though
 * the source door actor itself isn't rendered there.
 */
export type IncomingDoorDestination = {
  sourceActorId: string;
  sourceStageId: string;
  destX: number;
  destY: number;
};

/**
 * Walk every stage in the world, find door actors whose destination
 * stage points to a DIFFERENT stage, and bucket those destinations by
 * the stage they target. Same-stage destinations are ignored — they're
 * handled directly by the rendering stage when the door is selected.
 */
export function collectDoorsByDestinationStage(
  world: Pick<WorldMinimal, "stages">,
  characters: Characters,
): { [destStageId: string]: IncomingDoorDestination[] } {
  const result: { [destStageId: string]: IncomingDoorDestination[] } = {};

  for (const sourceStage of Object.values(world.stages)) {
    for (const actor of Object.values(sourceStage.actors)) {
      const character = characters[actor.characterId];
      if (character?.kind !== "door") continue;

      const destXRaw = getVariableValue(actor, character, DOOR_VARIABLE_IDS.destinationX, "=");
      const destYRaw = getVariableValue(actor, character, DOOR_VARIABLE_IDS.destinationY, "=");
      const destStageId =
        getVariableValue(actor, character, DOOR_VARIABLE_IDS.destinationStage, "=") ?? "";

      const destX = Number(destXRaw);
      const destY = Number(destYRaw);
      if (!Number.isFinite(destX) || !Number.isFinite(destY)) continue;
      if (!destStageId || destStageId === sourceStage.id) continue;

      (result[destStageId] ??= []).push({
        sourceActorId: actor.id,
        sourceStageId: sourceStage.id,
        destX,
        destY,
      });
    }
  }

  return result;
}
