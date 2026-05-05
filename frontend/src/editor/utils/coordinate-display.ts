import { Position, Stage } from "../../types";

// Coordinate-system convention:
//   Internal coordinates: 0-indexed, Y-down. Top-left tile is (0, 0).
//   Display coordinates: 1-indexed, Y-up. Bottom-left tile is (1, 1).
//
// Example on a height-8 stage:
//   internal (0, 0)  ↔  display (1, 8)   — top-left
//   internal (0, 7)  ↔  display (1, 1)   — bottom-left
//
// Internal coordinates are used everywhere in storage, simulation, rendering,
// and rule data. Display coordinates are exposed only at user-facing boundaries:
// the inspector's position fields, the kid-readable `x`/`y` actor variables
// surfaced in conditions and actions, and disambiguation labels in the rule
// editor.

export function toDisplayX(internalX: number): number {
  return internalX + 1;
}

export function toDisplayY(internalY: number, stageHeight: number): number {
  return stageHeight - internalY;
}

export function toInternalX(displayX: number): number {
  return displayX - 1;
}

export function toInternalY(displayY: number, stageHeight: number): number {
  return stageHeight - displayY;
}

/** Format an internal position for display, e.g. "(3, 5)". */
export function formatPosition(position: Position, stage: Pick<Stage, "height">): string {
  return `(${toDisplayX(position.x)},${toDisplayY(position.y, stage.height)})`;
}
