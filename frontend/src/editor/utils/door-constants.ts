import { Character, Position } from "../../types";

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
