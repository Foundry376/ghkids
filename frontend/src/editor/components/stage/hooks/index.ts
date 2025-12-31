/**
 * Stage Hooks
 *
 * These hooks extract logic from the main Stage component into
 * smaller, testable units.
 */

export {
  useStageCoordinates,
  calculatePxOffset,
  calculateGridPosition,
  parseDragOffset,
  isPositionInBounds,
  type PxOffset,
} from "./useStageCoordinates";

export {
  useStageZoom,
  calculateFitScale,
  STAGE_ZOOM_STEPS,
  type StageScaleConfig,
} from "./useStageZoom";

export {
  useStageSelection,
  selectionRectToGridBounds,
  findActorsInBounds,
  getSelectionCharacterId,
  type SelectionRect,
} from "./useStageSelection";

export { useStagePopover, type PopoverState } from "./useStagePopover";
