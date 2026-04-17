import { Character } from "../../types";

export const DOOR_VARIABLE_IDS = {
  destinationX: "door-dest-x",
  destinationY: "door-dest-y",
  destinationStage: "door-dest-stage",
} as const;

export function isDoorCharacter(character: Character | undefined): boolean {
  return character?.kind === "door";
}
