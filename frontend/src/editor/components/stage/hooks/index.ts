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

export {
  useStageDragDrop,
  // Parsing utilities
  parseSpriteDropData,
  parseAppearanceDropData,
  parseHandleSide,
  // Creation utilities
  createActorSpriteData,
  createCharacterSpriteData,
  createAppearanceData,
  setHandleDragData,
  // Pure calculation functions
  calculateNewExtent,
  calculateDropOffset,
  cloneExistsAtPosition,
  // Types
  type ActorDropData,
  type CharacterDropData,
  type AppearanceDropData,
  type DropMode,
  type HandleSide,
  type StageDragDropConfig,
} from "./useStageDragDrop";
