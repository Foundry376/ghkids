import { useCallback, useState } from "react";
import { Actor, Position } from "../../../../types";
import { STAGE_CELL_SIZE } from "../../../constants/constants";

/**
 * Selection rectangle defined by start and end pixel coordinates.
 * The start is where the user began dragging, end is current position.
 * Note: end may be less than start if user dragged up/left.
 */
export interface SelectionRect {
  start: { top: number; left: number };
  end: { top: number; left: number };
}

/**
 * Converts a selection rectangle to grid bounds.
 *
 * This is a pure function extracted for testability.
 *
 * @param rect - Selection rectangle in pixels
 * @param scale - Current zoom scale
 * @returns Grid bounds { min: Position, max: Position }
 */
export function selectionRectToGridBounds(
  rect: SelectionRect,
  scale: number
): { min: Position; max: Position } {
  // Sort to handle dragging in any direction
  const [minLeft, maxLeft] = [rect.start.left, rect.end.left].sort(
    (a, b) => a - b
  );
  const [minTop, maxTop] = [rect.start.top, rect.end.top].sort((a, b) => a - b);

  return {
    min: {
      x: Math.floor(minLeft / STAGE_CELL_SIZE / scale),
      y: Math.floor(minTop / STAGE_CELL_SIZE / scale),
    },
    max: {
      x: Math.floor(maxLeft / STAGE_CELL_SIZE / scale),
      y: Math.floor(maxTop / STAGE_CELL_SIZE / scale),
    },
  };
}

/**
 * Finds all actors within the given grid bounds.
 *
 * This is a pure function extracted for testability.
 *
 * @param actors - Dictionary of actors
 * @param min - Minimum grid position (inclusive)
 * @param max - Maximum grid position (inclusive)
 * @returns Array of actors within bounds
 */
export function findActorsInBounds(
  actors: { [id: string]: Actor },
  min: Position,
  max: Position
): Actor[] {
  return Object.values(actors).filter(
    (actor) =>
      actor.position.x >= min.x &&
      actor.position.x <= max.x &&
      actor.position.y >= min.y &&
      actor.position.y <= max.y
  );
}

/**
 * Determines the character ID to use for selection.
 *
 * Returns the character ID if all selected actors share the same character,
 * otherwise returns null (mixed selection).
 *
 * @param actors - Array of selected actors
 * @returns Character ID if uniform, null otherwise
 */
export function getSelectionCharacterId(actors: Actor[]): string | null {
  if (actors.length === 0) return null;

  const firstCharacterId = actors[0].characterId;
  const allSameCharacter = actors.every(
    (a) => a.characterId === firstCharacterId
  );

  return allSameCharacter ? firstCharacterId : null;
}

/**
 * Hook that manages the selection rectangle state for box selection.
 *
 * This hook handles:
 * - Starting a selection rectangle when user clicks background
 * - Updating the rectangle as user drags
 * - Finishing selection and determining which actors are selected
 * - Canceling selection
 *
 * IMPORTANT: This hook manages state only. It does NOT:
 * - Add event listeners (that's the parent's responsibility)
 * - Dispatch Redux actions (the parent passes a callback)
 * - Access DOM elements directly
 *
 * @returns Object with selection state and control functions
 */
export function useStageSelection() {
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(
    null
  );

  /**
   * Starts a new selection rectangle.
   *
   * @param startPx - Starting pixel position (typically from getPxOffsetForEvent)
   */
  const startSelection = useCallback(
    (startPx: { left: number; top: number }) => {
      setSelectionRect({ start: startPx, end: startPx });
    },
    []
  );

  /**
   * Updates the selection rectangle's end position.
   *
   * IMPORTANT: This only updates if a selection is in progress.
   * Calling this when selectionRect is null is a no-op.
   *
   * @param endPx - Current pixel position
   */
  const updateSelection = useCallback(
    (endPx: { left: number; top: number }) => {
      setSelectionRect((prev) => (prev ? { ...prev, end: endPx } : null));
    },
    []
  );

  /**
   * Finishes the selection and calls back with selected actors.
   *
   * This:
   * 1. Converts the rectangle to grid bounds
   * 2. Finds actors within bounds
   * 3. Determines if selection is uniform (same character)
   * 4. Calls the onSelect callback with results
   * 5. Clears the selection rectangle
   *
   * @param scale - Current zoom scale
   * @param actors - Dictionary of all actors on stage
   * @param onSelect - Callback with (characterId, actorIds)
   */
  const finishSelection = useCallback(
    (
      scale: number,
      actors: { [id: string]: Actor },
      onSelect: (characterId: string | null, actorIds: string[]) => void
    ) => {
      if (!selectionRect) return;

      const bounds = selectionRectToGridBounds(selectionRect, scale);
      const selectedActors = findActorsInBounds(actors, bounds.min, bounds.max);
      const characterId = getSelectionCharacterId(selectedActors);

      onSelect(
        characterId,
        selectedActors.map((a) => a.id)
      );
      setSelectionRect(null);
    },
    [selectionRect]
  );

  /**
   * Cancels any in-progress selection.
   */
  const cancelSelection = useCallback(() => {
    setSelectionRect(null);
  }, []);

  /**
   * Returns whether a selection is currently in progress.
   */
  const isSelecting = selectionRect !== null;

  return {
    selectionRect,
    isSelecting,
    startSelection,
    updateSelection,
    finishSelection,
    cancelSelection,
  };
}
