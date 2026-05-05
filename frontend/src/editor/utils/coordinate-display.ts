// Coordinate-system convention:
//   Internal coordinates: 0-indexed, Y-down. Top-left tile is (0, 0).
//   Display coordinates: 1-indexed, Y-up. Bottom-left tile is (1, 1).
//
// Internal coordinates are used everywhere in storage, simulation, rendering,
// and rule data. Display coordinates are exposed only at user-facing boundaries:
// the inspector's position fields, and the kid-readable `x`/`y` actor variables
// surfaced in conditions and actions.

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
